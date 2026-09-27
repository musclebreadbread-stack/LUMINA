const GROWTH_GATES = [
  {
    capability: "deepSaju",
    featureVariable: "FEATURE_DEEP_SAJU",
    approvalVariable: "DEEP_SAJU_PRODUCT_APPROVED",
  },
  {
    capability: "deepCompatibility",
    featureVariable: "FEATURE_DEEP_COMPATIBILITY",
    approvalVariable: "DEEP_COMPATIBILITY_PRODUCT_APPROVED",
  },
  {
    capability: "deepTarot",
    featureVariable: "FEATURE_DEEP_TAROT",
    approvalVariable: "DEEP_TAROT_PRODUCT_APPROVED",
  },
  {
    capability: "typeCareer",
    featureVariable: "FEATURE_TYPE_CAREER",
    approvalVariable: "TYPE_CAREER_PRODUCT_APPROVED",
  },
  {
    capability: "referrals",
    featureVariable: "FEATURE_REFERRALS",
    approvalVariable: "REFERRAL_POLICY_APPROVED",
  },
  {
    capability: "gifts",
    featureVariable: "FEATURE_GIFTS",
    approvalVariable: "GIFT_POLICY_APPROVED",
  },
  {
    capability: "pricingExperiments",
    featureVariable: "FEATURE_PRICING_EXPERIMENTS",
    approvalVariable: "PRICING_EXPERIMENTS_POLICY_APPROVED",
  },
  {
    capability: "marketingRetention",
    featureVariable: "FEATURE_MARKETING_RETENTION",
    approvalVariable: "MARKETING_RETENTION_POLICY_APPROVED",
    policyVersionVariable: "MARKETING_RETENTION_POLICY_VERSION",
  },
  {
    capability: "supportCases",
    featureVariable: "FEATURE_SUPPORT_CASES",
    approvalVariable: "SUPPORT_CASES_POLICY_APPROVED",
  },
];

const validPolicyVersion = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/u;
const issues = [];
const warnings = [];
const appEnvironment = process.env.APP_ENV;

if (appEnvironment !== "staging" && appEnvironment !== "production") {
  issues.push("APP_ENV must be staging or production");
}

const sentryEnabledValue = process.env.SENTRY_SERVER_ENABLED;
const sentryDsnConfigured = Boolean(process.env.SENTRY_DSN?.trim());
const sentryEnabledValueIsValid =
  sentryEnabledValue === undefined
  || sentryEnabledValue === ""
  || sentryEnabledValue === "true"
  || sentryEnabledValue === "false";

if (!sentryEnabledValueIsValid) {
  issues.push("SENTRY_SERVER_ENABLED must be unset, empty, true, or false");
} else if (sentryEnabledValue === "true" && !sentryDsnConfigured) {
  issues.push("SENTRY_SERVER_ENABLED=true requires SENTRY_DSN");
} else if (appEnvironment === "production" && sentryEnabledValue !== "true") {
  warnings.push("Production server-side Sentry reporting is disabled; this process will not send server errors to Sentry.");
}

for (const gate of GROWTH_GATES) {
  const featureValue = process.env[gate.featureVariable];
  const approvalValue = process.env[gate.approvalVariable];
  const validBoolean = (value) => value === undefined || value === "" || value === "true" || value === "false";

  if (!validBoolean(featureValue)) {
    issues.push(`${gate.capability}: ${gate.featureVariable} must be unset, empty, true, or false`);
  }
  if (!validBoolean(approvalValue)) {
    issues.push(`${gate.capability}: ${gate.approvalVariable} must be unset, empty, true, or false`);
  }
  if (featureValue === "true" && approvalValue !== "true") {
    issues.push(`${gate.capability}: feature enablement requires explicit policy approval`);
  }
  if (
    gate.policyVersionVariable !== undefined
    && featureValue === "true"
    && approvalValue === "true"
    && !validPolicyVersion.test(process.env[gate.policyVersionVariable] ?? "")
  ) {
    issues.push(`${gate.capability}: a valid approved policy version is required`);
  }
}

for (const warning of warnings) {
  console.log(JSON.stringify({
    level: "warn",
    message: `Railway preflight warning: ${warning}`,
    component: "railway-preflight",
    event: "warning",
  }));
}

if (issues.length > 0) {
  console.error("Railway preflight failed; environment values are omitted.");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Railway preflight passed for ${appEnvironment}; ${GROWTH_GATES.length} growth gates checked.`);
}
