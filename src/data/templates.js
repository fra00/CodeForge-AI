// src/data/templates.js

/**
 * Struttura dati per i Templates predefiniti.
 * Ogni template definisce un set di file per un progetto iniziale.
 */

export const templates = {
  'react-app': {
    id: 'react-app',
    name: 'React App Base',
    description: 'Applicazione React con un componente funzionale di base.',
    icon: '⚛️',
    tags: ['react', 'frontend', 'spa'],
    files: {
      'index.html': {
        name: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./index.js"></script>
</body>
</html>`
      },
      'index.js': {
        name: 'index.js',
        language: 'javascript',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`
      },
      'App.js': {
        name: 'App.js',
        language: 'javascript',
        content: `import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Hello React!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}

export default App;`
      },
    }
  },
  'vanilla-js-todo': {
    id: 'vanilla-js-todo',
    name: 'Vanilla JS Todo List',
    description: 'Una semplice lista di cose da fare con HTML, CSS e JavaScript puro.',
    icon: '📝',
    tags: ['javascript', 'html', 'css', 'vanilla'],
    files: {
      'index.html': {
        name: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo List</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <h1>Todo List</h1>
    <input type="text" id="todo-input" placeholder="Aggiungi un nuovo task">
    <button id="add-button">Aggiungi</button>
    <ul id="todo-list"></ul>
  </div>
  <script src="script.js"></script>
</body>
</html>`
      },
      'style.css': {
        name: 'style.css',
        language: 'css',
        content: `body {
  font-family: sans-serif;
  background-color: #f4f4f4;
  display: flex;
  justify-content: center;
  padding-top: 50px;
}
#app {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  width: 300px;
}
#todo-list {
  list-style: none;
  padding: 0;
}
#todo-list li {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}`
      },
      'script.js': {
        name: 'script.js',
        language: 'javascript',
        content: `document.getElementById('add-button').addEventListener('click', addTodo);

function addTodo() {
  const input = document.getElementById('todo-input');
  const text = input.value.trim();

  if (text !== '') {
    const li = document.createElement('li');
    li.textContent = text;
    document.getElementById('todo-list').appendChild(li);
    input.value = '';
  }
}`
      },
    }
  },
  'arduino-blink': {
    id: 'arduino-blink',
    name: 'Arduino LED Blink',
    description: 'Sketch base per far lampeggiare un LED sulla scheda Arduino.',
    icon: '💡',
    tags: ['arduino', 'cpp', 'hardware'],
    files: {
      'blink.ino': {
        name: 'blink.ino',
        language: 'cpp',
        content: `// blink.ino
const int ledPin = 13;

void setup() {
  // Inizializza il pin digitale come output.
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(ledPin, HIGH); // Accende il LED
  delay(1000);               // Aspetta un secondo
  digitalWrite(ledPin, LOW);  // Spegne il LED
  delay(1000);               // Aspetta un secondo
}`
      },
    }
  },
};