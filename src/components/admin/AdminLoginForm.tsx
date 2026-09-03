"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signInAdmin, type AdminLoginState } from "@/app/admin/actions";

const INITIAL_STATE: AdminLoginState = { error: null };

function SubmitButton({ label, pendingLabel }: { readonly label: string; readonly pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full items-center justify-center bg-hobun px-5 py-3 text-sm font-semibold text-ink-950 transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function AdminLoginForm({
  emailLabel,
  passwordLabel,
  submitLabel,
  pendingLabel,
  errorLabel,
}: {
  readonly emailLabel: string;
  readonly passwordLabel: string;
  readonly submitLabel: string;
  readonly pendingLabel: string;
  readonly errorLabel: string;
}) {
  const [state, action] = useActionState(signInAdmin, INITIAL_STATE);

  return (
    <form action={action} className="space-y-5">
      <label className="block space-y-2">
        <span className="font-mono text-[11px] tracking-[0.14em] text-hobun-faint">{emailLabel}</span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          className="min-h-12 w-full border border-ink-600 bg-ink-900 px-4 text-sm text-hobun outline-none transition-colors placeholder:text-hobun-faint focus:border-hobun"
        />
      </label>
      <label className="block space-y-2">
        <span className="font-mono text-[11px] tracking-[0.14em] text-hobun-faint">{passwordLabel}</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          minLength={8}
          required
          className="min-h-12 w-full border border-ink-600 bg-ink-900 px-4 text-sm text-hobun outline-none transition-colors placeholder:text-hobun-faint focus:border-hobun"
        />
      </label>
      {state.error !== null && (
        <p role="alert" className="border border-red-400/40 bg-red-950/30 px-4 py-3 text-sm leading-relaxed text-red-100">
          {errorLabel}
        </p>
      )}
      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
