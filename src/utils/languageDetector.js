/**
 * Mappa le estensioni dei file ai nomi delle lingue supportate da Monaco Editor.
 * Monaco Editor supporta molte lingue, ma qui mappiamo quelle più comuni
 * e quelle specificate nelle features (JS, C++, Kotlin, Arduino, HTML, CSS).
 */
const languageMap = {
  // Web
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.json': 'json',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.xml': 'xml',
  '.md': 'markdown',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  // Altre lingue
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'cpp',
  '.hpp': 'cpp',
  '.java': 'java',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.kt': 'kotlin', // Kotlin
  '.kts': 'kotlin',
  // Arduino (spesso trattato come C/C++)
  '.ino': 'cpp', // Arduino sketch files
  '.pde': 'cpp', // Processing/Arduino
};

/**
 * Determina la lingua di Monaco Editor in base al nome del file.
 * @param {string} filename - Il nome del file (es. 'index.html', 'script.js').
 * @returns {string} Il nome della lingua per Monaco Editor (es. 'html', 'javascript').
 */
export function detectLanguage(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'text';
  }

  // Estrai l'estensione del file
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return 'text'; // Nessuna estensione
  }

  const extension = filename.substring(lastDotIndex).toLowerCase();

  // Cerca nella mappa
  return languageMap[extension] || 'text';
}

/**
 * Restituisce l'icona Lucide appropriata per il nome del file.
 * @param {string} filename - Il nome del file.
 * @returns {string} Il nome dell'icona Lucide (es. 'FileText', 'FileCode', 'FileHtml').
 */
export function detectIcon(filename) {
  const language = detectLanguage(filename);

  switch (language) {
    case 'json':
    case 'yaml':
      return 'FileJson';
    case 'markdown':
      return 'FileText';
    case 'text':
      return 'FileText';
    default:
      // Per tutti i linguaggi di programmazione (html, css, js, cpp, ecc.)
      return 'FileCode';
  }
}