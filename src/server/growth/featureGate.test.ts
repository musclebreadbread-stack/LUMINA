import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { GrowthCapability } from "./featureGate";

type GateEnvironment = Readonly<{
  capability: GrowthCapability;
  featureEnvironmentVariable: string;
  approvalEnvironmentVariable: string;
}>;

const GATE_ENVIRONMENTS = [
  {
    capability: "deepSaju",
    featureEnvironmentVariable: "FEATURE_DEEP_SAJU",
    approvalEnvironmentVariable: "DEEP_SAJU_PRODUCT_APPROVED",
  },
  {
    capability: "deepCompatibility",
    featureEnvironmentVariable: "FEATURE_DEEP_COMPATIBILITY",
    approvalEnvironmentVariable: "DEEP_COMPATIBILITY_PRODUCT_APPROVED",
  },
  {
    capability: "deepTarot",
    featureEnvironmentVariable: "FEATURE_DEEP_TAROT",
    approvalEnvironmentVariable: "DEEP_TAROT_PRODUCT_APPROVED",
  },
  {
    capability: "typeCareer",
    featureEnvironmentVariable: "FEATURE_TYPE_CAREER",
    approvalEnvironmentVariable: "TYPE_CAREER_PRODUCT_APPROVED",
  },
  {
    capability: "referrals",
    featureEnvironmentVariable: "FEATURE_REFERRALS",
    approvalEnvironmentVariable: "REFERRAL_POLICY_APPROVED",
  },
  {
    capability: "gifts",
    featureEnvironmentVariable: "FEATURE_GIFTS",
    approvalEnvironmentVariable: "GIFT_POLICY_APPROVED",
  },
  {
    capability: "pricingExperiments",
    featureEnvironmentVariable: "FEATURE_PRICING_EXPERIMENTS",
    approvalEnvironmentVariable: "PRICING_EXPERIMENTS_POLICY_APPROVED",
  },
  {
    capability: "marketingRetention",
    featureEnvironmentVariable: "FEATURE_MARKETING_RETENTION",
    approvalEnvironmentVariable: "MARKETING_RETENTION_POLICY_APPROVED",
  },
  {
    capability: "supportCases",
    featureEnvironmentVariable: "FEATURE_SUPPORT_CASES",
    approvalEnvironmentVariable: "SUPPORT_CASES_POLICY_APPROVED",
  },
] as const satisfies readonly GateEnvironment[];

type GateOverrides = Readonly<{
  feature?: string;
  approval?: string;
  policyVersion?: string;
}>;

async function loadFeatureGate(gate: GateEnvironment, overrides: GateOverrides = {}) {
  vi.resetModules();

  for (const environment of GATE_ENVIRONMENTS) {
    vi.stubEnv(environment.featureEnvironmentVariable, "false");
    vi.stubEnv(environment.approvalEnvironmentVariable, "false");
  }
  vi.stubEnv("MARKETING_RETENTION_POLICY_VERSION", "");
  vi.stubEnv(gate.featureEnvironmentVariable, overrides.feature ?? "false");
  vi.stubEnv(gate.approvalEnvironmentVariable, overrides.approval ?? "false");
  if (overrides.policyVersion !== undefined) {
    vi.stubEnv("MARKETING_RETENTION_POLICY_VERSION", overrides.policyVersion);
  }

  return import("./featureGate");
}

function runRailwayPreflight(overrides: Readonly<Record<string, string>> = {}) {
  const environment: NodeJS.ProcessEnv = { ...process.env, APP_ENV: "production" };
  for (const gate of GATE_ENVIRONMENTS) {
    environment[gate.featureEnvironmentVariable] = "false";
    environment[gate.approvalEnvironmentVariable] = "false";
  }
  environment.MARKETING_RETENTION_POLICY_VERSION = "";
  environment.SENTRY_SERVER_ENABLED = "false";
  environment.SENTRY_DSN = "";
  Object.assign(environment, overrides);

  return spawnSync(process.execPath, [resolve(process.cwd(), "scripts/railway-preflight.mjs")], {
    cwd: process.cwd(),
    env: environment,
    encoding: "utf8",
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Phase 9 growth feature gates", () => {
  it.each(GATE_ENVIRONMENTS)("keeps $capability disabled when its feature flag is off", async (gate) => {
    const featureGate = await loadFeatureGate(gate, { approval: "true" });

    expect(featureGate.getGrowthGateStatus(gate.capability)).toEqual({
      enabled: false,
      reason: "feature_disabled",
    });
  });

  it.each(GATE_ENVIRONMENTS)("requires approval before enabling $capability", async (gate) => {
    const featureGate = await loadFeatureGate(gate, { feature: "true" });

    expect(featureGate.getGrowthGateStatus(gate.capability)).toEqual({
      enabled: false,
      reason: "policy_approval_required",
    });
  });

  it.each(GATE_ENVIRONMENTS)("enables $capability only after both gates pass", async (gate) => {
    const overrides = gate.capability === "marketingRetention"
      ? { feature: "true", approval: "true", policyVersion: "2027-02-01" }
      : { feature: "true", approval: "true" };
    const featureGate = await loadFeatureGate(gate, overrides);

    expect(featureGate.getGrowthGateStatus(gate.capability)).toEqual({ enabled: true, reason: "enabled" });
    expect(featureGate.isGrowthCapabilityEnabled(gate.capability)).toBe(true);
  });

  it("requires a valid marketing policy version and exposes only the approved version", async () => {
    const marketingGate = GATE_ENVIRONMENTS.find((gate) => gate.capability === "marketingRetention");
    if (!marketingGate) throw new Error("Marketing retention gate is missing");

    const withoutVersion = await loadFeatureGate(marketingGate, { feature: "true", approval: "true" });
    expect(withoutVersion.getGrowthGateStatus("marketingRetention")).toEqual({
      enabled: false,
      reason: "policy_version_required",
    });
    expect(withoutVersion.getApprovedMarketingPolicyVersion()).toBeNull();

    const withInvalidVersion = await loadFeatureGate(marketingGate, {
      feature: "true",
      approval: "true",
      policyVersion: " contains spaces ",
    });
    expect(withInvalidVersion.getGrowthGateStatus("marketingRetention")).toEqual({
      enabled: false,
      reason: "policy_version_required",
    });

    const policyVersion = "2027-02-01-v1";
    const withValidVersion = await loadFeatureGate(marketingGate, {
      feature: "true",
      approval: "true",
      policyVersion,
    });
    expect(withValidVersion.getApprovedMarketingPolicyVersion()).toBe(policyVersion);
  });

  it.each(["staging", "production"] as const)("accepts a safe %s Railway configuration", (appEnvironment) => {
    const result = runRailwayPreflight({ APP_ENV: appEnvironment });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("9 growth gates checked");
  });

  it("allows policy approval to be present while its feature remains disabled", () => {
    const approvalsOnly = Object.fromEntries(GATE_ENVIRONMENTS.map((gate) => [gate.approvalEnvironmentVariable, "true"]));
    const result = runRailwayPreflight(approvalsOnly);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("9 growth gates checked");
  });

  it("warns about missing production Sentry reporting without blocking startup", () => {
    const result = runRailwayPreflight({
      APP_ENV: "production",
      SENTRY_SERVER_ENABLED: "false",
      SENTRY_DSN: "",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const warningLine = result.stdout.split(/\r?\n/u).find((line) => line.startsWith("{"));
    const warningLog: unknown = JSON.parse(warningLine ?? "null");
    expect(warningLog).toMatchObject({
      level: "warn",
      message: "Railway preflight warning: Production server-side Sentry reporting is disabled; this process will not send server errors to Sentry.",
      component: "railway-preflight",
      event: "warning",
    });
    expect(result.stdout).toContain("9 growth gates checked");
  });

  it("blocks an explicitly enabled Sentry integration when its DSN is missing", () => {
    const result = runRailwayPreflight({
      SENTRY_SERVER_ENABLED: "true",
      SENTRY_DSN: "",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("SENTRY_SERVER_ENABLED=true requires SENTRY_DSN");
  });

  it("blocks malformed Sentry enablement without echoing the configured DSN", () => {
    const dsn = "sentry-dsn-must-not-appear-in-output";
    const result = runRailwayPreflight({
      SENTRY_SERVER_ENABLED: "TRUE",
      SENTRY_DSN: dsn,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("SENTRY_SERVER_ENABLED must be unset, empty, true, or false");
    expect(result.stdout + result.stderr).not.toContain(dsn);
    expect(result.stdout).not.toContain("server errors to Sentry");
    expect(result.stdout).toContain("Production billing checkout is disabled");
  });

  it("keeps the Sentry warning accurate when another preflight check blocks startup", () => {
    const result = runRailwayPreflight({ FEATURE_DEEP_SAJU: "true" });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"level":"warn"');
    expect(result.stdout).toContain("this process will not send server errors to Sentry");
    expect(result.stdout).not.toContain("startup continues");
    expect(result.stderr).toContain("deepSaju: feature enablement requires explicit policy approval");
  });

  it("accepts configured server-side Sentry without printing the DSN", () => {
    const dsn = "sentry-dsn-must-not-appear-in-output";
    const result = runRailwayPreflight({
      SENTRY_SERVER_ENABLED: "true",
      SENTRY_DSN: dsn,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("9 growth gates checked");
    expect(result.stdout).not.toContain(dsn);
  });

  it.each(GATE_ENVIRONMENTS)("blocks deployment when $capability is enabled without approval", (gate) => {
    const result = runRailwayPreflight({
      [gate.featureEnvironmentVariable]: "true",
      [gate.approvalEnvironmentVariable]: "false",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(gate.capability);
    expect(result.stderr).not.toContain("process.env");
  });

  it("accepts enabled gates only with explicit approval and a versioned marketing policy", () => {
    const enabledGates = Object.fromEntries(GATE_ENVIRONMENTS.flatMap((gate) => [
      [gate.featureEnvironmentVariable, "true"],
      [gate.approvalEnvironmentVariable, "true"],
    ]));
    const result = runRailwayPreflight({
      ...enabledGates,
      MARKETING_RETENTION_POLICY_VERSION: "2027-02-01-v1",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("9 growth gates checked");
  });

  it("blocks malformed flag values, missing policy versions, and unsupported app environments", () => {
    const malformedFlag = runRailwayPreflight({
      APP_ENV: "production",
      FEATURE_DEEP_SAJU: "TRUE",
    });
    expect(malformedFlag.status).toBe(1);
    expect(malformedFlag.stderr).toContain("FEATURE_DEEP_SAJU");

    const unversionedMarketing = runRailwayPreflight({
      FEATURE_MARKETING_RETENTION: "true",
      MARKETING_RETENTION_POLICY_APPROVED: "true",
    });
    expect(unversionedMarketing.status).toBe(1);
    expect(unversionedMarketing.stderr).toContain("marketingRetention");

    const unsupportedEnvironment = runRailwayPreflight({ APP_ENV: "development" });
    expect(unsupportedEnvironment.status).toBe(1);
    expect(unsupportedEnvironment.stderr).toContain("APP_ENV must be staging or production");
  });
});
