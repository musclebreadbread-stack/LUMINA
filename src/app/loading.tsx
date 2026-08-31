import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default function Loading() {
  return <LoadingContent />;
}

async function LoadingContent() {
  const t = await getTranslations("home");
  const links = [
    { href: "/saju", label: t("hubSajuTitle") },
    { href: "/tarot", label: t("hubTarotTitle") },
    { href: "/numerology", label: t("hubNumerologyTitle") },
    { href: "/psychometrics", label: t("hubPsychometricsTitle") },
    { href: "/horoscope", label: t("hubHoroscopeTitle") },
  ] as const;

  return (
    <main id="landing-fallback" className="lumina-fallback mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
      <div className="site-header border-b border-ink-700 py-5">
        <span className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</span>
      </div>
      <div className="py-16">
        <p className="font-mono text-sm tracking-[0.18em] text-hobun-faint">{t("platformEyebrow")}</p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2rem,6vw,4rem)] leading-tight font-medium tracking-tight text-hobun">
          {t("platformTitle1")}<br />{t("platformTitle2")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("platformBody")}</p>
        <nav className="mt-10" aria-label={t("hubHeading")}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="theme-control block border border-ink-700 bg-ink-850 px-4 py-4 text-sm text-hobun transition-colors hover:border-hobun focus-visible:border-hobun"
                >
                  {link.label} <span aria-hidden>↗</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
