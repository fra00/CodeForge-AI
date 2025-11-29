/**
 * Definisce gli ambienti di programmazione disponibili e le regole associate.
 * Esportato per essere utilizzato sia dalla logica dello store che dall'interfaccia utente.
 */
export const ENVIRONMENTS = {
  web: {
    label: "Web (HTML/CSS/JS)",
    rules: `
# WEB DEVELOPMENT CONTEXT RULES
- You are an expert in modern web development (HTML, CSS, JavaScript/TypeScript, React).
- Assume a modern browser environment with support for ES6+ features.
- For styling, prefer Tailwind CSS if not specified otherwise.
    `,
  },
  csharp: {
    label: "C# (.NET)",
    rules: `
# C# CONTEXT RULES
- You are an expert in C# and the .NET ecosystem.
- Assume the use of modern C# features (C# 12).
- For projects, suggest standard structures using 'dotnet new'.
- Pay attention to memory management and async/await patterns.
    `,
  },
  arduino: {
    label: "Arduino (C/C++)",
    rules: `
# ARDUINO CONTEXT RULES
- You are an expert in C/C++ for embedded systems, specifically for the Arduino platform.
- Remember that memory (SRAM) and storage (Flash) are extremely limited. Write efficient code.
- Use 'Serial.println()' for debugging.
- Common libraries include Wire.h, SPI.h, etc.
    `,
  },
  esp32: {
    label: "ESP32 (Arduino Framework)",
    rules: `
# ESP32 (ARDUINO FRAMEWORK) CONTEXT RULES
- You are an expert in C/C++ for the ESP32 microcontroller, using the Arduino framework.
- The hardware is powerful: it has a dual-core processor, Wi-Fi, and Bluetooth built-in.
- **CRITICAL: Leverage FreeRTOS.** For concurrent tasks, create separate tasks using 'xTaskCreate' or 'xTaskCreatePinnedToCore'. The main loop() runs on core 1.
- For networking, use the standard ESP32 libraries like 'WiFi.h' and 'HTTPClient.h'.
- Be mindful of pin assignments. Many pins are configurable.
- Use 'Serial.println()' for debugging output.
- Memory is more abundant than on a classic Arduino, but still be efficient.
    `,
  },
  cpp: {
    label: "C++",
    rules: `
# C++ CONTEXT RULES
- You are an expert in modern C++ (C++17/C++20).
- Emphasize RAII, smart pointers (std::unique_ptr, std::shared_ptr) for memory management.
- Use the Standard Template Library (STL) extensively.
- For project structure, consider using CMake.
    `,
  },
  java: {
    label: "Java",
    rules: `
# JAVA CONTEXT RULES
- You are an expert in Java and the JVM ecosystem.
- Assume a recent LTS version of Java (e.g., Java 17 or 21).
- Use standard build tools like Maven or Gradle for project structure.
- Pay attention to Java conventions, exception handling, and common design patterns.
    `,
  },
  python: {
    label: "Python",
    rules: `
# PYTHON CONTEXT RULES
- You are an expert in Python 3.
- Follow PEP 8 style guidelines.
- Use virtual environments and 'pip' for dependency management.
- Be mindful of common libraries for tasks (e.g., requests for HTTP, pandas for data, Flask/Django for web).
    `,
  },
};