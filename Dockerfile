FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable pnpm

FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack prepare pnpm@11.18.0 --activate \
    && pnpm install --frozen-lockfile

FROM base AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Railway passes service variables to Docker builds only when declared as ARG.
# Next.js inlines NEXT_PUBLIC_* at build time, so the seller footer needs these here.
ARG NEXT_PUBLIC_SELLER_NAME
ARG NEXT_PUBLIC_SELLER_REPRESENTATIVE
ARG NEXT_PUBLIC_SELLER_REGISTRATION_NUMBER
ARG NEXT_PUBLIC_SELLER_MAIL_ORDER_REGISTRATION
ARG NEXT_PUBLIC_SELLER_ADDRESS
ARG NEXT_PUBLIC_SELLER_PHONE
ARG NEXT_PUBLIC_SELLER_CONTACT_EMAIL
ARG NEXT_PUBLIC_HOSTING_PROVIDER
ENV NEXT_PUBLIC_SELLER_NAME=$NEXT_PUBLIC_SELLER_NAME \
    NEXT_PUBLIC_SELLER_REPRESENTATIVE=$NEXT_PUBLIC_SELLER_REPRESENTATIVE \
    NEXT_PUBLIC_SELLER_REGISTRATION_NUMBER=$NEXT_PUBLIC_SELLER_REGISTRATION_NUMBER \
    NEXT_PUBLIC_SELLER_MAIL_ORDER_REGISTRATION=$NEXT_PUBLIC_SELLER_MAIL_ORDER_REGISTRATION \
    NEXT_PUBLIC_SELLER_ADDRESS=$NEXT_PUBLIC_SELLER_ADDRESS \
    NEXT_PUBLIC_SELLER_PHONE=$NEXT_PUBLIC_SELLER_PHONE \
    NEXT_PUBLIC_SELLER_CONTACT_EMAIL=$NEXT_PUBLIC_SELLER_CONTACT_EMAIL \
    NEXT_PUBLIC_HOSTING_PROVIDER=$NEXT_PUBLIC_HOSTING_PROVIDER

# Every other NEXT_PUBLIC_* the app reads. Without these, prerendered routes
# (sitemap.xml, robots.txt) fall back to http://localhost:3000 and client bundles
# ship without the Umami, AdSense, Sentry and Kakao values even when Railway has them.
# scripts/test-railway-preflight.mjs fails when src/ reads a NEXT_PUBLIC_* missing here.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CONTACT_EMAIL
ARG NEXT_PUBLIC_ADSENSE_CLIENT
ARG NEXT_PUBLIC_ADSENSE_SLOT_ID
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_KAKAO_JS_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT \
    NEXT_PUBLIC_ADSENSE_SLOT_ID=$NEXT_PUBLIC_ADSENSE_SLOT_ID \
    NEXT_PUBLIC_UMAMI_SCRIPT_URL=$NEXT_PUBLIC_UMAMI_SCRIPT_URL \
    NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_KAKAO_JS_KEY=$NEXT_PUBLIC_KAKAO_JS_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# An ARG that Railway did not forward still becomes ENV X="" above, and Next.js
# inlines "" as a literal — which would turn today's working server-side runtime
# reads into empty strings. Unset empty NEXT_PUBLIC_* values so only provided
# values are inlined and everything else keeps reading process.env at runtime.
RUN for name in $(env | sed -n 's/^\(NEXT_PUBLIC_[A-Z0-9_]*\)=$/\1/p'); do unset "$name"; done \
    && pnpm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts/railway-*.mjs ./scripts/
COPY --from=builder --chown=nextjs:nodejs /app/scripts/lib/railway*.mjs ./scripts/lib/

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "service_name=\"${RAILWAY_SERVICE_NAME:-web}\"; case \"$service_name\" in cron-10min) exec node scripts/railway-10min-jobs.mjs ;; cron-daily) exec node scripts/railway-daily-jobs.mjs ;; web) node scripts/railway-preflight.mjs && exec node server.js ;; *) printf '%s\\n' 'Unsupported LUMINA Railway service name' >&2; exit 64 ;; esac"]
