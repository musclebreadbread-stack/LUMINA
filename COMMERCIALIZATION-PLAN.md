# LUMINA 상용화·수익화 고도화 개발 계획 — 작성 계획

## Context

**왜 이 문서가 필요한가**
- LUMINA는 12개 분석 엔진과 결과 화면, 근거 인프라의 완성도가 높다(단위 테스트 137개, e2e 25개, 커버리지 81.9%). 하지만 돈을 받을 구조가 없다.
  - 수익 수단은 **꺼져 있는 AdSense 뼈대**뿐이다.
  - 일반 사용자 계정, 결제, 서버 저장, AI가 없다.
  - 사용자 데이터는 전부 브라우저(localStorage·IndexedDB)와 URL에 있다. URL에는 생년월일시가 들어가며, lz-string으로 압축만 할 뿐 암호화하지 않는다.
- 기존 `DEVELOPMENT-PLAN.md`는 광고 중심 모델이었다. 이번에 **무료 + 단건 + 구독 혼합 모델**로 전환하기로 결정했다.

**무엇을 만드는가**
- 새 문서를 `D:\Jack\17. Paseo\LUMINA\COMMERCIALIZATION-PLAN.md`로 저장한다.
- 담을 내용: 현황 진단, 상용화 전략, 목표 아키텍처, 단계별 실행 계획, 법무 체크리스트, **이미지 생성 프롬프트 전문**.

**어떤 결과를 기대하는가**
- 문서만 보고 각 Phase에 바로 착수할 수 있어야 한다.
- 첫 매출은 **2026-12-01 국내 "2027 신년운세 리포트" 소프트 런치**로 만든다.
  - 12-08에 공개한다.
  - 성수기는 12~2월이다. 2027년 입춘은 02-04, 설날은 02-06이다.

## 확정 의사결정 (사용자 답변 + 외부 검증)

| # | 항목 | 결정 | 근거·주의 |
|---|---|---|---|
| D1 | 사업 주체 | 한국 사업자 | Stripe는 한국 사업자 가입 불가. Paddle은 "horoscopes, fortune-telling" 판매 금지 |
| D2 | 결제 | 국내는 토스페이먼츠(결제위젯, 빌링은 카드만). 해외는 Lemon Squeezy(MoR). LS가 불가하면 토스 해외카드(USD/JPY)+PayPal | LS는 "모든 형태의 서비스" 판매 금지 조항 때문에 서면 사전 승인이 필요하다. 또 LS는 Stripe Managed Payments로 흡수되는 중인데, 이쪽은 한국을 지원하지 않는다. 그래서 `PaymentProvider` 추상화가 필요하다 |
| D3 | 수익 모델 | 무료 핵심 결과 + 단건 리포트 + 구독(LUMINA+) | AdSense는 비활성으로 두고 코드는 보존 |
| D4 | AI | OpenRouter `@openrouter/ai-sdk-provider` (AI SDK 7, Node 22+, ESM) | 요청마다 `data_collection:"deny"`, `zdr:true` 지정. 결정론 facts만 입력 |
| D5 | DB | Neon 유지(`LUMINA-cognitive`, aws-ap-southeast-1, PG18) + 유료 플랜 전환 | 현재 한도는 512MB, 이력 6h. Supabase 레거시는 제거 |
| D6 | 호스팅 | Vercel → **Railway 전면 이전**(Asia Southeast·싱가포르, Neon과 같은 권역) + Cloudflare | Railway 도메인·TLS·운영 경로 확인 후 Vercel 프로젝트를 2026-09-26 삭제. Analytics는 Umami, Cron은 Railway로 전환했고 Vercel 배포 설정·환경 동기화·분석 대체 코드를 2026-09-28 정리했다. Sentry 운영 DSN은 미설정 |
| D7 | 로그인 | **Better Auth 자체 호스팅**(카카오·구글·애플·이메일 OTP, 비밀번호 없음). 사용자 정보는 Neon `identity` 스키마에 저장 | Neon Auth는 Google/GitHub/Vercel만 지원한다. 직원용 Neon Auth는 유지하되 경로와 쿠키를 분리 |
| D8 | 첫 상품 | 2027 신년운세, 12월 초 국내 | — |
| D9 | 다국어 | ko/en으로 검증 → `LocalizedText` 개편 → ja(4월) → zh-Hant(6월) → es(8월) | — |
| D10 | 12월 범위 고정 | 한국·한국어·토스 단건·상품 1종 | 구독·LS·영문 판매·AI 통합 자아 리포트는 12월 이후 |
| D11 | AI의 역할 | AI가 facts를 인용해 **교차 통합 해설 챕터**(총운·분야 4·월별 코멘트)를 쓴다. 결정론 계산과 설명 블록이 근거층이자 폴백이다 | 사용자 의도(AI 교차 서술)와 "근거 없는 문장은 없다" 원칙을 함께 지킨다. `FEATURE_AI_NARRATIVE` 플래그로 끌 수 있다. 11-20 품질 게이트를 통과하지 못하면 결정론 본문으로 출시하고, AI 챕터는 나중에 무료 업데이트로 추가한다 |

## 산출물

- **승인 즉시 저장**: `D:\Jack\17. Paseo\LUMINA\COMMERCIALIZATION-PLAN.md`에 저장한다(현재 작업 폴더 루트). 저장 후 파일 링크와 폴더 위치 링크를 사용자에게 보고한다.
- 루트에 신규 파일 **`COMMERCIALIZATION-PLAN.md`**를 만든다(기존 `*-PLAN.md` 명명 규칙).
- 기존 문서는 수정하지 않는다. 대신 새 문서 첫머리에 "DEVELOPMENT-PLAN.md의 광고 중심 수익 모델을 대체"한다고 명시한다.
- 본문은 한국어로 쓴다. 코드 식별자와 경로는 원문 그대로 둔다.
- 외부 사실에는 출처 링크를 붙인다(부록).
- 비밀값과 개인정보는 넣지 않는다.
- 신규 경로에는 "(신규)"라고 표기한다.

## 문서 목차와 핵심 내용

### 0. 문서 정보
기준 커밋 `09a6ac1`, 운영 URL, 선행 문서와의 관계, 의사결정 표(D1–D11).

### 1. 현황 진단
- 12개 분석의 성숙도 표.
- 콘텐츠 깊이: MBTI형 64변형은 풍부하다. 타로·수비학·궁합은 템플릿 수준이다. 통합 초상은 교차 종합이 없다.
- 인프라와 품질 현황.
- 수익화 관점의 갭.
- 결함 목록(경로 포함).
- 재사용 자산 맵.

### 2. 상용화 전략
- 가치 제안: "근거가 보이는 동서양 통합 자기 탐구".
- 무료/단건/구독 구성:
  - 계산은 무료, 해석 전문은 유료.
  - 무료 결과와 미리보기는 전자상거래법 §17의 시험사용 역할을 한다.
- 가격 가설(A/B로 검증 전제):

  | 상품 | 가격 가설 |
  |---|---|
  | 2027 신년운세 | ₩9,900 |
  | 사주 심층 | ₩19,900 |
  | 궁합 심층 | ₩12,900 |
  | 16유형 커리어·관계 | ₩14,900 |
  | 타로 심층 | ₩3,900 |
  | AI 통합 자아 | ₩29,000 |
  | LUMINA+ | 월 ₩7,900 / 연 ₩59,000 |

  USD 병기. 벤치마크: 16Personalities $29–99, Co–Star $9.99/월, The Pattern $14.99/월.
- 상품 로드맵과 라이선스 게이트:
  - 유료 상품과 AI 입력에는 `licenseStatus:"verified"`인 신호만 쓴다(IPIP·사주·점성·수비).
  - SD3·SSEIT·ECR-R형·MBTI 상표 관련 항목은 허가를 받기 전까지 무료로만 둔다.
- KPI 퍼널: 매출 집계는 `billing.orders` 기준이다. `track()`은 동의 게이트 때문에 과소 집계된다.
- 시즌 캘린더.

### 3. 목표 아키텍처

**구성도**
- Cloudflare(DNS·캐시·WAF·Turnstile)
- Railway: `web`, `cron-daily`, `cron-10min`, `umami`
- Neon: `identity`/`member`/`billing`/`ai`/`ops` 스키마
- 외부 서비스: OpenRouter, 토스, LS, Resend, Sentry

**Railway 셀프 호스팅** (`node_modules/next/dist/docs/01-app/02-guides/self-hosting.md` 근거)
- 빌드·런타임:
  - `output:'standalone'` + 멀티스테이지 Dockerfile. Node 22+ 필요, `engines` 명시.
  - `.dockerignore`로 PNG 원본을 뺀다.
  - `sharp` 메모리 설정.
  - `/api/health`로 헬스체크.
- 배포·종료: 무중단 배포와 SIGTERM 드레인. `after()`는 이 드레인에 의존한다.
- 인스턴스 확장:
  - 시작은 1 replica.
  - 늘릴 때는 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, `deploymentId`, Redis 캐시 핸들러(`refreshTags`)를 갖춘다.
- CDN(Cloudflare):
  - 동적 HTML은 캐시하지 않는다.
  - `public/` 이미지와 `/_next/static`만 캐시한다.
  - 스트리밍 응답은 버퍼링하지 않게 한다.
  - 오리진 100초 타임아웃이 있다. 그래서 AI 생성은 비동기(`after()` + 폴링)로 한다.
- 환경:
  - Railway 환경은 staging과 production으로 나눈다.
  - **PR 환경은 staging을 기준으로 삼는다.** 기본값은 production 복제라서 그대로 두면 운영 자격증명이 노출된다.
  - 환경 구분은 명시적인 `APP_ENV`로 한다.
- Vercel 전용 기능의 대체:

  | Vercel 기능 | 대체 |
  |---|---|
  | `@vercel/analytics` | Umami(Railway 자체 호스팅, 쿠키 없음). 관리자 롤업 소스(`src/app/api/internal/analytics-rollup/route.ts`)를 Vercel API에서 Umami API로 교체하고, `ops` 테이블과 `/admin/analytics`는 유지 |
  | Speed Insights | Sentry(web vitals + 오류). PII는 `analyticsScrub` 규칙으로 스크럽 |
  | `vercel.json` cron | Railway cron 서비스 2개(일일 / 10분). 내부 엔드포인트를 `timingSafeEqual` 시크릿으로 호출 |
  | `x-vercel-ip-country` | `CF-IPCountry`(저장하지 않음) |
  | `scripts/vercel-sync-*-env.mjs` | Railway 변수 체크리스트 |

**인증 (Better Auth)**
- basePath는 `/api/account/auth`, 쿠키 접두사는 직원용 Neon Auth와 분리한다.
- 로그인 수단은 kakao/google/apple/emailOTP. 비밀번호 로그인은 끈다.
- `rateLimit.storage:"database"`, `nextCookies()`.
- 스키마 SQL은 CLI `generate`로 뽑아 리뷰한 뒤 `neon/migrations/`로 커밋한다. 프로덕션에 CLI `migrate`를 직접 쓰지 않는다.
- 루트 `layout.tsx`에서는 세션을 읽지 않는다. 읽으면 정적 SEO 페이지까지 동적 렌더가 된다. 계정 메뉴는 클라이언트 섬으로 만든다.

**권한·페이월 (DAL, `server-only`)**
- 페이지는 `requireUser → getOwnedProfile(복호화) → getEntitlement` 순으로 확인한다.
- Server Action과 Route Handler는 매번 다시 검증한다.
- `src/proxy.ts`는 로케일 전용으로 유지한다.
- 권한이 없는 premium 본문은 **아예 직렬화하지 않고** `LockedChapter`만 보낸다.
- `forbidden()`/`unauthorized()`는 16.3.1에서 experimental이라 쓰지 않는다.

**결제**
- `PaymentProvider` 인터페이스(toss/lemonsqueezy/fake). fake 구현은 `APP_ENV=production`에서 import하면 throw한다.
- 상태 전이는 `applyEvent()` 한 곳에서만 한다.
  - 먼저 `webhook_events`에 insert해 중복을 걸러낸다.
  - 이후 전이는 `pg` Pool 대화형 트랜잭션으로 처리한다. HTTP `neon()`은 결과에 따라 분기할 수 없어 billing에 쓰지 않는다.
- 토스 흐름:
  1. 가격은 서버가 정한다.
  2. pending 주문을 만든다(30분 만료).
  3. `successUrl=/api/billing/toss/return`으로 돌아오면 금액이 일치하는지 확인한다.
  4. 10분 안에 `POST /v1/payments/confirm`을 `Idempotency-Key`와 함께 호출한다.
  5. 웹훅이 오면 조회 API로 재확인한다.
  6. 일일 reconcile로 누락을 맞춘다.
- 환불: 열람 전이고 7일 이내면 셀프 자동 환불한다. 그 외는 `/admin/billing`에서 owner가 사유를 남기고 처리한다(audit 기록).
- 동의 캡처는 문구 버전과 함께 `member.consents`에 남긴다. KR 청약철회 제한, EU 철회권 포기, 국외 이전 동의가 대상이다.

**AI 파이프라인** (`src/server/ai/*`)
- 입력: facts 스키마(`Fact{id, lane, tier, value(band/category), evidenceRef}`). PII가 들어갈 필드 자체가 없다.
- 프롬프트는 버전으로 관리한다(`*.v1.ts`).
- 출력: `sections[{paragraphs[{text, citedFactIds≥1}]}]`.
- 검증:
  - 인용이 없는 문단은 제거한다.
  - 유효 문단이 90% 미만이면 1회 repair한 뒤 결정론 폴백으로 간다.
  - 금지 주장: 단정 예언, 의료·투자·법률 조언, facts에 없는 수치.
- 캐시 키: `sha256(product·factSheetVersion·sortedFacts·locale·promptVersion·schemaVersion·tier)`. facts가 밴드 단위라 적중률이 높고 사전 워밍이 가능하다.
- 티어: 리포트 / Q&A / repair.
- 비용 가드: 전역 일일 USD 차단기, 권한당 생성 3회, 월 쿼터(원자적 차감), OpenRouter 키 한도.
- 실행: `after()` + 폴링 + sweeper cron.
- 평가: 골든셋 50건(인용 100%, 금칙어 0)을 통과해야 머지한다. CI는 mock 모델을 쓰고 네트워크를 차단한다.
- 구조화 출력 API 이름은 설치된 `node_modules/ai/docs/`로 확인한 뒤 구현한다.

**데이터 모델·RLS**

| 역할 | 범위 |
|---|---|
| `lumina_cognitive_app`(기존) | 본인 행 |
| `lumina_auth_app` | `identity`만 |
| `lumina_billing_worker` | billing 쓰기 |
| `lumina_jobs_worker` | owner URL 대체 |

- `app.current_user_id()`를 추가한다.
- 테이블:
  - `identity.*`
  - `member.{profiles,saved_results,consents,share_links}`
  - `billing.{products,prices,orders,payments,refunds,subscriptions,entitlements,webhook_events,audit_events}`
  - `ai.{narrative_cache,user_narratives,usage_ledger,quota_counters}`
- 암호화:
  - 출생 프로필은 앱 계층 AES-256-GCM으로 암호화한다(AAD=user_id‖id, staging은 별도 키).
  - 빌링키도 암호화한다.
- 보존: 결제·계약 기록은 5년. 탈퇴 시 `user_id=null`로 두고 HMAC 참조만 남긴다.

**마이그레이션 원장** (`scripts/neon-migrate.mjs` 개편)
- `ops.schema_migrations`(checksum)를 둔다.
- `pg_advisory_lock`으로 동시 실행을 막는다.
- 기본은 `--dry-run`, 실제 적용은 `--apply`.
- 기존 4개 파일은 `--baseline`으로 등록한다.
- 운영 가드 우회 수정: 셸에 DB URL이 미리 설정돼 있으면 거부하고, endpoint 대조로 production을 판별한다. 이 로직은 공통 로더 `scripts/lib/neonAdminEnv.mjs`로 둔다.

**개인정보**
- 새로 생성하는 `/r/` 링크는 중단하고 `/p/[id]`(128bit 불투명 ID, 암호화 페이로드, 12개월 만료)로 바꾼다.
- 기존 `/r/`는 읽기 전용으로 두고 `Referrer-Policy: no-referrer`를 건다.
- 로컬 데이터의 계정 이전(claim)은 목록을 보여 주고 동의를 받은 뒤, 재검증·멱등으로 처리한다.
- 국외 이전 고지 대상: Railway, Neon, OpenRouter, Cloudflare, Sentry, Resend.

### 4. 단계별 실행 계획
각 Phase에 목표, 기간, 작업(파일), [외부]/[승인] 표시, DoD, 검증, 리스크를 적는다. 요약은 아래 로드맵 표에 있다.

### 5. 법무·컴플라이언스 체크리스트

**국내**
- 통신판매업 신고.
- 사업자정보와 호스팅 제공자(Railway) 상호 표시.
- 전자상거래법 §17: 청약철회 제한 고지, 시험사용 제공, 열람 전 7일 환불.
- 다크패턴 규제(2025-02-14 시행, 과태료 상한 1,000만 원): 자동갱신 고지, 증액·유료 전환 전 동의, 해지 방해 금지.
- 개인정보보호법: 국외 이전 고지, 처리 위탁 고지, 만 14세 미만 가입 제한, 보존·파기 기준.
- AI 기본법(2026-01-22 시행, 계도기간 1년 이상): 생성형 AI 사전 고지, 결과물 표시.
- 표시광고법: 정확도 과장 금지.
- 미성년 결제의 법정대리인 취소권 고지.

**해외**
- EU: 철회권 포기 동의, GDPR, 추후 EU 대리인 검토. EU AI Act Art.50은 법무 확인.
- 일본: 特商法 표기(Phase 8).

**상표·라이선스·면책**
- "MBTI" 상표: 유료 상품명은 "16유형"으로 하고 비제휴 고지를 붙인다.
- 검사 도구 라이선스를 확인한다.
- 면책 문구를 넣는다.

### 6. 이미지 자산 계획과 생성 프롬프트
프롬프트 전문을 복사해 쓸 수 있는 형식으로 싣는다. 요약은 아래 이미지 자산 섹션에 있다.

### 7. 리스크 레지스터

### 8. 부록
출처 링크, 신규 의존성 목록([승인] 필요), 용어.
- 신규 의존성: `better-auth`, `pg`, `@tosspayments/tosspayments-sdk`, `ai@^7`, `@openrouter/ai-sdk-provider`, `zod@^4`(경계 검증 전용), `@sentry/nextjs`, `resend`.

## 로드맵 (문서 4장 요약)

| Phase | 기간 | 범위 | 완료 기준(DoD) |
|---|---|---|---|
| **0 기반·보안·외부 착수** | 09-28 → 10-09 | 퀵윈(아래), 마이그레이션 원장과 가드 수정, Node 22 `engines`, `src/lib/flags.ts`, 커버리지 대상에 `src/server/**` 추가. [외부] 착수 항목은 표 아래에 정리 | staging에서 migrate를 두 번 실행하면 두 번째는 적용 0건. 보안 헤더 적용. `/privacy`의 "서버 미저장" 문구 정정 |
| **1 Railway·Cloudflare 이전** | 10-05 → 10-23 (Railway 전환 실제 확인 09-26) | Dockerfile/standalone, Railway staging→prod, PR 환경을 staging 기준으로, cron 2개, Umami와 롤업 소스 교체, Cloudflare 캐시·WAF·Turnstile, DNS 전환 [승인]. Railway 도메인·TLS·운영 smoke 통과 후 Vercel 프로젝트를 2026-09-26 삭제했고, 저장소의 Vercel 배포·환경 동기화·분석 대체 경로를 2026-09-28 정리했다. | Railway production 도메인·TLS·경로 smoke 확인. **Phase 1은 부분 완료**: Sentry 운영 알림 수신과 롤백 리허설은 별도 검증 전까지 완료로 보지 않는다. |
| **2 계정·DAL·서버 저장** | 10-12 → 11-06 | Better Auth, `src/server/{auth,dal,crypto}/**`, `src/app/account/**`, `ClaimLocalData`, `/p/[id]`, 계정 삭제·내보내기 | 소셜·OTP 로그인 동작. 교차 사용자 조회 0행(`scripts/neon-verify-rls.mjs`). claim이 멱등. 기존 `/r/*` 정상 |
| **3 결제 코어(토스 단건)** | 10-26 → 11-20 | `src/server/billing/**`, checkout, `LockedChapter`/`PaywallPanel`/`WithdrawalNotice`, `/admin/billing`, `BusinessInfoFooter`, `/refund-policy`, 영수증 메일, reconcile cron | 결제→확정→권한→열람이 끝까지 동작. 같은 웹훅 5회 재전송에도 권한 1건. 금액 변조 시 거부. 셀프 환불 동작 |
| **4 2027 신년운세 엔진·콘텐츠** | 10-12 → 11-20 (병행, 최장 경로) | `src/engine/saju/yearForecast.ts`: 丁未 세운 십신·십이운성, 未와 원국의 관계, 월운 壬寅~癸丑, 대운 겹침, 입춘 경계. `yearForecastExplanations.ts`, 리포트 페이지, 랜딩 `src/app/premium/saju-2027` + JSON-LD Offer, `r/[data]`의 AdSlot 자리에 `PremiumTeaser`. 이미지 Y01–Y07 | 엔진 커버리지 95%. 모든 블록 evidenceRefs ≥1. 전문가 검수 서명. 골든 차트(입춘 전후·시각 미상·야자시) 통과 |
| **5 AI 파이프라인** | 11-02 → 11-27 | `src/server/ai/**`, `ai` 마이그레이션, 상태 폴링 API, sweeper, 2027 리포트 AI 챕터(플래그) | **11-20 품질 게이트**: 골든셋 인용 100%·금칙어 0, 폴백·예산 차단기 동작, CI 네트워크 호출 0 |
| **6 런치 하드닝·출시** | 11-16 → 12-08 | 법무 최종본 반영, CSP enforce, 부하 테스트(설날 10배), 경보(결제 실패율·웹훅·AI 예산 80%). 11-27 코드 프리즈. 프로덕션 마이그레이션(직전 스냅샷) [승인], 라이브 키 [승인], 실결제→환불 리허설, 12-01 소프트 런치(플래그 10%→100%), 12-08 공개 | 롤백은 `FEATURE_BILLING` off로 구매 버튼만 숨긴다. 기존 구매자는 계속 열람 가능 |
| **7 구독·글로벌·플래그십** | 12-14 → 2027-02-13 | LUMINA+(토스 빌링: 카드, D+1/3/7 덩닝, 갱신 전 고지, 가입과 같은 깊이의 해지). LS(승인 시 `FEATURE_LS`). 설날 전 영문 2027(Year of the Goat). AI 통합 자아 리포트 GA(1월 중순). 설날 프리즈 01-29 → 02-09 | 구독 전환·해지 e2e, 다크패턴 체크리스트 통과 |
| **8 다국어** | 2027-02-16 → 08 | `LocalizedText`를 ko/en 필수 + 기타 선택 + en 폴백 구조로 바꿔 37개 파일에 점진 이행. `shareCode.ts` 로케일 확장, JP/TC OG 폰트, proxy 일반화. ja(4월) → zh-Hant(6월) → es(8월), 特商法 표기, 현지 가격 | 로케일별 parity test, 용어집·스타일가이드 |
| **9 상품 확장·성장·운영** | 2027-02 → 상시 | 사주 심층(10일간·60일주는 조합 레이아웃), 궁합 심층, 타로 심층, 16유형 커리어·관계, SEO 프로그래매틱 페이지, 이메일 리텐션, 레퍼럴·선물하기, PWA, 가격 A/B, CS 콘솔, 지표(MRR·ARPPU·환불률·AI 원가율) | 상품별 DoD는 문서에 정의 |

### Phase 9 세부 완료 기준과 출시 승인 조건

아래 기술 DoD는 구현 완료를 판정하는 기준이다. 가격, 보상, 환불·양도, 발송 대상·주기, 법적 해석 등 정책 입력은 승인 조건으로 분리한다. 기술 DoD를 통과해도 정책 승인 전에는 기능을 출시하지 않는다. 서버 기능 게이트는 기능 플래그와 해당 정책 승인 변수를 모두 요구하며, 이메일 리텐션은 승인된 정책 버전도 요구한다.

| 작업 영역 | 기술 완료 기준(DoD) | 별도 출시 승인 조건 |
|---|---|---|
| 사주·궁합·타로 심층 | 사주 10일간·60일주 전수 fixture와 경계 사례 테스트를 통과하고 잘못된 조합을 거부한다. 궁합·타로는 확정된 계산 규칙의 golden case, 입력 경계, 재현 가능한 결과를 검증한다. 노출되는 해석은 사용한 근거와 한계를 추적할 수 있고, 유료 권한 검증은 서버에서 수행한다. | 상품별 제공 범위·가격, 해석 근거와 콘텐츠 라이선스, 표현·고지 문구를 승인한다. 심층 상품 게이트는 `DEEP_SAJU_PRODUCT_APPROVED`, `DEEP_COMPATIBILITY_PRODUCT_APPROVED`, `DEEP_TAROT_PRODUCT_APPROVED` 승인 없이는 열지 않는다. |
| 16유형 커리어·관계 | 16개 유형 모두에 커리어·관계 콘텐츠가 있고, 점수 입력부터 유형 출력까지의 golden case와 미지원·경계 입력 테스트를 통과한다. 지원 로케일 간 유형 ID·핵심 의미·주의 문구가 일치한다. | 유형 산출 근거, 측정·라이선스 범위, 커리어·관계 표현 및 면책 문구를 승인한다. `TYPE_CAREER_PRODUCT_APPROVED` 전에는 공개하지 않는다. |
| SEO 프로그래매틱 페이지 | 공개 페이지에만 색인을 허용한다. 페이지별 제목·설명·canonical·로케일 대체 URL·구조화 데이터가 중복·오류 없이 생성되고 sitemap/robots가 색인 대상과 일치하는지 자동 검사한다. 개인 입력, 계정 데이터, 결과 공유용 비공개 값을 경로·메타데이터·구조화 데이터에 넣지 않으며 비공개 페이지는 색인되지 않는다. | 색인할 페이지 분류, 콘텐츠 근거·라이선스, 건강·재무 등 오인 가능 표현에 대한 검수를 승인한다. |
| 이메일 리텐션 | 명시적 동의와 동의 당시 정책 버전을 기록한다. 구독 취소는 대기 중인 발송에도 즉시 적용되고, 재시도·중복 작업에도 같은 캠페인 메일이 중복 발송되지 않도록 멱등 처리한다. 반송·억제 목록, 발송 이력, 사용자별 철회 경로를 테스트한다. | 처리 근거, 수신 대상·빈도·템플릿, 보유 기간, 발송 도메인 인증과 메일 제공자를 승인한다. `MARKETING_RETENTION_POLICY_APPROVED`와 유효한 `MARKETING_RETENTION_POLICY_VERSION`이 모두 있어야 한다. |
| 레퍼럴 | 자기 추천, 중복·만료 귀속, 반복 보상 요청을 거부한다. 추천 귀속·보상·취소/회수 처리는 원자적이고 멱등이며, 재시도와 동시 요청을 포함한 테스트를 통과한다. 보상 원장과 관련 상태 변경을 감사 가능하게 남긴다. | 보상액·한도·대상·시점·부정 이용 처리·취소/회수와 세무 조건을 승인한다. `REFERRAL_POLICY_APPROVED` 전에는 보상이나 캠페인을 활성화하지 않는다. |
| 선물하기 | 발행·수령·사용·만료·취소·환불·양도 상태 전이가 원자적이고 멱등이며, 만료·중복 사용·수령자 불일치·환불 후 사용을 거부한다. 이벤트 이력과 접근 권한을 검증한다. | 양도 허용 여부와 조건, 수령 기한, 환불·부분 사용·취소 기준, 가격·세무 조건을 승인한다. `GIFT_POLICY_APPROVED` 전에는 판매·양도·환불 정책에 의존하는 동작을 활성화하지 않는다. |
| PWA | 설치·오프라인 앱 셸·새 버전 갱신·오래된 캐시 정리 경로를 검증한다. 서비스 워커는 계정·응답·검사 결과·결제·인증 데이터와 비공개 API 응답을 저장하지 않는다. 오프라인 진입과 복구 테스트를 통과한다. | 오프라인에서 제공할 공개 기능과 사용자 안내 문구를 제품·보안 검토로 승인한다. |
| 가격 A/B | 배정은 실험 내에서 일관되고 재현 가능하다. 실험 배정·가격 버전이 checkout과 주문에 고정되며 화면 표시 금액, 승인 요청 금액, 확정 주문 금액이 일치한다. 확정 주문 금액은 실험 변경으로 바뀌지 않고 대조군·중단 경로를 검증한다. | 실험 가격·대상·배정 비율·기간·대조군·중단 기준과 결제·고지 조건을 승인한다. `PRICING_EXPERIMENTS_POLICY_APPROVED` 전에는 노출하거나 결제에 반영하지 않는다. |
| CS 콘솔 | 서버에서 역할별 작업을 제한하고 데이터 접근은 강제 RLS를 통과해야 한다. 조회·변경 감사 기록, 민감 데이터 최소 노출, 내보내기 제한, 삭제·보유 정책 경로를 테스트한다. 교차 사용자·무권한 접근이 차단된다. | 담당 역할·조회 가능 필드·응답 기준·보유 및 삭제 기간·민감 문의 처리 절차를 승인한다. `SUPPORT_CASES_POLICY_APPROVED` 전에는 상담 데이터 접근을 활성화하지 않는다. |
| 운영 지표 | MRR·ARPPU·환불률·AI 원가율별 산식, 분모·기간·시간대·환불 반영·원천을 버전 관리하고 표본 데이터로 회귀 검사한다. 결제 원장·환불 내역·AI 사용량과 대사하며 집계값만 분석 화면에 노출하고 산출 시각과 원천을 표시한다. | 매출 인식, 환불 분류, ARPPU 분모, AI 원가 산정 단가·기간 등 재무·제품 지표 정의를 승인한다. |

Phase 9 출시 전에는 대상 기능의 기술 DoD와 관련 승인 조건을 각각 확인한다. 현재 성장 기능 게이트는 코드에서 기능 플래그와 승인 변수를 모두 요구하며, 회귀 테스트는 9개 게이트와 이메일 정책 버전 조건을 검증한다. 이 검증은 상품 정책 승인이나 운영 플래그 활성화를 대신하지 않는다.

**Phase 0 [외부] 착수 항목**
- 결제·판매: 토스 PG 심사(단건과 빌링은 별도), 통신판매업 신고, LS 서면 승인.
- 자문·허가: 법무(약관·처리방침·환불·AI 고지), 세무(부가세·해외매출), 라이선스(SD3·SSEIT·ECR-R·MBTI·타로).
- 로그인 연동: 카카오 비즈앱, Apple Developer, Google OAuth.
- 인프라·서비스 준비: Neon 유료 플랜과 PITR, Railway Pro, Cloudflare 존과 상용 도메인 확정, OpenRouter 키 한도, 메일 도메인 SPF/DKIM.

**Phase 0 퀵윈**
- `src/app/admin/actions.ts`: `redirect()`를 try/catch 밖으로 옮긴다.
- 롤업 cron:
  - 시크릿 비교를 `timingSafeEqual`로 바꾼다.
  - DB 연결을 owner URL에서 `lumina_jobs_worker`로 바꾼다.
- 보안 헤더(`next.config.ts`):
  - HSTS, nosniff, Referrer-Policy, Permissions-Policy, `frame-ancestors`.
  - CSP는 Report-Only로 시작한다.
- 직원용 Neon Auth의 공개 가입을 차단한다.
- `related_test_click`을 롤업 allowlist와 DB check에 추가한다.
- 운영 가드 우회를 수정한다.
- Supabase 레거시 제거는 별도 PR로 한다 [승인].
- `.gitignore`에 새 이미지 폴더의 PNG 원본을 추가한다.

## 이미지 자산 (문서 6장)

**원칙**
- 기존 마스터 스타일을 그대로 이어받는다. 문구는 원문을 재사용한다.
  - 사주 계열: `saju-image-prompts.md` 십이지신도 블록, 오행 hex 팔레트.
  - 타로 계열: Major Arcana 블록.
  - 프리미엄: `docs/CHARACTER-ARTWORK-PROMPTS.md`의 collectible plate 블록과 negative 프롬프트.
  - UI 삽화: `IMAGE-ASSET-EXPANSION-PLAN.md` §4.4 D블록(구조화 필드).
  - 과학 계열: 무채색, 신비 요소 금지.
- 글자·숫자·워터마크는 넣지 않는다.
- 파일명은 엔진 키를 쓴다.
- 처리 순서: PNG 생성 → `scripts/optimize-images.mjs`의 폴더 목록에 새 폴더 추가 → `pnpm images:optimize` → 코드에서 `assetPath()`로 참조. OG가 필요한 폴더는 `prepare-og-images.mjs` 대상에도 추가한다.
- 재사용(YAGNI):
  - 60일주는 10일간 이미지와 기존 12지신 이미지를 조합한다.
  - 월운 12개월 삽화는 `public/saju/zodiac/*`를 쓴다.

| ID | 용도 | 수 | 비율 | 경로(신규) | Phase |
|---|---|---|---|---|---|
| C01–C03 | 요금제 엠블럼(촛불·등불·별 만다라) | 3 | 1:1 | `public/commerce/tiers/{free,single,plus}` | 3 |
| C04 | 잠긴 챕터 봉인 | 1 | 1:1 | `public/commerce/lock-seal` | 3 |
| C05–C06 | 결제 완료 / 재시도 | 2 | 4:3 | `public/commerce/checkout/{success,retry}` | 3 |
| A01–A02 | 로그인 히어로 / 내 서재 빈 상태 | 2 | 3:2, 4:3 | `public/account/{signin,library-empty}` | 2 |
| E01–E03 | 이메일 헤더(환영·영수증·다이제스트, PNG) | 3 | 3:1 | `public/email/{welcome,receipt,digest}.png` | 3 |
| Y01–Y03 | 2027 정미년(丁未, 붉은 양) 키비주얼(표지·히어로·정사각) | 3 | 2:3, 16:9, 1:1 | `public/reports/yearly-2027/{cover,hero,square}` | 4 |
| Y04–Y07 | 분야 챕터(일·재물 / 관계 / 몸과 리듬 / 배움·성장) | 4 | 4:3 | `public/reports/yearly-2027/chapters/{work,relationships,wellbeing,growth}` | 4 |
| B01 | 브랜드 OG 배경(홈·수비학·궁합 OG 누락 보완) | 1 | 1.91:1 | `public/brand/og-background` | 4 |
| M01–M04 | 광고 크리에이티브(텍스트 없음, 저장소 밖 보관) | 4 | 4:5 / 9:16 | 저장소 외부 | 6 |
| R01–R05 | 프리미엄 표지(사주 심층·궁합 심층·통합 자아·타로 심층·16유형 커리어[과학 계열]) | 5 | 2:3 | `public/reports/covers/{saju-deep,compatibility-deep,integrated-self,tarot-deep,types-career}` | 7·9 |
| S01–S10 | 10천간 일간 | 10 | 2:3 | `public/saju/day-masters/{jia,yi,bing,ding,wu,ji,geng,xin,ren,gui}` (`STEMS[].en` 소문자) | 9 |
| K01–K06 | 궁합 관계 | 6 | 4:3 | `public/compatibility/relations/{combination,trine,clash,punishment,harm,destruction}` (`BranchRelationKind`) | 9 |
| T01–T02 | 타로 카드 뒷면 / 리딩 테이블 | 2 | 2:3, 16:9 | `public/tarot/ui/{card-back,table}` | 9 |
| G01 | 선물하기 카드 | 1 | 3:2 | `public/commerce/gift-card` | 9 |

- 저장소에 들어가는 신규 이미지는 43장, 저장소 밖에 두는 광고 크리에이티브는 4장이다.
- 각 항목에 ID, 파일명, 폴더, 비율과 원본 크기(1024×1536 등), 베이스 블록, Subject 또는 개별 지시, negative를 싣는다.
- 생성이 끝나면 개수·파일명·용량을 먼저 검증한 뒤 코드에 통합한다.

## 검증 방법 (문서 저장 후)

1. 문서에 인용한 **기존** 경로와 식별자를 Glob/Grep으로 전수 확인한다(예: `getAdminAccess`, `branchRelationsOf`, `assetPath`, `STEMS`). 신규 경로에는 "(신규)" 표기가 있는지 확인한다.
2. 비밀값 패턴(키·토큰·`postgres://`·`sk-`)과 개인정보가 없는지 grep한다.
3. 이미지 프롬프트를 점검한다.
   - 기존 스타일 블록 원문을 재사용했는지.
   - "No text / no letters / no watermark" 제약이 있는지.
   - 파일명이 엔진 키와 일치하는지.
   - ID·경로 표와 본문 항목 수가 43+4개로 일치하는지.
4. 의사결정 표, 로드맵, 이미지 표 사이에 서로 어긋나는 날짜·Phase 번호가 없는지 확인한다.
5. 외부 사실(결제 정책, 법규, 가격)이 모두 부록 출처로 연결되는지 확인한다.
6. 마크다운 렌더링(표·코드블록)을 확인한다.

## 남은 위험

- **일정**: 이전, 계정, 결제, 콘텐츠, AI를 10주 안에 끝내야 한다.
  - 12월 범위를 고정한다(D10).
  - AI 챕터는 플래그로 켜고 끈다(D11).
  - Railway 전환은 production 경로에서 확인했으나 Sentry DSN·알림 수신과 롤백 리허설 증거는 아직 없다.
- **외부 리드타임**이 12-01을 좌우한다: PG 심사, 통신판매업 신고, 법무, 전문가 검수. 모두 09-29에 착수한다.
- **LS 거절 또는 Stripe 편입**: 12월은 KR 전용이라 영향이 없다. 대안은 토스 해외결제와 세무 검토다.
- **라이선스·상표**: 허가 전까지 유료 상품과 AI 입력에서 제외한다.
- **서버 저장 전환에 따른 유출 영향**: 최소 수집, 앱 계층 암호화, 만료로 줄인다.
- **Better Auth 운영 부담**: 대안은 Clerk다(카카오 지원은 미확인).
