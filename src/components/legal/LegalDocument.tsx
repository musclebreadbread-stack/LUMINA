import { parseLegalMarkdown, type LegalBlock, type LegalInlines } from "@/lib/legal/markdown";

interface LegalDocumentProps {
  readonly source: string;
  /** 비한국어 화면에서 한국어 원문이 기준임을 알리는 한 줄. 한국어 화면에서는 넘기지 않는다. */
  readonly notice?: string;
}

function Inlines({ inlines }: { readonly inlines: LegalInlines }) {
  return (
    <>
      {inlines.map((inline, index) =>
        inline.kind === "strong"
          ? <strong key={index} className="font-medium text-hobun">{inline.text}</strong>
          : <span key={index}>{inline.text}</span>,
      )}
    </>
  );
}

function Block({ block }: { readonly block: LegalBlock }) {
  switch (block.kind) {
    case "heading":
      return <h2 className="pt-6 text-base font-medium text-hobun"><Inlines inlines={block.inlines} /></h2>;
    case "paragraph":
      return <p><Inlines inlines={block.inlines} /></p>;
    case "orderedList":
      return (
        <ol start={block.start} className="list-decimal space-y-1.5 pl-5 marker:text-hobun-faint">
          {block.items.map((item, index) => <li key={index}><Inlines inlines={item} /></li>)}
        </ol>
      );
    case "bulletList":
      return (
        <ul className="list-disc space-y-1.5 pl-5 marker:text-hobun-faint">
          {block.items.map((item, index) => <li key={index}><Inlines inlines={item} /></li>)}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-[13px]">
            <thead>
              <tr>
                {block.header.map((cell, index) => (
                  <th key={index} scope="col" className="border-b border-ink-700 px-2 py-2 font-medium text-hobun">
                    <Inlines inlines={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-ink-800 px-2 py-2 align-top">
                      <Inlines inlines={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** 검토된 법무 원문(.md)을 문구 변경 없이 그대로 화면에 옮긴다. */
export function LegalDocument({ source, notice }: LegalDocumentProps) {
  const document = parseLegalMarkdown(source);
  return (
    <article lang="ko">
      <div className="py-10">
        <h1 className="text-[clamp(1.5rem,4.5vw,2rem)] leading-tight font-medium tracking-tight">{document.title}</h1>
        {notice ? <p className="mt-3 font-mono text-[13px] text-hobun-faint">{notice}</p> : null}
      </div>
      <div className="space-y-4 border-t border-ink-700 pt-4 text-sm leading-relaxed text-hobun-dim">
        {document.blocks.map((block, index) => <Block key={index} block={block} />)}
      </div>
    </article>
  );
}

export function legalDocumentTitle(source: string): string {
  return parseLegalMarkdown(source).title;
}
