import type { ReactNode } from "react";
import type { Locale } from "@/i18n/locale";

interface BusinessInfoFooterProps {
  readonly locale: Locale;
  readonly children?: ReactNode;
}

const LABELS = {
  ko: {
    name: "상호",
    representative: "대표자",
    registrationNumber: "사업자등록번호",
    mailOrderRegistration: "통신판매업 신고번호",
    address: "주소",
    phone: "고객센터",
    email: "이메일",
    hostingProvider: "호스팅 제공자",
  },
  en: {
    name: "Business name",
    representative: "Representative",
    registrationNumber: "Business registration",
    mailOrderRegistration: "Mail-order sales registration",
    address: "Address",
    phone: "Customer service",
    email: "Email",
    hostingProvider: "Hosting provider",
  },
} as const;

/**
 * Korean e-commerce disclosure (전자상거래법 사업자정보 + 통신판매업 신고번호,
 * 정보통신망법 호스팅 제공자 표시). Renders nothing until every one of the eight
 * fields is configured — a half-complete legal disclosure is worse than none.
 * Mounted once, globally, in the root layout (Track C6) rather than per page.
 * NEXT_PUBLIC_* values are inlined at build time, so each one must be read with
 * a literal `process.env.NAME` access (no dynamic keys).
 */
export function BusinessInfoFooter({ locale, children }: BusinessInfoFooterProps) {
  const name = process.env.NEXT_PUBLIC_SELLER_NAME?.trim();
  const representative = process.env.NEXT_PUBLIC_SELLER_REPRESENTATIVE?.trim();
  const registrationNumber = process.env.NEXT_PUBLIC_SELLER_REGISTRATION_NUMBER?.trim();
  const mailOrderRegistration = process.env.NEXT_PUBLIC_SELLER_MAIL_ORDER_REGISTRATION?.trim();
  const address = process.env.NEXT_PUBLIC_SELLER_ADDRESS?.trim();
  const phone = process.env.NEXT_PUBLIC_SELLER_PHONE?.trim();
  const email = process.env.NEXT_PUBLIC_SELLER_CONTACT_EMAIL?.trim();
  const hostingProvider = process.env.NEXT_PUBLIC_HOSTING_PROVIDER?.trim();
  if (
    !name || !representative || !registrationNumber || !mailOrderRegistration
    || !address || !phone || !email || !hostingProvider
  ) {
    return null;
  }

  const label = locale === "ko" ? LABELS.ko : LABELS.en;
  return (
    <footer className="mx-auto w-full max-w-4xl px-5 pb-10 sm:px-8">
      <div className="border-t border-ink-800 pt-5 text-xs leading-6 text-hobun-faint">
        <p>
          {label.name} {name} · {label.representative} {representative} · {label.registrationNumber} {registrationNumber}
        </p>
        <p>{label.mailOrderRegistration} {mailOrderRegistration}</p>
        <p>{label.address} {address}</p>
        <p>
          {label.phone} {phone} · {label.email}{" "}
          <a href={`mailto:${email}`} className="underline underline-offset-4">{email}</a>
        </p>
        <p>{label.hostingProvider} {hostingProvider}</p>
        {children}
      </div>
    </footer>
  );
}
