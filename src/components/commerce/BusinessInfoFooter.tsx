import type { ReactNode } from "react";

interface BusinessInfoFooterProps {
  readonly locale: string;
  readonly className?: string;
  readonly children?: ReactNode;
}

const LABELS = {
  ko: {
    name: "상호",
    representative: "대표자",
    registrationNumber: "사업자등록번호",
    mailOrderNumber: "통신판매업 신고번호",
    address: "주소",
    phone: "고객센터",
    email: "이메일",
    hostingProvider: "호스팅 제공자",
  },
  en: {
    name: "Business name",
    representative: "Representative",
    registrationNumber: "Business registration",
    mailOrderNumber: "Mail-order registration",
    address: "Address",
    phone: "Customer service",
    email: "Email",
    hostingProvider: "Hosting provider",
  },
} as const;

/*
 * 전자상거래법 사업자 표시 — 사이트 하단 판매자 정보. 한 항목이라도 비면 아무것도 그리지 않는다.
 * NEXT_PUBLIC_* 는 빌드 시점에 인라인되므로 반드시 문자 그대로 접근한다(동적 키 금지).
 */
export function BusinessInfoFooter({ locale, className, children }: BusinessInfoFooterProps) {
  const name = process.env.NEXT_PUBLIC_SELLER_NAME?.trim();
  const representative = process.env.NEXT_PUBLIC_SELLER_REPRESENTATIVE?.trim();
  const registrationNumber = process.env.NEXT_PUBLIC_SELLER_REGISTRATION_NUMBER?.trim();
  const mailOrderNumber = process.env.NEXT_PUBLIC_SELLER_MAIL_ORDER_NUMBER?.trim();
  const address = process.env.NEXT_PUBLIC_SELLER_ADDRESS?.trim();
  const phone = process.env.NEXT_PUBLIC_SELLER_PHONE?.trim();
  const email = process.env.NEXT_PUBLIC_SELLER_CONTACT_EMAIL?.trim();
  const hostingProvider = process.env.NEXT_PUBLIC_HOSTING_PROVIDER?.trim();
  if (
    !name || !representative || !registrationNumber || !mailOrderNumber
    || !address || !phone || !email || !hostingProvider
  ) {
    return null;
  }

  const label = locale === "ko" ? LABELS.ko : LABELS.en;
  return (
    <footer className={`mt-10 border-t border-ink-800 pt-5 text-xs leading-6 text-hobun-faint ${className ?? ""}`}>
      <p>
        {label.name} {name} · {label.representative} {representative} · {label.registrationNumber} {registrationNumber}
      </p>
      <p>{label.mailOrderNumber} {mailOrderNumber}</p>
      <p>{label.address} {address}</p>
      <p>
        {label.phone} {phone} · {label.email}{" "}
        <a href={`mailto:${email}`} className="underline underline-offset-4">{email}</a>
      </p>
      <p>{label.hostingProvider} {hostingProvider}</p>
      {children}
    </footer>
  );
}
