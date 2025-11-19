# Documentazione della Libreria di Componenti React

Questo documento serve come guida di alto livello per la libreria di componenti. È stato ottimizzato per essere interpretato da un Large Language Model (LLM) che deve utilizzare i componenti in modo autonomo.

## Guida per l'LLM

1.  **Gerarchia delle Informazioni**: Per comprendere come usare un componente, segui questa priorità:
    *   **1° - File di Esempio (`/example/*.jsx`)**: Analizza il file di esempio corrispondente (es. `ExampleButton.jsx`) per vedere l'uso pratico e la composizione. Questo è il modo più efficace per imparare.
    *   **2° - Codice Sorgente del Componente (`/Button.jsx`)**: Leggi i commenti JSDoc e i `propTypes` nel file sorgente per la documentazione autorevole e completa delle API (props). **Questa è la fonte di verità per le API.**
    *   **3° - Questo Documento (`documentation.md`)**: Usa questo file per comprendere i principi di progettazione generali, la struttura del progetto e i concetti di alto livello come il theming.
2.  **Contesto Mirato**: Quando ti viene chiesto di eseguire un'attività, richiedi un contesto limitato ai file specifici necessari (componenti, esempi, e questo file di guida), piuttosto che l'intera codebase.

## Principi di Progettazione

La libreria segue un insieme di best practice volte a promuovere codice pulito, modulare e testabile.


- **Componibilità**: I componenti sono progettati per essere composti tra loro. Componenti complessi come `Modal`, `Tabs` e `Accordion` sono costruiti utilizzando componenti più semplici come `Card` e `Button`.
- **Singola Responsabilità (SRP)**: Ogni componente ha uno scopo chiaro e definito.
- **API Dichiarativa**: I componenti vengono utilizzati in modo dichiarativo, descrivendo _cosa_ l'interfaccia dovrebbe mostrare, non _come_ dovrebbe aggiornarsi.
- **Standardizzazione dei Contenitori (`<Box>` vs `<div>`)**: Per tutti i contenitori generici che necessitano di uno sfondo o di stili tematici, prediligere l'uso del componente `<Box>` rispetto a un `<div>` standard. Il componente `<Box>` è già collegato al sistema di temi (luce/buio). Utilizzare `<div>` solo per scopi puramente strutturali o quando lo stile è già gestito da un componente contenitore padre (es. all'interno di una `<Card>`).
- **Logica vs UI**: La logica riutilizzabile è estratta in custom Hooks (es. `useDisclosure`, `useWizard`) per separarla dalla presentazione (UI), migliorando la testabilità e la riusabilità.

---

## Concetti Generali

### Gestione dei Temi (Light/Dark)

La libreria supporta nativamente un tema chiaro e uno scuro, gestiti tramite il `ThemeProvider`.

**Come funziona:**

1.  **Provider**: L'intera applicazione è avvolta nel `ThemeProvider`, che gestisce lo stato del tema corrente (`light` o `dark`).
2.  **Attributo `data-theme`**: Il provider applica un attributo `data-theme="light"` o `data-theme="dark"` all'elemento `<html>` della pagina.
3.  **Variabili CSS**: Gli stili dei componenti utilizzano variabili CSS definite nel file `src/App.css`. Esiste un set di variabili di default (per il tema scuro) e un set che sovrascrive il primo quando `data-theme="light"`.

**Esempio di Definizione e Utilizzo delle Variabili:**

```css
/* Definizione in App.css */
:root { /* Tema Scuro di default */
  --card-bg: #333333;
  --card-color: #f0f0f0;
}

:root[data-theme="light"] { /* Sovrascrittura per il Tema Chiaro */
  --card-bg: #ffffff;
  --card-color: #212529;
}

/* Utilizzo in Card.css */
.card {
  background-color: var(--card-bg);
  color: var(--card-color);
}
```

**Hook di Utilizzo (`useTheme`):**

Per interagire con il sistema di temi, si utilizza l'hook `useTheme`. Questo hook restituisce un oggetto con lo stato corrente e le funzioni per modificarlo.

```jsx
import { useTheme } from './context/ThemeContext';

const { theme, toggleTheme, setTheme } = useTheme();
```

### Gestione del Layout Responsivo

La responsività è gestita tramite un approccio **mobile-first** utilizzando CSS Media Queries e variabili CSS globali per i breakpoint.

**Breakpoint Definiti:**

Le seguenti variabili sono disponibili globalmente e definite in `src/App.css`:

- `--breakpoint-sm: 576px;`
- `--breakpoint-md: 768px;`
- `--breakpoint-lg: 992px;`
- `--breakpoint-xl: 1200px;`

**Esempio di Utilizzo (da `Tabs.css`):**

```css
/* Stile di default (mobile) */
.tabs-container {
  flex-direction: column;
}

/* Stile per schermi più grandi del breakpoint 'md' */
@media (min-width: var(--breakpoint-md)) {
  .tabs-container {
    flex-direction: row;
  }
}
```

## Indice dei Componenti

### 1. Layout e Struttura

- `Article`
- `Box`
- `Grid`
- `Card`, `CardHeader`, `CardFooter`
- `Modal`
- `Accordion`
- `Tabs`
- `Wizard`
- `Drawer`
- `Breadcrumbs`

### 2. Controlli per Form

- `Button`
- `Input`
- `Select`
- `Textarea`
- `Checkbox`
- `RadioGroup` e `Radio`
- `ToggleSwitch`

### 3. Feedback e Notifica

- `Alert`
- `Spinner`
- `Tooltip`
- `ProgressBar`

### 4. Visualizzazione Dati

- `Avatar`
- `Badge`
- `List` e `ListItem`
- `Table`
- `Pagination`

### 5. Hooks

- `useDisclosure`

---

## 1. Layout e Struttura

### Componente: `Article`

**Scopo:**
Un componente wrapper per contenuti di testo estesi, come post di blog o documentazione. Utilizza le classi `prose` del plugin `@tailwindcss/typography` per una formattazione tipografica di alta qualità e reattiva ai temi.

**Nota importante:**
Per un corretto funzionamento dei temi (chiaro/scuro), è necessario configurare il plugin `@tailwindcss/typography` nel file `tailwind.config.js` per utilizzare le variabili CSS della libreria. Vedere i commenti nel file `Article.css` per un esempio di configurazione.

**Props (API):**

| Prop        | Tipo   | Default | Richiesto | Descrizione                                        |
| ----------- | ------ | ------- | --------- | -------------------------------------------------- |
| `children`  | `node` | -       | Sì        | Il contenuto HTML dell'articolo (h1, p, ul, etc.). |
| `className` | `string` | `''`    | No        | Classi CSS aggiuntive.                             |

**Esempio di Utilizzo:**

```jsx
<Article>
  <h1>Titolo dell'Articolo</h1>
  <p>Questo è un paragrafo di introduzione.</p>
  <h2>Sottotitolo</h2>
</Article>
```

---

### Componente: `Box`

**Scopo:**
Un componente contenitore primitivo e flessibile. Di base, renderizza un `div` e può essere utilizzato per creare qualsiasi tipo di layout.

**Props (API):**

| Prop        | Tipo          | Default | Richiesto | Descrizione                                                              |
| ----------- | ------------- | ------- | --------- | ------------------------------------------------------------------------ |
| `as`        | `elementType` | `'div'` | No        | L'elemento o il componente da renderizzare (es. 'div', 'section').       |
| `children`  | `node`        | -       | No        | Il contenuto da renderizzare all'interno del box.                        |
| `className` | `string`      | `''`    | No        | Classi CSS aggiuntive da applicare al contenitore.                       |

**Esempio di Utilizzo:**

```jsx
// Box standard (renderizza un div)
<Box className="my-custom-layout">
  <p>Questo è un contenuto dentro un Box.</p>
</Box>

// Box che renderizza un elemento <section>
<Box as="section" className="my-custom-section">
  <h2>Titolo della Sezione</h2>
  <p>Contenuto della sezione.</p>
</Box>
```

---

### Componente Composito: `Grid` e `GridItem`

**Scopo:**
Fornisce un wrapper di base per creare semplici layout a griglia. Questi componenti generano classi CSS simili a quelle di Tailwind CSS per `grid`, `grid-cols`, `gap`, e `col-span`.

**Nota importante:**
Questi componenti sono forniti come una _facility_ per layout semplici e non responsivi. Per layout complessi o che richiedono un comportamento responsivo (es. numero di colonne diverso su mobile e desktop), **si raccomanda di utilizzare direttamente le classi di Tailwind CSS** su un componente `<Box>` o un `<div>`.

**Componenti:**

- **`<Grid>`**: Il contenitore della griglia.
- **`<GridItem>`**: Un singolo elemento all'interno della griglia.

**Esempio di Utilizzo:**

```jsx
// Utilizzo del componente Grid per un layout semplice
<Grid cols={3} gap={4}>
  <GridItem colSpan={2}>
    <Box>Contenuto Largo</Box>
  </GridItem>
  <GridItem>
    <Box>Contenuto Stretto</Box>
  </GridItem>
</Grid>

// Approccio raccomandato per layout complessi/responsivi
<Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Box className="md:col-span-2">Contenuto Largo</Box>
  <Box>Contenuto Stretto</Box>
</Box>
```

**Props per `<Grid>`:**

| Prop        | Tipo     | Default | Richiesto | Descrizione                                        |
| ----------- | -------- | ------- | --------- | -------------------------------------------------- |
| `children`  | `node`   | -       | Sì        | Uno o più componenti `GridItem`.                   |
| `cols`      | `number` | `1`     | No        | Il numero di colonne della griglia (`grid-cols-`). |
| `gap`       | `number` | `4`     | No        | Lo spazio tra gli elementi (`gap-`).               |
| `className` | `string` | `''`    | No        | Classi CSS aggiuntive.                             |

**Props per `<GridItem>`:**

| Prop        | Tipo     | Default | Richiesto | Descrizione                                      |
| ----------- | -------- | ------- | --------- | ------------------------------------------------ |
| `children`  | `node`   | -       | Sì        | Il contenuto dell'elemento.                      |
| `colSpan`   | `number` | `1`     | No        | Quante colonne deve occupare (`col-span-`).      |
| `className` | `string` | `''`    | No        | Classi CSS aggiuntive.                           |

---

### Componente: `Card`

**Scopo:**
Un contenitore generico per raggruppare contenuti correlati in un riquadro visivo. È la base per molti altri componenti.

**Props (API):**

| Prop        | Tipo     | Default | Richiesto | Descrizione                                          |
| ----------- | -------- | ------- | --------- | ---------------------------------------------------- |
| `children`  | `node`   | -       | Sì        | Il contenuto da renderizzare all'interno della card. |
| `className` | `string` | `''`    | No        | Classi CSS aggiuntive da applicare al contenitore.   |

**Esempio di Utilizzo:**

```jsx
<Card>
  <p>Questo è il contenuto della card.</p>
</Card>
```

---

### Componente: `CardHeader`

**Scopo:**
Un componente per definire l'intestazione di una `Card`. Tipicamente contiene il titolo.

**Props (API):**

| Prop        | Tipo     | Default | Richiesto | Descrizione                                     |
| ----------- | -------- | ------- | --------- | ----------------------------------------------- |
| `children`  | `node`   | -       | Sì        | Il contenuto dell'intestazione (es. un titolo). |
| `className` | `string` | `''`    | No        | Classi CSS aggiuntive.                          |

**Esempio di Utilizzo:**

```jsx
<Card>
  <CardHeader>Titolo della Card</CardHeader>
  <p>Contenuto...</p>
</Card>
```

---

### Componente: `CardFooter`

**Scopo:**
Un componente per definire il piè di pagina di una `Card`. Ideale per contenere pulsanti di azione.

**Props (API):**

| Prop        | Tipo     | Default | Richiesto | Descrizione                                       |
| ----------- | -------- | ------- | --------- | ------------------------------------------------- |
| `children`  | `node`   | -       | Sì        | Il contenuto del footer (es. uno o più `Button`). |
| `className` | `string` | `''`    | No        | Classi CSS aggiuntive.                            |

**Esempio di Utilizzo:**

```jsx
<Card>
  <p>Contenuto...</p>
  <CardFooter>
    <Button variant="secondary">Annulla</Button>
    <Button>Salva</Button>
  </CardFooter>
</Card>
```

---

### Componente: `Modal`

**Scopo:**
Mostra contenuti in una finestra di dialogo sovrapposta che blocca l'interazione con il resto della pagina. Utilizza l'hook `useDisclosure` per la gestione dello stato.

**Props (API):**

| Prop       | Tipo     | Default | Richiesto | Descrizione                                            |
| ---------- | -------- | ------- | --------- | ------------------------------------------------------ |
| `isOpen`   | `bool`   | -       | Sì        | Controlla la visibilità del modale.                    |
| `onClose`  | `func`   | -       | Sì        | Funzione da eseguire quando l'utente chiude il modale. |
| `title`    | `string` | -       | No        | Titolo da mostrare nell'`CardHeader` del modale.       |
| `children` | `node`   | -       | Sì        | Contenuto del modale.                                  |

**Esempio di Utilizzo:**

```jsx
// Per aprirlo di default, si può inizializzare l'hook in questo modo:
// const { isOpen, onOpen, onClose } = useDisclosure({ defaultIsOpen: true });

return (
  <>
    <Button onClick={onOpen}>Apri Modale</Button>
    <Modal isOpen={isOpen} onClose={onClose} title="Titolo Modale">
      <p>Contenuto del modale.</p>
    </Modal>
  </>
);
```

---

### Componente: `Drawer`

**Scopo:**
Mostra contenuti in un pannello che scorre da un lato dello schermo (destra o sinistra). È un'alternativa al `Modal` per menu, filtri o form contestuali. Utilizza l'hook `useDisclosure` per la gestione dello stato.

**Props (API):**

| Prop        | Tipo                          | Default   | Richiesto | Descrizione                                            |
| ----------- | ----------------------------- | --------- | --------- | ------------------------------------------------------ |
| `isOpen`    | `bool`                        | -         | Sì        | Controlla la visibilità del drawer.                    |
| `onOpen`    | `func`                        | -         | No        | Funzione per aprire il drawer. Se fornita, mostra una "maniglia" (handle) laterale per l'apertura. |
| `onClose`   | `func`                        | -         | Sì        | Funzione da eseguire quando l'utente chiude il drawer. |
| `position`  | `oneOf(['left', 'right'])`    | `'right'` | No        | Determina da quale lato dello schermo appare il drawer. |
| `children`  | `node`                        | -         | Sì        | Contenuto del drawer.                                  |
| `className` | `string`                      | `''`      | No        | Classi CSS aggiuntive per il pannello del drawer.      |

**Esempio di Utilizzo:**

```jsx
const { isOpen, onOpen, onClose } = useDisclosure();

return (
  <>
    <Button onClick={onOpen}>Apri Drawer</Button>
    <Drawer isOpen={isOpen} onClose={onClose} position="left">
      <CardHeader>Menu</CardHeader>
      <div style={{ padding: '1.5rem', flex: 1 }}>...</div>
    </Drawer>
  </>
);
```

---

### Componente Composito: `Accordion`

**Scopo:**
Permette di mostrare e nascondere sezioni di contenuto. Utile per FAQ o per ridurre la complessità visiva.

**Componenti:**

- **`<Accordion>`**: Il contenitore principale che gestisce lo stato dei pannelli aperti.
- **`<AccordionItem>`**: Un wrapper per una singola sezione dell'accordion.
- **`<AccordionHeader>`**: L'intestazione cliccabile che controlla l'apertura/chiusura.
- **`<AccordionPanel>`**: Il pannello che contiene il contenuto nascosto.

**Esempio di Utilizzo:**

```jsx
<Accordion allowMultiple>
  <AccordionItem>
    <AccordionHeader>Sezione 1</AccordionHeader>
    <AccordionPanel>Contenuto della prima sezione.</AccordionPanel>
  </AccordionItem>
  <AccordionItem>
    <AccordionHeader>Sezione 2</AccordionHeader>
    <AccordionPanel>Contenuto della seconda sezione.</AccordionPanel>
  </AccordionItem>
</Accordion>
```

**Props per `<Accordion>`:**

| Prop             | Tipo              | Default | Richiesto | Descrizione                                                          |
| ---------------- | ----------------- | ------- | --------- | -------------------------------------------------------------------- |
| `children`       | `node`            | -       | Sì        | Uno o più componenti `AccordionItem`.                                |
| `allowMultiple`  | `bool`            | `false` | No        | Se `true`, permette di avere più pannelli aperti contemporaneamente. |
| `defaultIndexes` | `arrayOf(number)` | `[]`    | No        | Array degli indici dei pannelli da aprire di default.                |

---

### Componente Composito: `Tabs`

**Scopo:**
Organizza i contenuti in sezioni navigabili tramite linguette (tab).

**Componenti:**

- **`<Tabs>`**: Il contenitore principale che gestisce la tab attiva.
- **`<TabList>`**: Il contenitore per i pulsanti delle tab.
- **`<Tab>`**: Il singolo pulsante di una tab.
- **`<TabPanels>`**: Il contenitore per i pannelli di contenuto.
- **`<TabPanel>`**: Il contenuto di una singola tab.

**Esempio di Utilizzo:**

```jsx
<Tabs>
  <TabList>
    <Tab>Profilo</Tab>
    <Tab>Impostazioni</Tab>
  </TabList>
  <TabPanels>
    <TabPanel>
      <p>Contenuto del profilo.</p>
    </TabPanel>
    <TabPanel>
      <p>Contenuto delle impostazioni.</p>
    </TabPanel>
  </TabPanels>
</Tabs>
```

**Props per `<Tabs>`:**

| Prop           | Tipo     | Default | Richiesto | Descrizione                                |
| -------------- | -------- | ------- | --------- | ------------------------------------------ |
| `children`     | `node`   | -       | Sì        | I componenti `TabList` e `TabPanels`.      |
| `defaultIndex` | `number` | `0`     | No        | L'indice della tab da mostrare di default. |

---

### Componente Composito: `Wizard`

**Scopo:**
Guida l'utente attraverso un processo a più passaggi (step). Utilizza un approccio "headless" con un Context Provider (`Wizard`) e un custom hook (`useWizard`).

**Componenti e Hook:**

- **`<Wizard>`**: Il provider che gestisce lo stato del processo.
- **`useWizard()`**: Hook per accedere allo stato e alle funzioni di navigazione (`nextStep`, `prevStep`, `isLastStep`, etc.).
- **`<WizardPages>`**: Componente helper che renderizza solo il contenuto dello step attivo.

**Esempio di Utilizzo:**

```jsx
const WizardControls = () => {
  const { prevStep, nextStep, isFirstStep, isLastStep } = useWizard();
  return (
    <div>
      <Button onClick={prevStep} disabled={isFirstStep}>
        Indietro
      </Button>
      <Button onClick={nextStep}>{isLastStep ? "Fine" : "Avanti"}</Button>
    </div>
  );
};

<Wizard totalSteps={3} onFinish={() => alert("Finito!")}>
  <WizardPages>
    <div>Contenuto Step 1</div>
    <div>Contenuto Step 2</div>
    <div>Contenuto Step 3</div>
  </WizardPages>
  <WizardControls />
</Wizard>;
```

**Props per `<Wizard>`:**

| Prop                 | Tipo     | Default | Richiesto | Descrizione                                                                                      |
| -------------------- | -------- | ------- | --------- | ------------------------------------------------------------------------------------------------ |
| `children`           | `node`   | -       | Sì        | Il contenuto del wizard (pagine e controlli).                                                    |
| `totalSteps`         | `number` | -       | Sì        | Il numero totale di passaggi del wizard.                                                         |
| `onFinish`           | `func`   | -       | No        | Funzione da eseguire quando si clicca "Avanti" sull'ultimo step.                                 |
| `onBeforeStepChange` | `func`   | -       | No        | Funzione di validazione da eseguire prima di cambiare step. Deve ritornare `true` per procedere. |

---

### Componente: `Breadcrumbs`

**Scopo:**
Mostra il percorso di navigazione gerarchico (breadcrumb) per aiutare l'utente a orientarsi all'interno dell'applicazione.

**Props (API):**

| Prop        | Tipo                                                      | Default | Richiesto | Descrizione                                                                                             |
| ----------- | --------------------------------------------------------- | ------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `items`     | `arrayOf(shape({ label: string, href?: string }))`        | `[]`    | Sì        | Un array di oggetti che rappresentano i link. L'ultimo elemento è considerato la pagina corrente. |
| `separator` | `node`                                                    | `'/'`   | No        | Il separatore da visualizzare tra gli elementi.                                                         |
| `className` | `string`                                                  | `''`    | No        | Classi CSS aggiuntive.                                                                                  |

**Esempio di Utilizzo:**

```jsx
const items = [
  { label: 'Home', href: '/' },
  { label: 'Libreria', href: '/library' },
  { label: 'Dati' },
];

<Breadcrumbs items={items} />
```

---

## 2. Controlli per Form

### Componente: `Button`

**Scopo:**
Un bottone generico con vari stili e dimensioni.

**Props (API):**

| Prop        | Tipo                                                 | Default     | Richiesto | Descrizione                           |
| ----------- | ---------------------------------------------------- | ----------- | --------- | ------------------------------------- |
| `children`  | `node`                                               | -           | Sì        | Il testo o l'icona del bottone.       |
| `onClick`   | `func`                                               | -           | No        | Funzione da eseguire al click.        |
| `type`      | `oneOf(['button', 'submit', 'reset'])`               | `'button'`  | No        | L'attributo `type` del bottone HTML.  |
| `variant`   | `oneOf(['primary', 'secondary', 'danger', 'ghost'])` | `'primary'` | No        | Lo stile visivo del bottone.          |
| `size`      | `oneOf(['small', 'medium', 'large'])`                | `'medium'`  | No        | La dimensione del bottone.            |
| `disabled`  | `bool`                                               | `false`     | No        | Se `true`, il bottone è disabilitato. |
| `className` | `string`                                             | `''`        | No        | Classi CSS aggiuntive.                |

---

### Componente: `Input`

**Scopo:**
Un campo di input generico con etichetta, gestione degli errori e stati.

**Props (API):**

| Prop          | Tipo                | Default  | Richiesto | Descrizione                                      |
| ------------- | ------------------- | -------- | --------- | ------------------------------------------------ |
| `id`          | `string`            | -        | Sì        | ID univoco per l'input e l'etichetta.            |
| `label`       | `string`            | -        | No        | Testo dell'etichetta associata.                  |
| `type`        | `string`            | `'text'` | No        | Tipo di input (es. `text`, `password`, `email`). |
| `value`       | `string` o `number` | -        | Sì        | Il valore controllato dell'input.                |
| `onChange`    | `func`              | -        | Sì        | Funzione da eseguire al cambio di valore.        |
| `placeholder` | `string`            | -        | No        | Testo segnaposto.                                |
| `disabled`    | `bool`              | `false`  | No        | Se `true`, l'input è disabilitato.               |
| `error`       | `string`            | `null`   | No        | Messaggio di errore da visualizzare.             |
| `className`   | `string`            | `''`     | No        | Classi CSS aggiuntive per il wrapper.            |

---

### Componente: `Select`

**Scopo:**
Un menu a tendina (select) con etichetta e gestione degli errori.

**Props (API):**

| Prop        | Tipo                                                      | Default | Richiesto | Descrizione                               |
| ----------- | --------------------------------------------------------- | ------- | --------- | ----------------------------------------- |
| `id`        | `string`                                                  | -       | Sì        | ID univoco.                               |
| `label`     | `string`                                                  | -       | No        | Testo dell'etichetta.                     |
| `options`   | `arrayOf(shape({ value: string/number, label: string }))` | -       | Sì        | Array di oggetti per le opzioni.          |
| `value`     | `string` o `number`                                       | -       | Sì        | Il valore controllato del select.         |
| `onChange`  | `func`                                                    | -       | Sì        | Funzione da eseguire al cambio di valore. |
| `disabled`  | `bool`                                                    | `false` | No        | Se `true`, il select è disabilitato.      |
| `error`     | `string`                                                  | `null`  | No        | Messaggio di errore.                      |
| `className` | `string`                                                  | `''`    | No        | Classi CSS aggiuntive.                    |

---

### Componente: `Textarea`

**Scopo:**
Un campo di testo su più righe con etichetta e gestione degli errori.

**Props (API):**

| Prop          | Tipo     | Default | Richiesto | Descrizione                               |
| ------------- | -------- | ------- | --------- | ----------------------------------------- |
| `id`          | `string` | -       | Sì        | ID univoco.                               |
| `label`       | `string` | -       | No        | Testo dell'etichetta.                     |
| `value`       | `string` | -       | Sì        | Il valore controllato.                    |
| `onChange`    | `func`   | -       | Sì        | Funzione da eseguire al cambio di valore. |
| `placeholder` | `string` | -       | No        | Testo segnaposto.                         |
| `disabled`    | `bool`   | `false` | No        | Se `true`, è disabilitato.                |
| `error`       | `string` | `null`  | No        | Messaggio di errore.                      |
| `className`   | `string` | `''`    | No        | Classi CSS aggiuntive.                    |

---

### Componente: `Checkbox`

**Scopo:**
Una casella di spunta per opzioni binarie (selezionato/non selezionato).

**Props (API):**

| Prop        | Tipo     | Default | Richiesto | Descrizione                              |
| ----------- | -------- | ------- | --------- | ---------------------------------------- |
| `id`        | `string` | -       | Sì        | ID univoco.                              |
| `label`     | `string` | -       | No        | Etichetta testuale.                      |
| `checked`   | `bool`   | -       | Sì        | Stato di selezione del checkbox.         |
| `onChange`  | `func`   | -       | Sì        | Funzione da eseguire al cambio di stato. |
| `disabled`  | `bool`   | `false` | No        | Se `true`, è disabilitato.               |
| `className` | `string` | `''`    | No        | Classi CSS aggiuntive.                   |

---

### Componente Composito: `RadioGroup` e `Radio`

**Scopo:**
Permette di selezionare una singola opzione da un gruppo.

**Componenti:**

- **`<RadioGroup>`**: Contenitore che gestisce la selezione e lo stato del gruppo.
- **`<Radio>`**: Il singolo pulsante di opzione.

**Esempio di Utilizzo:**

```jsx
const [selectedValue, setSelectedValue] = useState("opzione1");

<RadioGroup
  name="gruppo"
  selectedValue={selectedValue}
  onChange={setSelectedValue}
>
  <Radio id="radio1" value="opzione1" label="Opzione 1" />
  <Radio id="radio2" value="opzione2" label="Opzione 2" />
</RadioGroup>;
```

**Props per `<RadioGroup>`:**

| Prop            | Tipo                | Default | Richiesto | Descrizione                                      |
| --------------- | ------------------- | ------- | --------- | ------------------------------------------------ |
| `name`          | `string`            | -       | Sì        | Nome del gruppo, condiviso da tutti i radio.     |
| `selectedValue` | `string` o `number` | -       | Sì        | Il valore dell'opzione attualmente selezionata.  |
| `onChange`      | `func`              | -       | Sì        | Funzione che riceve il nuovo valore selezionato. |
| `children`      | `node`              | -       | Sì        | Uno o più componenti `Radio`.                    |

**Props per `<Radio>`:**

| Prop       | Tipo                | Default | Richiesto | Descrizione                              |
| ---------- | ------------------- | ------- | --------- | ---------------------------------------- |
| `id`       | `string`            | -       | Sì        | ID univoco.                              |
| `value`    | `string` o `number` | -       | Sì        | Valore unico associato a questa opzione. |
| `label`    | `string`            | -       | No        | Etichetta testuale.                      |
| `disabled` | `bool`              | `false` | No        | Se `true`, è disabilitato.               |

---

### Componente: `ToggleSwitch`

**Scopo:**
Un interruttore animato, alternativa moderna al `Checkbox`.

**Props (API):**

| Prop       | Tipo     | Default | Richiesto | Descrizione                              |
| ---------- | -------- | ------- | --------- | ---------------------------------------- |
| `id`       | `string` | -       | Sì        | ID univoco.                              |
| `label`    | `string` | -       | No        | Etichetta testuale.                      |
| `checked`  | `bool`   | -       | Sì        | Stato di attivazione (on/off).           |
| `onChange` | `func`   | -       | Sì        | Funzione da eseguire al cambio di stato. |
| `disabled` | `bool`   | `false` | No        | Se `true`, è disabilitato.               |

---

## 3. Feedback e Notifica

### Componente: `Alert`

**Scopo:**
Mostra messaggi contestuali e persistenti all'interno del layout della pagina (non è un popup).

**Props (API):**

| Prop       | Tipo                                              | Default  | Richiesto | Descrizione                                          |
| ---------- | ------------------------------------------------- | -------- | --------- | ---------------------------------------------------- |
| `children` | `node`                                            | -        | Sì        | Contenuto del messaggio di alert.                    |
| `variant`  | `oneOf(['success', 'danger', 'warning', 'info'])` | `'info'` | No        | Stile visivo dell'alert.                             |
| `onClose`  | `func`                                            | -        | No        | Se fornita, mostra un pulsante per chiudere l'alert. |

---

### Componente: `Spinner`

**Scopo:**
Indica uno stato di caricamento con un'animazione a rotazione.

**Props (API):**

| Prop   | Tipo                                  | Default    | Richiesto | Descrizione               |
| ------ | ------------------------------------- | ---------- | --------- | ------------------------- |
| `size` | `oneOf(['small', 'medium', 'large'])` | `'medium'` | No        | Dimensione dello spinner. |

---

### Componente: `Tooltip`

**Scopo:**
Mostra un piccolo riquadro con informazioni testuali al passaggio del mouse su un elemento.

**Props (API):**

| Prop       | Tipo     | Default | Richiesto | Descrizione                                                |
| ---------- | -------- | ------- | --------- | ---------------------------------------------------------- |
| `children` | `node`   | -       | Sì        | L'elemento che attiverà il tooltip al passaggio del mouse. |
| `text`     | `string` | -       | Sì        | Il testo da visualizzare all'interno del tooltip.          |

---

### Componente: `ProgressBar`

**Scopo:**
Visualizza una barra di progresso per indicare l'avanzamento di un'operazione.

**Props (API):**

| Prop       | Tipo     | Default | Richiesto | Descrizione                                       |
| ---------- | -------- | ------- | --------- | ------------------------------------------------- |
| `progress` | `number` | -       | Sì        | Valore del progresso in percentuale (da 0 a 100). |
| `height`   | `number` | `10`    | No        | Altezza della barra in pixel.                     |

---

## 4. Visualizzazione Dati

### Componente: `Avatar`

**Scopo:**
Mostra l'immagine di un utente. Se l'immagine non è disponibile, mostra un fallback con le iniziali.

**Props (API):**

| Prop       | Tipo                                  | Default    | Richiesto | Descrizione                                                             |
| ---------- | ------------------------------------- | ---------- | --------- | ----------------------------------------------------------------------- |
| `src`      | `string`                              | -          | No        | URL dell'immagine.                                                      |
| `alt`      | `string`                              | -          | Sì        | Testo alternativo per l'immagine.                                       |
| `size`     | `oneOf(['small', 'medium', 'large'])` | `'medium'` | No        | Dimensione dell'avatar.                                                 |
| `children` | `node`                                | -          | No        | Contenuto di fallback (es. iniziali) da mostrare se `src` non è valido. |

---

### Componente: `Badge`

**Scopo:**
Mostra piccole etichette o contatori, utili per notifiche o stati.

**Props (API):**

| Prop       | Tipo                                 | Default     | Richiesto | Descrizione             |
| ---------- | ------------------------------------ | ----------- | --------- | ----------------------- |
| `children` | `node`                               | -           | Sì        | Contenuto del badge.    |
| `variant`  | `oneOf(['default', 'primary', ...])` | `'default'` | No        | Stile visivo del badge. |

---

### Componente Composito: `List` e `ListItem`

**Scopo:**
Crea liste di elementi semplici e strutturate.

**Componenti:**

- **`<List>`**: Il contenitore `<ul>` della lista.
- **`<ListItem>`**: Il singolo elemento `<li>` della lista.

**Esempio di Utilizzo:**

```jsx
<List>
  <ListItem>Primo elemento</ListItem>
  <ListItem>Secondo elemento</ListItem>
</List>
```

---

### Componente: `Table`

**Scopo:**
Un componente generico per visualizzare dati in formato tabellare.

**Props (API):**

| Prop      | Tipo                                              | Default | Richiesto | Descrizione                                                                                                  |
| --------- | ------------------------------------------------- | ------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `columns` | `arrayOf(shape({ key: string, header: string }))` | -       | Sì        | Definisce le colonne della tabella. `key` è la chiave dell'oggetto dati, `header` è il titolo della colonna. |
| `data`    | `arrayOf(object)`                                 | -       | Sì        | L'array di dati da visualizzare. Ogni oggetto rappresenta una riga.                                          |

---

### Componente: `Pagination`

**Scopo:**
Fornisce controlli di navigazione per suddividere grandi set di dati (come in una `Table`) in più pagine.

**Props (API):**

| Prop           | Tipo     | Default | Richiesto | Descrizione                                                             |
| -------------- | -------- | ------- | --------- | ----------------------------------------------------------------------- |
| `currentPage`  | `number` | -       | Sì        | Il numero della pagina attualmente attiva.                              |
| `totalItems`   | `number` | -       | Sì        | Il numero totale di elementi da paginare.                               |
| `itemsPerPage` | `number` | -       | Sì        | Il numero di elementi da visualizzare per pagina.                       |
| `onPageChange` | `func`   | -       | Sì        | Funzione chiamata con il nuovo numero di pagina quando l'utente naviga. |

---

## 5. Hooks

### Hook: `useDisclosure`

**Scopo:**
Un custom hook per gestire in modo semplice e riutilizzabile lo stato di apertura/chiusura di componenti come `Modal`, `Accordion`, `Drawer`, etc.

**Valori di Ritorno:**

| Nome       | Tipo   | Descrizione                                         |
| ---------- | ------ | --------------------------------------------------- |
| `isOpen`   | `bool` | Lo stato corrente (aperto/chiuso).                  |
| `onOpen`   | `func` | Funzione per impostare lo stato a `true` (aperto).  |
| `onClose`  | `func` | Funzione per impostare lo stato a `false` (chiuso). |
| `onToggle` | `func` | Funzione per invertire lo stato corrente.           |

**Esempio di Utilizzo:**

```jsx
import useDisclosure from "./useDisclosure";

const MyComponent = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Button onClick={onOpen}>Apri</Button>
      <Modal isOpen={isOpen} onClose={onClose}>
        Contenuto...
      </Modal>
    </>
  );
};
```
