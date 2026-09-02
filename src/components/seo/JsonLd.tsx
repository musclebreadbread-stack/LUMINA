/**
 * 구조화 데이터(JSON-LD) 한 조각.
 *
 * 원칙: **화면에 실제로 보이는 것만 넣는다.** 페이지에 없는 FAQ·평점·저자를
 * 지어내 넣지 않는다 — 구조화 데이터와 본문이 어긋나면 구글 정책 위반이고,
 * 무엇보다 사용자가 검색 결과에서 본 것과 다른 페이지를 만나게 된다.
 *
 * "use client"를 붙이지 않는다 — 서버에서 그대로 직렬화해 내보내면 되고,
 * 클라이언트 번들에 넣을 이유가 없다.
 */

/**
 * JSON-LD로 직렬화 가능한 값. `any` 없이 재귀 구조를 표현한다.
 * `undefined`를 허용하는 이유는 JSON.stringify가 그 키를 통째로 빼기 때문이다 —
 * 조건부로 채우는 필드를 호출부에서 분기 없이 쓸 수 있다.
 */
export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly JsonLdValue[]
  | { readonly [key: string]: JsonLdValue };

export interface JsonLdProps {
  readonly data: Readonly<Record<string, JsonLdValue>>;
}

/**
 * `</script>`가 값 안에 들어오면 스크립트 블록이 조기에 닫힌다. `<`를 유니코드
 * 이스케이프로 바꿔 두면 JSON 의미는 그대로면서 HTML 파서가 오해하지 않는다.
 */
function serialize(data: Readonly<Record<string, JsonLdValue>>): string {
  return JSON.stringify(data).replace(/</gu, "\\u003c");
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // 값은 JSON.stringify를 거친 순수 데이터이고 `<`까지 이스케이프한다.
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}
