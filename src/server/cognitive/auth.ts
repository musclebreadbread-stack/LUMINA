import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface CognitiveSubject {
  readonly id: string;
  readonly isAnonymous: boolean;
}

export class CognitiveAuthError extends Error {
  constructor(message = "cognitive authentication is required") {
    super(message);
    this.name = "CognitiveAuthError";
  }
}

/** 익명 또는 일반 authenticated 세션의 주체를 확인한다. */
export async function requireCognitiveSubject(): Promise<CognitiveSubject> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user === null) throw new CognitiveAuthError();

  return {
    id: data.user.id,
    isAnonymous: data.user.is_anonymous === true,
  };
}
