import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessInfoFooter } from "../BusinessInfoFooter";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ALL_ENV_VARS = Object.freeze({
  NEXT_PUBLIC_SELLER_NAME: "LUMINA Inc.",
  NEXT_PUBLIC_SELLER_REPRESENTATIVE: "Hong Gildong",
  NEXT_PUBLIC_SELLER_REGISTRATION_NUMBER: "123-45-67890",
  NEXT_PUBLIC_SELLER_PHONE: "02-0000-0000",
  NEXT_PUBLIC_SELLER_ADDRESS: "Seoul, Korea",
  NEXT_PUBLIC_SELLER_CONTACT_EMAIL: "hello@example.com",
  NEXT_PUBLIC_SELLER_MAIL_ORDER_REGISTRATION: "2026-서울강남-01234",
  NEXT_PUBLIC_HOSTING_PROVIDER: "Railway",
});

function stubAllEnvVars(): void {
  for (const [key, value] of Object.entries(ALL_ENV_VARS)) vi.stubEnv(key, value);
}

describe("BusinessInfoFooter", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllEnvs();
  });

  it.each(Object.keys(ALL_ENV_VARS))("renders nothing while %s is missing so partial seller data is never shown", (name) => {
    stubAllEnvVars();
    vi.stubEnv(name, " ");

    act(() => {
      root.render(<BusinessInfoFooter locale="ko" />);
    });

    expect(container.innerHTML).toBe("");
  });

  it("renders every field with Korean labels once all eight are configured", () => {
    stubAllEnvVars();

    act(() => {
      root.render(<BusinessInfoFooter locale="ko" />);
    });

    expect(container.textContent).toContain("상호 LUMINA Inc.");
    expect(container.textContent).toContain("대표자 Hong Gildong");
    expect(container.textContent).toContain("사업자등록번호 123-45-67890");
    expect(container.textContent).toContain("고객센터 02-0000-0000");
    expect(container.textContent).toContain("통신판매업 신고번호");
    expect(container.textContent).toContain("2026-서울강남-01234");
    expect(container.textContent).toContain("Seoul, Korea");
    expect(container.textContent).toContain("hello@example.com");
    expect(container.textContent).toContain("호스팅 제공자");
    expect(container.textContent).toContain("Railway");
  });

  it("renders English labels for a non-Korean locale", () => {
    stubAllEnvVars();

    act(() => {
      root.render(<BusinessInfoFooter locale="en" />);
    });

    expect(container.textContent).toContain("Mail-order sales registration");
    expect(container.textContent).toContain("Hosting provider");
  });

  it("renders children alongside the disclosure", () => {
    stubAllEnvVars();

    act(() => {
      root.render(<BusinessInfoFooter locale="ko"><p>extra notice</p></BusinessInfoFooter>);
    });

    expect(container.textContent).toContain("extra notice");
  });
});
