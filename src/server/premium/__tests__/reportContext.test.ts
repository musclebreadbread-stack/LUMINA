import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/server/billing/service", () => ({
  getOwnDirectEntitlementOrderId: vi.fn(),
  getOwnOrderProfileIds: vi.fn(),
}));

vi.mock("@/server/member/dal", () => ({
  getOwnProfile: vi.fn(),
  getOwnProfileById: vi.fn(),
}));

import { getOwnDirectEntitlementOrderId, getOwnOrderProfileIds } from "@/server/billing/service";
import { getOwnProfile, getOwnProfileById } from "@/server/member/dal";
import type { MemberProfile } from "@/server/member/profileSchema";
import { getOwnBoundProfile } from "../reportContext";

const getOwnDirectEntitlementOrderIdMock = vi.mocked(getOwnDirectEntitlementOrderId);
const getOwnOrderProfileIdsMock = vi.mocked(getOwnOrderProfileIds);
const getOwnProfileMock = vi.mocked(getOwnProfile);
const getOwnProfileByIdMock = vi.mocked(getOwnProfileById);

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const PROFILE_ID = "22222222-2222-4222-8222-222222222222";

const BOUND_PROFILE: MemberProfile = {
  year: 1990, month: 1, day: 1, calendar: "solar", isLeapMonth: false,
  hour: 12, minute: 0, gender: "unspecified", dayBoundaryRule: "midnight",
  placeLabel: "Seoul", placeLabelEn: "Seoul", lat: 37.5, lng: 127, timeZone: "Asia/Seoul",
};

const LIVE_PROFILE: MemberProfile = { ...BOUND_PROFILE, year: 1991, placeLabel: "Busan" };

afterEach(() => {
  vi.clearAllMocks();
});

describe("getOwnBoundProfile", () => {
  it("returns the profile bound to the order when a direct purchase and its snapshot both exist", async () => {
    getOwnDirectEntitlementOrderIdMock.mockResolvedValue(ORDER_ID);
    getOwnOrderProfileIdsMock.mockResolvedValue([PROFILE_ID]);
    getOwnProfileByIdMock.mockResolvedValue(BOUND_PROFILE);

    const result = await getOwnBoundProfile("saju-2027");

    expect(result).toEqual(BOUND_PROFILE);
    expect(getOwnProfileByIdMock).toHaveBeenCalledWith(PROFILE_ID);
    expect(getOwnProfileMock).not.toHaveBeenCalled();
  });

  it("falls back to the live profile when there is no direct entitlement (e.g. LUMINA+ subscription access)", async () => {
    getOwnDirectEntitlementOrderIdMock.mockResolvedValue(null);
    getOwnProfileMock.mockResolvedValue(LIVE_PROFILE);

    const result = await getOwnBoundProfile("saju-2027");

    expect(result).toEqual(LIVE_PROFILE);
    expect(getOwnOrderProfileIdsMock).not.toHaveBeenCalled();
  });

  it("falls back to the live profile when the order has no bound profile id (pre-B2 order)", async () => {
    getOwnDirectEntitlementOrderIdMock.mockResolvedValue(ORDER_ID);
    getOwnOrderProfileIdsMock.mockResolvedValue([]);
    getOwnProfileMock.mockResolvedValue(LIVE_PROFILE);

    const result = await getOwnBoundProfile("saju-2027");

    expect(result).toEqual(LIVE_PROFILE);
    expect(getOwnProfileByIdMock).not.toHaveBeenCalled();
  });

  it("falls back to the live profile when the bound snapshot itself was deleted", async () => {
    getOwnDirectEntitlementOrderIdMock.mockResolvedValue(ORDER_ID);
    getOwnOrderProfileIdsMock.mockResolvedValue([PROFILE_ID]);
    getOwnProfileByIdMock.mockResolvedValue(null);
    getOwnProfileMock.mockResolvedValue(LIVE_PROFILE);

    const result = await getOwnBoundProfile("saju-2027");

    expect(result).toEqual(LIVE_PROFILE);
  });

  it("returns null when there is no direct entitlement and no live profile either", async () => {
    getOwnDirectEntitlementOrderIdMock.mockResolvedValue(null);
    getOwnProfileMock.mockResolvedValue(null);

    const result = await getOwnBoundProfile("saju-2027");

    expect(result).toBeNull();
  });
});
