import { describe, it, expect } from 'vitest';
import { detectLanguage, detectIcon } from '../utils/languageDetector';

describe('languageDetector', () => {
  describe('detectLanguage', () => {
    it('should return correct language for web files', () => {
      expect(detectLanguage('index.html')).toBe('html');
      expect(detectLanguage('style.css')).toBe('css');
      expect(detectLanguage('script.js')).toBe('javascript');
      expect(detectLanguage('component.jsx')).toBe('javascript');
      expect(detectLanguage('types.ts')).toBe('typescript');
      expect(detectLanguage('config.json')).toBe('json');
      expect(detectLanguage('README.md')).toBe('markdown');
    });

    it('should return correct language for other code files', () => {
      expect(detectLanguage('main.cpp')).toBe('cpp');
      expect(detectLanguage('header.h')).toBe('cpp');
      expect(detectLanguage('main.c')).toBe('c');
      expect(detectLanguage('app.py')).toBe('python');
      expect(detectLanguage('main.kt')).toBe('kotlin');
      expect(detectLanguage('blink.ino')).toBe('cpp'); // Arduino
    });

    it('should return "text" for unknown extensions or no extension', () => {
      expect(detectLanguage('unknown.xyz')).toBe('text');
      expect(detectLanguage('filewithoutextension')).toBe('text');
      expect(detectLanguage('')).toBe('text');
      expect(detectLanguage(null)).toBe('text');
    });

    it('should be case-insensitive for extensions', () => {
      expect(detectLanguage('FILE.HTML')).toBe('html');
      expect(detectLanguage('SCRIPT.JS')).toBe('javascript');
    });
  });

  describe('detectIcon', () => {
    it('should return correct icon for specific file types', () => {
      expect(detectIcon('config.json')).toBe('FileJson');
      expect(detectIcon('README.md')).toBe('FileText');
      expect(detectIcon('unknown.xyz')).toBe('FileText');
    });

    it('should return "FileCode" for all programming languages', () => {
      expect(detectIcon('index.html')).toBe('FileCode');
      expect(detectIcon('style.css')).toBe('FileCode');
      expect(detectIcon('script.js')).toBe('FileCode');
      expect(detectIcon('main.cpp')).toBe('FileCode');
      expect(detectIcon('app.py')).toBe('FileCode');
      expect(detectIcon('blink.ino')).toBe('FileCode');
    });
  });
});