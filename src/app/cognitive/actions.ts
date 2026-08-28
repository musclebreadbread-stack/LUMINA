"use server";

import type { RunSnapshot, SubmissionResult } from "@engine/cognitive-standardized/types";
import { parseResponseInput, parseStartRunInput, parseRunId } from "@/lib/cognitiveRunInput";
import {
  resumeCognitiveRun,
  startCognitiveRun,
  submitCognitiveResponse,
} from "@/server/cognitive/runs";

export async function startCognitiveRunAction(input: unknown): Promise<RunSnapshot> {
  return startCognitiveRun(parseStartRunInput(input));
}

export async function submitCognitiveResponseAction(input: unknown): Promise<SubmissionResult> {
  return submitCognitiveResponse(parseResponseInput(input));
}

export async function resumeCognitiveRunAction(input: unknown): Promise<RunSnapshot | null> {
  return resumeCognitiveRun(parseRunId(input));
}
