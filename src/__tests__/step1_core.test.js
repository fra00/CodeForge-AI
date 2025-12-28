describe("Step 1: Core Runner Stability", () => {
  test("Primitive assertions", () => {
    expect(1 + 1).toBe(2);
    expect("hello").toBe("hello");
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
  });

  test("Object and Array assertions", () => {
    const obj = { a: 1, b: { c: 2 } };
    expect(obj).toEqual({ a: 1, b: { c: 2 } });
    expect(obj).not.toBe({ a: 1, b: { c: 2 } }); // Reference check

    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  test("Async/Await support", async () => {
    const asyncFn = () =>
      new Promise((resolve) => setTimeout(() => resolve("done"), 10));
    const result = await asyncFn();
    expect(result).toBe("done");
  });

  test("Error handling assertions", () => {
    const thrower = () => {
      throw new Error("Boom");
    };
    expect(thrower).toThrow();
    expect(thrower).toThrow("Boom");
  });
});
