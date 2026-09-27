import type { StoredProfile } from "@/lib/profile";

export async function establishReportSession(
  payload:
    | Readonly<{ kind: "birth"; profile: StoredProfile }>
    | Readonly<{ kind: "compatibility"; first: StoredProfile; second: StoredProfile }>,
): Promise<boolean> {
  try {
    const response = await fetch("/api/report/profile-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}
