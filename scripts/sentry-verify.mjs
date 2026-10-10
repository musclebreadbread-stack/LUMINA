/*
 * Sentry 운영 알림 수신 확인용 합성 이벤트 1건을 보낸다. 사용자 데이터는 담지 않는다.
 * 사용: railway run --service web --environment production -- node scripts/sentry-verify.mjs --send
 * --send 없이 실행하면 설정만 검사하고 아무것도 보내지 않는다. DSN 값은 출력하지 않는다.
 */
const shouldSend = process.argv.includes("--send");
const unknownArguments = process.argv.slice(2).filter((argument) => argument !== "--send");
if (unknownArguments.length > 0) {
  console.error("Usage: node scripts/sentry-verify.mjs [--send]");
  process.exit(64);
}

const dsn = process.env.SENTRY_DSN?.trim();
const environment = process.env.APP_ENV?.trim();
const issues = [];
if (!dsn) {
  issues.push("SENTRY_DSN must be configured");
} else {
  try {
    const parsed = new URL(dsn);
    if (parsed.protocol !== "https:" || !parsed.username || parsed.pathname.length < 2) {
      issues.push("SENTRY_DSN must be an https DSN with a public key and project id");
    }
  } catch {
    issues.push("SENTRY_DSN must be a valid URL");
  }
}
if (environment !== "staging" && environment !== "production") {
  issues.push("APP_ENV must be staging or production");
}
if (process.env.SENTRY_SERVER_ENABLED !== "true") {
  issues.push("SENTRY_SERVER_ENABLED must be true so production errors are reported");
}

if (issues.length > 0) {
  console.error("Sentry verification failed; configuration values are omitted.");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

if (!shouldSend) {
  console.log(`Sentry configuration looks complete for ${environment}; rerun with --send to emit one synthetic event.`);
  process.exit(0);
}

// 일반 Node ESM import에는 captureMessage·flush가 노출되지 않아 CommonJS 진입점을 쓴다.
const { createRequire } = await import("node:module");
const Sentry = createRequire(import.meta.url)("@sentry/nextjs");
Sentry.init({ dsn, environment, sendDefaultPii: false, tracesSampleRate: 0, beforeBreadcrumb: () => null });
const verificationId = crypto.randomUUID();
const eventId = Sentry.captureMessage(`LUMINA Sentry delivery verification ${verificationId}`, {
  level: "error",
  tags: { lumina_verification: "true" },
});
const flushed = await Sentry.flush(10_000);
if (!flushed) {
  console.error("Sentry did not drain the event queue within 10 seconds.");
  process.exit(1);
}
// flush는 큐 비움만 보장하고 네트워크 도달을 보장하지 않는다. 도착은 Sentry 화면에서 확인한다.
console.log(JSON.stringify({ component: "sentry-verify", event: "submitted", environment, eventId, verificationId }));
console.log("Delivery is not confirmed yet: search Sentry for the verificationId and confirm the alert notification arrived.");
