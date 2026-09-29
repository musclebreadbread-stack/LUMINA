import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/billing/service", () => ({
  createPendingOrder: vi.fn(),
  BillingAccessError: class BillingAccessError extends Error {
    constructor(readonly reason: string) { super(reason); }
  },
  BillingInputError: class BillingInputError extends Error {
    constructor(readonly reason: string) { super(reason); }
  },
}));
vi.mock("@/server/member/dal", () => ({
  claimOwnLocalData: vi.fn(),
}));

import { BillingAccessError, BillingInputError, createPendingOrder } from "@/server/billing/service";
import { claimOwnLocalData } from "@/server/member/dal";
import { POST } from "./route";

const createPendingOrderMock = vi.mocked(createPendingOrder);
const claimOwnLocalDataMock = vi.mocked(claimOwnLocalData);

const SITE_ORIGIN = "https://lumina.jack.ai.kr";

const VALID_PROFILE = {
  year: 1990, month: 5, day: 14, calendar: "solar", isLeapMonth: false,
  hour: 10, minute: 30, gender: "unspecified", dayBoundaryRule: "zi23",
  placeLabel: "서울", placeLabelEn: "Seoul", lat: 37.5665, lng: 126.978, timeZone: "Asia/Seoul",
};

const VALID_BODY = {
  productKey: "saju-2027",
  locale: "ko",
  acceptedPurchaseTerms: true,
  acceptedWithdrawalNotice: true,
  acceptedEuWithdrawalWaiver: false,
};

const CREATED_ORDER = {
  orderId: "55555555-5555-4555-8555-555555555555",
  orderName: "2027 신년운세 리포트",
  amount: 9_900,
  currency: "KRW" as const,
  customerKey: "customer-key-01234567890123456789",
  clientKey: "client-key",
  successUrl: "https://lumina.jack.ai.kr/api/billing/toss/return",
  failUrl: "https://lumina.jack.ai.kr/api/billing/toss/fail",
};

function orderRequest(body: unknown, origin: string | null = SITE_ORIGIN): Request {
  return new Request(`${SITE_ORIGIN}/api/billing/orders`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_ORIGIN);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/billing/orders", () => {
  it("rejects a cross-origin request", async () => {
    const response = await POST(orderRequest(VALID_BODY, "https://evil.example"));
    expect(response.status).toBe(403);
    expect(createPendingOrderMock).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON content type", async () => {
    const request = new Request(`${SITE_ORIGIN}/api/billing/orders`, {
      method: "POST",
      headers: { origin: SITE_ORIGIN, "content-type": "text/plain" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(415);
  });

  it("rejects a malformed profileSnapshot", async () => {
    const response = await POST(orderRequest({ ...VALID_BODY, profileSnapshot: { year: "not-a-number" } }));
    expect(response.status).toBe(400);
    expect(createPendingOrderMock).not.toHaveBeenCalled();
  });

  it("creates an order without any profile fallback when it succeeds on the first try", async () => {
    createPendingOrderMock.mockResolvedValue(CREATED_ORDER);
    const response = await POST(orderRequest(VALID_BODY));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(CREATED_ORDER);
    expect(claimOwnLocalDataMock).not.toHaveBeenCalled();
    expect(createPendingOrderMock).toHaveBeenCalledTimes(1);
  });

  it("returns profile_required with no retry when no profileSnapshot was sent", async () => {
    createPendingOrderMock.mockRejectedValue(new BillingInputError("profile_required"));
    const response = await POST(orderRequest(VALID_BODY));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "profile_required" });
    expect(claimOwnLocalDataMock).not.toHaveBeenCalled();
    expect(createPendingOrderMock).toHaveBeenCalledTimes(1);
  });

  it("claims the local profile and retries once when profile_required is returned with a profileSnapshot", async () => {
    createPendingOrderMock
      .mockRejectedValueOnce(new BillingInputError("profile_required"))
      .mockResolvedValueOnce(CREATED_ORDER);
    claimOwnLocalDataMock.mockResolvedValue({ profileSaved: true, snapshotsSaved: 0 });

    const response = await POST(orderRequest({ ...VALID_BODY, profileSnapshot: VALID_PROFILE }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(CREATED_ORDER);
    expect(claimOwnLocalDataMock).toHaveBeenCalledWith(VALID_PROFILE, []);
    expect(createPendingOrderMock).toHaveBeenCalledTimes(2);
  });

  it("propagates the original error when the retry after claiming a profile still fails", async () => {
    createPendingOrderMock.mockRejectedValue(new BillingInputError("profile_required"));
    claimOwnLocalDataMock.mockResolvedValue({ profileSaved: true, snapshotsSaved: 0 });

    const response = await POST(orderRequest({ ...VALID_BODY, profileSnapshot: VALID_PROFILE }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "profile_required" });
    expect(createPendingOrderMock).toHaveBeenCalledTimes(2);
  });

  it("re-sanitizes attribution on the server instead of trusting the client's values", async () => {
    createPendingOrderMock.mockResolvedValue(CREATED_ORDER);
    const response = await POST(orderRequest({
      ...VALID_BODY,
      attribution: {
        source: "Naver",
        medium: "person@example.com",
        campaign: null,
        landingPath: "/r/N4IgdghgtgpiBcIAuACAMgSwEZgDQBcB7ATwFsAaAQQ",
      },
    }));
    expect(response.status).toBe(200);
    expect(createPendingOrderMock).toHaveBeenCalledWith(expect.objectContaining({
      attribution: { source: "naver", medium: null, campaign: null, landingPath: "/r/[data]" },
    }));
  });

  it("passes no attribution when the client sent none", async () => {
    createPendingOrderMock.mockResolvedValue(CREATED_ORDER);
    await POST(orderRequest(VALID_BODY));
    expect(createPendingOrderMock).toHaveBeenCalledWith(expect.objectContaining({ attribution: null }));
  });

  it("rejects an attribution block with unexpected fields or a wrong shape", async () => {
    const extraField = await POST(orderRequest({
      ...VALID_BODY,
      attribution: { source: null, medium: null, campaign: null, landingPath: "/", email: "a@b.c" },
    }));
    expect(extraField.status).toBe(400);
    const wrongType = await POST(orderRequest({
      ...VALID_BODY,
      attribution: { source: 5, medium: null, campaign: null, landingPath: "/" },
    }));
    expect(wrongType.status).toBe(400);
    expect(createPendingOrderMock).not.toHaveBeenCalled();
  });

  it("maps an authentication error to 401 without attempting a profile fallback", async () => {
    createPendingOrderMock.mockRejectedValue(new BillingAccessError("authentication_required"));
    const response = await POST(orderRequest({ ...VALID_BODY, profileSnapshot: VALID_PROFILE }));
    expect(response.status).toBe(401);
    expect(claimOwnLocalDataMock).not.toHaveBeenCalled();
  });
});
