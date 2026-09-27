import type { ReactNode } from "react";

interface BusinessInfoFooterProps {
  readonly children?: ReactNode;
}

export function BusinessInfoFooter({ children }: BusinessInfoFooterProps) {
  const name = process.env.NEXT_PUBLIC_SELLER_NAME?.trim();
  const registrationNumber = process.env.NEXT_PUBLIC_SELLER_REGISTRATION_NUMBER?.trim();
  const address = process.env.NEXT_PUBLIC_SELLER_ADDRESS?.trim();
  const email = process.env.NEXT_PUBLIC_SELLER_CONTACT_EMAIL?.trim();
  if (!name || !registrationNumber || !address || !email) return null;

  return (
    <footer className="mt-10 border-t border-ink-800 pt-5 text-xs leading-6 text-hobun-faint">
      <p>{name} · {registrationNumber}</p>
      <p>{address}</p>
      <p><a href={`mailto:${email}`} className="underline underline-offset-4">{email}</a></p>
      {children}
    </footer>
  );
}
