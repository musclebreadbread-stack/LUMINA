import type { ReactNode } from "react";
import type { Locale } from "@/i18n/locale";

interface BusinessInfoFooterProps {
  readonly locale: Locale;
  readonly children?: ReactNode;
}

/**
 * Korean e-commerce disclosure (전자상거래법 사업자정보 + 통신판매업 신고번호,
 * 정보통신망법 호스팅 제공자 표시). Renders nothing until every field is
 * configured — a half-complete legal disclosure is worse than none, and this
 * repo doesn't yet have a "preview" concept to show some fields but not others.
 * Mounted globally in the root layout (Track C6) rather than per page.
 */
export function BusinessInfoFooter({ locale, children }: BusinessInfoFooterProps) {
  const name = process.env.NEXT_PUBLIC_SELLER_NAME?.trim();
  const registrationNumber = process.env.NEXT_PUBLIC_SELLER_REGISTRATION_NUMBER?.trim();
  const address = process.env.NEXT_PUBLIC_SELLER_ADDRESS?.trim();
  const email = process.env.NEXT_PUBLIC_SELLER_CONTACT_EMAIL?.trim();
  const mailOrderRegistration = process.env.NEXT_PUBLIC_SELLER_MAIL_ORDER_REGISTRATION?.trim();
  const hostingProvider = process.env.NEXT_PUBLIC_HOSTING_PROVIDER?.trim();
  if (!name || !registrationNumber || !address || !email || !mailOrderRegistration || !hostingProvider) return null;

  const english = locale !== "ko";

  return (
    <footer className="mx-auto w-full max-w-4xl px-5 pb-10 sm:px-8">
      <div className="border-t border-ink-800 pt-5 text-xs leading-6 text-hobun-faint">
        <p>{name} · {registrationNumber}</p>
        <p>{english ? "Mail-order sales registration" : "통신판매업 신고번호"} {mailOrderRegistration}</p>
        <p>{address}</p>
        <p><a href={`mailto:${email}`} className="underline underline-offset-4">{email}</a></p>
        <p>{english ? "Hosting provider" : "호스팅 제공자"}: {hostingProvider}</p>
        {children}
      </div>
    </footer>
  );
}
