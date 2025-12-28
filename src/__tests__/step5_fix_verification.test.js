import { useState } from "react";
import { renderHook } from "../testing/VitestCompatibleRunner";

describe("Step 5: Transformer Fix Verification", () => {
  test("should execute without syntax errors", () => {
    // Questo test serve a verificare che il codice generato dal TestTransformer
    // sia sintatticamente valido (nessun "Invalid or unexpected token").
    // Se la generazione degli alias usa caratteri di a capo non validi,
    // questo test fallirà prima ancora di arrivare qui.

    const { result } = renderHook(() => useState("success"));
    expect(result.current[0]).toBe("success");
  });
});
