import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceWorkerRegistration as RegistrationComponent } from "../ServiceWorkerRegistration";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const register = vi.fn(async (...args: unknown[]) => {
  if (args.length === 0) throw new Error("Expected a script URL and options");
});

function restoreProperty(target: object, key: PropertyKey, descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) Object.defineProperty(target, key, descriptor);
  else Reflect.deleteProperty(target, key);
}

describe("ServiceWorkerRegistration", () => {
  let container: HTMLDivElement;
  let root: Root;
  let serviceWorkerDescriptor: PropertyDescriptor | undefined;
  let secureContextDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
    secureContextDescriptor = Object.getOwnPropertyDescriptor(window, "isSecureContext");
    register.mockClear();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    restoreProperty(navigator, "serviceWorker", serviceWorkerDescriptor);
    restoreProperty(window, "isSecureContext", secureContextDescriptor);
  });

  it("registers the service worker at the application root on a secure context", async () => {
    await act(async () => {
      root.render(<RegistrationComponent />);
    });

    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });

  it("does not register when the page is insecure or service workers are unavailable", async () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: false });
    await act(async () => {
      root.render(<RegistrationComponent />);
    });
    expect(register).not.toHaveBeenCalled();

    act(() => root.unmount());
    root = createRoot(container);
    Reflect.deleteProperty(navigator, "serviceWorker");
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    await act(async () => {
      root.render(<RegistrationComponent />);
    });
    expect(register).not.toHaveBeenCalled();
  });
});
