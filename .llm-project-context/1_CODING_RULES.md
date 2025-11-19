# Best Practice di Programmazione JavaScript/React

Questo documento definisce un insieme di best practice e linee guida per lo sviluppo di applicazioni JavaScript e React. L'obiettivo è promuovere codice pulito, leggibile, manutenibile, scalabile e, soprattutto, **facilmente testabile**.

---

## 1. Principi Generali di Codifica

- **Pulizia e Leggibilità:**
  - **Chiarezza:** Scrivi codice facile da capire per chiunque (incluso il tuo "io futuro"!).
  - **Nomi Espliciti:** Usa nomi chiari e descrittivi per variabili, funzioni, classi e componenti (es. `calculateTotalPrice` invece di `calc`, `UserProfileCard` invece di `UPC`).
  - **Commenti Utili:** Commenta il codice quando la logica è complessa, o per spiegare "il perché" di una scelta, non solo "il cosa". Evita commenti ovvi.
  - **Formattazione Consistente:** Mantieni una formattazione del codice uniforme (indentazione, spazi, ecc.). Strumenti come Prettier e ESLint possono aiutarti.
- **DRY (Don't Repeat Yourself):**
  - Evita la duplicazione di codice. Se ti trovi a scrivere lo stesso blocco di codice più di una volta, valuta di estrarlo in una funzione, un componente o un modulo riutilizzabile.
- **KISS (Keep It Simple, Stupid):**
  - Prediligi soluzioni semplici ed eleganti a quelle eccessivamente complesse. La complessità non necessaria aumenta i bug e rende il codice difficile da capire e mantenere.
- **YAGNI (You Aren't Gonna Need It):**
  - Non implementare funzionalità o complessità che non sono richieste al momento. Costruisci ciò di cui hai bisogno ora, pensando alla scalabilità, ma senza fare "over-engineering".

---

## 2. Best Practice JavaScript

- **Uso di `const` e `let`:**
  - **Prediligi `const`:** Usa `const` per tutte le variabili i cui valori non devono essere riassegnati. Questo rende il codice più prevedibile e riduce i potenziali bug.
  - **Usa `let` con cautela:** Usa `let` solo quando sai che una variabile dovrà essere riassegnata. Evita `var`.
- **Arrow Functions (`=>`):**
  - **Preferenza:** Utilizza le arrow functions per callback, funzioni anonime e metodi di classe (quando non è necessario `this` contestuale specifico di un metodo di classe tradizionale). Sono più concise e gestiscono il `this` in modo più intuitivo (lexical `this`).
- **Destrutturazione:**
  - Usa la destrutturazione di array e oggetti per estrarre valori in modo pulito e leggibile. (es. `const { name, age } = user;` invece di `const name = user.name; const age = user.age;`).
- **Moduli ES6 (Import/Export):**
  - Utilizza sempre la sintassi `import`/`export` per la gestione dei moduli.
  - Prediligi gli `export` nominali rispetto agli `export default` quando appropriato, per una maggiore chiarezza e per facilitare i refactoring automatici.
- **Gestione Asincrona (Promises/Async-Await):**
  - **Evita Callback Hell:** Prediligi le **Promises** e la sintassi **`async`/`await`** per gestire operazioni asincrone. Sono molto più leggibili e gestibili.
  - **Gestione Errori:** Implementa sempre blocchi `try/catch` con `async/await` o catene `.catch()` con le Promises per gestire gli errori in modo robusto.

---

## 3. Best Practice React (Componenti Funzione vs. Classi)

**Nota:** La comunità React e la documentazione ufficiale prediligono l'uso dei **componenti a funzione con Hooks** per lo sviluppo di nuovo codice. I componenti a classe sono ancora supportati ma meno raccomandati per la nuova implementazione. Le seguenti regole riflettono questa preferenza.

### 3.1 Componenti a Funzione e Hooks (Preferito)

- **Usa Componenti Funzione:** Per la maggior parte dei nuovi componenti, usa funzioni React con Hooks. Sono più semplici, più concisi e più facili da testare.
- **Hooks appropriati:**
  - `useState` per la gestione dello stato locale.
  - `useEffect` per effetti collaterali (fetch dati, manipolazione DOM, sottoscrizioni), ricordandosi di gestire le dipendenze e le funzioni di cleanup.
  - `useContext` per accedere al contesto.
  - `useReducer` per la gestione di stati complessi con logica di transizione chiara.
  - `useCallback` e `useMemo` per l'ottimizzazione delle performance, **solo quando necessario** e misurato (non abusarne, possono introdurre complessità).
- **Props:**
  - Destruttura le props all'inizio del componente.
  - Passa solo le props strettamente necessarie al sotto-componente. Evita il "prop drilling" eccessivo; considera Context API o librerie di gestione dello stato per dati globali.
  - Usa `PropTypes` (per JS) o TypeScript (per TS) per la validazione delle props e una maggiore robustezza.

### 3.2 Componenti a Classe (Quando Inevitabile o in Codice Legacy)

- **Costruttore:** Inizializza lo stato e lega i metodi solo se necessario. Se non ci sono `props` o stato da inizializzare, non è necessario un costruttore.
- **Metodi del Ciclo di Vita:** Comprendi appieno i metodi del ciclo di vita (`componentDidMount`, `componentDidUpdate`, `componentWillUnmount`) e il loro corretto utilizzo.
- **`setState`:** Aggiorna lo stato usando la forma a funzione di `setState` (`this.setState(prevState => ...)`) quando il nuovo stato dipende dal precedente.
- **Bining dei Metodi:** Lega i metodi al `this` della classe nel costruttore o utilizza le arrow functions come proprietà di classe per evitare problemi di contesto.

---

## 4. Modularità e Riusabilità

**Principio:** Scomponi l'interfaccia utente e la logica in blocchi piccoli, isolati e riutilizzabili.

- **Singola Responsabilità (SRP):**
  - Ogni componente (o classe/funzione) dovrebbe avere una singola ragione per cambiare. Se un componente fa troppe cose, dividilo.
- **Limiti di Lunghezza:**
  - **Componenti/Classi:** Se un file componente JSX/TSX o una classe JavaScript supera approssimativamente le **100-150 righe di codice** (escludendo import, commenti iniziali, interfacce/prop types), valuta fortemente di **estrarre sezioni in nuovi sotto-componenti o moduli dedicati**.
  - **Funzioni/Metodi:** Le funzioni o i metodi dovrebbero essere brevi e concisi, idealmente non più di 20-30 righe.
- **Estrazione di Componenti/Funzioni Riutilizzabili:**
  - **UI Complessi:** Identifica blocchi di JSX riutilizzabili o logicamente autonomi (es. un header di card, un elemento di lista specifico).
  - **Logica Riutilizzabile:** Estrai logica complessa, manipolazione di dati o chiamate API in funzioni utility pure o custom Hooks, separandole dalla UI.
- **Nomi Espliciti per Estratti:** Quando estrai un sotto-componente o una funzione, assegna un nome che rifletta chiaramente la sua nuova e singola responsabilità (es. `ProductImage`, `UserFormFields`, `useFormValidation`).

---

## 5. Testabilità

**Principio:** Tutto il codice generato e sviluppato deve essere intrinsecamente testabile. La testabilità è una caratteristica fondamentale del buon design del software.

- **Purity (Pure Functions/Components):**
  - **Prediligi Pure Functions:** Le funzioni pure (che dati gli stessi input, restituiscono sempre gli stessi output e non hanno effetti collaterali) sono estremamente facili da testare.
  - **Pure Components:** I componenti React (specialmente quelli a funzione) dovrebbero essere il più puri possibile, gestendo la UI in base alle props e allo stato.
- **Isolamento delle Responsabilità:**
  - Separa la logica di business dalla UI e dalle chiamate API. Questo permette di testare ogni parte in isolamento.
  - Le funzioni utility e i custom Hooks dovrebbero essere testabili indipendentemente dai componenti che li utilizzano.
- **Dependency Injection (In Modo Semplice):**
  - Quando possibile, "inietta" le dipendenze (es. servizi API, configurazioni) tramite props o argomenti di funzione, piuttosto che importarle direttamente da un modulo globale. Questo facilita la mock-up delle dipendenze nei test.
- **Evita Stato Globale Non Necessario:**
  - Mantieni lo stato il più locale possibile. Lo stato globale è più difficile da ragionare e da testare.
- **Test Unitari:**
  - Scrivi test unitari per funzioni pure, custom Hooks e piccoli componenti per verificare che facciano esattamente ciò che dovrebbero.
- **Test di Integrazione:**
  - Scrivi test di integrazione per verificare che i componenti interagiscano correttamente tra loro e con i servizi esterni (simulati).
- **Test di Componente (React Testing Library):**
  - Usa librerie come React Testing Library (RTL) per testare i componenti React concentrandoti sul comportamento dell'utente, piuttosto che sull'implementazione interna. RTL incoraggia test più robusti.

---

**Nota per LLM:** Quando ti viene richiesto di generare codice, fai riferimento a queste linee guida. Se il codice risultante è troppo lungo o complesso, suddividilo in componenti/funzioni più piccole e separate, seguendo i principi di modularità e riutilizzabilità. Assicurati che ogni parte del codice sia progettata pensando alla sua testabilità.
