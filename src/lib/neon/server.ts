import "server-only";

import { neon } from "@neondatabase/serverless";

export type NeonSql = ReturnType<typeof neon>;

function requiredDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured");
  return value;
}

let pooledSql: NeonSql | null = null;

/** Server Component/Server Action에서만 사용하는 Neon pooled SQL 클라이언트. */
export function createNeonSql(): NeonSql {
  if (pooledSql === null) pooledSql = neon(requiredDatabaseUrl());
  return pooledSql;
}

export function isNeonRow(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function neonRows(value: unknown): readonly Readonly<Record<string, unknown>>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isNeonRow);
}

export function neonErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown Neon database error";
}

export function isNeonUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { readonly code?: unknown }).code;
  return code === "23505";
}
