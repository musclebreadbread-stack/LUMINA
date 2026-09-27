"use client";

import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";

export const accountAuthClient = createAuthClient({
  basePath: "/api/account/auth",
  plugins: [emailOTPClient()],
});
