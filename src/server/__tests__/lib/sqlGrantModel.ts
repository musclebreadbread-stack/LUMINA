/**
 * A small, deliberately pragmatic parser for the `grant`/`revoke` statements that
 * appear in `neon/migrations/*.sql`. It is not a general SQL parser — it only
 * understands the handful of statement shapes this repository actually writes
 * (verified by `grep -n -iE "^\s*(grant|revoke)\b" neon/migrations/*.sql`):
 *
 *   grant <priv[, priv(cols)...]> on <table[, table...]> to <role[, role...]>;
 *   grant <priv...> on table <table[, table...]> to <role...>;
 *   grant <priv...> on all tables in schema <schema[, schema...]> to <role...>;
 *   grant usage on schema <schema[, schema...]> to <role...>;
 *   grant execute on function <name(args)> to <role...>;
 *   revoke <same shapes> from <role...>;
 *
 * Every real statement in this codebase starts flush at the beginning of a
 * line (`^(grant|revoke)\b`), which lets us safely ignore the keyword
 * appearing inside `execute format('revoke ...')` or `raise exception '... revoke ...'`
 * strings elsewhere in the migrations — those never start a line.
 */

export type ColumnGrant = "*" | ReadonlySet<string>;

export interface GrantModel {
  /** role -> schema -> has "all tables in schema <schema>" (any action, any column) */
  readonly wildcardSchemas: Map<string, Set<string>>;
  /** role -> "schema.table" -> action -> allowed columns ("*" = every column) */
  readonly tableGrants: Map<string, Map<string, Map<string, ColumnGrant>>>;
}

export function createEmptyGrantModel(): GrantModel {
  return { wildcardSchemas: new Map(), tableGrants: new Map() };
}

function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    if (char === separator && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

function normalizeIdentifier(raw: string): string {
  return raw.trim().replace(/"/gu, "").toLowerCase();
}

interface ParsedPrivilege {
  readonly action: string;
  readonly columns: readonly string[] | null;
}

function parsePrivileges(segment: string): ParsedPrivilege[] {
  // "all privileges" is a synonym for "all" (Postgres accepts either spelling).
  const normalized = segment.replace(/\ball\s+privileges\b/giu, "all");
  return splitTopLevel(normalized, ",").map((chunk) => {
    const match = /^([a-zA-Z]+)\s*(?:\(([^)]*)\))?$/u.exec(chunk.trim());
    if (!match?.[1]) throw new Error(`Unrecognized privilege clause: "${chunk}"`);
    const [, action, columnList] = match;
    return {
      action: action.toLowerCase(),
      columns: columnList ? splitTopLevel(columnList, ",").map((c) => normalizeIdentifier(c)) : null,
    };
  });
}

type ParsedTarget =
  | { readonly kind: "allTablesInSchema"; readonly schemas: readonly string[] }
  | { readonly kind: "schema"; readonly schemas: readonly string[] }
  | { readonly kind: "function" }
  | { readonly kind: "tables"; readonly tables: readonly string[] };

function parseTarget(segment: string): ParsedTarget {
  const trimmed = segment.trim();
  if (/^all\s+tables\s+in\s+schema\b/iu.test(trimmed)) {
    const rest = trimmed.replace(/^all\s+tables\s+in\s+schema\b/iu, "");
    return { kind: "allTablesInSchema", schemas: splitTopLevel(rest, ",").map(normalizeIdentifier) };
  }
  if (/^schema\b/iu.test(trimmed)) {
    const rest = trimmed.replace(/^schema\b/iu, "");
    return { kind: "schema", schemas: splitTopLevel(rest, ",").map(normalizeIdentifier) };
  }
  if (/^function\b/iu.test(trimmed)) return { kind: "function" };
  const withoutTableKeyword = trimmed.replace(/^table\b/iu, "");
  return { kind: "tables", tables: splitTopLevel(withoutTableKeyword, ",").map(normalizeIdentifier) };
}

function tableGrantsFor(model: GrantModel, role: string): Map<string, Map<string, ColumnGrant>> {
  let byTable = model.tableGrants.get(role);
  if (!byTable) {
    byTable = new Map();
    model.tableGrants.set(role, byTable);
  }
  return byTable;
}

function applyGrant(model: GrantModel, role: string, target: ParsedTarget, privileges: readonly ParsedPrivilege[]): void {
  if (target.kind === "schema" || target.kind === "function") return; // not column-relevant
  if (target.kind === "allTablesInSchema") {
    let schemas = model.wildcardSchemas.get(role);
    if (!schemas) {
      schemas = new Set();
      model.wildcardSchemas.set(role, schemas);
    }
    for (const schema of target.schemas) schemas.add(schema);
    return;
  }
  const byTable = tableGrantsFor(model, role);
  for (const table of target.tables) {
    let byAction = byTable.get(table);
    if (!byAction) {
      byAction = new Map();
      byTable.set(table, byAction);
    }
    for (const privilege of privileges) {
      if (privilege.action === "all") {
        for (const action of ["select", "insert", "update", "delete"]) byAction.set(action, "*");
        continue;
      }
      const incoming: ColumnGrant = privilege.columns === null ? "*" : new Set(privilege.columns);
      const existing = byAction.get(privilege.action);
      if (incoming === "*" || existing === "*") {
        byAction.set(privilege.action, "*");
      } else if (existing) {
        byAction.set(privilege.action, new Set([...existing, ...incoming]));
      } else {
        byAction.set(privilege.action, incoming);
      }
    }
  }
}

function applyRevoke(model: GrantModel, role: string, target: ParsedTarget, privileges: readonly ParsedPrivilege[]): void {
  if (target.kind === "schema" || target.kind === "function") return;
  if (target.kind === "allTablesInSchema") {
    model.wildcardSchemas.get(role)?.clear();
    const byTable = model.tableGrants.get(role);
    if (byTable) {
      for (const schema of target.schemas) {
        for (const table of [...byTable.keys()]) {
          if (table.startsWith(`${schema}.`)) byTable.delete(table);
        }
      }
    }
    return;
  }
  const byTable = model.tableGrants.get(role);
  if (!byTable) return;
  for (const table of target.tables) {
    const byAction = byTable.get(table);
    if (!byAction) continue;
    for (const privilege of privileges) {
      if (privilege.action === "all") {
        byTable.delete(table);
        continue;
      }
      if (privilege.columns === null) {
        byAction.delete(privilege.action);
        continue;
      }
      const existing = byAction.get(privilege.action);
      if (existing instanceof Set) {
        for (const column of privilege.columns) existing.delete(column);
      }
      // Revoking specific columns from a "*" (whole-table) grant does not occur
      // in this codebase's migrations; left unhandled rather than guessed at.
    }
  }
}

/** One `grant`/`revoke` statement extracted from a migration file, flush at line-start. */
function extractStatements(sql: string): string[] {
  const statements: string[] = [];
  const startPattern = /^\s*(grant|revoke)\b/gimu;
  let match: RegExpExecArray | null;
  while ((match = startPattern.exec(sql))) {
    const semicolonIndex = sql.indexOf(";", match.index);
    if (semicolonIndex === -1) throw new Error(`Unterminated grant/revoke statement near index ${match.index}`);
    statements.push(sql.slice(match.index, semicolonIndex));
    startPattern.lastIndex = semicolonIndex;
  }
  return statements;
}

function applyStatement(model: GrantModel, rawStatement: string): void {
  const statement = rawStatement.replace(/\s+/gu, " ").trim();
  const verbMatch = /^(grant|revoke)\b/iu.exec(statement);
  if (!verbMatch?.[1]) throw new Error(`Statement does not start with grant/revoke: "${statement}"`);
  const verb = verbMatch[1].toLowerCase();
  const afterVerb = statement.slice(verbMatch[0].length);

  const onIndex = afterVerb.search(/\bon\b/iu);
  if (onIndex === -1) throw new Error(`Missing "on" clause: "${statement}"`);
  const privilegeSegment = afterVerb.slice(0, onIndex);
  const afterOn = afterVerb.slice(onIndex + 2);

  const roleKeyword = verb === "grant" ? /\bto\b/iu : /\bfrom\b/iu;
  const roleIndex = afterOn.search(roleKeyword);
  if (roleIndex === -1) throw new Error(`Missing "${verb === "grant" ? "to" : "from"}" clause: "${statement}"`);
  const targetSegment = afterOn.slice(0, roleIndex);
  const roleSegment = afterOn.slice(roleIndex + (verb === "grant" ? 2 : 4));

  const privileges = parsePrivileges(privilegeSegment);
  const target = parseTarget(targetSegment);
  const roles = splitTopLevel(roleSegment, ",").map(normalizeIdentifier);

  for (const role of roles) {
    if (verb === "grant") applyGrant(model, role, target, privileges);
    else applyRevoke(model, role, target, privileges);
  }
}

/** Parses every grant/revoke statement in `migrationSqlInOrder` and folds them into a model. */
export function buildGrantModel(migrationSqlInOrder: readonly string[]): GrantModel {
  const model = createEmptyGrantModel();
  for (const sql of migrationSqlInOrder) {
    for (const statement of extractStatements(sql)) applyStatement(model, statement);
  }
  return model;
}

/** Whether `role` may insert every column in `columns` into `schema.table`, per `model`. */
export function canInsertColumns(
  model: GrantModel,
  role: string,
  schemaTable: string,
  columns: readonly string[],
): { readonly allowed: boolean; readonly missingColumns: readonly string[] } {
  const schema = schemaTable.split(".")[0] ?? "";
  if (model.wildcardSchemas.get(role)?.has(schema)) return { allowed: true, missingColumns: [] };
  const grant = model.tableGrants.get(role)?.get(schemaTable)?.get("insert");
  if (grant === "*") return { allowed: true, missingColumns: [] };
  const granted = grant ?? new Set<string>();
  const missingColumns = columns.filter((c) => !granted.has(c.toLowerCase()));
  return { allowed: missingColumns.length === 0, missingColumns };
}
