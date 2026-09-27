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
const validBoolean = (value) => value === undefined || value === "" || value === "true" || value === "false";
const hasConfiguredValue = (name) => Boolean(process.env[name]?.trim());

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

const billingFeatureValue = process.env.FEATURE_BILLING;
if (!validBoolean(billingFeatureValue)) {
  issues.push("billing: FEATURE_BILLING must be unset, empty, true, or false");
} else if (billingFeatureValue === "true") {
  if (process.env.FEATURE_MEMBER_AUTH !== "true") {
    issues.push("billing: FEATURE_MEMBER_AUTH must be true before checkout can be enabled");
  }

  const memberAuthRequiredVariables = [
    "BETTER_AUTH_URL",
    "BETTER_AUTH_SECRET",
    "IDENTITY_DATABASE_URL",
    "MEMBER_DATABASE_URL",
    "RESEND_API_KEY",
    "AUTH_EMAIL_FROM",
    "MEMBER_AUTH_TURNSTILE_SECRET_KEY",
    "MEMBER_AUTH_TURNSTILE_SITE_KEY",
  ];
  for (const name of memberAuthRequiredVariables) {
    if (!hasConfiguredValue(name)) issues.push(`billing: ${name} must be configured for member checkout`);
  }
  if (process.env.MEMBER_LEGAL_DOCUMENTS_APPROVED !== "true") {
    issues.push("billing: MEMBER_LEGAL_DOCUMENTS_APPROVED must be true before member checkout");
  }
  if ((process.env.BETTER_AUTH_SECRET?.length ?? 0) < 32) {
    issues.push("billing: BETTER_AUTH_SECRET must contain at least 32 characters");
  }
  for (const name of ["MEMBER_TERMS_VERSION", "MEMBER_PRIVACY_VERSION", "MEMBER_TRANSFER_VERSION"]) {
    if (!validPolicyVersion.test(process.env[name] ?? "")) {
      issues.push(`billing: ${name} must use a valid approved policy version`);
    }
  }

  const authUrlValue = process.env.BETTER_AUTH_URL;
  if (authUrlValue) {
    try {
      const authUrl = new URL(authUrlValue);
      if (
        authUrl.username || authUrl.password || authUrl.search || authUrl.hash
        || (authUrl.pathname !== "/" && authUrl.pathname !== "")
        || authUrl.protocol !== "https:"
      ) {
        issues.push("billing: BETTER_AUTH_URL must be an HTTPS origin without a path or credentials");
      }
    } catch {
      issues.push("billing: BETTER_AUTH_URL must be an absolute HTTPS origin");
    }
  }
  for (const [idName, secretName] of [
    ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    ["KAKAO_CLIENT_ID", "KAKAO_CLIENT_SECRET"],
    ["APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET"],
  ]) {
    if (hasConfiguredValue(idName) !== hasConfiguredValue(secretName)) {
      issues.push(`billing: ${idName} and ${secretName} must be configured together`);
    }
  }
  if (process.env.AUTH_EMAIL_FROM && /[\r\n]/u.test(process.env.AUTH_EMAIL_FROM)) {
    issues.push("billing: AUTH_EMAIL_FROM must not contain line breaks");
  }

  const billingRequiredVariables = [
    "BILLING_DATABASE_URL",
    "TOSS_CLIENT_KEY",
    "TOSS_SECRET_KEY",
    "BILLING_ENCRYPTION_KEY",
    "BILLING_USER_REF_HMAC_KEY",
    "BILLING_TERMS_VERSION",
    "BILLING_WITHDRAWAL_NOTICE_VERSION",
  ];
  for (const name of billingRequiredVariables) {
    if (!hasConfiguredValue(name)) issues.push(`billing: ${name} must be configured`);
  }
  const expectedTossEnvironment = appEnvironment === "production" ? "live" : "test";
  if (
    hasConfiguredValue("TOSS_CLIENT_KEY")
    && !process.env.TOSS_CLIENT_KEY.startsWith(`${expectedTossEnvironment}_ck_`)
  ) {
    issues.push(`billing: TOSS_CLIENT_KEY must start with ${expectedTossEnvironment}_ck_ for ${appEnvironment}`);
  }
  if (
    hasConfiguredValue("TOSS_SECRET_KEY")
    && !process.env.TOSS_SECRET_KEY.startsWith(`${expectedTossEnvironment}_sk_`)
  ) {
    issues.push(`billing: TOSS_SECRET_KEY must start with ${expectedTossEnvironment}_sk_ for ${appEnvironment}`);
  }
  if (process.env.BILLING_LEGAL_DOCUMENTS_APPROVED !== "true") {
    issues.push("billing: BILLING_LEGAL_DOCUMENTS_APPROVED must be true before checkout can be enabled");
  }
  if (!/^[a-fA-F0-9]{64}$/u.test(process.env.BILLING_ENCRYPTION_KEY ?? "")) {
    issues.push("billing: BILLING_ENCRYPTION_KEY must be 64 hexadecimal characters");
  }
  const billingHmacKey = process.env.BILLING_USER_REF_HMAC_KEY ?? "";
  if (Buffer.byteLength(billingHmacKey, "utf8") < 32 || /[\r\n]/u.test(billingHmacKey)) {
    issues.push("billing: BILLING_USER_REF_HMAC_KEY must contain at least 32 bytes and no line breaks");
  }
  const encryptionKeyVersion = Number(process.env.BILLING_ENCRYPTION_KEY_VERSION ?? "1");
  if (!Number.isSafeInteger(encryptionKeyVersion) || encryptionKeyVersion < 1 || encryptionKeyVersion > 9999) {
    issues.push("billing: BILLING_ENCRYPTION_KEY_VERSION must be an integer from 1 to 9999");
  }
  for (const name of ["BILLING_TERMS_VERSION", "BILLING_WITHDRAWAL_NOTICE_VERSION"]) {
    const value = process.env[name]?.trim() ?? "";
    if (!value || value.length > 100 || /[\r\n]/u.test(value)) {
      issues.push(`billing: ${name} must be a non-empty document version no longer than 100 characters`);
    }
  }
} else if (appEnvironment === "production") {
  warnings.push("Production billing checkout is disabled; paid orders cannot be accepted.");
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
