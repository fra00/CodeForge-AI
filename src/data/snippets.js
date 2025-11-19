// src/data/snippets.js

/**
 * Struttura dati per gli Snippets predefiniti.
 * Ogni snippet ha un ID, titolo, lingua, tag e il codice.
 */

export const javascriptSnippets = [
  {
    id: 'js-async-fetch',
    title: 'Async Fetch con Error Handling',
    language: 'javascript',
    tags: ['async', 'fetch', 'error-handling'],
    code: `async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}`
  },
  {
    id: 'js-debounce',
    title: 'Debounce Function',
    language: 'javascript',
    tags: ['utility', 'performance'],
    code: `function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}`
  },
  {
    id: 'js-zustand-store',
    title: 'Zustand Store Base',
    language: 'javascript',
    tags: ['zustand', 'state-management'],
    code: `import { create } from 'zustand';

export const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));`
  },
  {
    id: 'js-react-component',
    title: 'Componente Funzionale React Base',
    language: 'javascript',
    tags: ['react', 'component'],
    code: `import React from 'react';

export function MyComponent({ prop1 }) {
  const [state, setState] = useState('');

  return (
    <div>
      <h1>{prop1}</h1>
      <input value={state} onChange={(e) => setState(e.target.value)} />
    </div>
  );
}`
  },
];

export const cppSnippets = [
  {
    id: 'cpp-smart-pointer',
    title: 'Unique Pointer',
    language: 'cpp',
    tags: ['memory', 'smart-pointer'],
    code: `#include <memory>
#include <iostream>

class MyClass {
public:
  void greet() { std::cout << "Hello!" << std::endl; }
};

void useUniquePtr() {
  std::unique_ptr<MyClass> ptr = std::make_unique<MyClass>();
  ptr->greet();
}`
  },
  {
    id: 'cpp-vector-loop',
    title: 'Vector Range-based Loop',
    language: 'cpp',
    tags: ['stl', 'vector'],
    code: `#include <vector>
#include <iostream>

void printVector(const std::vector<int>& vec) {
  for (int val : vec) {
    std::cout << val << " ";
  }
  std::cout << std::endl;
}`
  },
];

export const arduinoSnippets = [
  {
    id: 'arduino-blink',
    title: 'LED Blink Base',
    language: 'cpp', // Arduino usa C++
    tags: ['basic', 'io'],
    code: `const int ledPin = 13;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(ledPin, HIGH);
  delay(1000);
  digitalWrite(ledPin, LOW);
  delay(1000);
}`
  },
];

export const allSnippets = [
  ...javascriptSnippets,
  ...cppSnippets,
  ...arduinoSnippets,
];