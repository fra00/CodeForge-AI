describe("Step 2: Mocking System", () => {
  test("vi.fn() basic usage", () => {
    const mock = vi.fn();
    mock("hello");
    expect(mock).toHaveBeenCalled();
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith("hello");
  });

  test("vi.fn() return values", () => {
    const mock = vi.fn().mockReturnValue("default");
    expect(mock()).toBe("default");

    mock.mockReturnValueOnce("once");
    expect(mock()).toBe("once");
    expect(mock()).toBe("default");
  });

  test("vi.spyOn() usage", () => {
    const cart = {
      getTotal: () => 100,
    };

    const spy = vi.spyOn(cart, "getTotal");

    // Default behavior (calls original)
    expect(cart.getTotal()).toBe(100);
    expect(spy).toHaveBeenCalled();

    // Mock implementation
    spy.mockReturnValue(200);
    expect(cart.getTotal()).toBe(200);

    // Restore
    spy.mockRestore();
    expect(cart.getTotal()).toBe(100);
  });

  test("mock implementation", () => {
    const mock = vi.fn((x) => x * 2);
    expect(mock(2)).toBe(4);

    mock.mockImplementation((x) => x + 10);
    expect(mock(2)).toBe(12);
  });
});
