/**
 * Finds `insert into <schema.table> (<columns>)` calls in TypeScript source and
 * attributes each one to the database role that will actually execute it, based
 * on which `with*Transaction(...)` helper call textually encloses it.
 *
 * This is a paren-depth scan, not an AST parse: it treats every `(` / `)` in the
 * file (including inside template-literal SQL) as nesting depth. That is safe
 * here because both the TypeScript source and the embedded SQL always balance
 * their parentheses — SQL column lists, `values (...)`, and `now()` calls never
 * leave a paren open across statements.
 */

export const TRANSACTION_HELPER_ROLES: Readonly<Record<string, string>> = {
  withMemberTransaction: "lumina_member_app",
  withBillingTransaction: "lumina_billing_worker",
  withAITransaction: "lumina_ai_worker",
  withGrowthTransaction: "lumina_growth_worker",
};

export interface ScannedInsert {
  readonly role: string;
  readonly table: string;
  readonly columns: readonly string[];
  readonly index: number;
}

const HELPER_CALL_PATTERN = new RegExp(`\\b(${Object.keys(TRANSACTION_HELPER_ROLES).join("|")})\\s*\\(`, "gu");
const INSERT_INTO_PATTERN = /insert\s+into\s+([a-zA-Z_][\w]*\.[a-zA-Z_][\w"]*)(?:\s+as\s+\w+)?\s*\(([^)]*)\)/giu;

interface ActiveHelper {
  readonly role: string;
  /** Paren depth at which this helper call's own argument list is nested. */
  readonly depth: number;
}

/** Scans `source` and returns every insert found inside a tracked transaction helper. */
export function scanInsertsByRole(source: string): ScannedInsert[] {
  const helperStarts = new Map<number, string>(); // index of call's opening "(" -> role
  for (const match of source.matchAll(HELPER_CALL_PATTERN)) {
    const helperName = match[1];
    const role = helperName ? TRANSACTION_HELPER_ROLES[helperName] : undefined;
    if (!role) continue; // the pattern's one capture group always matches a known helper name
    const openParenIndex = match.index + match[0].length - 1;
    helperStarts.set(openParenIndex, role);
  }

  const stack: ActiveHelper[] = [];
  let depth = 0;
  const roleAtIndex: Array<string | null> = [];
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === "(") {
      depth += 1;
      const role = helperStarts.get(i);
      if (role) stack.push({ role, depth });
    } else if (char === ")") {
      const top = stack[stack.length - 1];
      if (top && top.depth === depth) stack.pop();
      depth -= 1;
    }
    const active = stack[stack.length - 1];
    roleAtIndex[i] = active ? active.role : null;
  }

  const results: ScannedInsert[] = [];
  for (const match of source.matchAll(INSERT_INTO_PATTERN)) {
    const role = roleAtIndex[match.index] ?? null;
    if (!role) continue; // not inside a tracked helper (e.g. a different pool/role); out of scope
    const [, tableName, columnList] = match;
    if (!tableName || columnList === undefined) continue; // both capture groups are required by the pattern
    const table = tableName.replace(/"/gu, "").toLowerCase();
    const columns = columnList
      .split(",")
      .map((c) => c.trim().replace(/"/gu, "").toLowerCase())
      .filter((c) => c.length > 0);
    results.push({ role, table, columns, index: match.index });
  }
  return results;
}
