import "server-only";

import { serverFeatureFlags } from "@/lib/flags";

export const GROWTH_CAPABILITIES = [
  "deepSaju",
  "deepCompatibility",
  "deepTarot",
  "typeCareer",
  "referrals",
  "gifts",
  "pricingExperiments",
  "marketingRetention",
  "supportCases",
] as const;

export type GrowthCapability = (typeof GROWTH_CAPABILITIES)[number];
export type GrowthGateReason = "feature_disabled" | "policy_approval_required" | "policy_version_required" | "enabled";

type GrowthGateConfig = Readonly<{
  featureFlag: GrowthCapability;
  approvalEnvironmentVariable: string;
  policyVersionEnvironmentVariable?: string;
}>;

const GROWTH_GATES: Readonly<Record<GrowthCapability, GrowthGateConfig>> = Object.freeze({
  deepSaju: { featureFlag: "deepSaju", approvalEnvironmentVariable: "DEEP_SAJU_PRODUCT_APPROVED" },
  deepCompatibility: {
    featureFlag: "deepCompatibility",
    approvalEnvironmentVariable: "DEEP_COMPATIBILITY_PRODUCT_APPROVED",
  },
  deepTarot: { featureFlag: "deepTarot", approvalEnvironmentVariable: "DEEP_TAROT_PRODUCT_APPROVED" },
  typeCareer: { featureFlag: "typeCareer", approvalEnvironmentVariable: "TYPE_CAREER_PRODUCT_APPROVED" },
  referrals: { featureFlag: "referrals", approvalEnvironmentVariable: "REFERRAL_POLICY_APPROVED" },
  gifts: { featureFlag: "gifts", approvalEnvironmentVariable: "GIFT_POLICY_APPROVED" },
  pricingExperiments: {
    featureFlag: "pricingExperiments",
    approvalEnvironmentVariable: "PRICING_EXPERIMENTS_POLICY_APPROVED",
  },
  marketingRetention: {
    featureFlag: "marketingRetention",
    approvalEnvironmentVariable: "MARKETING_RETENTION_POLICY_APPROVED",
    policyVersionEnvironmentVariable: "MARKETING_RETENTION_POLICY_VERSION",
  },
  supportCases: { featureFlag: "supportCases", approvalEnvironmentVariable: "SUPPORT_CASES_POLICY_APPROVED" },
});

function isPolicyVersion(value: string | undefined): value is string {
  return value !== undefined && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/u.test(value);
}

export function getGrowthGateStatus(capability: GrowthCapability): Readonly<{
  enabled: boolean;
  reason: GrowthGateReason;
}> {
  const gate = GROWTH_GATES[capability];
  if (!serverFeatureFlags[gate.featureFlag]) return { enabled: false, reason: "feature_disabled" };
  if (process.env[gate.approvalEnvironmentVariable] !== "true") {
    return { enabled: false, reason: "policy_approval_required" };
  }
  if (
    gate.policyVersionEnvironmentVariable &&
    !isPolicyVersion(process.env[gate.policyVersionEnvironmentVariable])
  ) {
    return { enabled: false, reason: "policy_version_required" };
  }
  return { enabled: true, reason: "enabled" };
}

export function isGrowthCapabilityEnabled(capability: GrowthCapability): boolean {
  return getGrowthGateStatus(capability).enabled;
}

export function getApprovedMarketingPolicyVersion(): string | null {
  if (!isGrowthCapabilityEnabled("marketingRetention")) return null;
  const version = process.env.MARKETING_RETENTION_POLICY_VERSION;
  return isPolicyVersion(version) ? version : null;
}
