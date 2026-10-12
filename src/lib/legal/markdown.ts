/*
 * 법무 문서(이용약관·개인정보처리방침·환불 안내) 전용 마크다운 해석기.
 * 검토된 원문 .md를 그대로 화면에 옮기기 위해, 원문이 쓰는 문법만 지원한다:
 * # 제목 · ## 소제목 · 문단 · 번호 목록 · 글머리 목록 · 표 · **굵게** · \[ 이스케이프 · &#91; 숫자 엔티티.
 * 그 밖의 문법은 원문이 화면에 날것으로 노출되지 않도록 오류로 막는다.
 */

export type LegalInline = Readonly<{ kind: "text" | "strong"; text: string }>;
export type LegalInlines = readonly LegalInline[];

export type LegalBlock =
  | Readonly<{ kind: "heading"; inlines: LegalInlines }>
  | Readonly<{ kind: "paragraph"; inlines: LegalInlines }>
  | Readonly<{ kind: "orderedList"; start: number; items: readonly LegalInlines[] }>
  | Readonly<{ kind: "bulletList"; items: readonly LegalInlines[] }>
  | Readonly<{ kind: "table"; header: readonly LegalInlines[]; rows: readonly (readonly LegalInlines[])[] }>;

export type LegalDocumentModel = Readonly<{ title: string; blocks: readonly LegalBlock[] }>;

const ORDERED_ITEM = /^(\d+)\.\s+(.*)$/u;
const BULLET_ITEM = /^-\s+(.*)$/u;
const TABLE_SEPARATOR = /^\|(\s*:?-{3,}:?\s*\|)+$/u;

function unescapeText(value: string): string {
  return value
    .replace(/&#(\d+);/gu, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\\([!-/:-@[-`{-~])/gu, "$1");
}

export function parseInline(source: string): LegalInlines {
  const inlines: LegalInline[] = [];
  const pushText = (text: string) => {
    if (!text) return;
    const last = inlines.at(-1);
    if (last?.kind === "text") {
      inlines[inlines.length - 1] = { kind: "text", text: last.text + text };
    } else {
      inlines.push({ kind: "text", text });
    }
  };
  let rest = source;
  while (rest.length > 0) {
    const open = rest.indexOf("**");
    const close = open >= 0 ? rest.indexOf("**", open + 2) : -1;
    if (open < 0 || close < 0 || close === open + 2) {
      pushText(unescapeText(rest));
      break;
    }
    pushText(unescapeText(rest.slice(0, open)));
    inlines.push({ kind: "strong", text: unescapeText(rest.slice(open + 2, close)) });
    rest = rest.slice(close + 2);
  }
  return inlines;
}

function splitTableRow(line: string): string[] {
  return line.replace(/^\|/u, "").replace(/\|$/u, "").split("|").map((cell) => cell.trim());
}

function parseBlock(lines: readonly string[]): LegalBlock {
  const first = lines[0] ?? "";
  if (first.startsWith("## ") && lines.length === 1) {
    return { kind: "heading", inlines: parseInline(first.slice(3).trim()) };
  }
  if (first.startsWith("|")) {
    if (lines.length < 2 || !TABLE_SEPARATOR.test(lines[1] ?? "") || lines.some((line) => !line.startsWith("|"))) {
      throw new Error(`Unsupported table block: ${first}`);
    }
    const header = splitTableRow(first);
    const rows = lines.slice(2).map(splitTableRow);
    if (rows.some((row) => row.length !== header.length)) throw new Error(`Unsupported table shape: ${first}`);
    return { kind: "table", header: header.map(parseInline), rows: rows.map((row) => row.map(parseInline)) };
  }
  const ordered = lines.map((line) => ORDERED_ITEM.exec(line));
  if (ordered.every(Boolean)) {
    return {
      kind: "orderedList",
      start: Number(ordered[0]?.[1] ?? "1"),
      items: ordered.map((match) => parseInline(match?.[2] ?? "")),
    };
  }
  const bullets = lines.map((line) => BULLET_ITEM.exec(line));
  if (bullets.every(Boolean)) {
    return { kind: "bulletList", items: bullets.map((match) => parseInline(match?.[1] ?? "")) };
  }
  if (lines.length === 1 && !/^(#|>|```|\* |\+ )/u.test(first)) {
    return { kind: "paragraph", inlines: parseInline(first) };
  }
  throw new Error(`Unsupported legal markdown block: ${first}`);
}

export function parseLegalMarkdown(source: string): LegalDocumentModel {
  const groups: string[][] = [];
  let current: string[] = [];
  for (const raw of source.replace(/\r\n?/gu, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      if (current.length > 0) groups.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) groups.push(current);

  const [titleGroup, ...bodyGroups] = groups;
  const titleLine = titleGroup?.[0] ?? "";
  if (titleGroup?.length !== 1 || !titleLine.startsWith("# ")) {
    throw new Error("Legal document must start with a single # title line");
  }
  return { title: unescapeText(titleLine.slice(2).trim()), blocks: bodyGroups.map(parseBlock) };
}
