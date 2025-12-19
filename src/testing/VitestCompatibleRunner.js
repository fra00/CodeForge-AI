/**
 * Implementazione di un mini-framework di test compatibile con la sintassi di Vitest,
 * progettato per essere eseguito interamente nel browser.
 */
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

    return {
      toBe: (expected) => {
        if (value !== expected) {
          throw new Error(`expect(received).toBe(expected)\n\nReceived: ${value}\nExpected: ${expected}`);
        }
      },
      toEqual: (expected) => {
        if (!deepEqual(value, expected)) {
          throw new Error(`expect(received).toEqual(expected)\n\nReceived: ${JSON.stringify(value)}\nExpected: ${JSON.stringify(expected)}`);
        }
      },
      toBeTruthy: () => {
        if (!value) {
          throw new Error(`expect(received).toBeTruthy()\n\nReceived: ${value}`);
        }
      },
      toBeFalsy: () => {
        if (value) {
          throw new Error(`expect(received).toBeFalsy()\n\nReceived: ${value}`);
        }
      },
      toContain: (item) => {
        if (!value || typeof value.includes !== 'function' || !value.includes(item)) {
          throw new Error(`expect(received).toContain(expected)\n\nReceived: ${JSON.stringify(value)}\nExpected to contain: ${JSON.stringify(item)}`);
        }
      },
      toThrow: (expectedError) => {
        if (typeof value !== 'function') {
          throw new Error('expect(received).toThrow() received must be a function');
        }
        try {
          value();
        } catch (error) {
          if (expectedError && !error.message.includes(expectedError)) {
            throw new Error(`expect(received).toThrow(expected)\n\nReceived error: "${error.message}"\nExpected to include: "${expectedError}"`);
          }
          return; // Test passato, l'eccezione è stata lanciata come previsto
        }
        throw new Error('expect(received).toThrow()\n\nFunction did not throw.');
      },
    };
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

// Esponiamo le funzioni globalmente per essere usate dal codice dei test
export const describe = (name, fn) => runner.describe(name, fn);
export const it = (name, fn) => runner.it(name, fn);
export const test = (name, fn) => runner.test(name, fn);
export const expect = (value) => runner.expect(value);
export const beforeEach = (fn) => runner.beforeEach(fn);
export const afterEach = (fn) => runner.afterEach(fn);
export const beforeAll = (fn) => runner.beforeAll(fn);
export const afterAll = (fn) => runner.afterAll(fn);

// Istanza globale del runner
export let runner = new VitestCompatibleRunner();

export function resetRunner() {
  runner = new VitestCompatibleRunner();
}