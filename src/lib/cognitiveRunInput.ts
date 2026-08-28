import type { DeviceCapability, StartRunInput } from "@engine/cognitive-standardized/types";
import type { SubmitOwnedResponseInput } from "@/server/cognitive/repository";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/;
const RESERVED_OPTION_IDS = new Set(["hidden", "secret", "answer", "correct", "correctOptionId"]);

function recordOf(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("cognitive input must be an object");
  }
  return value as Readonly<Record<string, unknown>>;
}

function requiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value)) throw new TypeError(message);
  return value;
}

function uuid(value: unknown, name: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw new TypeError(`invalid ${name}`);
  return value;
}

function capability(value: unknown): DeviceCapability {
  const input = recordOf(value);
  const locale = input.locale;
  const device = input.device;
  if (locale !== "ko" && locale !== "en") throw new TypeError("invalid capability locale");
  if (device !== "desktop" && device !== "tablet" && device !== "mobile") throw new TypeError("invalid capability device");

  const booleans = ["keyboard", "pointer", "reducedMotion"] as const;
  for (const key of booleans) {
    if (typeof input[key] !== "boolean") throw new TypeError(`invalid capability ${key}`);
  }
  const dimensions = ["viewportWidth", "viewportHeight"] as const;
  for (const key of dimensions) {
    if (typeof input[key] !== "number" || !Number.isFinite(input[key]) || input[key] <= 0) {
      throw new TypeError(`invalid capability ${key}`);
    }
  }

  return {
    locale,
    device,
    keyboard: input.keyboard as boolean,
    pointer: input.pointer as boolean,
    viewportWidth: input.viewportWidth as number,
    viewportHeight: input.viewportHeight as number,
    reducedMotion: input.reducedMotion as boolean,
  };
}

export function parseStartRunInput(input: unknown): StartRunInput {
  const value = recordOf(input);
  const consent = recordOf(value.consent);
  if (consent.operationalStorage !== true) throw new TypeError("operational storage consent is required");
  if (typeof consent.researchParticipation !== "boolean") throw new TypeError("invalid research consent");
  const ageYears = value.ageYears;
  if (ageYears !== undefined && (typeof ageYears !== "number" || !Number.isInteger(ageYears) || ageYears < 18 || ageYears > 64)) {
    throw new TypeError("age must be an integer between 18 and 64");
  }

  return {
    consent: {
      operationalStorage: true,
      researchParticipation: consent.researchParticipation,
    },
    capability: capability(value.capability),
    ...(ageYears === undefined ? {} : { ageYears }),
  };
}

export function parseResponseInput(input: unknown): SubmitOwnedResponseInput {
  const value = recordOf(input);
  const runId = uuid(value.runId, "run id");
  const assignmentId = uuid(value.assignmentId, "assignment id");
  const optionId = requiredString(value.optionId, "invalid option id");
  if (RESERVED_OPTION_IDS.has(optionId)) throw new TypeError("invalid option id");

  const elapsedRaw = value.elapsedMs;
  let elapsedMs: number | null = null;
  if (elapsedRaw !== undefined && elapsedRaw !== null) {
    if (typeof elapsedRaw !== "number" || !Number.isSafeInteger(elapsedRaw) || elapsedRaw < 0) {
      throw new TypeError("invalid elapsed milliseconds");
    }
    elapsedMs = elapsedRaw;
  }

  return { runId, assignmentId, optionId, elapsedMs };
}

export function parseRunId(input: unknown): string {
  return uuid(input, "run id");
}
