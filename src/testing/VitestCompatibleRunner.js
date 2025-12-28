import { createRoot } from "react-dom/client";
import React from "react";
import { act } from "react-dom/test-utils";

// Registro globale per tracciare tutti i mock creati e permettere operazioni bulk (restore, clear, reset)
const globalMocks = new Set();

// --- Fake Timers State & Logic ---
const fakeTimers = {
  enabled: false,
  queue: [],
  currentTime: 0,
  originals: {
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    setInterval: window.setInterval,
    clearInterval: window.clearInterval,
    Date: window.Date,
  }
};

function installFakeTimers() {
  if (fakeTimers.enabled) return;
  fakeTimers.enabled = true;
  fakeTimers.currentTime = Date.now();
  fakeTimers.queue = [];

  window.setTimeout = (cb, delay = 0, ...args) => {
    const id = Math.random();
    fakeTimers.queue.push({
      id,
      cb,
      time: fakeTimers.currentTime + delay,
      args,
      type: 'timeout'
    });
    fakeTimers.queue.sort((a, b) => a.time - b.time);
    return id;
  };

  window.clearTimeout = (id) => {
    fakeTimers.queue = fakeTimers.queue.filter(t => t.id !== id);
  };

  window.setInterval = (cb, delay = 0, ...args) => {
    const id = Math.random();
    const safeDelay = delay < 1 ? 1 : delay; // Prevent infinite loops
    fakeTimers.queue.push({
      id,
      cb,
      delay: safeDelay,
      time: fakeTimers.currentTime + safeDelay,
      args,
      type: 'interval'
    });
    fakeTimers.queue.sort((a, b) => a.time - b.time);
    return id;
  };

  window.clearInterval = (id) => {
    fakeTimers.queue = fakeTimers.queue.filter(t => t.id !== id);
  };

  const OriginalDate = fakeTimers.originals.Date;
  window.Date = class extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) return new OriginalDate(fakeTimers.currentTime);
      return new OriginalDate(...args);
    }
    static now() {
      return fakeTimers.currentTime;
    }
  };
}

function useRealTimers() {
  if (!fakeTimers.enabled) return;
  window.setTimeout = fakeTimers.originals.setTimeout;
  window.clearTimeout = fakeTimers.originals.clearTimeout;
  window.setInterval = fakeTimers.originals.setInterval;
  window.clearInterval = fakeTimers.originals.clearInterval;
  window.Date = fakeTimers.originals.Date;
  fakeTimers.enabled = false;
  fakeTimers.queue = [];
}

/**
 * Implementazione di un mini-framework di test compatibile con la sintassi di Vitest,
 * progettato per essere eseguito interamente nel browser.
 */
class Any {
  constructor(constructor) {
    this.constructorRef = constructor;
  }
  asymmetricMatch(other) {
    if (this.constructorRef === String) return typeof other === 'string';
    if (this.constructorRef === Number) return typeof other === 'number';
    if (this.constructorRef === Boolean) return typeof other === 'boolean';
    if (this.constructorRef === Function) return typeof other === 'function';
    if (this.constructorRef === Object) return typeof other === 'object' && other !== null;
    if (this.constructorRef === Array) return Array.isArray(other);
    if (this.constructorRef === Symbol) return typeof other === 'symbol';
    if (this.constructorRef === BigInt) return typeof other === 'bigint';
    return other instanceof this.constructorRef;
  }
}

class ObjectContaining {
  constructor(sample) {
    this.sample = sample;
  }
  asymmetricMatch(other, matcher) {
    if (typeof other !== 'object' || other === null) return false;
    for (const key in this.sample) {
      if (Object.prototype.hasOwnProperty.call(this.sample, key)) {
        if (!(key in other)) return false;
        if (matcher && !matcher(other[key], this.sample[key])) return false;
      }
    }
    return true;
  }
}

function createMockFunction(initialImplementation) {
  let implementation = initialImplementation;
  let onceImplementations = [];

  const mockFn = function(...args) {
    mockFn.mock.calls.push(args);
    let result;
    
    let currentImpl = implementation;
    if (onceImplementations.length > 0) {
      currentImpl = onceImplementations.shift();
    }

    if (currentImpl) {
      try {
        result = currentImpl.apply(this, args);
        mockFn.mock.results.push({ type: 'return', value: result });
        return result;
      } catch (error) {
        mockFn.mock.results.push({ type: 'throw', value: error });
        throw error;
      }
    } else {
      mockFn.mock.results.push({ type: 'return', value: undefined });
    }
  };
  mockFn.mock = {
    calls: [],
    results: [],
  };
  mockFn._isMockFunction = true; // Marker for our matchers
  
  // API per modificare il comportamento del mock
  mockFn.mockImplementation = (newImpl) => { implementation = newImpl; return mockFn; };
  mockFn.mockReturnValue = (val) => { implementation = () => val; return mockFn; };
  mockFn.mockImplementationOnce = (newImpl) => { onceImplementations.push(newImpl); return mockFn; };
  mockFn.mockReturnValueOnce = (val) => { onceImplementations.push(() => val); return mockFn; };
  mockFn.mockRestore = () => {}; // No-op per fn standard, sovrascritto da spyOn

  mockFn.mockClear = () => {
    mockFn.mock.calls = [];
    mockFn.mock.results = [];
  };

  mockFn.mockReset = () => {
    mockFn.mockClear();
    implementation = undefined;
    onceImplementations = [];
  };

  // Registriamo il mock nel set globale
  globalMocks.add(mockFn);

  return mockFn;
}

export class VitestCompatibleRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.results = {
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 0,
      testResults: [],
      startTime: 0,
      endTime: 0,
    };
  }

  // --- API Pubblica (repliche di Vitest) ---

  describe(name, fn) {
    const parentSuite = this.currentSuite;
    const newSuite = {
      name,
      tests: [],
      status: "pass", // Inizia come 'pass', diventa 'fail' se un test fallisce
      assertionResults: [],
      beforeEachHooks: [],
      afterEachHooks: [],
      beforeAllHooks: [],
      afterAllHooks: [],
    };

    if (parentSuite) {
      parentSuite.tests.push(newSuite);
    } else {
      this.suites.push(newSuite);
      this.results.testResults.push(newSuite);
    }

    this.currentSuite = newSuite;
    fn(); // Esegue la funzione per raccogliere i test `it` al suo interno
    this.currentSuite = parentSuite; // Ripristina la suite precedente
  }

  it(name, fn) {
    if (!this.currentSuite) {
      // Se `it` è usato senza `describe`, creiamo una suite di default
      this.describe("default suite", () => {
        this.currentSuite.tests.push({ name, fn });
      });
    } else {
      this.currentSuite.tests.push({ name, fn });
    }
  }

  test(name, fn) {
    this.it(name, fn); // `test` è un alias di `it`
  }

  beforeEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEachHooks.push(fn);
    }
  }

  afterEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterEachHooks.push(fn);
    }
  }

  beforeAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeAllHooks.push(fn);
    }
  }

  afterAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterAllHooks.push(fn);
    }
  }

  expect(value) {
    const deepEqual = (a, b) => {
      if (b instanceof Any) return b.asymmetricMatch(a);
      if (b instanceof ObjectContaining) return b.asymmetricMatch(a, deepEqual);
      if (a === b) return true;
      if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
      if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) return a === b;
      if (a === null || a === undefined || b === null || b === undefined) return a === b;
      if (a.prototype !== b.prototype) return false;
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
      }
      return true;
    };

    const generateMatchers = (isNot) => {
      return {
        toBe: (expected) => {
          const pass = value === expected;
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toBe(expected)\n\nReceived: ${value}\nExpected${isNot ? ' not' : ''}: ${expected}`);
          }
        },
        toEqual: (expected) => {
          const pass = deepEqual(value, expected);
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toEqual(expected)\n\nReceived: ${JSON.stringify(value)}\nExpected${isNot ? ' not' : ''}: ${JSON.stringify(expected)}`);
          }
        },
        toBeTruthy: () => {
          const pass = !!value;
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toBeTruthy()\n\nReceived: ${value}`);
          }
        },
        toBeFalsy: () => {
          const pass = !value;
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toBeFalsy()\n\nReceived: ${value}`);
          }
        },
        toBeNull: () => {
          const pass = value === null;
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toBeNull()\n\nReceived: ${value}`);
          }
        },
        toBeDefined: () => {
          const pass = value !== undefined;
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toBeDefined()\n\nReceived: ${value}`);
          }
        },
        toBeUndefined: () => {
          const pass = value === undefined;
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toBeUndefined()\n\nReceived: ${value}`);
          }
        },
        toContain: (item) => {
          const pass = value && typeof value.includes === 'function' && value.includes(item);
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toContain(expected)\n\nReceived: ${JSON.stringify(value)}\nExpected to contain: ${JSON.stringify(item)}`);
          }
        },
        toHaveLength: (expected) => {
          if (!value || typeof value.length !== 'number') {
            throw new Error(`expect(received).toHaveLength(expected)\n\nReceived value must have a length property.\nReceived: ${value}`);
          }
          const pass = value.length === expected;
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toHaveLength(expected)\n\nExpected length: ${expected}\nReceived length: ${value.length}`);
          }
        },
        toThrow: (expectedError) => {
          if (typeof value !== 'function') {
            throw new Error('expect(received).toThrow() received must be a function');
          }
          let errorThrown = null;
          try {
            value();
          } catch (error) {
            errorThrown = error;
          }

          if (isNot) {
            if (errorThrown) {
              throw new Error(`expect(received).not.toThrow()\n\nFunction threw: ${errorThrown.message}`);
            }
          } else {
            if (!errorThrown) {
              throw new Error('expect(received).toThrow()\n\nFunction did not throw.');
            }
            if (expectedError && !errorThrown.message.includes(expectedError)) {
              throw new Error(`expect(received).toThrow(expected)\n\nReceived error: "${errorThrown.message}"\nExpected to include: "${expectedError}"`);
            }
          }
        },
        // --- DOM Matchers (jest-dom style) ---
        toBeInTheDocument: () => {
          if (value === null || value === undefined) {
            throw new Error('expect(received).toBeInTheDocument()\n\nReceived value is null or undefined');
          }
          const pass = document.contains(value);
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toBeInTheDocument()\n\nElement is ${isNot ? '' : 'not '}in the document.`);
          }
        },
        toHaveClass: (className) => {
          if (!value || !value.classList || !value.classList.contains) {
            throw new Error(`expect(received).toHaveClass("${className}")\n\nReceived value is not an element or has no classList.`);
          }
          const pass = value.classList.contains(className);
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toHaveClass("${className}")\n\nReceived element does ${isNot ? '' : 'not '}have class "${className}".\nActual classes: "${value.className}"`);
          }
        },

        // --- Numeric Matchers ---
        toBeGreaterThan: (expected) => {
          if (typeof value !== 'number' || typeof expected !== 'number') {
            throw new Error('expect(received).toBeGreaterThan(expected) expected numbers');
          }
          const pass = value > expected;
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toBeGreaterThan(expected)\n\nReceived: ${value}\nExpected: ${expected}`);
          }
        },
        toBeGreaterThanOrEqual: (expected) => {
          if (typeof value !== 'number' || typeof expected !== 'number') {
            throw new Error('expect(received).toBeGreaterThanOrEqual(expected) expected numbers');
          }
          const pass = value >= expected;
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toBeGreaterThanOrEqual(expected)\n\nReceived: ${value}\nExpected: ${expected}`);
          }
        },
        toBeLessThan: (expected) => {
          if (typeof value !== 'number' || typeof expected !== 'number') {
            throw new Error('expect(received).toBeLessThan(expected) expected numbers');
          }
          const pass = value < expected;
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toBeLessThan(expected)\n\nReceived: ${value}\nExpected: ${expected}`);
          }
        },
        toBeLessThanOrEqual: (expected) => {
          if (typeof value !== 'number' || typeof expected !== 'number') {
            throw new Error('expect(received).toBeLessThanOrEqual(expected) expected numbers');
          }
          const pass = value <= expected;
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toBeLessThanOrEqual(expected)\n\nReceived: ${value}\nExpected: ${expected}`);
          }
        },
        toBeCloseTo: (expected, precision = 2) => {
          if (typeof value !== 'number' || typeof expected !== 'number') {
            throw new Error('expect(received).toBeCloseTo(expected) expected numbers');
          }
          const pass = Math.abs(expected - value) < (Math.pow(10, -precision) / 2);
          if (isNot ? pass : !pass) {
            const received = value;
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toBeCloseTo(expected, precision)\n\nExpected: ${expected}\nReceived: ${received}\nPrecision: ${precision}`);
          }
        },

        // --- Mock Matchers ---
        toHaveBeenCalled: () => {
          if (!value || !value._isMockFunction) {
            throw new Error('expect(received).toHaveBeenCalled() received must be a mock function.');
          }
          const pass = value.mock.calls.length > 0;
          if (isNot ? pass : !pass) {
            const negation = isNot ? 'not ' : '';
            throw new Error(`Expected mock function ${negation}to be called, but it was called ${value.mock.calls.length} times.`);
          }
        },
        toHaveBeenCalledTimes: (expected) => {
          if (!value || !value._isMockFunction) {
            throw new Error('expect(received).toHaveBeenCalledTimes() received must be a mock function.');
          }
          const pass = value.mock.calls.length === expected;
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toHaveBeenCalledTimes(expected)\n\nExpected: ${expected}\nReceived: ${value.mock.calls.length}`);
          }
        },
        toHaveBeenCalledWith: (...expectedArgs) => {
          if (!value || !value._isMockFunction) {
            throw new Error('expect(received).toHaveBeenCalledWith() received must be a mock function.');
          }
          // Check if at least one call matches the expected arguments
          const pass = value.mock.calls.some(callArgs => deepEqual(callArgs, expectedArgs));
          if (isNot ? pass : !pass) {
            const receivedCalls = value.mock.calls.map(args => JSON.stringify(args)).join('\n  ');
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toHaveBeenCalledWith(expected)\n\nExpected: ${JSON.stringify(expectedArgs)}\nReceived:\n  ${receivedCalls || '(no calls)'}`);
          }
        },
        
        // --- Extended DOM Matchers (Commonly used by AI) ---
        toHaveTextContent: (text) => {
          if (!value || typeof value.textContent !== 'string') {
             throw new Error('expect(received).toHaveTextContent() received must be an HTMLElement');
          }
          const pass = value.textContent.includes(text);
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toHaveTextContent("${text}")\n\nReceived text: "${value.textContent}"`);
          }
        },
        toHaveValue: (expectedValue) => {
          if (!value || value.value === undefined) {
             throw new Error('expect(received).toHaveValue() received must be a form element with a value');
          }
          const pass = value.value === expectedValue;
          if (isNot ? pass : !pass) {
            throw new Error(`expect(received)${isNot ? '.not' : ''}.toHaveValue("${expectedValue}")\n\nReceived value: "${value.value}"`);
          }
        },
        toHaveAttribute: (attr, expectedValue) => {
          if (!value || !value.getAttribute) throw new Error('expect(received).toHaveAttribute() received must be an Element');
          const hasAttr = value.hasAttribute(attr);
          const attrVal = value.getAttribute(attr);
          const pass = expectedValue === undefined ? hasAttr : attrVal === expectedValue;
           if (isNot ? pass : !pass) throw new Error(`expect(received)${isNot ? '.not' : ''}.toHaveAttribute("${attr}", "${expectedValue}") failed.`);
        },
        toBeDisabled: () => {
           const pass = value && value.disabled === true;
           if (isNot ? pass : !pass) throw new Error(`expect(received)${isNot ? '.not' : ''}.toBeDisabled() failed.`);
        },

        // --- Unsupported / Stubbed Matchers for LLM Guidance ---
        toMatchSnapshot: () => {
           throw new Error("[Vitest Lite] Snapshot testing (toMatchSnapshot) is not supported in this browser environment. Please use 'toEqual' or specific property assertions instead.");
        },
        toMatchInlineSnapshot: () => {
           throw new Error("[Vitest Lite] Snapshot testing (toMatchInlineSnapshot) is not supported. Please use 'toEqual' or specific property assertions instead.");
        },
        toThrowErrorMatchingSnapshot: () => {
           throw new Error("[Vitest Lite] Snapshot testing is not supported. Please check the error message string explicitly using 'toThrow'.");
        },
        toThrowErrorMatchingInlineSnapshot: () => {
           throw new Error("[Vitest Lite] Snapshot testing is not supported. Please check the error message string explicitly using 'toThrow'.");
        },
      };
    };

    const matchers = generateMatchers(false);
    matchers.not = generateMatchers(true);

    // --- Async Matchers Stubs ---
    // Intercettiamo l'accesso a .resolves e .rejects per guidare l'LLM
    Object.defineProperty(matchers, 'resolves', {
      get: () => { throw new Error("[Vitest Lite] Async matchers (.resolves) are not supported. Please use 'const result = await promise; expect(result)...' instead."); }
    });
    Object.defineProperty(matchers, 'rejects', {
      get: () => { throw new Error("[Vitest Lite] Async matchers (.rejects) are not supported. Please use 'try { await promise; } catch(e) { expect(e)... }' instead."); }
    });

    return matchers;
  }

  // --- Esecuzione dei Test ---

  async run() {
    this.results.startTime = performance.now();
    for (const suite of this.suites) {
      await this.runSuite(suite);
    }
    this.results.endTime = performance.now();

    // --- SOLUZIONE ---
    // Crea una copia "pulita" dei risultati senza le funzioni di test,
    // che non possono essere clonate e inviate dal Web Worker.
    const cleanResults = {
      ...this.results,
      testResults: this.results.testResults.map(suite => ({
        ...suite,
        // Rimuoviamo l'array `tests` che contiene le funzioni.
        // Le informazioni importanti sono già in `assertionResults`.
        tests: undefined, 
      })),
    };
    // Rimuoviamo la proprietà per sicurezza
    cleanResults.testResults.forEach(suite => delete suite.tests);

    return cleanResults;
  }

  async runSuite(suite, parentHooks = { beforeEach: [], afterEach: [] }) {
    for (const hook of suite.beforeAllHooks) await hook();

    const beforeEachHooks = [...parentHooks.beforeEach, ...suite.beforeEachHooks];
    const afterEachHooks = [...parentHooks.afterEach, ...suite.afterEachHooks];

    for (const testOrSubSuite of suite.tests) {
      if (testOrSubSuite.tests) { // È una sotto-suite
        await this.runSuite(testOrSubSuite, { beforeEach: beforeEachHooks, afterEach: afterEachHooks });

        // Flatten: porta su i risultati delle asserzioni dalle sotto-suite
        suite.assertionResults.push(...testOrSubSuite.assertionResults);
        if (testOrSubSuite.status === "fail") suite.status = "fail";

      } else { // È un test
        this.results.numTotalTests++;
        const startTime = performance.now();
        let status = "pass";
        let failureMessage = null;

        try {
          for (const hook of beforeEachHooks) await hook();
          await testOrSubSuite.fn(); // Esegue la funzione del test
          this.results.numPassedTests++;
        } catch (error) {
          status = "fail";
          this.results.numFailedTests++;
          suite.status = "fail"; // Marca la suite come fallita
          failureMessage = error instanceof Error ? error.message : String(error);
        } finally {
          for (const hook of afterEachHooks) await hook();
        }

        const endTime = performance.now();
        suite.assertionResults.push({
          title: testOrSubSuite.name,
          status,
          duration: endTime - startTime,
          failureMessages: failureMessage ? [failureMessage] : [],
          fullName: `${suite.name} > ${testOrSubSuite.name}`,
        });
      }
    }

    for (const hook of suite.afterAllHooks) await hook();
  }
}

export const vi = {
  fn: (implementation) => createMockFunction(implementation),
  spyOn: (obj, methodName) => {
    if (!obj || typeof obj[methodName] !== 'function') {
      throw new Error(`Cannot spyOn method "${methodName}". It is not a function.`);
    }
    const originalImplementation = obj[methodName];
    // Crea un mock che chiama l'originale di default
    const mockFn = createMockFunction(originalImplementation);
    
    // Sostituisce il metodo sull'oggetto
    obj[methodName] = mockFn;
    
    // Aggiunge la capacità di ripristino
    mockFn.mockRestore = () => { obj[methodName] = originalImplementation; };
    
    return mockFn;
  },
  /**
   * Sostituisce una proprietà globale (es. window.crypto) con un valore mock.
   * Utile per mockare API del browser che potrebbero essere read-only.
   */
  stubGlobal: (name, value) => {
    Object.defineProperty(window, name, {
      value: value,
      writable: true,
      configurable: true,
    });
  },
  /**
   * Ripristina l'implementazione originale di tutti i mock creati con spyOn.
   */
  restoreAllMocks: () => {
    globalMocks.forEach((mock) => mock.mockRestore());
  },
  /**
   * Pulisce la cronologia delle chiamate (calls, results) di tutti i mock.
   * Non ripristina l'implementazione originale.
   */
  clearAllMocks: () => {
    globalMocks.forEach((mock) => mock.mockClear());
  },
  /**
   * Resetta completamente lo stato di tutti i mock (cronologia + implementazioni).
   */
  resetAllMocks: () => {
    globalMocks.forEach((mock) => mock.mockReset());
  },
  
  // --- Timer Mocks ---
  useFakeTimers: () => installFakeTimers(),
  useRealTimers: () => useRealTimers(),
  
  runOnlyPendingTimers: () => {
    if (!fakeTimers.enabled) return;
    // Esegue i task attualmente in coda (snapshot)
    const tasks = [...fakeTimers.queue];
    fakeTimers.queue = []; 
    tasks.forEach(task => {
      fakeTimers.currentTime = task.time;
      try { task.cb(...(task.args || [])); } catch(e) { console.error(e); }
      if (task.type === 'interval') {
        fakeTimers.queue.push({ ...task, time: fakeTimers.currentTime + task.delay });
      }
    });
    fakeTimers.queue.sort((a, b) => a.time - b.time);
  },
  
  advanceTimersByTime: (ms) => {
    if (!fakeTimers.enabled) return;
    const targetTime = fakeTimers.currentTime + ms;
    let limit = 10000; // Safety break
    while (fakeTimers.queue.length > 0 && fakeTimers.queue[0].time <= targetTime && limit-- > 0) {
      const task = fakeTimers.queue.shift();
      fakeTimers.currentTime = task.time;
      try { task.cb(...(task.args || [])); } catch(e) { console.error(e); }
      if (task.type === 'interval') {
        const nextTask = { ...task, time: task.time + task.delay };
        // Inserimento ordinato
        let inserted = false;
        for(let i=0; i<fakeTimers.queue.length; i++) {
            if (fakeTimers.queue[i].time > nextTask.time) {
                fakeTimers.queue.splice(i, 0, nextTask);
                inserted = true;
                break;
            }
        }
        if (!inserted) fakeTimers.queue.push(nextTask);
      }
    }
    fakeTimers.currentTime = targetTime;
  },
  
  runAllTimers: () => {
    if (!fakeTimers.enabled) return;
    let limit = 1000;
    while (fakeTimers.queue.length > 0 && limit-- > 0) {
       const task = fakeTimers.queue.shift();
       fakeTimers.currentTime = task.time;
       try { task.cb(...(task.args || [])); } catch(e) { console.error(e); }
       if (task.type === 'interval') {
         const nextTask = { ...task, time: task.time + task.delay };
         let inserted = false;
         for(let i=0; i<fakeTimers.queue.length; i++) {
             if (fakeTimers.queue[i].time > nextTask.time) {
                 fakeTimers.queue.splice(i, 0, nextTask);
                 inserted = true;
                 break;
             }
         }
         if (!inserted) fakeTimers.queue.push(nextTask);
       }
    }
  },

  // --- Unsupported / Stubbed Methods for LLM Guidance ---
  mock: () => { throw new Error("[Vitest Lite] Module mocking (vi.mock) is not supported in this browser environment. Please use Dependency Injection or vi.spyOn() on globals."); },
  unmock: () => { throw new Error("[Vitest Lite] vi.unmock is not supported."); },
  doMock: () => { throw new Error("[Vitest Lite] vi.doMock is not supported."); },
  importActual: () => { throw new Error("[Vitest Lite] vi.importActual is not supported."); },
  
  setSystemTime: () => { throw new Error("[Vitest Lite] vi.setSystemTime is not supported. Please use 'vi.useFakeTimers()' and 'vi.advanceTimersByTime()' to manipulate time."); },
  getMockedSystemTime: () => { throw new Error("[Vitest Lite] vi.getMockedSystemTime is not supported."); },
  getRealSystemTime: () => { throw new Error("[Vitest Lite] vi.getRealSystemTime is not supported."); },
  
  resetModules: () => { throw new Error("[Vitest Lite] vi.resetModules is not supported as there is no module registry to reset."); },
  isolateModules: () => { throw new Error("[Vitest Lite] vi.isolateModules is not supported."); },
  setConfig: () => { throw new Error("[Vitest Lite] vi.setConfig is not supported."); },
  
  // --- Common Utilities ---
  mocked: (item) => item, // Helper TypeScript comune, identity function in JS
  hoisted: () => { throw new Error("[Vitest Lite] vi.hoisted is not supported (requires bundler)."); },
};

// --- React Testing Utilities (Globali) ---

let currentRoot = null;
let currentContainer = null;

export function cleanup() {
  if (currentRoot) {
    act(() => currentRoot.unmount());
    currentRoot = null;
  }
  if (currentContainer) {
    currentContainer.remove();
    currentContainer = null;
  }
  // Ripristina i timer reali se erano stati mockati
  useRealTimers();
  // Puliamo anche il localStorage per evitare che i test si influenzino a vicenda
  // o che lo stato persista tra le esecuzioni (se il runner viene riutilizzato).
  try {
    window.localStorage.clear();
  } catch (e) {}
}

/**
 * Utility per testare custom hooks senza usare JSX.
 * Esempio: const { result } = renderHook(() => useMyHook());
 */
export function renderHook(hookFn, options = {}) {
  // Assicura che l'ambiente sia pulito prima di un nuovo render
  cleanup();

  const result = { current: null };
  const { wrapper: Wrapper } = options;

  function TestComponent() {
    const hookResult = hookFn();
    result.current = hookResult;
    return null;
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  currentContainer = container;
  currentRoot = createRoot(container);

  // Se c'è un wrapper, avvolgiamo il TestComponent
  const component = Wrapper
    ? React.createElement(Wrapper, null, React.createElement(TestComponent))
    : React.createElement(TestComponent);

  act(() => {
    currentRoot.render(component);
  });

  return {
    result,
    rerender: () => {
      act(() => {
        currentRoot.render(component);
      });
    },
    unmount: () => {
      cleanup();
    },
  };
}

// Istanza globale del runner
export let runner = new VitestCompatibleRunner();

export function resetRunner() {
  runner = new VitestCompatibleRunner();
}

// Esportiamo act per l'uso nei test
export { act }; 

// --- Enhanced Exports with Modifiers (.skip, .only, etc.) ---

const createTestInterface = (runnerMethod) => {
  const fn = (name, cb) => runnerMethod.call(runner, name, cb);
  
  // .skip: Logga un warning e non esegue il test
  fn.skip = (name, cb) => { console.warn(`[Vitest Lite] Skipped test: ${name}`); };
  
  // .concurrent: Esegue normalmente (alias)
  fn.concurrent = (name, cb) => runnerMethod.call(runner, name, cb);
  
  // .only / .each: Stub con errore esplicito
  fn.only = () => { throw new Error("[Vitest Lite] .only is not supported. Please run specific test files instead."); };
  fn.each = () => { throw new Error("[Vitest Lite] .each is not supported. Please use a standard loop."); };
  
  return fn;
};

export const describe = createTestInterface(runner.describe);
export const it = createTestInterface(runner.it);
export const test = createTestInterface(runner.test);

// Re-export standard utils
export const expect = (value) => runner.expect(value);
expect.any = (constructor) => new Any(constructor);
expect.objectContaining = (sample) => new ObjectContaining(sample);
export const beforeEach = (fn) => runner.beforeEach(fn);
export const afterEach = (fn) => runner.afterEach(fn);
export const beforeAll = (fn) => runner.beforeAll(fn);
export const afterAll = (fn) => runner.afterAll(fn);