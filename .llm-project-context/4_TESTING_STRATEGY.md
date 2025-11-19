# Testing Strategy - Applicativo Web React

## Filosofia di Testing

Il nostro approccio al testing segue la piramide dei test: molti test unitari, un numero moderato di test di integrazione, e pochi test end-to-end. L'obiettivo è garantire qualità, manutenibilità e velocità di esecuzione.

---

## 1. Stack Tecnologico per i Test

### Testing Framework

- **Vitest**: Framework di testing veloce e moderno, compatibile con Vite
- **React Testing Library**: Per testare componenti React seguendo best practices
- **MSW (Mock Service Worker)**: Per mockare le chiamate API
- **Playwright**: Per test end-to-end

### Installazione

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D msw @playwright/test
```

---

## 2. Test Unitari

### Cosa Testare

- **Custom Hooks**: Tutta la logica di business estratta in hooks
- **Utility Functions**: Funzioni pure di manipolazione dati, validazione, formattazione
- **Store Zustand**: Azioni e selettori dello state management
- **Funzioni di validazione**: Schemi Zod e logiche custom

### Pattern da Seguire

#### Test di Custom Hook

```typescript
// useUserData.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useUserData } from "./useUserData";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useUserData", () => {
  it("deve recuperare i dati utente con successo", async () => {
    const { result } = renderHook(() => useUserData("user-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({
      id: "user-123",
      firstName: expect.any(String),
    });
  });

  it("deve gestire errori di rete", async () => {
    // Setup MSW per simulare errore
    const { result } = renderHook(() => useUserData("invalid-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

#### Test di Utility Function

```typescript
// formatCurrency.test.ts
import { formatCurrency } from "./formatCurrency";

describe("formatCurrency", () => {
  it("deve formattare correttamente i numeri in euro", () => {
    expect(formatCurrency(1234.56)).toBe("1.234,56 €");
  });

  it("deve gestire valori negativi", () => {
    expect(formatCurrency(-99.99)).toBe("-99,99 €");
  });

  it("deve arrotondare a due decimali", () => {
    expect(formatCurrency(10.999)).toBe("11,00 €");
  });
});
```

---

## 3. Test di Integrazione (Componenti React)

### Cosa Testare

- **Interazioni Utente**: Click, input, navigazione
- **Rendering Condizionale**: Mostri/nascondi elementi in base allo stato
- **Integrazione con Hook**: Il componente usa correttamente gli hook custom
- **Form Submission**: Validazione e invio dati

### Pattern da Seguire

#### Setup Globale (vitest.setup.ts)

```typescript
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll } from "vitest";
import { server } from "./mocks/server";

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
```

#### Test di Componente con Form

```typescript
// UserForm.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserForm } from "./UserForm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe("UserForm", () => {
  it("deve mostrare errori di validazione per campi obbligatori", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserForm />);

    const submitButton = screen.getByRole("button", { name: /invia/i });
    await user.click(submitButton);

    expect(
      await screen.findByText(/email è obbligatoria/i)
    ).toBeInTheDocument();
    expect(await screen.findByText(/nome è obbligatorio/i)).toBeInTheDocument();
  });

  it("deve inviare il form con dati validi", async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn();
    renderWithProviders(<UserForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/nome/i), "Mario");
    await user.type(screen.getByLabelText(/email/i), "mario@example.com");
    await user.click(screen.getByRole("button", { name: /invia/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        firstName: "Mario",
        email: "mario@example.com",
      });
    });
  });

  it("deve disabilitare il pulsante durante il submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserForm />);

    await user.type(screen.getByLabelText(/nome/i), "Mario");
    await user.type(screen.getByLabelText(/email/i), "mario@example.com");

    const submitButton = screen.getByRole("button", { name: /invia/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
  });
});
```

#### Test con MSW per Mock API

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) => {
    const { id } = params;

    return HttpResponse.json({
      id,
      firstName: "Mario",
      lastName: "Rossi",
      email: "mario@example.com",
      roles: ["editor"],
    });
  }),

  http.post("/api/users", async ({ request }) => {
    const newUser = await request.json();

    return HttpResponse.json(
      { ...newUser, id: "generated-id-123" },
      { status: 201 }
    );
  }),
];

// mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

---

## 4. Test End-to-End (E2E)

### Cosa Testare

- **User Flows Critici**: Registrazione, login, checkout
- **Funzionalità Business-Critical**: Pagamenti, export dati
- **Cross-browser Testing**: Safari, Chrome, Firefox

### Pattern da Seguire

#### Test Playwright

```typescript
// e2e/userRegistration.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Registrazione Utente", () => {
  test("deve permettere la registrazione di un nuovo utente", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.fill('input[name="firstName"]', "Maria");
    await page.fill('input[name="lastName"]', "Verdi");
    await page.fill('input[name="email"]', "maria@example.com");
    await page.fill('input[name="password"]', "SecurePass123!");

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("text=Benvenuta, Maria")).toBeVisible();
  });

  test("deve mostrare errore per email già esistente", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[name="email"]', "existing@example.com");
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Email già registrata")).toBeVisible();
  });
});
```

---

## 5. Coverage e Metriche

### Target di Coverage

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

### Configurazione Vitest per Coverage

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/setupTests.ts",
        "**/*.config.ts",
        "**/*.d.ts",
        "**/types/",
        "**/__mocks__/",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

---

## 6. Convenzioni e Best Practices

### Nomenclatura File di Test

- File di test nella stessa cartella del file sorgente
- Formato: `NomeFile.test.ts` o `NomeFile.test.tsx`
- Test E2E in cartella separata: `e2e/nomeTest.spec.ts`

### Struttura dei Test

```typescript
describe("NomeComponente/Funzione", () => {
  // Setup comune
  beforeEach(() => {
    // Inizializzazione
  });

  it("deve comportarsi in modo X quando Y", () => {
    // Arrange: Setup
    // Act: Esecuzione
    // Assert: Verifica
  });

  it("deve gestire il caso edge Z", () => {
    // Test case
  });
});
```

### Query Selector Priority (React Testing Library)

1. `getByRole` - Preferito (accessibilità)
2. `getByLabelText` - Per form fields
3. `getByPlaceholderText` - Alternativa per input
4. `getByText` - Per contenuto visibile
5. `getByTestId` - ULTIMO RESORT (solo se necessario)

### Cosa NON Testare

- Dettagli di implementazione (stato interno privato)
- Librerie di terze parti (sono già testate)
- CSS styling (usa visual regression testing se necessario)
- Semplici prop passing senza logica

---

## 7. CI/CD Integration

### Pipeline GitHub Actions

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Script Package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 8. Checklist Pre-Commit

Prima di ogni commit, assicurati che:

- [ ] Tutti i test passano: `npm run test:unit`
- [ ] Coverage non diminuisce
- [ ] Nuove feature hanno test corrispondenti
- [ ] Test E2E per flussi critici sono aggiornati
- [ ] Nessun `test.skip()` o `test.only()` rimasto nel codice

---

## 9. Risorse e Riferimenti

- [React Testing Library Docs](https://testing-library.com/react)
- [Vitest Documentation](https://vitest.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Kent C. Dodds - Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
