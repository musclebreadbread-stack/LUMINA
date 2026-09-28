# LUMINA 수익화 실행 계획 v2 — "만들어진 것을 팔리게 한다"

기준: 2026-09-28 · 브랜치 `claude/ecstatic-franklin-44oub4` · 기준 커밋 `3b23f0e`
선행 문서: `COMMERCIALIZATION-PLAN.md`(아키텍처·법무 원칙은 유지, 이 문서는 **실행 순서와 결함 보정**을 대체)

> **날짜 정정(2026-09-28, Track D 구현 중 발견)**: `COMMERCIALIZATION-PLAN.md`는 "2027년 입춘은 02-04, 설날은 02-06"이라고 적고 있으나, 이 저장소가 이미 신뢰해 쓰는 `korean-lunar-calendar`(KASI 기준)로 직접 계산하면 **2027년 설날은 02-07**이다(입춘 02-04는 맞음, `astronomy-engine`으로 별도 재검증함). 이 문서의 아래 모든 "설날"·"02-06" 언급은 02-07로 고쳐 읽는다. `COMMERCIALIZATION-PLAN.md` 자체는 기존 문서 보존 원칙에 따라 수정하지 않았다.

---

## 0. Context (서론)

**왜 새 계획이 필요한가**
- 결제·로그인·AI·구독 코드는 대부분 구현됐다. 하지만 전부 플래그로 꺼져 있고, 운영에서 한 번도 돈이 오간 적이 없다.
- 전수 점검 결과, 코드가 켜져도 **첫 결제가 실패하는 결함**과 **판매 페이지 약속보다 얇은 상품**, **8단계 구매 경로**, **유입 경로 부재**가 확인됐다.
- 실제 트래픽 기록이 저장소 어디에도 없다. 매출 = 유입 × 전환 × 객단가 × 재구매에서 네 항이 모두 0에 가깝다.

**사용자 결정 (2026-09-28 답변)**

| 항목 | 결정 | 계획에 미치는 영향 |
|---|---|---|
| 외부 준비 | 사업자등록·통신판매업·토스 PG·법무 **모두 미착수** | 외부 트랙이 최장 경로. 09-29 즉시 착수 |
| 첫 매출 시점 | 12월 신년운세 시즌 (12-01 소프트, 12-08 공개) | 코드 프리즈 11-27 유지 |
| 마케팅 예산 | **0원 (오가닉만)** | SEO·공유 카드·카카오 채널·자동 생성 SNS 카드에 집중 |
| 승인 후 범위 | 문서 저장 + Sprint 1 구현 | 4장 범위를 구현·커밋·푸시·Draft PR |

**한 줄 결론**: 12월 매출은 "코드"가 아니라 **외부 승인 리드타임 + 10월 중순까지의 SEO 출시**에 달려 있다. 코드는 P0 결함 수정 → 상품 보강 → 구매 경로 단축 순으로 병행한다.

---

## 1. 현황 진단 (검증된 사실만)

### 1.1 이미 가진 자산
- 분석 13종 엔진(`src/engine/*`), 근거·인용 체계, 결과 화면, OG 이미지, Railway 운영(`lumina.jack.ai.kr`, smoke 18/18).
- 결제: 토스 단건·빌링, 웹훅 멱등, 환불, reconcile, 영수증(`src/server/billing/*`). 상품 7종 가격 시드(`neon/migrations/20260928000000_billing_core.sql:300-320`, 전부 `enabled=false`).
- 계정: Better Auth(이메일 OTP·카카오·구글·애플), 출생 프로필 AES-256-GCM 암호화, `/p/[id]` 비공개 공유, 내보내기·삭제.
- AI: facts→프롬프트→zod→인용 검증→캐시→결정론 폴백, 비용 가드(`src/server/ai/*`). 모델 미지정, 골든셋 없음.
- 성장 스키마: 레퍼럴·선물·가격실험·CS 테이블(`20261003000000_growth_foundation.sql`), 로직은 마케팅 수신동의만.

### 1.2 매출 공식별 병목

| 항 | 현재 상태 | 근거 |
|---|---|---|
| 유입 | `/saju`·`/astro` noindex, 색인 URL 약 43개(띠·별자리 24), 핵심 결과는 공유 불가 | `src/app/saju/page.tsx:21`, `r/[data]/page.tsx:590` `allowLinkShare={false}` |
| 전환 | 유료 노출은 사주 결과 1곳, 문구는 항상 "준비 중". 구매 약 8단계. 글로벌 내비·계정 메뉴·가격 페이지 없음 | `r/[data]/page.tsx:450`, `PremiumTeaser.tsx` |
| 객단가 | 판매 가능 상품 1종(₩9,900). 리포트는 AI 없이 템플릿 16블록, 광고한 4개 분야 챕터 없음 | `premium/saju-2027/report/page.tsx` |
| 재구매 | LUMINA+ 혜택 = 2027 리포트 1종뿐. 리텐션 알림 없음 | `service.ts:721` |

### 1.3 검증된 결함 (P0 = 첫 결제 차단 또는 매출 누수)

| # | 결함 | 위치 | 등급 |
|---|---|---|---|
| 1 | 주문 insert가 `receipt_locale`을 쓰지만 `lumina_member_app` 컬럼 권한에 없음 → **모든 주문 503** | `billing_core.sql:408`, `service.ts:198-206` | P0 |
| 2 | 리포트가 "현재 프로필"로 계산됨 → 1회 구매로 여러 사람 리포트 생성 가능 | `report/page.tsx:56`, `narrative/route.ts` | P0 |
| 3 | 구독 청구 주문을 셀프 환불 API로 환불 가능 | `service.ts` `reserveRefund` | P0 |
| 4 | 토스 취소 타임아웃 시 `refunding`에 고착(관리자 화면·reconcile 모두 미처리) | `service.ts:595-691` | P1 |
| 5 | 토스 대시보드 취소가 무시돼 권한 회수 안 됨 | `toss/webhook/route.ts` | P1 |
| 6 | 10분 cron이 첫 실패에서 중단 → 영수증 1건 실패가 구독 청구·AI를 막음 | `scripts/lib/railwayCronRun.mjs` | P1 |
| 7 | 결제·AI 라우트가 오류를 503으로 삼키고 Sentry 미전송, 운영 DSN 없음 | billing/AI 라우트 catch | P1 |
| 8 | `buildYearForecastFacts`가 `expertReviewStatus !== "pending"`이면 throw → 전문가 승인 시 AI 붕괴 | `src/server/ai/facts.ts:21` | P1 |
| 9 | 리포트 열람 표시를 렌더 중 기록 → 링크 미리보기·프리페치가 환불권 소멸 | `report/page.tsx:72` | P1 |
| 10 | 출생정보 쿠키가 `path:/r`, 30분 → 결제 경로에서 읽을 수 없음 | `api/report/profile-session/route.ts:60-61` | 설계 제약 |
| 11 | 로그인 후 항상 `/account/consent`→`/account`로 이동(상품 페이지 복귀 불가) | `SignInPanel.tsx:254` | 전환 |
| 12 | 토스 복귀가 `/premium/saju-2027` 하드코딩, 로케일 소실 | `toss/return/route.ts:11` | 전환 |
| 13 | CSP에 토스·OAuth 출처 없음 → enforce 시 결제 붕괴 | `next.config.ts` | 출시 전 |
| 14 | 결제·인증·AI 테스트 0건, `/api/health` DB 미확인 | `src/server/**`, `e2e/premium.spec.ts` | 품질 |

### 1.4 외부 전제조건 (전부 미착수)
사업자등록 → PG 가입·심사(단건/정기 별도) → 통신판매업 신고 → 법무 최종본(약관·처리방침·환불·국외이전·AI 고지) → 명리 전문가 검수 → 라이브 키 → Neon 유료+PITR·Railway Pro·Sentry DSN·Resend 도메인(SPF/DKIM)·카카오 앱 키·Turnstile.

---

## 2. 시장 근거와 전략 원칙

### 2.1 시장 근거 (보도 기준, 원문 재확인 권장)
- 테크랩스(점신 운영) 2024년 매출 978억 원, 영업이익 105억 원. 점신 사업 영업이익 31억 원(+41%). — [더벨](https://www.thebell.co.kr/front/newsview.asp?key=202502130911203240101422), [이투데이](https://www.etoday.co.kr/news/view/2444751)
- 2025년 2월 운세 앱 MAU 1위 점신 95만 명, 점유율 46.5%. — [톱스타뉴스](https://www.topstarnews.net/news/articleView.html?idxno=15623421)
- 포스텔러: 광고 없이 유료 콘텐츠(코인 충전 후 콘텐츠별 차감)로 2024년 연매출 100억 원 돌파, 누적 가입자 860만. — [ZDNet Korea](https://zdnet.co.kr/view/?no=20250203104315)
- 사주나루(전화 상담형) 2024년 연매출 400억 원. — [다음 뉴스](https://v.daum.net/v/20251211210300627?f=p)

**해석 (추론)**
1. 국내 운세 시장은 **광고보다 유료 콘텐츠 판매**로 수익이 검증됐다(포스텔러). → 광고는 계속 끄고 단건 판매를 먼저 연다.
2. 상위 사업자는 앱·대규모 사용자 기반이다. LUMINA가 정면으로 이길 축은 **"근거가 보이는 해석 + 심리검사 통합 + 설치 없는 웹 + 공유"**다.
3. 신년운세는 검색 수요가 12~2월에 몰리는 시즌 상품이다. 오가닉만으로 잡으려면 **검색 페이지가 11월 전에 색인**돼야 한다.

### 2.2 전략 원칙
1. **팔 수 있는 1개를 끝까지**: 12월은 `saju-2027` 1종(D10 유지). 나머지 상품은 카탈로그 구조만 먼저 만든다.
2. **약속한 만큼 준다**: 광고한 4개 분야 챕터를 결정론 콘텐츠로 먼저 채우고, AI는 품질 게이트 통과 후 덧입힌다.
3. **무료가 유입, 유료는 깊이**: 계산·요약은 무료, 챕터·월별 해설은 유료(전자상거래법 §17 시험사용 역할).
4. **예산 0원 = 자산이 광고**: SEO 페이지·공유 카드·자동 생성 SNS 이미지를 엔진에서 뽑는다.
5. **모든 판매 기능은 승인 게이트 뒤에**: 기존 플래그·승인 변수 체계를 그대로 쓴다.

---

## 3. 실행 로드맵 (본론)

트랙은 병행한다. ★ = 최장 경로.

### Track E — 외부·법무 (사용자 담당, ★)

| 주차 | 할 일 | 산출물 |
|---|---|---|
| 09-29 | 사업자등록(업종 코드는 세무 확인), 토스페이먼츠 가입 신청, 법무 검토 의뢰, 명리 전문가 섭외, 상용 도메인 확정 | 사업자등록증 |
| 10-06 | 통신판매업 신고(구매안전서비스 확인증 등 필요 서류·PG와의 선후는 관할 기관·토스에 확인), Google Search Console·네이버 서치어드바이저 등록, 카카오 디벨로퍼스 앱(공유 JS 키·로그인) | 신고번호, 카카오 키 |
| 10-13 | ★ 토스 단건 심사 제출(사이트에 상품·가격·환불정책·사업자정보 노출 필요 → Track C의 "가격 공개·결제 비활성" 모드로 대응), 토스 **정기결제 별도 심사**도 동시 신청 | 심사 접수 |
| 10-20~11-10 | 법무 최종본 수령 → 약관·처리방침·환불정책 게시, 버전 변수 확정. Resend 도메인 SPF/DKIM, Turnstile 키 | 문서 버전 |
| 11-17 | 전문가 검수 서명(`YEAR_FORECAST_EXPERT_REVIEW_APPROVED`), Neon 유료+PITR, Railway Pro, Sentry 알림 수신자 | 승인 기록 |
| 11-24 | ★ 라이브 키 수령·설정, 운영 실결제→환불 리허설 | 출시 판정 |

### Track A — P0 결함·운영 안정화 (코드)

| 작업 | 파일 | 크기 |
|---|---|---|
| A1 권한 마이그레이션 `grant insert (receipt_locale)` | `neon/migrations/20261006000000_billing_orders_receipt_locale_grant.sql`(신규) | S |
| A2 권한 정적 테스트: 마이그레이션의 grant 맵 ↔ `src/server/**`의 `insert into … (cols)`를 역할별로 교차 검증 | `src/server/__tests__/dbGrants.test.ts`(신규) | M |
| A3 구독 청구 주문 셀프 환불 차단(`subscription_invoice_id is null`) | `src/server/billing/service.ts` | S |
| A4 cron 격리: 모든 작업 실행 후 실패 집계, 영수증 부분 실패는 200+`failed` | `scripts/lib/railwayCronRun.mjs`, `scripts/test-railway-cron.mjs`, `api/internal/billing-receipts/route.ts` | S |
| A5 서버 오류 캡처 헬퍼(`scrubSentryEvent` 재사용) → 503을 반환하는 모든 catch에 연결 | `src/server/observability/captureServerError.ts`(신규), billing·AI·internal 라우트 | S |
| A6 `expertReviewStatus`를 `"pending"\|"approved"`로 확장, facts throw 제거 | `src/engine/saju/yearForecast.ts`, `src/server/ai/facts.ts` | S |
| A7 고착 환불 복구·대시보드 취소 반영·reconcile 10분 주기(50건, pending+refunding) | `service.ts`, `toss/webhook`, `internal/billing-reconcile`, `admin/billing/page.tsx` | M |
| A8 스테이징 테스트 모드: `billingJobsAllowed()` = prod+`live_` 또는 staging+`test_` 키, 스테이징 영수증 허용목록 | `src/server/billing/environment.ts`(신규), internal 라우트 3개 | S |
| A9 `/api/health/ready`(DB `select 1`), CSP에 `*.tosspayments.com`·OAuth 출처 추가(report-only 유지) | `src/app/api/health/ready/route.ts`(신규), `next.config.ts` | S |
| A10 DB 운영 스크립트: `lumina_billing_worker` 역할 설정, 상품 활성화(`--dry-run` 기본, audit 기록) | `scripts/neon-configure-billing-role.mjs`, `scripts/billing-product-admin.mjs`(신규, `neon-configure-ai-role.mjs` 패턴) | S |

### Track B — 팔 만한 상품 만들기

| 작업 | 파일 | 크기 |
|---|---|---|
| B1 ★ 결정론 4챕터(일·재물/관계/몸과 리듬/배움·성장): 십신×분야, 십이운성×리듬, 원국 관계×관계, 주목할 달. 문단마다 `evidenceRefs≥1`(비어 있지 않은 튜플 타입) + `factIds`로 AI 출력과 같은 모양 → AI 꺼짐·실패 시 그대로 표시 | `src/engine/saju/yearForecastChapters.ts`, `yearForecastChapterText.ts`(신규), `explanations.ts`의 `STAGE_DETAILS`·`TEN_GOD_DETAILS` 재사용 | M(코드)+L(콘텐츠·검수) |
| B2 ★ 구매↔프로필 바인딩: `billing.order_profiles(order_id, slot, profile_id, profile_fingerprint)`, 스냅샷은 `member.profiles`에 `source_key='order:<id>'`로 암호화 저장(탈퇴 시 삭제, 주문은 5년 보존) | 마이그레이션 `20261007000000_billing_order_profiles.sql`, `service.ts` `createPendingOrder`, `member/dal.ts` `getOwnProfileById()`, `src/server/premium/reportContext.ts`(신규) | M |
| B3 열람 표시를 POST로 이동: "리포트 열기" 게이트 + 청약철회 제한 고지 → `/api/billing/orders/[id]/open` → 303 | `report/page.tsx`, 신규 라우트 | S |
| B4 상품 카탈로그: `PRODUCT_CATALOG`(requiredProfiles, productPath, reportPath, selfRefundable, includedInPlus). DB는 가격·활성·라이선스, 카탈로그는 동작 담당. `PRODUCT_KEY`·`z.literal("saju-2027")`·`PLUS_PRODUCTS` 하드코딩 제거 | `src/server/billing/catalog.ts`(신규), `service.ts`, `subscriptions.ts`, `api/billing/orders/route.ts`, `ai/service.ts` | M |
| B5 `createForecast` 중복 제거 → `forecastFromProfile()` 공유 | `report/page.tsx`, `narrative/route.ts` | S |

### Track C — 구매 경로 8단계 → 4단계
결과 페이지 → 상품 페이지(필요 시 로그인 후 **원래 자리로 복귀**) → 확인 패널 1개 → 토스 → 리포트

| 작업 | 파일 |
|---|---|
| C1 `returnTo`(내부 `/premium/*`·`/r/*`만 허용) | `SignInPanel.tsx`, `account/consent/page.tsx` |
| C2 확인 패널: "이 출생정보로 구매"(브라우저의 `getProfileSnapshot()` 전송, 서버 `memberProfileSchema` 검증), "전체 동의" 마스터 체크박스(청약철회 제한은 시각적으로 분리), EU 포기 동의는 해당 국가만 | `CheckoutButton.tsx`, `src/lib/profile.ts` |
| C3 토스 성공·실패 복귀 → 카탈로그의 리포트 경로 + `?order=` + 로케일 | `toss/return`, `toss/fail` 라우트 |
| C4 계정 메뉴(클라이언트 섬, 레이아웃은 세션을 읽지 않음) + `/pricing`(신규) | `src/components/account/AccountMenu.tsx`(신규), `layout.tsx` |
| C5 판매 상태 3단계: `hidden` / `preview`(가격·사업자정보·환불정책 공개, 결제 비활성 "12월 1일 판매 시작" + 알림받기) / `live`. PG 심사 대응 겸용 | `PremiumTeaser.tsx`, `premium/saju-2027/page.tsx`, `service.ts` `getActiveSale()` |
| C6 `BusinessInfoFooter` 전역화 + 통신판매업 신고번호·호스팅 제공자 필드 | `BusinessInfoFooter.tsx`, `layout.tsx`, `.env.example` |

### Track D — 오가닉 유입 (예산 0원, ★ SEO는 10월 중순 출시)

| 작업 | 파일 | 목적 |
|---|---|---|
| D1 ★ 공개 가이드 엔진(`branchRelationsOf`, `tenGodOf`, `twelveStageOf`, `ipchunOf` 등 기존 함수만 사용) | `src/engine/saju/publicGuides.ts`(신규) | 검색 페이지 데이터 |
| D2 ★ 프로그래매틱 페이지 83개: `/saju/2027`(허브, 입춘 vs 설날 띠 기준 해설), `/saju/2027/[sign]` 12, `/saju/ilgan/[stem]` 10, `/saju/ilju/[pillar]` 60. 각 페이지 `buildAlternates`·`Breadcrumbs`·Article JSON-LD·OG 이미지·상품 CTA·상호 링크(얇은 콘텐츠 방지용 편집 서문) | `src/app/saju/2027/**`, `src/app/saju/ilgan/**`, `src/app/saju/ilju/**`(신규), `sitemap.ts` | "2027 띠별 운세" 시즌 검색 |
| D3 `/saju`·`/astro` 색인 허용 + 정적 설명 콘텐츠 | `saju/page.tsx`, `astro/page.tsx` | 핵심 랜딩 |
| D4 사주 공유 카드: `ShareKind "saju"` = 일주·정령·주도 오행·강약·2027 세운 십신(생년월일 역산 불가) → `/s/saju/<code>` + 1080×1920 스토리 카드 | `src/lib/shareCode.ts`, `src/lib/og/cards/saju.tsx`(신규), `s/[kind]/[code]/page.tsx`, `ShareBar.tsx`, `shareCode.fixtures.ts` | 바이럴 루프 |
| D5 SNS 카드 자동 생성 스크립트: 12띠×2027, 주간 절기 카드 PNG 일괄 출력(기존 `src/lib/og/*` 재사용) | `scripts/generate-social-cards.mjs`(신규) | 인스타·스레드·카카오 채널 무료 게시 |
| D6 유료 접점 확장: 판매 상태 인지 Teaser를 astro/all/today/compatibility에, NextLens를 전 결과 페이지에 | `r/[data]/{astro,all,today}`, `compatibility/[left]/[right]`, `src/lib/nextLens.ts` | 전환 |
| D7 귀속·서버 이벤트: 첫 방문 UTM·랜딩 경로 → 주문에 저장, 결제 확정 시 서버에서 `purchase_completed` 기록, 관리자 화면에 채널별 매출 | `src/lib/attribution.ts`(신규), 마이그레이션 `billing.order_attribution`, `service.ts`, `admin/billing/page.tsx` | 채널 ROI |
| D8 출시 알림 신청(정보통신망법 §50 광고성 정보 사전 동의, 1회 발송 후 파기 — 법무 확인) | `member.marketing_preferences` 재사용 | 런치 당일 첫 매출 |

### Track F — 출시·시즌 운영
- 11-17 스테이징 전체 리허설(토스 테스트 키): 구매→열기→리포트, 웹훅 5회 재전송 시 권한 1건, 금액 변조 거부, 셀프 환불, 대시보드 취소, 고착 환불 복구, reconcile, 영수증.
- 11-24 운영 마이그레이션(직전 스냅샷) [승인] → preflight → `billing-product-admin.mjs --apply` → 내부 실카드 결제·환불.
- 11-27 코드 프리즈 · 12-01 소프트 런치 · 12-08 공개(알림 신청자 발송) · 12~2월 주간 KPI 리뷰.
- 롤백: `FEATURE_BILLING=false`로 구매 버튼만 숨김. 기존 구매자는 계속 열람.

### Track G — 출시 이후 반복 매출 (요약)
- **LUMINA+ 월간 흐름**(1월, 토스 정기결제 승인 전제): `buildYearForecast` 연도 제한 완화(2026~2030) → `src/engine/saju/monthFlow.ts`(신규) → `/plus/monthly`. 절기 시작마다 동의자에게 메일. `/account/library`에 구매·저장 결과 통합.
- **궁합 심층**(2/14 전): 카탈로그 `requiredProfiles:2`, 기존 `synastry` 엔진 + 콘텐츠·검수.
- AI 챕터: 골든셋 50건(인용 100%, 금칙어 0) 통과 후 챕터 위에 덧입힘.
- 영문 "Year of the Fire Goat"·해외 결제, 사주·타로 심층, 16유형은 라이선스·결제수단 결정 후 2027 Q1 재평가. 광고는 계속 비활성.

### 주차별 스프린트

| 주 | 코드 | 외부 |
|---|---|---|
| 09-29 | **Sprint 1**(4장): A1–A6 + 문서 | 사업자등록, 토스 가입, 법무·전문가 섭외 |
| 10-06 | ★ D1–D3(SEO 83p·색인), A8–A10 | 통신판매업, 검색엔진 등록, 카카오 키 |
| 10-13 | D4 공유 카드, A7 환불·reconcile, C5–C6(가격 공개 모드·푸터) | ★ 토스 단건·정기 심사 제출 |
| 10-20 | B4 카탈로그, B2–B3 바인딩·열기 게이트, B5 | 법무 검토 진행 |
| 10-27 | ★ B1 결정론 챕터 → 전문가 검수 송부 | — |
| 11-03 | C1–C4 구매 경로 단축, 계정 메뉴·가격 페이지 | 법무 최종본 |
| 11-10 | D5–D8 SNS 카드·접점 확장·귀속·알림 신청 | Resend·Turnstile |
| 11-17 | ★ 스테이징 전체 리허설, 결제 e2e | 전문가 서명, 인프라 유료 전환 |
| 11-24 | ★ 운영 활성화·실결제 리허설, 11-27 프리즈 | 라이브 키 |
| 12-01 | 소프트 런치 → 12-08 공개 | — |

**Plan B**: 토스 승인이 11-24까지 안 나오면 판매 상태를 `preview`로 유지하고 알림 신청을 계속 모은다. 승인 즉시 `live` 전환, 입춘(02-04) 전 캠페인으로 재집중. SEO·공유 자산은 그대로 누적된다.

---

## 4. Sprint 1 — 승인 즉시 구현할 범위

외부 DB 접근 없이 로컬에서 검증 가능한 P0만 담는다.

**상태: 완료 (2026-09-28, 이 브랜치의 첫 커밋)** — 아래 8개 항목 모두 구현·테스트·`pnpm lint`·`pnpm typecheck`·`pnpm test`(1121건)·`pnpm build` 통과. A1 미적용 상태로 되돌려 A2 테스트가 실제로 `service.ts:199`를 짚어 실패하는지 직접 재현해 검증했다. 운영 DB에는 아직 적용하지 않았다 — `pnpm db:neon:migrate`는 [승인] 후 스테이징→운영 순으로 별도 실행한다.

1. **계획 문서 저장**: 이 계획을 루트 `MONETIZATION-EXECUTION-PLAN.md`(신규)로 저장. 기존 `*-PLAN.md`는 수정하지 않음.
2. **A1 권한 마이그레이션**: `neon/migrations/20261006000000_billing_orders_receipt_locale_grant.sql` — `begin; grant insert (receipt_locale) on billing.orders to lumina_member_app; commit;` (기존 마이그레이션 형식 확인 후 맞춤). 운영 적용은 `pnpm db:neon:migrate` 원장으로 스테이징→운영 [승인].
3. **A2 정적 권한 테스트**: `neon/migrations/*.sql`을 순서대로 파싱해 역할별 컬럼 insert 권한 맵 생성 → `src/server/**/*.ts`에서 `withMemberTransaction` 안의 `insert into schema.table (cols)`를 추출 → 부분집합 단언. 수정 전 코드에서 실패(버그 재현) → 마이그레이션 추가 후 통과를 확인. `vitest.config.ts`의 node 프로젝트 include에 맞춘다.
4. **A3 구독 청구 주문 셀프 환불 차단** + 해당 SQL 조건 테스트.
5. **A4 cron 격리**(`railwayCronRun.mjs`) + `scripts/test-railway-cron.mjs` 케이스 추가, 영수증 라우트 부분 실패 200 처리.
6. **A5 `captureServerError`**: `src/lib/sentryPrivacy.ts`의 스크럽 규칙 재사용, `instrumentation.ts`와 같은 활성 조건. billing·AI·internal 라우트 catch에 연결(응답 형태는 그대로).
7. **A6 `expertReviewStatus` 확장**: 타입 `"pending" | "approved"`, facts throw 제거, 리포트 페이지가 상태를 읽어 표시. 기존 테스트 갱신.
8. 커밋 → `git push -u origin claude/ecstatic-franklin-44oub4` → Draft PR 생성 → PR 활동 구독.

---

## 5. KPI와 계측

| 층 | 지표 | 원천 |
|---|---|---|
| North Star | 결제 완료 건수·순매출 | `billing.orders`(서버 기준, 동의 게이트 영향 없음) |
| 유입 | 색인 페이지 수, 검색 노출·클릭 | Search Console, 네이버 서치어드바이저 |
| 관심 | 리포트 랜딩 방문, Teaser 클릭, 알림 신청 수 | Umami + `member.marketing_preferences` |
| 전환 | checkout_start → paid, 채널별 매출 | Umami + `billing.order_attribution` |
| 품질 | 환불률, 결제 오류, reconcile 불일치 | `/admin/billing`, Sentry |

**게이트 목표(가설 — 12월 1주 실측으로 교체)**
- 11-30: SEO 83페이지 중 70% 이상 색인, 알림 신청 수 기록 시작.
- 12-31: 유료 결제 20건 이상(`docs/IMPROVEMENT-LOOP.md` 기존 목표 유지), 환불률 10% 이하, 미해결 결제 오류 0.
- 02-07(설날): 누적 판매·재방문 데이터로 LUMINA+ 출시·가격 판단.

---

## 6. 리스크와 대응

| 리스크 | 대응 |
|---|---|
| 외부 승인 지연(PG·통신판매업·법무) | 09-29 동시 착수, `preview` 모드로 심사 요건 충족, Plan B |
| 오가닉 유입 부족 | SEO를 10월 중순 선출시, 공유 카드·SNS 카드 자동화, 네이버 등록 |
| 템플릿형 SEO 페이지 저품질 판정 | 페이지별 편집 서문·상호 링크·실계산 표, 색인률 주간 점검 |
| 전문가 검수 지연 | 10-27 챕터 송부, 미서명 시 "검수 대기" 표기 유지 여부를 법무와 결정 |
| 결제 사고 | 권한 정적 테스트, 스테이징 리허설, Sentry 알림, 10분 reconcile |
| 개인정보(프로필 스냅샷 증가) | 앱 계층 암호화 유지, 탈퇴 시 삭제, 지문은 HMAC |

---

## 7. 검증 방법

**Sprint 1 (로컬)**
- `pnpm install` 후 `pnpm lint && pnpm typecheck && pnpm test && pnpm test:railway-cron && pnpm build`.
- A2 테스트는 A1 마이그레이션 없이 실패하고, 추가 후 통과하는지 확인(버그 재현 증거).
- Next 16 API 사용 시 `node_modules/next/dist/docs/` 가이드 확인(AGENTS.md 지침).

**출시 전 (스테이징·운영, [승인])**
- `pnpm db:neon:migrate`(dry-run → apply, 두 번째 실행 적용 0건), `pnpm db:neon:verify-rls`.
- 토스 테스트 키 리허설 체크리스트(Track F), `pnpm railway:preflight`, `pnpm railway:smoke`.
- Search Console 커버리지, `/admin/billing` 순매출·환불률, Sentry 알림 수신 확인.

---

## 8. 결론

1. **지금 막힌 것은 코드가 아니라 순서다.** 외부 승인(최장 경로)과 SEO(시즌 선행)를 09-29에 동시에 시작한다.
2. **첫 결제를 막는 권한 버그부터 고친다.** Sprint 1은 P0 결함 6개를 테스트와 함께 닫는다.
3. **광고한 만큼의 상품, 4단계 구매, 공유되는 결과**가 12월 전환율을 결정한다.
4. 12월 이후는 카탈로그 구조 위에 LUMINA+ 월간 흐름과 궁합 심층을 얹어 반복 매출로 간다.

### 핵심 파일
- `src/server/billing/service.ts`, `src/server/billing/subscriptions.ts`
- `neon/migrations/20260928000000_billing_core.sql`(권한 408행)
- `src/app/premium/saju-2027/report/page.tsx`, `src/app/premium/saju-2027/page.tsx`
- `src/components/premium/CheckoutButton.tsx`, `src/components/premium/PremiumTeaser.tsx`
- `src/engine/saju/yearForecast.ts`, `src/server/ai/facts.ts`
- `scripts/lib/railwayCronRun.mjs`, `src/app/sitemap.ts`, `src/lib/shareCode.ts`
