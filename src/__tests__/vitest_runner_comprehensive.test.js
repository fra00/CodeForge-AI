import { useState, useEffect } from "react";
import { 
  describe as compatDescribe, 
  it as compatIt, 
  expect as compatExpect, 
  vi as compatVi,
  beforeAll as compatBeforeAll,
  afterAll as compatAfterAll,
  beforeEach as compatBeforeEach,
  afterEach as compatAfterEach,
  renderHook as compatRenderHook, 
  act as compatAct,
  runner,
  resetRunner
} from "../testing/VitestCompatibleRunner";

// Questo file viene eseguito dal VERO Vitest (Node.js/JSDOM).
// Testa che la logica interna di VitestCompatibleRunner funzioni correttamente.

describe("VitestCompatibleRunner Unit Tests (Node/JSDOM)", () => {
  
  beforeEach(() => {
    resetRunner();
    // Pulizia DOM e Mock reali tra i test
    document.body.innerHTML = '';
    vi.restoreAllMocks(); 
  });

  describe("Runner Engine & Matchers", () => {
    test("should pass basic assertions", async () => {
      // Definiamo una suite nel NOSTRO runner
      compatDescribe("suite", () => {
        compatIt("test", () => {
          compatExpect(1).toBe(1);
          compatExpect(true).toBeTruthy();
        });
      });

      // Eseguiamo il runner
      const results = await runner.run();
      
      // Verifichiamo i risultati col VERO expect
      expect(results.numPassedTests).toBe(1);
      expect(results.numFailedTests).toBe(0);
    });

    test("should fail on assertion error", async () => {
      compatDescribe("suite", () => {
        compatIt("test", () => {
          compatExpect(1).toBe(2); // Deve fallire
        });
      });

      const results = await runner.run();
      expect(results.numFailedTests).toBe(1);
      expect(results.testResults[0].assertionResults[0].status).toBe("fail");
      expect(results.testResults[0].assertionResults[0].failureMessages[0]).toContain("Received: 1");
    });

    test("should execute lifecycle hooks in order", async () => {
      const log = [];
      compatDescribe("suite", () => {
        compatBeforeAll(() => log.push("beforeAll"));
        compatAfterAll(() => log.push("afterAll"));
        compatBeforeEach(() => log.push("beforeEach"));
        compatAfterEach(() => log.push("afterEach"));
        
        compatIt("test", () => {
          log.push("test");
        });
      });

      await runner.run();
      expect(log).toEqual(["beforeAll", "beforeEach", "test", "afterEach", "afterAll"]);
    });
  });

  describe("Mocking System (compatVi)", () => {
    test("vi.fn() should track calls", async () => {
      compatDescribe("suite", () => {
        compatIt("test", () => {
          const fn = compatVi.fn();
          fn(1, 2);
          compatExpect(fn).toHaveBeenCalled();
          compatExpect(fn).toHaveBeenCalledWith(1, 2);
        });
      });

      const results = await runner.run();
      expect(results.numPassedTests).toBe(1);
    });

    test("vi.spyOn() should mock and restore", async () => {
      const obj = { method: () => "original" };
      
      compatDescribe("suite", () => {
        compatIt("test", () => {
          const spy = compatVi.spyOn(obj, "method");
          spy.mockReturnValue("mocked");
          
          compatExpect(obj.method()).toBe("mocked");
          
          spy.mockRestore();
          compatExpect(obj.method()).toBe("original");
        });
      });

      const results = await runner.run();
      expect(results.numPassedTests).toBe(1);
    });
  });

  describe("Fake Timers", () => {
    test("should control time", async () => {
      compatDescribe("timers", () => {
        compatIt("test", () => {
          compatVi.useFakeTimers();
          const fn = compatVi.fn();
          setTimeout(fn, 1000);
          
          compatVi.advanceTimersByTime(500);
          compatExpect(fn).not.toHaveBeenCalled();
          
          compatVi.advanceTimersByTime(500);
          compatExpect(fn).toHaveBeenCalled();
          
          compatVi.useRealTimers();
        });
      });
      
      const results = await runner.run();
      expect(results.numPassedTests).toBe(1);
    });
  });

  describe("React Utilities (renderHook)", () => {
    // Qui testiamo direttamente l'implementazione di renderHook usando il VERO Vitest.
    // Non serve passare per runner.run() perché renderHook è una utility standalone.
    
    test("renderHook should handle state updates", () => {
      const useCounter = () => {
        const [count, setCount] = useState(0);
        return { count, inc: () => setCount(c => c + 1) };
      };

      const { result } = compatRenderHook(() => useCounter());
      expect(result.current.count).toBe(0);

      compatAct(() => {
        result.current.inc();
      });

      expect(result.current.count).toBe(1);
    });
  });

});
