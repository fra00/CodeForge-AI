import { describe, it, expect, vi } from "vitest";
import { TestTransformer } from "../testing/TestTransformer";

// Mock del codice del runner per evitare dipendenze esterne durante i test
vi.mock("../testing/VitestCompatibleRunner.js?raw", () => ({
  default: "/* VITEST_RUNNER_CODE */",
}));

describe("TestTransformer", () => {
  const mockFiles = {
    "src/test.js": {
      path: "src/test.js",
      name: "test.js",
      isFolder: false,
      content: `
        import { sum } from './utils.js';
        
        test('adds 1 + 2 to equal 3', () => {
          expect(sum(1, 2)).toBe(3);
        });
      `,
    },
    "src/utils.js": {
      path: "src/utils.js",
      name: "utils.js",
      isFolder: false,
      content: `
        export const sum = (a, b) => a + b;
      `,
    },
    "src/component.jsx": {
      path: "src/component.jsx",
      name: "component.jsx",
      isFolder: false,
      content: `
            import React from 'react';
            export default function Component() { return <div>Hello</div>; }
        `,
    },
    "src/componentTest.js": {
      path: "src/componentTest.js",
      name: "componentTest.js",
      isFolder: false,
      content: `
            import Component from './component.jsx';
            test('renders', () => {});
        `,
    },
  };

  it("should transform a simple test file with imports", () => {
    const transformer = new TestTransformer(mockFiles);
    const result = transformer.transform("src/test.js");

    // Verifica che il codice del runner sia incluso
    expect(result).toContain("/* VITEST_RUNNER_CODE */");

    // Verifica che il codice di utils.js sia stato incluso (bundling)
    expect(result).toContain("const sum = (a, b) => a + b;");

    // Verifica che l'import locale sia stato rimosso dal codice del test
    expect(result).not.toContain("import { sum } from './utils.js';");

    // Verifica che il codice del test sia presente
    expect(result).toContain("test('adds 1 + 2 to equal 3'");
  });

  it("should handle export default function correctly", () => {
    const transformer = new TestTransformer(mockFiles);
    const result = transformer.transform("src/componentTest.js");

    // Verifica che la dichiarazione della funzione sia preservata
    // NOTA: Questo assume che il JSX non venga transpilato in questo stadio.
    expect(result).toContain(
      "function Component() { return <div>Hello</div>; }"
    );
    // Verifica l'assegnazione a defaultExport
    expect(result).toMatch(
      /const defaultExport_src_component_jsx\s*=\s*(Component|function\s+Component)/
    );
  });

  it("should throw error if module is not found", () => {
    const filesWithMissingDep = {
      "src/test.js": {
        path: "src/test.js",
        isFolder: false,
        content: "import { foo } from './missing.js';",
      },
    };
    const transformer = new TestTransformer(filesWithMissingDep);
    expect(() => transformer.transform("src/test.js")).toThrow(
      /Module not found/
    );
  });

  it("should sanitize </script> tags", () => {
    const maliciousFiles = {
      "src/test.js": {
        path: "src/test.js",
        isFolder: false,
        content: `
        import { foo } from './utils.js';
        export const s = '</script>';
      `,
      },
      "src/utils.js": {
        path: "src/utils.js",
        isFolder: false,
        content: "export const foo = 'bar';",
      },
    };
    const transformer = new TestTransformer(maliciousFiles);
    const result = transformer.transform("src/test.js");
    // Verifica che il tag di chiusura sia stato sottoposto a escape
    // Poiché il codice viene passato a JSON.stringify, il backslash viene raddoppiato.
    // Quindi cerchiamo <\\/script> nel codice generato (che appare come <\\\\/script> nella stringa JSON)
    expect(result).toContain("<\\\\/script>");
    expect(result).not.toContain("</script>");
  });

  it("should handle virtual entry point", () => {
    const transformer = new TestTransformer(mockFiles);
    // Simuliamo un codice virtuale come quello generato da "Run All Tests"
    // Nota: TestTransformer.findFile normalizza i path rimuovendo lo slash iniziale
    const virtualCode = "import './src/utils.js';";
    const result = transformer.transformVirtual(virtualCode);

    expect(result).toContain("const sum = (a, b) => a + b;");
  });

  it("should handle circular dependencies without infinite loop", () => {
    const circularFiles = {
      "src/moduleA.js": {
        path: "src/moduleA.js",
        isFolder: false,
        content: "import './moduleB.js'; export const a = 'A';",
      },
      "src/moduleB.js": {
        path: "src/moduleB.js",
        isFolder: false,
        content: "import './moduleA.js'; export const b = 'B';",
      },
    };
    const transformer = new TestTransformer(circularFiles);
    const result = transformer.transform("src/moduleA.js");

    expect(result).toContain("const a = 'A';");
    expect(result).toContain("const b = 'B';");
  });

  it("should generate aliases for default imports to fix scope issues", () => {
    const files = {
      "src/App.jsx": {
        path: "src/App.jsx",
        isFolder: false,
        content:
          "export default function Component() { return <div>Hello</div>; }",
      },
      "src/test.js": {
        path: "src/test.js",
        isFolder: false,
        content:
          "import App from './App.jsx'; test('renders', () => { render(<App />); });",
      },
    };
    const transformer = new TestTransformer(files);
    const result = transformer.transform("src/test.js");

    // Verifica che venga creato l'alias per collegare il nome locale all'export di default
    expect(result).toContain("const App = defaultExport_src_App_jsx;");
  });

  it("should wrap non-exporting files in block scope to prevent variable collisions", () => {
    const files = {
      "src/testA.js": {
        path: "src/testA.js",
        isFolder: false,
        content: "const sharedVar = 'A';",
      },
      "src/testB.js": {
        path: "src/testB.js",
        isFolder: false,
        content: "const sharedVar = 'B';",
      },
    };
    const transformer = new TestTransformer(files);
    // Simuliamo l'esecuzione di entrambi i file tramite un entry point virtuale
    const result = transformer.transformVirtual(
      "import './src/testA.js'; import './src/testB.js';"
    );

    // Verifica che il codice di ogni file sia avvolto in un blocco { ... }
    // Questo permette di ridefinire 'sharedVar' senza errori di sintassi
    // NOTA: Il codice è all'interno di una stringa JSON generata da safeStringify,
    // quindi i newline sono escaped (\n diventa \\n).
    expect(result).toContain('{\\nconst sharedVar = \'A\';\\n}');
    expect(result).toContain('{\\nconst sharedVar = \'B\';\\n}');
  });
});
