import Link from "next/link";

import { getSiteUrl } from "@/lib/siteUrl";
import { JsonLd, type JsonLdValue } from "./JsonLd";

/**
 * 빵부스러기 내비게이션.
 *
 * 화면에 보이는 목록과 BreadcrumbList 구조화 데이터를 **같은 배열 하나**에서 만든다 —
 * 둘을 따로 적어 두면 반드시 어긋나고, 보이지 않는 것을 구조화 데이터에 넣는 것은
 * 구글 정책 위반이다.
 *
 * 마지막 항목은 현재 페이지라 링크를 걸지 않고 aria-current로만 표시한다.
 */
export interface BreadcrumbItem {
  /** 현재 페이지(마지막 항목)는 href를 비운다. */
  readonly href?: string;
  readonly label: string;
}

export function Breadcrumbs({
  items,
  label,
}: {
  readonly items: readonly BreadcrumbItem[];
  /** nav 요소의 접근성 이름. 화면에는 보이지 않는다. */
  readonly label: string;
}) {
  if (items.length === 0) return null;

  const siteUrl = getSiteUrl();
  const structuredData: Record<string, JsonLdValue> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      // 현재 페이지 항목은 item을 비워 둔다 — 스펙이 허용하는 형태다.
      item: item.href === undefined ? undefined : new URL(item.href, siteUrl).toString(),
    })),
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <nav aria-label={label} className="no-print pt-5">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] text-hobun-faint">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex items-center gap-x-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.href === undefined ? (
                <span aria-current="page" className="text-hobun-dim">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="underline underline-offset-4 hover:text-hobun">
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
