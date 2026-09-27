import "server-only";

import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { hasValidMemberConsentGrant } from "./consentGrant";

const consentProtectedPaths = new Set([
  "/email-otp/send-verification-otp",
  "/sign-in/email-otp",
  "/sign-in/social",
]);

export const memberConsentGate = {
  id: "member-consent-gate",
  hooks: {
    before: [{
      matcher: (context) => typeof context.path === "string" && consentProtectedPaths.has(context.path),
      handler: createAuthMiddleware(async (context) => {
        if (!context.headers || !hasValidMemberConsentGrant(context.headers.get("cookie"))) {
          throw new APIError("BAD_REQUEST", { message: "required_consents_missing" });
        }
      }),
    }],
  },
} satisfies BetterAuthPlugin;
