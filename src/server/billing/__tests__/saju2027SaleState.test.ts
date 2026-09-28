import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getSaju2027SaleState } from "../service";

beforeEach(() => {
  vi.stubEnv("BILLING_DATABASE_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSaju2027SaleState", () => {
  it("is hidden when SAJU_2027_SALE_STATE is unset", async () => {
    vi.stubEnv("SAJU_2027_SALE_STATE", "");
    expect(await getSaju2027SaleState()).toEqual({ status: "hidden" });
  });

  it("is hidden for an unrecognized SAJU_2027_SALE_STATE value", async () => {
    vi.stubEnv("SAJU_2027_SALE_STATE", "coming-soon");
    expect(await getSaju2027SaleState()).toEqual({ status: "hidden" });
  });

  it("stays hidden for 'preview' when billing storage isn't configured (no price to show)", async () => {
    vi.stubEnv("SAJU_2027_SALE_STATE", "preview");
    expect(await getSaju2027SaleState()).toEqual({ status: "hidden" });
  });

  it("stays hidden for 'live' when billing storage isn't configured", async () => {
    vi.stubEnv("SAJU_2027_SALE_STATE", "live");
    expect(await getSaju2027SaleState()).toEqual({ status: "hidden" });
  });
});
