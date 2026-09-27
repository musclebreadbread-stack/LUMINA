import "server-only";

import { serverFeatureFlags } from "@/lib/flags";
import type { PaymentProvider } from "./providerTypes";
import { tossPaymentProvider } from "./toss";

export async function getPaymentProvider(): Promise<PaymentProvider> {
  const provider = process.env.BILLING_PROVIDER?.trim() || "toss";
  if (provider === "toss") return tossPaymentProvider;
  if (provider === "fake") {
    if (process.env.APP_ENV === "production") throw new Error("The fake payment provider is disabled in production");
    return (await import("./fake")).fakePaymentProvider;
  }
  if (provider === "lemonsqueezy" && !serverFeatureFlags.lemonSqueezy) {
    throw new Error("Lemon Squeezy is disabled until written approval is recorded");
  }
  throw new Error("The configured payment provider is unavailable");
}
