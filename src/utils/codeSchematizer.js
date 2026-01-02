import { Parser } from "acorn";
import jsx from "acorn-jsx";

// Estendiamo il parser per supportare JSX
const JsxParser = Parser.extend(jsx());

/**
 * Genera uno scheletro (outline) del codice JS/JSX riducendo la verbosità.
 * Mantiene import, export, firme di funzioni e classi, rimuovendo il corpo.
 *
 * @param {string} code - Il codice sorgente completo.
 * @returns {string} - Lo scheletro del codice ottimizzato per i token.
 */
export function generateCodeSkeleton(code) {
  try {
    // Parsing tollerante: module source type e versione latest
    const ast = JsxParser.parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
    });

    const lines = [];

    // Iteriamo solo sui nodi top-level per costruire la struttura
    for (const node of ast.body) {
      switch (node.type) {
        case "ImportDeclaration":
          lines.push(formatImport(node));
          break;
        case "FunctionDeclaration":
          lines.push(formatFunction(node));
          break;
        case "ClassDeclaration":
          lines.push(formatClass(node));
          break;
        case "VariableDeclaration":
          lines.push(formatVariable(node));
          break;
        case "ExportNamedDeclaration":
          lines.push(formatExportNamed(node));
          break;
        case "ExportDefaultDeclaration":
          lines.push(formatExportDefault(node));
          break;
        case "ExpressionStatement":
          // Gestisce assegnazioni globali (es. App.components = ...) per progetti legacy/non-module
          const expr = formatExpressionStatement(node);
          if (expr) lines.push(expr);
          break;
        // Ignoriamo espressioni e side-effect top-level per risparmiare spazio
        // a meno che non siano critici (ma per uno scheletro di solito non servono)
      }
    }

    return lines.join("\n");
  } catch (e) {
    // Fallback in caso di errore di parsing (es. sintassi sperimentale non supportata)
    // O se il linguaggio non è JS (C++, Python, Java, ecc.)
    const regexSkeleton = generateRegexSkeleton(code);
    if (regexSkeleton) {
      return regexSkeleton;
    }

    return `// [Skeleton Generation Failed]: ${e.message}\n// (File content too complex, non-JS language, or syntax error)`;
  }
}

// --- FORMATTERS ---

function formatImport(node) {
  const source = node.source.value;
  if (node.specifiers.length === 0) {
    return `import "${source}";`;
  }
  const specs = node.specifiers.map((s) => {
    if (s.type === "ImportDefaultSpecifier") return s.local.name;
    if (s.type === "ImportNamespaceSpecifier") return `* as ${s.local.name}`;
    // Gestisce alias: import { foo as bar }
    return s.local.name !== s.imported.name
      ? `${s.imported.name} as ${s.local.name}`
      : s.local.name;
  });
  return `import { ${specs.join(", ")} } from "${source}";`;
}

function formatFunction(node, isExport = false) {
  const name = node.id?.name || "";
  const params = node.params.map(formatParam).join(", ");
  const prefix = isExport ? "export " : "";
  const asyncPrefix = node.async ? "async " : "";
  const generatorPrefix = node.generator ? "*" : "";
  return `${prefix}${asyncPrefix}function ${generatorPrefix}${name}(${params}) { ... }`;
}

function formatClass(node, isExport = false) {
  const name = node.id?.name || "";
  const prefix = isExport ? "export " : "";
  const superClass = node.superClass ? ` extends ${node.superClass.name}` : "";
  return `${prefix}class ${name}${superClass} { ... }`;
}

function formatVariable(node, isExport = false) {
  const kind = node.kind; // const, let, var
  const decls = node.declarations.map((d) => {
    const name = formatParam(d.id);
    // Rileva Arrow Functions o Function Expressions assegnate a variabili
    if (
      d.init &&
      (d.init.type === "ArrowFunctionExpression" ||
        d.init.type === "FunctionExpression")
    ) {
      const params = d.init.params.map(formatParam).join(", ");
      const asyncPrefix = d.init.async ? "async " : "";
      return `${name} = ${asyncPrefix}(${params}) => { ... }`;
    }
    return name;
  });
  const prefix = isExport ? "export " : "";
  return `${prefix}${kind} ${decls.join(", ")};`;
}

function formatExportNamed(node) {
  if (node.declaration) {
    if (node.declaration.type === "FunctionDeclaration")
      return formatFunction(node.declaration, true);
    if (node.declaration.type === "ClassDeclaration")
      return formatClass(node.declaration, true);
    if (node.declaration.type === "VariableDeclaration")
      return formatVariable(node.declaration, true);
  }
  if (node.specifiers) {
    const specs = node.specifiers.map((s) => s.exported.name).join(", ");
    return `export { ${specs} };`;
  }
  return "export ...;";
}

function formatExportDefault(node) {
  // Gestisce export default anonimi o nominati
  return `export default ...;`;
}

function formatParam(node) {
  if (node.type === "Identifier") return node.name;
  if (node.type === "AssignmentPattern") return formatParam(node.left) + "?"; // Parametro opzionale/default
  if (node.type === "ObjectPattern") return "{}"; // Destructuring oggetto
  if (node.type === "ArrayPattern") return "[]"; // Destructuring array
  if (node.type === "RestElement") return "..." + formatParam(node.argument); // Rest params
  return "arg";
}

// --- EXTENDED FORMATTERS (Legacy JS) ---

function formatExpressionStatement(node) {
  // Intercetta assegnazioni globali: App.components = ... o window.App = ...
  if (node.expression.type === "AssignmentExpression") {
    const left = node.expression.left;
    const right = node.expression.right;
    
    let name = "";
    // Supporta Identifier (MyGlobal) o MemberExpression semplice (App.components)
    if (left.type === "Identifier") {
        name = left.name;
    } else if (left.type === "MemberExpression" && left.object.type === "Identifier" && left.property.type === "Identifier") {
        name = `${left.object.name}.${left.property.name}`;
    }

    if (name) {
      // Se è una IIFE (Immediately Invoked Function Expression)
      if (right.type === "CallExpression" && (right.callee.type === "FunctionExpression" || right.callee.type === "ArrowFunctionExpression")) {
         return `${name} = (function() { ... })();`;
      }
      return `${name} = ...;`;
    }
  }
  return null;
}

// --- POLYGLOT FALLBACK (Regex) ---

function generateRegexSkeleton(code) {
  const lines = code.split('\n');
  const output = [];
  let hasContent = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. Import/Include generici (Python, C++, Java, C#, JS)
    if (/^(import|export|package|using|#include|from)\b/.test(trimmed)) {
      output.push(trimmed);
      hasContent = true;
      continue;
    }

    // 2. Definizioni strutturali (Classi, Funzioni, Namespace)
    // Cerca righe che finiscono con { (C-like) o : (Python)
    // Esclude keyword di controllo flusso comuni (if, else, for...) per ridurre il rumore
    if ((trimmed.endsWith('{') && !/^(if|else|for|while|switch|catch|try|do)\b/.test(trimmed)) || 
        (trimmed.endsWith(':') && /^(def|class)\b/.test(trimmed))) {
      output.push(trimmed + (trimmed.endsWith('{') ? " ... }" : " ..."));
      hasContent = true;
    }
  }
  
  return hasContent ? output.join('\n') : null;
}

// --- EXTENDED FORMATTERS (Legacy JS) ---

function formatExpressionStatement(node) {
  // Intercetta assegnazioni globali: App.components = ... o window.App = ...
  if (node.expression.type === "AssignmentExpression") {
    const left = node.expression.left;
    const right = node.expression.right;
    
    let name = "";
    // Supporta Identifier (MyGlobal) o MemberExpression semplice (App.components)
    if (left.type === "Identifier") {
        name = left.name;
    } else if (left.type === "MemberExpression" && left.object.type === "Identifier" && left.property.type === "Identifier") {
        name = `${left.object.name}.${left.property.name}`;
    }

    if (name) {
      // Se è una IIFE (Immediately Invoked Function Expression)
      if (right.type === "CallExpression" && (right.callee.type === "FunctionExpression" || right.callee.type === "ArrowFunctionExpression")) {
         return `${name} = (function() { ... })();`;
      }
      return `${name} = ...;`;
    }
  }
  return null;
}

// --- POLYGLOT FALLBACK (Regex) ---

function generateRegexSkeleton(code) {
  const lines = code.split('\n');
  const output = [];
  let hasContent = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. Import/Include generici (Python, C++, Java, C#, JS)
    if (/^(import|export|package|using|#include|from)\b/.test(trimmed)) {
      output.push(trimmed);
      hasContent = true;
      continue;
    }

    // 2. Definizioni strutturali (Classi, Funzioni, Namespace)
    // Cerca righe che finiscono con { (C-like) o : (Python)
    // Esclude keyword di controllo flusso comuni (if, else, for...) per ridurre il rumore
    if ((trimmed.endsWith('{') && !/^(if|else|for|while|switch|catch|try|do)\b/.test(trimmed)) || 
        (trimmed.endsWith(':') && /^(def|class)\b/.test(trimmed))) {
      output.push(trimmed + (trimmed.endsWith('{') ? " ... }" : " ..."));
      hasContent = true;
    }
  }
  
  return hasContent ? output.join('\n') : null;
}
