import "@testing-library/jest-dom";

// Radix uses layout observers that jsdom does not implement.
class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', { value: TestResizeObserver, configurable: true });
Object.defineProperty(globalThis, 'ResizeObserver', { value: TestResizeObserver, configurable: true });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
