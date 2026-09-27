import "server-only";

interface ServerFeatureFlags {
  readonly memberAuth: boolean;
  readonly billing: boolean;
  readonly aiNarrative: boolean;
  readonly lemonSqueezy: boolean;
  readonly luminaPlus: boolean;
  readonly deepSaju: boolean;
  readonly deepCompatibility: boolean;
  readonly deepTarot: boolean;
  readonly typeCareer: boolean;
  readonly referrals: boolean;
  readonly gifts: boolean;
  readonly pricingExperiments: boolean;
  readonly marketingRetention: boolean;
  readonly supportCases: boolean;
}

function isEnabled(value: string | undefined): boolean {
  return value === "true";
}

export const serverFeatureFlags: ServerFeatureFlags = Object.freeze({
  memberAuth: isEnabled(process.env.FEATURE_MEMBER_AUTH),
  billing: isEnabled(process.env.FEATURE_BILLING),
  aiNarrative: isEnabled(process.env.FEATURE_AI_NARRATIVE),
  lemonSqueezy: isEnabled(process.env.FEATURE_LS),
  luminaPlus: isEnabled(process.env.FEATURE_LUMINA_PLUS),
  deepSaju: isEnabled(process.env.FEATURE_DEEP_SAJU),
  deepCompatibility: isEnabled(process.env.FEATURE_DEEP_COMPATIBILITY),
  deepTarot: isEnabled(process.env.FEATURE_DEEP_TAROT),
  typeCareer: isEnabled(process.env.FEATURE_TYPE_CAREER),
  referrals: isEnabled(process.env.FEATURE_REFERRALS),
  gifts: isEnabled(process.env.FEATURE_GIFTS),
  pricingExperiments: isEnabled(process.env.FEATURE_PRICING_EXPERIMENTS),
  marketingRetention: isEnabled(process.env.FEATURE_MARKETING_RETENTION),
  supportCases: isEnabled(process.env.FEATURE_SUPPORT_CASES),
});
