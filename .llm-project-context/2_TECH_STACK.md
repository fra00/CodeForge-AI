# 2. Stack Tecnologico

## 🎯 Overview

- **Build Tool:** Vite
- **Framework:** React 18+ con JavaScript
- **UI Library:** Custom (componenti proprietari)
- **Backend:** Nessuno (Frontend only)

---

## Core Stack

### Vite

- **Versione:** Latest
- **Comandi:**
  - `npm run dev` - Dev server
  - `npm run build` - Build produzione
  - `npm run preview` - Preview build

### React + JavaScript

- **Versione:** React 18.3+
- **Pattern:** Solo componenti funzionali con hooks
- **Strict Mode:** Attivo

---

## State Management

### Zustand

- **Import:** `import { create } from 'zustand'`
- **Utilizzo:** Per stato globale dell'applicazione

```
export const useStore = create<StoreState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

---

## Data Fetching

### TanStack Query (React Query)

- **Import:** `import { useQuery, useMutation } from '@tanstack/react-query'`
- **Utilizzo:** Per tutte le chiamate API

```
const { data, isLoading } = useQuery({
  queryKey: ["users", userId],
  queryFn: () => fetchUser(userId),
});
```

---

## Form Management

### React Hook Form + Zod

- **Import:** `import { useForm } from 'react-hook-form'`
- **Validazione:** Usa sempre Zod con `zodResolver`

```
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

const { register, handleSubmit } = useForm({
  resolver: zodResolver(schema),
});
```

---

## Routing

### React Router v6

- **Import:** `import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'`
- **Pattern:** Routing dichiarativo con Routes/Route

---

## Styling

### CSS Modules

- **Pattern:** `ComponentName.module.css` per ogni componente
- **Import:** `import styles from './Component.module.css'`
- **Vietato:** Stili inline e classi globali

### Design Tokens

- Usa CSS custom properties per colori, spacing, typography
- Definiti in `:root` nel file globale `styles/tokens.css`

---

## Utility Libraries

### Date Management

- **Libreria:** `date-fns`
- **Import:** `import { format, parseISO } from 'date-fns'`

### HTTP Client

- **Libreria:** `axios`
- **Base URL:** Configurato in `src/lib/api.js`

### Icons

- **Libreria:** `lucide-react`
- **Import:** `import { Icon } from 'lucide-react'`

### Utilities

- **Libreria:** `lodash-es`
- **Import:** Named imports only (tree-shaking)

---

## Testing

### Unit & Integration

- **Framework:** Vitest
- **Library:** React Testing Library
- **Mocking:** MSW (Mock Service Worker)

### E2E

- **Framework:** Playwright

---

## Componenti UI Custom

### Struttura

```
src/components/
├── ui/          # Componenti base (Button, Input, Card...)
├── layout/      # Layout (Header, Sidebar, Footer...)
└── features/    # Componenti di dominio
```

### Convenzioni

- File: `ComponentName.jsx`
- Stili: `ComponentName.module.css`
- **Vietato:** File `.types.ts`. La validazione delle prop si fa con `PropTypes`.
- Export barrel: `index.ts` in ogni cartella

---

## Path Aliases

Configurati in `vite.config.ts` e `tsconfig.json`:

```
import { Button } from "@/components/ui";
import { useUserData } from "@hooks/useUserData";
import { User } from "@types/user";
```

---

## Environment Variables

- Prefisso obbligatorio: `VITE_`
- File: `.env` (locale), `.env.production` (prod)
- Accesso: `import.meta.env.VITE_VARIABILE`

---

## Build & Deploy

### Build

```bash
npm run build  # Output in /dist
```

### Deploy

- **Hosting:** Vercel / Netlify
- **Configurazione:** Automatica per Vite projects
