import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getAdminAccess } from "@/server/admin/authorization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AdminLoginPage() {
  const access = await getAdminAccess();
  if (access.status === "authorized") redirect("/admin/analytics");

  const t = await getTranslations("admin");
  return (
    <main className="mx-auto flex min-h-[calc(100vh-74px)] w-full max-w-xl items-center px-5 py-12 sm:px-8">
      <section className="w-full border border-ink-700 bg-ink-900/70 p-6 shadow-[0_28px_90px_-48px_rgba(0,0,0,0.95)] sm:p-9" aria-labelledby="admin-login-title">
        <p className="font-mono text-[11px] tracking-[0.2em] text-hobun-faint">LUMINA / ADMIN</p>
        <h1 id="admin-login-title" className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-hobun">{t("title")}</h1>
        <p className="mt-4 text-sm leading-relaxed text-hobun-dim">{t("accessNote")}</p>
        {access.status === "unavailable" && (
          <p className="mt-4 border border-amber-300/30 bg-amber-950/20 px-4 py-3 text-xs leading-relaxed text-amber-100">{t("setupNote")}</p>
        )}
        <div className="mt-8">
          <AdminLoginForm
            emailLabel={t("email")}
            passwordLabel={t("password")}
            submitLabel={t("submit")}
            pendingLabel={t("signingIn")}
            errorLabel={t("genericError")}
          />
        </div>
        <Link href="/" className="mt-6 inline-flex text-sm text-hobun-dim underline underline-offset-4 hover:text-hobun">{t("backHome")}</Link>
      </section>
    </main>
  );
}
