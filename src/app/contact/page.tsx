import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { InfoNav } from "@/components/ui/InfoNav";
import { buildAlternates } from "@/lib/seoAlternates";

/**
 * 문의 페이지.
 *
 * 공개 문의 이메일은 `NEXT_PUBLIC_CONTACT_EMAIL`로 주입한다 — 값이 없으면 주소를
 * 지어내지 않고 "준비 중"만 보여 주고 색인에서 뺀다. 눌러도 닿지 않는 연락처가
 * 검색 결과에 올라가는 편이 연락처가 없는 것보다 나쁘기 때문이다.
 */
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contactPage");
  return {
    title: t("title"),
    description: t("intro"),
    alternates: await buildAlternates("/contact"),
    ...(contactEmail ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function ContactPage() {
  const [t, tNav] = await Promise.all([getTranslations("contactPage"), getTranslations("nav")]);

  const footerLinks = [
    { href: "/about", label: tNav("about") },
    { href: "/privacy", label: tNav("privacy") },
    { href: "/terms", label: tNav("terms") },
  ] as const;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <InfoNav />
      <Breadcrumbs
        label={tNav("breadcrumb")}
        items={[{ href: "/", label: "LUMINA" }, { label: t("title") }]}
      />
      <div className="py-10">
        <p className="font-mono text-[13px] tracking-wide text-hobun-faint">{t("kicker")}</p>
        <h1 className="mt-4 text-[clamp(1.8rem,5vw,2.8rem)] leading-tight font-medium tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("intro")}</p>
      </div>

      <section className="border-t border-ink-700 pt-8">
        {contactEmail ? (
          <>
            <h2 className="text-lg font-medium text-hobun">{t("emailLabel")}</h2>
            <p className="mt-3">
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex min-h-11 items-center font-mono text-sm text-hobun underline underline-offset-4 hover:text-hobun-dim"
              >
                {contactEmail}
              </a>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-hobun-dim">{t("responseNote")}</p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-medium text-hobun">{t("unavailableTitle")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("unavailableBody")}</p>
          </>
        )}
      </section>

      <section className="mt-12 border-t border-ink-700 pt-8">
        <nav className="flex flex-wrap gap-2">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center border border-ink-700 px-3 text-[13px] text-hobun-dim transition-colors hover:border-ink-600 hover:text-hobun"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
