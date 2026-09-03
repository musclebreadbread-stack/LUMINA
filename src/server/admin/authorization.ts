import "server-only";

import { getNeonAuth } from "@/lib/neon/auth";
import { createNeonSql, neonRows } from "@/lib/neon/server";
import type { AdminAccess } from "./analytics/types";

const ADMIN_ROLES = new Set(["viewer", "analyst", "owner"]);

function hasRuntimeAdminConfig(): boolean {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL &&
      process.env.NEON_AUTH_COOKIE_SECRET &&
      process.env.DATABASE_URL,
  );
}

function roleFromRow(row: Readonly<Record<string, unknown>> | undefined): AdminAccess["role"] {
  const value = row?.role;
  return typeof value === "string" && ADMIN_ROLES.has(value)
    ? (value as AdminAccess["role"])
    : null;
}

/**
 * Server-only authorization boundary for the operations console.
 * Neon Auth verifies the session; the RLS-bound membership query decides access.
 */
export async function getAdminAccess(): Promise<AdminAccess> {
  if (!hasRuntimeAdminConfig()) {
    return { status: "unavailable", role: null, userId: null };
  }

  let sessionResponse: Awaited<ReturnType<ReturnType<typeof getNeonAuth>["getSession"]>>;
  try {
    sessionResponse = await getNeonAuth().getSession();
  } catch {
    return { status: "unavailable", role: null, userId: null };
  }

  const user = sessionResponse.data?.user;
  if (!user || typeof user.id !== "string" || user.id.length === 0) {
    return { status: "unauthenticated", role: null, userId: null };
  }

  try {
    const sql = createNeonSql();
    const results = await sql.transaction([
      sql`select set_config('app.current_auth_user_id', ${user.id}, true)`,
      sql`
        select role
          from ops.admin_members
         where user_id = ${user.id}
           and active = true
         limit 1
      `,
    ]);
    const role = roleFromRow(neonRows(results[1])[0]);
    return role === null
      ? { status: "forbidden", role: null, userId: user.id }
      : { status: "authorized", role, userId: user.id };
  } catch {
    return { status: "unavailable", role: null, userId: null };
  }
}

export function canReadAnalytics(access: AdminAccess): boolean {
  return access.status === "authorized" && access.role !== null;
}
