import { useState, useCallback } from "react";
// renderHook e act sono globali, non serve importarli

// Definiamo un hook semplice direttamente nel file di test
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  return { count, increment, decrement };
}

describe("Step 3: Basic React Hooks", () => {
  test("should use useState and update with act", () => {
    const { result } = renderHook(() => useCounter(10));

    expect(result.current.count).toBe(10);

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(11);

    act(() => {
      result.current.decrement();
      result.current.decrement();
    });

    expect(result.current.count).toBe(9);
  });
});
