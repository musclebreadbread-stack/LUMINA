# LUMINA 지속 개선 루프

## 목적과 실행 범위

근거가 확인된 제품·운영 문제를 우선순위에 따라 하나씩 개선하고, 결과를 검증해 다음 작업에 반영합니다. 이 루프는 활성 Codex 작업 턴에서 실행됩니다. Windows 네이티브 환경에서 세션이 끝난 뒤 자동으로 살아 있는 관찰 프로세스를 가장하지 않습니다.

## 반복 절차

1. **관찰:** 상용화 계획의 미완료 기준, 운영 도메인·Railway 배포·cron·Neon 상태, 익명 집계 지표, 사용자 피드백, 테스트와 오류 보고를 확인합니다. 개인 식별 데이터나 비밀값은 개선 신호로 수집하거나 문서화하지 않습니다.
2. **분류:** 확인된 장애·데이터 손상 위험은 P0, 주요 사용자 흐름의 실패는 P1, 검증된 기능 공백은 P2, 시각적·운영 편의 개선은 P3로 둡니다. 추측과 실제 관찰을 구분합니다.
3. **선택:** 사용자 영향, 증거의 강도, 수정 범위, 되돌리기 가능성을 함께 고려해 가장 가치가 높은 한 항목을 선택합니다. 불명확한 정책·가격·계약 조건을 임의로 정하지 않습니다.
4. **구현:** 관련 파일과 현재 동작을 먼저 읽고, 저장소의 스킬 사전 점검을 수행합니다. 변경 범위를 좁히고, 승인된 정책 게이트와 데이터 권한 경계를 보존합니다.
5. **검증:** 변경에 맞는 lint·typecheck·테스트·build를 실행합니다. 운영 변경은 도메인·인증 보호 경로·DB/RLS·예약 작업 등 해당 경로를 직접 확인하고, 기대와 다른 결과는 완료로 보고하지 않습니다.
6. **갱신:** 결과, 검증 증거, 남은 제약과 다음 우선 항목을 이 문서 및 이어지는 작업 목표에 반영합니다. 실패한 접근은 같은 방식으로 반복하지 않습니다.

## 배포 및 정책 경계

- Neon은 LUMINA 업무 데이터베이스로 유지하고 Railway Postgres는 Umami 분석 저장소로 사용합니다.
- 코드 수정과 외부 운영 변경을 구분합니다. 새로운 운영 배포, 데이터 마이그레이션, 기능 플래그 활성화처럼 되돌리기 어렵거나 실제 사용자에게 영향을 주는 작업은 해당 범위에 대한 명시적 승인이 있어야 합니다.
- Phase 9의 상품별 완료 기준과 레퍼럴 보상, 선물 환불·양도, 가격 실험, 마케팅 메일 정책은 확정된 요구사항만 반영합니다. 관련 기능 플래그는 법무·계약·상품 조건이 확인될 때까지 기본 비활성으로 둡니다.
- 분석에는 합계 트래픽·허용된 이벤트만 사용합니다. 개인 정보, URL 내 민감 데이터, 자격 증명은 분석 이벤트나 진단 로그에 넣지 않습니다.

## 수익화 목표와 경쟁 포지션

- **North Star:** 실제 매출은 `billing.orders`의 결제 완료 금액에서 확정 환불액을 뺀 순매출로 계산합니다. 동의 기반 웹 분석 수치는 유입·행동 퍼널 진단에만 쓰고 매출 원장으로 취급하지 않습니다.
- **상품 가설:** 초기에는 한국어 2027 신년 사주 리포트 단건 구매를 검증합니다. 계획 문서의 ₩9,900은 미승인 가격 가설입니다. 가격, 상품별 완료 기준, 환불·양도 규칙을 승인하기 전에는 판매가와 결제 기능을 공개·활성화하지 않습니다.
- **첫 30일 목표 가설:** 출시 승인 후 적격 상품 페이지 방문 1,000건을 검증 표본으로 확보하고, 결제 전환율 2%를 내부 목표로 둡니다. 목표 전환이 맞으면 20건 판매이며, 가설 가격 ₩9,900 기준 총 결제액은 ₩198,000입니다(수수료·환불 전). 이는 예측이나 보장이 아니며, 방문 1,000건 미만이면 가격 실험 결과를 판단하지 않습니다. 2,500건 방문·50건 판매는 확장 목표입니다.
- **주간 퍼널:** 동의된 집계 방문 → 기본 분석 CTA → 결제 진입 → 결제 완료 → 확정 환불 → 순매출. 상품 방문·CTA 비율은 개인 정보 없이 집계하고, 결제·환불·매출은 billing 원장과 대조합니다. 이메일·리퍼럴·가격 A/B 실험은 각각 승인 게이트가 열리기 전까지 운영하지 않습니다.
- **경쟁 기준:** 포스텔러는 Google Play 소개에서 6,000개 이상의 읽을거리와 46개 주제 등 폭넓은 카탈로그를 제시하고, The Pattern은 구독형 글·오디오 인사이트와 관계 분석을 묶어 제공합니다. LUMINA는 콘텐츠 양이나 구독 카탈로그로 맞서기보다, 계산 근거·해석 한계·총 결제액을 확인할 수 있는 단건 리포트를 차별점으로 검증합니다. ([포스텔러](https://play.google.com/store/apps/details?hl=ko&id=com.un7qi3.forceteller), [The Pattern 구독 안내](https://thepattern.zendesk.com/hc/en-us/articles/360055659311-What-does-the-Go-Deeper-Subscription-include))
- **현재 차단 요인과 순서:** production에는 결제 기능 플래그, 결제 전용 DB 연결, Toss 키, 법률 문서 승인 버전이 준비되지 않았습니다. 상품·가격·환불 정책 승인 → 결제 DB/RLS 및 로그인 준비 → Toss 테스트 결제·환불 검증 → 운영자 승인 후 production 활성화 순으로 진행합니다. 기존 차단 게이트를 우회하지 않습니다.

## 현재 개선 대기열

| 우선순위 | 항목 | 상태와 다음 단계 |
|---|---|---|
| P1 | Phase 9 상품별 DoD와 정책 승인 조건 | 기술 DoD를 `COMMERCIALIZATION-PLAN.md`에 구체화했고, 승인 조건과 분리했다. 보상·가격·환불·메일 등 정책 값은 승인 후에만 확정·활성화 |
| P1 | 2027 리포트 유입·전환 측정 | 동의 기반 익명 이벤트와 관리자 퍼널 건수를 구현했고, 이벤트 건수 단계비율도 참고 지표로 표시한다. 개인 단위 전환이나 매출로 해석하지 않는다. 배포 후 적격 방문 1,000건 표본을 관찰하고, 승인 후 주문·환불·순매출을 원장과 대조한다. |
| P1 | Phase 1 production 서버 오류 모니터링 | production `SENTRY_DSN`이 없어 서버 오류가 Sentry로 전송되지 않는다. preflight는 비활성 상태를 경고하되 서비스를 시작하고, 부분·잘못된 활성화는 차단하도록 보강했다. 완료 전 Sentry 설정, 테스트 오류 전송, 수신 경보를 확인한다. |
| P1 | 실제 결제 개통 | production 회원 인증·결제 기능 플래그, `BILLING_DATABASE_URL`, Toss 키, billing·회원 동의 문서 버전이 준비되지 않았다. 사용자가 정책·PG 미준비를 확인했다. 승인 전까지 판매는 닫고, 값이 마련되면 staging 결제·환불·RLS 검증 후 별도 production 절차로 진행한다. |
| P2 | Railway 분석 저장소 권역 정렬 | `web`과 cron은 Singapore지만 Umami와 볼륨이 있는 Railway Postgres는 SFO다. 상태 저장소 이동 전 백업·복원 검증, 중단 허용 범위와 롤백 절차를 마련한다. |
| P2 | Railway cron 실행 결과 가시성 | 비식별 구조화 로그를 production에서 확인했다. 2026-10-08 `cron-10min`을 저장소 기준으로 갱신한 뒤 첫 실행에서 예상한 3개 작업이 모두 정책 게이트로 건너뛰어졌고, `cron-daily` 분석 롤업은 성공했다. 실제 결제·AI 작업 검증은 승인 게이트가 열릴 때 수행한다. staging에는 cron 서비스가 없다. |
| P2 | Phase 9 PWA 설치 인수 검증 | Chromium에서 standalone manifest와 아이콘, 오프라인 진입·복구, 비공개 경로 비저장, 실제 서비스 워커 버전 교체를 검증했다. OS 설치 UI와 설치된 앱 단독 실행은 기기별 검증이 남았다. |
| P2 | Phase 2 회원 인증 staging E2E | staging DB 역할과 Railway URL 연결은 준비됐지만 `FEATURE_MEMBER_AUTH=false`를 유지 중이다. 승인된 OAuth/메일/Turnstile 설정과 법무 동의 버전이 준비된 뒤 로그인·프로필·교차 사용자 RLS 흐름을 검증한다. |

## 최근 개선 기록

- **2026-09-27:** Phase 9 기술 DoD와 정책 출시 승인을 분리해 문서화했다. 성장 기능 9개가 기능 플래그와 승인 변수를 모두 요구하고, 마케팅 정책 버전이 유효해야 열리는지 검증하는 테스트 28개가 통과했다. 이번 변경은 코드·문서 검증만 포함하며 DB·배포·운영 플래그는 변경하지 않았다. 다음 우선 작업은 배포 전 환경 설정 검사 자동화다.
- **2026-09-27 추가 순환:** Railway 프로덕션에서 `APP_ENV`와 9개 기능·승인 변수를 값 비노출 방식으로 확인했다. Docker 시작 가드와 `railway:preflight` 명령을 추가해 형식 오류·승인 누락·잘못된 마케팅 정책 버전이 앱 시작 전에 차단되도록 했다. `/api/account/auth/get-session`의 503은 회원 인증 기능·법무 승인이 꺼진 운영 설정과 일치했다. 게이트 회귀 테스트 42개, 전체 테스트 1,162개, 린트·타입 검사·Next 빌드가 통과했다. Docker 엔진이 없어 컨테이너 이미지 실행과 이번 코드의 Railway 배포는 검증하지 않았다.
- **2026-09-27 추가 순환:** `railway:smoke`와 오프라인 회귀 테스트를 추가했다. 운영 도메인에서 GET/HEAD만으로 홈페이지, 헬스체크, 세션, 비인증 롤업 401, Umami 스크립트, BGM 응답을 확인했고 6개 모두 통과했다. 비인증 롤업은 DB 쓰기 전에 401로 종료하며 분석 전송 endpoint에는 요청하지 않았다. 이 변경은 코드·문서 검증만 포함한다. 다음 우선 작업은 Docker 엔진 복구 후 이미지 빌드와 시작 preflight를 확인하는 것이다.
- **2026-09-27 개인정보 경로 개선 및 배포:** 실제 Railway 응답에서 `/ja`, `/zh-Hant`, `/es`의 `/p`·`/r` 6개 URL이 `strict-origin-when-cross-origin`으로 나와 개인정보 경계 DoD와 다름을 확인했다. 지원 로케일 목록에서 공유 URL 헤더 규칙을 생성하도록 수정하고, 5개 언어의 `/p`·`/r` 10개 읽기 전용 검사를 추가했다. 로컬 Next production build에서 10/10, 전체 테스트 1,164개·린트·타입 검사·빌드가 통과했다. Railway 원격 Docker 빌드와 배포 후 웹 서비스 Online, 9개 성장 게이트 preflight, 운영 16/16 smoke를 확인했다. DB·환경 변수·기능 플래그는 변경하지 않았고 분석 이벤트도 보내지 않았다. 다음 우선 작업은 staging migration 재실행 멱등성 및 2개 계정 RLS 교차 조회 검증이다.
- **2026-09-27 staging DB·배포 검증:** staging endpoint가 production과 다른 Neon임을 가드로 확인하고, migration dry-run 대기 0건 및 연속 `--apply` 두 번 모두 `appliedCount: 0`을 확인했다. 합성 `.invalid` 사용자·프로필 두 건으로 기존 RLS 검증기를 실행해 38개 테이블을 점검했고 양방향 모두 본인 1행·교차 0행이었다. 임시 행을 삭제하고 `lumina_member_app` 암호를 기존 미설정 상태로 복구했다. staging 웹은 오래된 이미지와 Neon Auth 환경변수 누락 때문에 세션 500 및 공유 헤더 실패가 있었으며 staging 전용 base URL·쿠키 키를 반영한 뒤 Railway deployment `6f14392c-168f-4e3e-bdd3-254cd1cd6baf`를 배포했다. staging preflight 9/9와 smoke 16/16, production preflight 9/9와 smoke 16/16을 확인했다. staging Umami 서비스는 없고 smoke는 의도된 비활성 503을 확인한다. 회원 인증·결제·AI 기능 플래그와 production 설정은 변경하지 않았고 분석 이벤트를 보내지 않았다. 다음은 승인된 회원 인증 제공자·메일·Turnstile 설정과 동의 정책 버전이 준비된 뒤 Phase 2 로그인 E2E를 수행하는 것이다.

대기열은 새 증거나 사용자의 수정 지시가 들어오면 다시 우선순위를 정합니다. 코드에서 차단 정책을 구현하는 일과 실제 판매·메일 발송·AI 호출을 활성화하는 일은 서로 다른 승인 범위로 취급합니다.

## 2026-09-28 2027 리포트 매출 퍼널 계측

- **관찰:** 무료 분석 CTA를 상품 첫 화면 아래로 옮겼지만, 상품 페이지에 들어온 수와 CTA 클릭·결제 의향을 서로 구분할 이벤트가 없었다. 기존 이벤트 패널도 이 상품의 구매 여정을 보여주지 않았다.
- **변경:** 동의 선택이 있을 때만 `premium_report_view`, `premium_report_free_analysis_click`, `premium_report_checkout_start`를 보낸다. 세 이벤트에는 고정된 `analysis: saju`만 담고 URL·계정·프로필·출생정보·금액은 전송하지 않는다. 결제 시작은 구매 약관과 철회 안내 확인 이후 주문 API 요청을 시작할 때 기록한다. 관리자 분석의 전체 또는 사주 보기에서 일일 롤업 건수를 확인하도록 했다. 결제 제안·판매가·정책 플래그는 변경하지 않았다.
- **목표와 판정:** 30일 표본 목표는 이전에 정한 적격 방문 1,000건이며, 2% 전환·20건 판매는 미검증 내부 가설이다. 화면 이벤트는 건수이고 고유 방문자 수나 완료 결제가 아니다. 완료 주문·확정 환불·순매출은 `billing.orders` 원장만 기준으로 한다. 현재 production 결제 게이트가 닫혀 있어 주문 목표를 검증할 수 없다.
- **시장 근거와 한계:** 포스텔러 공식 Google Play 소개는 6,000개 이상의 무료·유료 운세와 46개 주제를 내세우며, The Pattern은 글·오디오·프로필·관계 기능을 구독 묶음으로 안내한다. 따라서 LUMINA는 카탈로그 폭이나 구독 혜택을 모방하기보다 계산 근거·해석 한계가 드러나는 단건 상품의 구매 의사를 측정한다. RevenueCat의 2026 수치는 앱 구독의 다운로드 후 35일 기준으로 freemium 중앙값 2.1%, hard-paywall 10.7%를 제시한다. 이는 웹의 단건 상품과 표본·분모·구매 모델이 달라 LUMINA 전환 목표나 전망치로 사용하지 않는다. ([포스텔러](https://play.google.com/store/apps/details?hl=ko&id=com.un7qi3.forceteller), [The Pattern](https://thepattern.zendesk.com/hc/en-us/articles/360055659311-What-does-the-Go-Deeper-Subscription-include), [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps-2026))
- **검증:** 퍼널 관련 회귀 22/22, 전체 146개 테스트 파일·1,183개 테스트, `pnpm.cmd` lint·typecheck·Next production build가 통과했다. skill-manager `verify --run`은 Windows에서 bare `pnpm`을 찾지 못해 `WinError 2`였으며 직접 실행 게이트는 모두 통과했다. Railway production 배포 `d7c21db4-e8cb-4424-b008-3215f3d62448` 성공 후 비변경 smoke 18/18, 브라우저에서 상품 페이지 200·무료 CTA 표시와 `/saju` 연결·미리보기 존재·페이지 오류 없음·정책상 구매 패널 미노출을 확인했다. 검증 중 분석 이벤트는 보내지 않았다.
- **다음:** 관리자 화면에서 2027 상품 이벤트 유입을 관찰한다. 주문 수·환불·순매출 패널은 결제 정책과 운영 게이트가 승인되어 실제 주문 원장을 쓸 수 있을 때 추가한다. 구매 정책과 billing 설정을 승인 없이 활성화하거나 가격 A/B를 실행하지 않는다.

## 2026-09-28 결제 원장 순매출 관리자 노출

- **관찰:** `getBillingKpiSummary()`가 최근 30일 KRW 주문에서 성공 처리된 환불액을 뺀 `netRevenue30dKrw`를 계산했지만, 반환 타입과 `/admin/billing` 화면에는 노출하지 않았다. 그래서 운영자가 계획의 매출 North Star를 결제 원장과 함께 확인할 수 없었다.
- **변경:** 기존 원장 집계값을 서버 전용 관리자 요약 타입에 포함하고 결제 관리 화면 첫 번째 지표로 표시했다. 최근 30일 결제분에서 성공한 환불을 뺀다는 정의를 한국어·영어로 덧붙였다. 기존 owner 접근 통제와 결제 플래그를 유지했다.
- **검증·운영 경계:** SQL·스키마·가격·결제 설정은 변경하지 않았다. 코드 검증 후 승인된 범위의 코드 커밋·푸시만 진행하고 Railway 운영 배포나 운영 데이터 조회는 별도 승인 전까지 하지 않는다.
- **다음:** 결제·환불 정책과 사업 설정이 승인되어 운영 주문이 생기면 이 지표를 원장 합계와 대조한다. 승인 전까지 판매 기능은 비활성으로 유지한다.

## 2026-09-30 최근 결제분 순매출의 환불 연결

- **관찰:** 관리자 지표는 최근 30일에 결제된 KRW 주문의 순매출로 설명하지만, SQL은 성공 환불에도 최근 30일의 `processed_at` 조건을 적용했다. 그 결과 최근 결제 주문이 30일보다 늦게 환불되면 주문 금액에서 환불액이 빠지지 않았다.
- **변경:** 최근 30일 결제 주문 코호트는 그대로 두고, 그 주문에 연결된 모든 성공 환불액을 처리 시점과 관계없이 차감하도록 했다. 환불 합계 대상도 해당 코호트의 결제만 포함한다. 관리자 설명은 이 코호트 기준을 명시하며 데이터 구조와 결제 설정은 변경하지 않았다.
- **검증:** KPI 집중 테스트 3/3, 전체 Vitest 166개 파일·1,384개 테스트, lint, typecheck, Next production build가 통과했고 코드 리뷰 승인을 받았다. SQL 테스트는 기간 필터·코호트 연결·성공 상태를 확인했으며, skill-manager `verify --run`은 Windows bare `pnpm` 경로 문제로 네 검사 모두 `WinError 2`였고 같은 게이트를 `pnpm.cmd`로 직접 통과했다.
- **운영 경계·다음:** 실제 PostgreSQL 실행계획과 운영 주문·환불 원장 대사는 검증하지 않았다. 이 화면 산식은 계획상 재무·제품 정의 승인도 남아 있어 확정 회계 지표가 아니다. 결제 플래그 활성화, 운영 DB 변경, 배포 없이 코드만 검증했다.

## 2026-09-30 결제 지표의 빈 원장·산출 정보

- **관찰:** billing DB가 연결되어도 최근 30일 결제 주문이 하나도 없으면 집계 쿼리가 결과 행을 만들지 않았다. 이때 관리자 화면에서 MRR 0과 초기 상태를 볼 수 없었고, 운영 지표 DoD의 산출 시각과 원천도 표시하지 않았다.
- **변경:** `active` 요약을 집계의 기준으로 두고 결제 코호트를 left join해 매출이 없어도 KPI가 0으로 반환되도록 했다. 서버 계산 완료 시각을 ISO UTC로 내리고 화면에는 KST 표시 시각과 billing 원장·AI 사용량 원천을 안내한다. 산식과 기능 게이트는 바꾸지 않았다.
- **검증:** KPI 집중 테스트 3/3, 전체 Vitest 166개 파일·1,384개 테스트, ESLint, TypeScript typecheck, Next production build 통과. 테스트는 유료·환불 표본, 무매출 기본값, null 분모, 계산 시각과 SQL의 빈 코호트 경계를 확인한다. skill-manager `verify --run`은 Windows에서 bare `pnpm` 실행 파일을 찾지 못해 네 검사 모두 `WinError 2`였고 같은 gate를 `pnpm.cmd`로 직접 통과했다.
- **운영 경계·다음:** finance-approved 산식, Neon 실데이터 대사, AI 사용량 DB 동시성/가용성은 별도 운영 검증이 남아 있다. DB 구조·설정·배포는 변경하지 않는다.

## 2026-09-27 staging 회원 인증 DB 역할 준비

- **관찰:** staging Neon에는 `lumina_auth_app`과 `lumina_member_app` 역할이 있었지만 비밀번호가 설정되지 않았고, Railway staging 웹에는 두 연결 URL이 없었다. `FEATURE_MEMBER_AUTH=false`이며 Better Auth, Resend, Turnstile 설정도 준비되지 않았다.
- **변경:** `scripts/neon-configure-member-auth-roles.mjs`를 추가했다. 기본 dry-run은 staging endpoint, 역할 권한·RLS·비밀번호 상태와 로컬 환경 파일을 검사하고, `--apply`는 staging 전용 랜덤 비밀번호 생성과 연결 검증 후 `.env.staging.local`에 두 URL을 기록한다. production endpoint는 거부하며 비밀번호와 URL은 출력하지 않는다. 실행 스크립트는 `db:neon:configure-member-auth-roles`로 등록했다.
- **적용과 검증:** staging 전용 역할의 제한 권한·강제 RLS·정책을 통과한 뒤 두 URL을 Railway staging `web` 서비스에 배포 없이 설정하고 deployment `3859b56e-be76-4293-bb6f-4521daa62a9a`를 재배포했다. 두 역할의 실제 연결 검증, 성장 기능 preflight 9/9, 읽기 전용 smoke 16/16을 확인했다. 회원 인증 세션 endpoint는 기능 플래그가 꺼져 있어 503을 반환했고, production 서비스·DB·변수는 변경하지 않았다.
- **다음:** 이메일/OAuth 제공자, 메일 발신자, Turnstile, 승인된 동의 문서 버전이 준비되기 전까지 회원 인증을 비활성 상태로 유지한다. 값이 준비되면 staging 로그인·교차 사용자 RLS E2E를 검증한 후 production 반영을 별도 단계로 진행한다.

## 2026-09-27 production 관측성 시작 가드

- **관찰:** Railway production 웹·DB·cron이 Online/Completed이고 현재 도메인 smoke는 16/16 통과했다. Vercel CLI는 연결된 `lumina-cognitive` 프로젝트를 `project_not_found`로 반환했다. production에는 `SENTRY_DSN`이 없어 Next instrumentation이 서버 오류를 전송하지 않는다.
- **변경:** `scripts/railway-preflight.mjs`가 production에서 Sentry 서버 보고가 꺼진 경우 값 없이 경고하고 서비스를 시작하도록 했다. 반대로 Sentry를 명시적으로 켰는데 DSN이 없거나 enable 값이 잘못된 경우는 시작 전에 차단한다. 비밀값을 진단 출력에 포함하지 않는다.
- **검증·배포:** 사전 점검 46개, 전체 140개 테스트 파일·1,168개 테스트, lint·typecheck·build가 통과했다. Railway staging 배포 `91569706-28f5-4db7-b4dd-e38f1c807b09`과 production 배포 `196ca5c4-ac2c-4395-8ce1-0e23c2928a41`이 모두 `SUCCESS`다. 실제 production 시작 로그에서 고정 Sentry 비활성 경고를 확인했고 서비스 `Online`, 도메인 smoke 16/16, 회원 인증 503을 재확인했다. 상품·회원·결제·AI 기능 플래그는 모두 비활성이고 DB 마이그레이션은 실행하지 않았다.
- **다음:** 실제 오류 알림 완료 기준을 충족하려면 Sentry 프로젝트 DSN을 설정하고 테스트 오류가 Sentry에 도달하는지와 담당자 경보 수신을 확인해야 한다. 이 값이 준비되기 전에도 현재 경고는 production 시작 로그에 남으며, 다음 P2는 정책 입력이 마련된 뒤 Phase 2 staging 로그인 E2E다.

## 2026-09-27 production cron 권역·소스 정렬

- **관찰:** Railway production `web`은 Singapore `asia-southeast1-eqsg3a`였지만 두 cron은 SFO였고, 런타임 Neon 분석 endpoint는 `ap-southeast-1`이었다. cron은 계획의 배치 권역과 달랐다.
- **변경:** `cron-10min`을 Singapore로 옮기고 `*/10 * * * *` 예약을 보존했다. `cron-daily`도 옮긴 뒤 기존 소스 재빌드에서 `@vercel/analytics`가 남은 것을 확인해 현재 저장소를 다시 업로드했다. 기능 승인 플래그·환경 변수·업무 DB는 바꾸지 않았다.
- **검증:** `cron-10min` 권역 배포 `bd4d7b76-255b-4c55-9d0f-b6c2d4676195`와 `cron-daily` 현재 소스 배포 `2e0d9a6a-9754-4fa4-aa9b-3b792af89236`이 모두 `SUCCESS`; 두 cron의 권역·예약·시작 명령이 유지됐다. 03:50 UTC 10분 작업 후 다음 예약이 04:00 UTC로 갱신됐다. 운영 도메인 GET/HEAD smoke 16/16 통과, 분석 이벤트 0건이다.
- **남은 확인:** `cron-daily`는 17:00 UTC 실행 전이라 새 이미지의 실제 Neon 롤업 결과는 미확인이다. 다음 순환에서 해당 로그를 확인하고, 이어서 DSN 제공이 필요한 Sentry 경보 수신을 확인한다.

## 2026-09-27 Railway 분석 DB 권역 후속 순환

- **관찰:** production 서비스 목록에서 `web`, `cron-daily`, `cron-10min`은 Singapore이고 기존 Umami와 기존 `Postgres`는 SFO다. 기존 DB 볼륨은 5,000 MB 중 약 157.5 MB를 사용한다. Railway Hobby 화면에는 백업/PITR이 비활성이라고 표시된다.
- **권역 이동 조건:** 기존 Postgres 설정의 Scale > Regions에서 권역 선택은 가능하다. Railway 안내에 따르면 연결 볼륨은 새 권역으로 이행되며 이동 중 서비스 중단이 발생한다. 따라서 오프사이트 `pg_dump` 생성과 별도 복원 검증, 중단 시간 및 롤백 절차가 확인되기 전에는 기존 Umami DB를 움직이지 않는다. 참고: [Railway Regions](https://docs.railway.com/deployments/regions), [Postgres 백업·복원](https://docs.railway.com/guides/postgres-backups-restores).
- **생성 UI 안전 교훈:** Railway 프로젝트의 Create > Database에서 PostgreSQL을 고르면 권역 사전 확인 없이 곧바로 production 서비스를 만들고 기본 권역에 배포한다. DB 생성 흐름을 설정 화면 확인 용도로 선택하지 않는다. 기존 DB의 권역은 해당 서비스 설정에서 검토하고, 볼륨 이행 경고를 확인한 후 별도 변경 단계로 취급한다.
- **운영 정리:** 이번 점검 중 신규 `Postgres-b2aR` 서비스와 `postgres-volume-a1qN`이 생성됐다. 기존 DB 덤프·복원, Umami 연결, 앱 변수 변경은 하지 않았다. 사용자가 서비스와 볼륨 삭제를 승인한 뒤 서비스 ID `8448e927-cda9-4803-9046-92b7096ebedf`를 삭제했다. 연결 볼륨 ID `fbe5c35c-77c4-4aa0-bb0b-210105dfa459`도 Railway CLI에서 삭제 요청을 수락했으나, 직후 목록에는 `isPendingDeletion: true`로 남아 최종 제거 확인이 필요하다. 기존 `Postgres`, Umami, web은 계속 `SUCCESS`였고 production 읽기 전용 smoke도 16/16 통과했다.
- **다음 순환:** 볼륨의 pending deletion이 목록에서 사라졌는지 읽기 전용으로 재확인한다. 2026-09-27 17:00 UTC 이후 `cron-daily` 첫 롤업 실행 로그도 확인한다. 분석 DB 이동은 백업 복원 검증과 허용 중단 시간이 갖춰진 뒤 다시 평가한다.

## 2026-09-27 분석 URL 공유 토큰 보호

- **관찰:** private report 경로 `/p/[id]`의 128-bit capability ID가 동의 후 Umami pageview URL 및 Sentry request URL에 포함될 수 있었다. 브라우저에서 Umami를 직접 호출하는 경우 client URL 정제만으로 전송 경로를 막지 못했고, `/ko/p/[id]` 기본 로케일 별칭도 정제기를 우회했다.
- **변경:** 공통 URL 정제기는 `/p/[id]`를 `/p/[share]`로 익명화하고 `/ko` 및 percent-encoded 경로 별칭을 정규화한다. malformed path escape는 전송 전에 차단한다. Umami Route Handler는 upstream 전달 전 `url`과 `referrer`를 서버에서 다시 정제하고, 유효한 URL이 없는 이벤트는 차단한다. Sentry와 Umami 회귀 테스트를 추가했다.
- **검증:** 관련 세 테스트 파일 54개, 전체 lint·typecheck, 142개 테스트 파일·1,184개 테스트, production build 및 `git diff --check`가 통과했다. skill-manager postflight wrapper는 Windows에서 `pnpm`을 찾지 못했지만 동일 품질 게이트를 `pnpm.cmd`로 직접 통과했다. 이 개인정보 보호 수정은 아직 production에 배포되지 않았다.
- **다음:** privacy fix는 production 배포 승인 후 반영하고, 배포 직후 읽기 전용 smoke를 다시 실행한다. 삭제 대기 볼륨이 목록에서 제거됐는지와 17:00 UTC 이후 `cron-daily` 첫 롤업 로그도 읽기 전용으로 재확인한다.

## 2026-09-27 관리자 분석 장애 안내

- **관찰:** Neon 분석 롤업 조회가 실패했을 때 Umami 설정 여부만으로 오류 문구를 선택해, Umami 미설정 상태에서는 실제 DB 조회 실패를 마이그레이션 누락으로 단정했다. 한국어 문구도 손상되어 있었다.
- **변경:** 롤업 가용성과 Umami 설정 상태를 별도 안내로 표시한다. Neon 롤업 실패는 현지화된 안내 한 번만 보이고, Umami 미설정 힌트는 별도로 유지한다. 두 설정 상태를 확인하는 서비스 회귀 테스트를 추가했다.
- **검증:** 전체 lint·typecheck, 142개 테스트 파일·1,185개 테스트, production build, 번역 JSON 및 `git diff --check`가 통과했다. skill-manager postflight runner는 Windows에서 `pnpm` 실행 파일을 찾지 못했으나 직접 실행한 `pnpm.cmd` 품질 게이트는 통과했다.
- **다음:** 로컬 코드 검증은 완료했다. 이전 개인정보 보호 수정과 이번 UI 안내는 production에 배포되지 않았으며, 기존 승인 경계가 해소된 뒤 production 반영과 읽기 전용 smoke를 진행한다.

## 2026-09-27 관리자 분석 렌더 회귀와 Railway 자원 정리

- **관찰:** 장애 안내 수정은 서비스 단위 테스트로 확인했지만 실제 Server Component 렌더에서 중복 문구와 안내 문단 분리를 보장하는 회귀 검증은 없었다. 사용자가 삭제를 승인한 빈 DB 볼륨은 삭제 요청 뒤에도 Railway의 유예 기간 동안 목록에 남는다.
- **변경:** en/ko 장애 상태를 `renderToStaticMarkup`으로 렌더하는 DOM 회귀 테스트를 추가했다. 현지화 장애 문구는 한 번만 보이고, 한국어 설정 힌트는 별도 문단으로 표시되며, 영어 설정 완료 상태에서는 해당 힌트가 숨겨지는지 확인한다. detached volume `fbe5c35c-77c4-4aa0-bb0b-210105dfa459`의 삭제 요청은 승인된 범위에서 완료했다.
- **검증:** `pnpm.cmd run lint`, `pnpm.cmd run typecheck`, 전체 143개 테스트 파일·1,187개 테스트, `pnpm.cmd run build`가 모두 통과했다. React·TypeScript 독립 리뷰에서 추가 지적이 없었다. 최신 Railway 조회에서 실수 DB 서비스 `Postgres-b2aR`는 없고, 해당 볼륨은 `isPendingDeletion: true`, 영구 삭제 예정은 2026-09-29 04:33:57 UTC로 확인했다. 직전 조회에서 일시적으로 목록에서 빠진 결과는 이 최신 응답으로 정정한다. 기존 `Postgres`는 남아 있으며 production `web`, DB, Umami, 두 cron 배포는 모두 `SUCCESS`; `lumina.jack.ai.kr`과 `/api/health` HTTP smoke는 200, `cron-daily`는 17:00 UTC 예약 상태다. Railway 문서는 삭제가 큐에 들어간 뒤 48시간 내 영구 삭제된다고 설명한다. skill-manager `verify --run`은 bare `pnpm`을 찾지 못해 네 명령이 모두 `WinError 2`로 실패했지만 동일한 lint·typecheck·test·build를 `pnpm.cmd`로 직접 통과했다.
- **다음:** 2027년 절기 독립 대조 공백은 이번 순환에서 보완했다. 2026-09-29 04:33:57 UTC 이후 볼륨의 영구 삭제 여부와 17:00 UTC 이후 `cron-daily` 실제 롤업 로그를 읽기 전용으로 재확인한다. Sentry DSN/경보 수신은 값 제공 후 검증하고, privacy 수정과 관리자 안내 UI는 별도 배포 승인 후 production에 반영한다.

## 2026-09-27 2027 절기 독립 대조 범위 보강

- **관찰:** Phase 4의 2027 신년운세는 12개 월운 경계를 절입으로 구분한다. 엔진 경계 테스트와 95% 초과 라인 커버리지는 있지만, `lunar-javascript` 독립 절기 대조의 기존 8개 연도 표본에는 판매 대상인 2027년이 빠져 있었다.
- **변경:** 독립 대조 연도 집합에 2027년을 넣어 해당 해의 24절기 시각을 별도 구현체와 검사한다. 판정 허용 오차는 기존 90초 기준을 그대로 사용한다.
- **검증:** `solarTerms.test.ts` 13개, 전체 143개 테스트 파일·1,187개 테스트, lint·typecheck·production build가 통과했다. `lunar-javascript`가 생성한 2027 절기 표본도 기존 90초 허용 오차를 통과했다. `yearForecast.ts` 단독 측정은 statement/line 98.79%, branch 92.3%, function 100%였다. skill-manager `verify --run`은 bare `pnpm` 실행 경로가 없어 네 작업 모두 `WinError 2`로 실패했지만, 동등한 `pnpm.cmd` 게이트는 모두 통과했다. Railway volume 삭제는 완료로 단정하지 않고 `pending deletion`부터 영구 제거까지 상태를 구분한다.
- **다음:** 전문가 검수 서명은 외부 입력 전까지 `pending`으로 유지한다. Railway 볼륨은 삭제 예약 시각 이후에만 최종 제거를 확인하고, daily cron 결과는 예정된 17:00 UTC 실행 이후 확인한다.

## 2026-09-27 Railway cron 실행 결과 관측성

- **관찰:** production `cron-10min`의 05:00, 05:10, 05:20, 05:30 UTC 로그에는 `Starting Container`만 있었다. 예약 서비스와 실행 코드를 확인했지만 작업 성공·실패 또는 승인 게이트로 건너뛴 수를 구분할 로그가 없었다. `cron-daily` 다음 예약은 17:00 UTC라 이번 점검 시점에는 롤업 결과가 아직 없었다.
- **변경:** 공통 cron runner를 추가해 JSON 시작·작업 완료·실패·최종 요약을 기록한다. 로그에는 예약 이름, 고정 작업 이름, 성공·건너뜀·미시작 개수, 경과 시간만 포함한다. 예외 메시지, 응답 본문, URL 및 환경 변수 값은 로그에 복사하지 않는다. 기존 작업 순서와 기능·정책 게이트는 유지했다.
- **검증:** 전용 Node 테스트 7개, 10분·일일 모든 승인 게이트 누락 검증, 내부 요청의 환경·origin·경로·Bearer·redirect·본문 비기록 테스트가 통과했다. 전체 lint·typecheck, 143개 파일/1,187개 테스트, production build도 통과했고 JS 독립 리뷰에서 남은 지적이 없었다. skill-manager `verify --run`은 bare `pnpm` 실행 경로를 찾지 못했지만 직접 `pnpm.cmd` 검증은 통과했다.
- **운영 확인:** 기존 production 서비스 배포는 모두 `SUCCESS`; 도메인 read-only smoke는 16/16 통과했고 분석 이벤트를 전송하지 않았다. `cron-10min` 다음 예약은 05:40 UTC, `cron-daily`는 17:00 UTC다. 실수로 만든 볼륨은 계속 `pending deletion`이며 확정 시각은 2026-09-29 04:33:57 UTC다.
- **배포 경계:** 이번 순환은 코드 검증만 수행했다. Railway 배포는 하지 않았으므로 production 로그에 새 이벤트가 기록되는지는 미확인이다.
- **다음:** production 배포 승인이 난 뒤 10분 cron의 `run_completed` 및 `skippedTaskCount`를 확인하고, 17:00 UTC 이후 daily cron의 분석 롤업 완료 로그를 읽기 전용으로 대조한다. 삭제 대기 볼륨은 2026-09-29 04:33:57 UTC 이후 최종 제거 여부를 다시 확인한다.

## 2026-09-27 Phase 9 PWA 수명주기 회귀 검증

- **관찰:** Phase 9 PWA 완료 기준은 설치, 오프라인 앱 셸, 새 워커 버전 전환·이전 캐시 정리, 민감 응답 비저장, 네트워크 복구를 요구하지만 실제 `public/sw.js`를 다루는 전용 테스트가 없었다.
- **변경:** Node VM에서 실제 서비스 워커 파일을 실행하는 테스트를 추가했다. 설치·`skipWaiting`, 버전 교체와 이전 셸 캐시 정리, 오프라인 페이지와 온라인 복구, 성공한 same-origin 정적 파일만 캐시되는 조건을 확인한다. `/p/`·`/r/` 페이지 탐색의 온라인 응답과 오프라인 대체 응답, 계정·인증·결제·API 응답이 캐시에 들어가지 않는지 검사한다. manifest 아이콘 경로는 실제 `src/app` 자산에 연결해 확인하고 등록 컴포넌트는 secure context 조건을 DOM 테스트로 검증한다.
- **검증:** PWA 테스트 9/9와 독립 TypeScript 리뷰가 통과했다. 전체 lint·typecheck, 145개 테스트 파일·1,196개 테스트, Next production build가 통과했다. skill-manager `verify --run`은 Windows에서 bare `pnpm`을 실행하지 못해 네 명령이 `WinError 2`였지만, 동등한 `pnpm.cmd` 게이트는 통과했다. production read-only smoke 16/16, `/sw.js`, `/offline.html`, `/manifest.webmanifest` 응답 200을 확인했고 분석 이벤트는 보내지 않았다.
- **운영 상태·배포 경계:** Railway `web`, 기존 업무 DB, Umami DB는 Online이고 두 cron 예약도 등록되어 있다. 실수로 만든 볼륨은 `isPendingDeletion: true`, 영구 삭제 예정 `2026-09-29 04:33:57 UTC`라 아직 삭제 완료가 아니다. 이번 PWA 회귀 테스트는 로컬 코드 변경이며 Railway 배포는 하지 않았다. 실제 브라우저 설치 프롬프트와 오프라인 네트워크 전환 E2E는 미검증이다.
- **다음:** 승인된 배포 후 PWA 브라우저 E2E와 service worker 업데이트 흐름을 검증한다. 삭제 예약 시각 이후 볼륨 제거와 17:00 UTC 이후 daily cron 실행 결과를 읽기 전용으로 재확인한다.

## 2026-09-27 Phase 9 PWA Chromium E2E

- **관찰:** 앞선 Node VM 테스트는 실제 `public/sw.js`의 버전 변경·캐시 정리를 확인하지만, 브라우저 등록·네트워크 오프라인 전환·페이지 탐색 동작은 직접 검증하지 않았다.
- **변경:** `e2e/pwa.spec.ts`에 Chromium 실제 브라우저 시나리오를 추가했다. `/sw.js`의 루트 등록과 활성 상태, 이전 `lumina-shell-*` 캐시 제거 및 비관련 캐시 보존, 오프라인 화면 진입과 복구, `/p/x`·`/r/not-a-real-share` 온라인 응답과 오프라인 대체가 Cache Storage에 저장되지 않는지 확인한다. 테스트 언어 쿠키는 기존 E2E 헬퍼를 사용한다.
- **검증:** Next production build와 프로젝트 Dockerfile의 standalone 폴더 구성으로 로컬 서버를 실행해 Chromium E2E 3/3이 통과했다. 빌드 standalone 디렉터리는 Dockerfile과 같이 `.next/static` 및 `public` 자산을 함께 둬야 브라우저 번들이 로드된다. 로컬 서버에 대한 브라우저 검증이며 Railway 배포는 하지 않았다.
- **운영 확인:** Railway 서비스 상태를 다시 확인했다. `web`, 기존 Neon 업무 DB와 Umami DB는 Online, 두 cron 예약은 유지 중이다. 운영 read-only smoke는 16/16, `/sw.js`, `/offline.html`, `/manifest.webmanifest`는 각 200이다. 승인된 빈 DB 볼륨은 삭제 대기 상태(`isPendingDeletion: true`, `2026-09-29 04:33:57 UTC` 예정)다.
- **남은 확인·다음:** Playwright 라우트는 브라우저가 요청하는 Service Worker 업데이트 스크립트를 바꾸지 못해 버전 교체 브라우저 E2E는 아직 없다. 기존 VM 버전 교체 테스트는 유지하고 별도 로컬 fixture 서버 또는 브라우저 업데이트 프로토콜을 검토한다. 볼륨은 예약 시각 이후, daily cron은 17:00 UTC 실행 이후 읽기 전용으로 확인한다.

## 2026-09-27 Phase 9 PWA 설치 기반과 서비스 워커 업데이트 E2E

- **관찰:** Phase 9 PWA 기준에는 설치 가능한 manifest와 새 서비스 워커 버전 갱신·이전 캐시 정리가 포함된다. 기존 VM 회귀는 워커 캐시 정리를 확인했지만 Chromium이 실제 스크립트를 다시 요청하는 업데이트 흐름은 검증하지 못했다. Playwright 공식 Service Workers 문서는 업데이트되는 서비스 워커 메인 스크립트 요청을 라우팅할 수 없다고 명시한다.
- **변경:** `e2e/pwa.spec.ts`가 Chromium에서 실제 앱의 manifest 링크, standalone 메타데이터, 아이콘 HTTP 응답을 검사한다. 같은 출처 loopback 임시 HTTP fixture는 저장소의 실제 `public/sw.js`를 v1으로 제공한 뒤 캐시 버전 상수만 v2로 바꿔 동일 URL에 응답한다. Chromium의 `registration.update()` 후 v2 캐시가 생성되고 v1·오래된 앱 캐시가 제거되며 비관련 캐시는 유지되는지 검증한다. 실제 `public/offline.html`도 제공하고 페이지 종료 실패와 무관하게 fixture 서버를 정리한다.
- **검증:** Next standalone 로컬 서버에서 Chromium PWA E2E 5/5, 전체 Vitest 145개 파일·1,196개 테스트, ESLint, TypeScript 검사를 통과했다. PWA 업데이트는 실제 브라우저가 v1과 v2 응답을 받아 수행했고 mock route는 사용하지 않았다.
- **운영 확인·배포 경계:** 이번 turn의 Railway read-only smoke는 16/16 통과했고 분석 이벤트는 보내지 않았다. 운영 서비스 목록에는 `web`, 기존 `Postgres`, `umami`, 두 cron이 있으며, 실수 생성으로 분리된 볼륨은 영구 삭제 예정 시각 `2026-09-29 04:33:57 UTC`까지 `pending deletion`이다. 변경은 테스트·문서뿐이라 Railway에 배포하지 않았다.
- **남은 검증·다음:** 실제 OS 설치 UI와 설치된 앱의 단독 실행은 기기별로 미확인이다. production Sentry 오류 알림도 `SENTRY_DSN`과 실제 수신 확인이 없어 미완료다. 2026-09-29 04:33:57 UTC 이후 분리 볼륨의 영구 삭제를, 17:00 UTC 이후 daily cron의 첫 롤업 결과를 읽기 전용으로 확인한다.

## 2026-09-27 Railway 리소스 삭제 대상과 cron 운영 로그 재확인

- **운영 상태:** production 서비스 목록에서 별도 빈 DB 서비스는 찾지 못했다. 유일한 `Postgres` 서비스(`3873fc24-8a50-4575-a71e-98c511a13011`)는 최신 배포 `SUCCESS`이고 157.499MB의 연결 볼륨(`postgres-volume`)이 있다. 승인 대상이라고 설명된 고아 볼륨(`postgres-volume-a1qN`, volume instance `7fabcc5f-0178-48f7-b7be-b300d4e3c993`)은 `serviceId: null`, 132.882MB, `isPendingDeletion: true`, 삭제 예정 `2026-09-29 04:33:57 UTC`다. 사용자가 현재 실행 중인 `Postgres` 서비스 보존을 확인했다. 별도 DB 서비스는 없으므로 서비스를 삭제하지 않고, 고아 볼륨만 예약된 영구 삭제 대상으로 유지한다.
- **cron 관찰:** production `cron-10min` 최근 40줄 조회는 17건(03:50:16–06:30:24 UTC)이었고 모두 `Starting Container`였다. 작업 완료·실패·건너뜀 요약 이벤트는 확인되지 않았다. 현재 저장소의 공통 cron runner에는 비식별 JSON 실행 로그가 있으나, 이 로그가 production에 배포되어 실행됐다는 증거는 아직 없다.
- **다음:** 승인 대상 DB 서비스의 정확한 ID를 확인한 뒤 삭제 대상과 연결 볼륨을 대조한다. cron 배포 변경은 production 배포 경계가 승인된 후에만 적용하고 `run_completed` 및 게이트별 건너뜀 수를 읽기 전용으로 확인한다. daily cron 롤업은 17:00 UTC 이후 결과를 확인한다.

## 2026-09-27 BGM 음원·플로팅 버튼 회귀 검증

- **관찰:** Railway 운영 smoke에서 `/audio/bgm/digital-observatory.mp3`는 200 `audio/mpeg`였다. 운영 Chrome(1120×500) 화면에서 언어·계층 설정은 헤더에 있고 BGM 토글은 화면 하단 오른쪽에 있어 겹치지 않았다.
- **변경:** `e2e/bgm.spec.ts`에 남아 있던 이전 상품별 MP3 경로 기대값을 실제 공통 `Digital Observatory` 음원으로 맞췄다. 홈 헤더와 플로팅 토글의 실제 bounding box가 1280×800 및 390×844 화면에서 겹치지 않는 회귀 검증을 추가했다.
- **검증:** `pnpm.cmd exec playwright test e2e/bgm.spec.ts --project=chromium` 3/3, `pnpm.cmd exec eslint e2e/bgm.spec.ts` 통과. production read-only smoke 16/16 통과, 분석 이벤트는 전송하지 않았다. TypeScript 검토에서 구체적 지적은 없었다. Railway 배포는 하지 않았다.
- **다음:** 17:00 UTC 이후 daily cron 분석 롤업 결과를 읽기 전용으로 확인한다. 사용자가 운영 `Postgres` 서비스와 연결 볼륨 보존을 확인했다. 별도 DB 서비스는 목록에 없고, 분리된 `postgres-volume-a1qN`만 2026-09-29 04:33:57 UTC 영구 삭제 예약 상태다. 예약 시각 이후 고아 볼륨 제거를 재확인한다.

## 2026-09-27 Railway cron 런타임 이미지·진입 경로 보강

- **관찰:** production `cron-10min` 실행 로그는 반복해서 `Starting Container`만 보였고 앱 작업 출력은 확인되지 않았다. Dockerfile 최종 이미지에는 cron 진입 스크립트가 import하는 `scripts/lib/railwayCronRun.mjs`가 복사되지 않았으며, 기본 Docker `CMD`도 웹 서버만 시작했다. Railway production 상태에는 cron별 직접 시작 명령이 설정되어 있었으므로 기존 서비스 경로와 기본 CMD 경로를 모두 검증 대상으로 삼았다.
- **변경:** runner 라이브러리 파일들을 최종 이미지에 복사한다. 기본 CMD는 Railway `RAILWAY_SERVICE_NAME`에 따라 `cron-10min`, `cron-daily`, `web`을 선택하고, 알 수 없는 서비스명은 실패 처리한다. 배포 안내와 cron 이미지 계약 회귀 테스트를 맞췄다.
- **로컬 검증:** 실제 Docker 이미지 빌드가 통과했다. 기본 CMD로 실행한 10분 cron은 세 정책 게이트가 꺼진 환경에서 `run_started`와 `run_completed`를 출력하고 3개 작업을 건너뛰며 정상 종료했다. daily는 network none + `APP_ENV=staging`에서 내부 요청을 차단하고 실패 요약을 출력했다. web은 preflight 통과 후 시작해 `/api/health` 200을 반환했다. cron Node 테스트 8/8, ESLint, typecheck, Vitest 145개 파일·1,196개 테스트, Next build도 통과했다.
- **production 반영:** `cron-10min` 배포 `31179660-6374-4be6-ac99-d297f7a9e172`, `cron-daily` 배포 `49ba9a77-f069-4aaa-b068-c12d16453071`이 모두 `SUCCESS`다. cron 전용 배포만 수행했고 웹과 Neon 스키마는 변경하지 않았다. 배포 후 Railway 읽기 전용 smoke 16/16, 최근 100개 HTTP 5xx 조회 0건이다. 07:20 UTC cron 인스턴스는 `EXITED`, 다음 실행은 07:30 UTC로 예약됐지만 Railway 로그 조회에는 `Starting Container`만 있어 앱 JSON 완료 이벤트는 아직 확인하지 못했다. daily 다음 예약은 17:00 UTC다.
- **보존·정책 상태:** 현재 production `Postgres`와 연결 볼륨(약 157.5MB 사용)은 그대로 보존했다. 별도 고아 볼륨은 삭제 예약 상태(`2026-09-29 04:33:57 UTC`)다. 10분 결제·AI·구독 정책 게이트는 미설정 상태이며 DB 마이그레이션은 실행하지 않았다. Sentry production DSN/경보 수신은 여전히 미완료다.
- **다음:** 07:30 UTC cron 실행의 상태·출력 수집을 읽기 전용으로 확인하고, 17:00 UTC 이후 daily 분석 롤업의 실제 결과를 대조한다. cron 작업은 종료되지만 앱 로그가 노출되지 않는 원인을 확인한 뒤, 삭제 예약 시각 이후 고아 볼륨 상태와 Sentry DSN 준비 여부를 다시 점검한다.

## 2026-09-27 Railway cron 구조화 로그 해석 수정

- **관찰·정정:** production `cron-10min` 배포 `31179660-6374-4be6-ac99-d297f7a9e172`의 07:30 UTC 실행은 `SUCCESS`, 인스턴스 `EXITED`, 다음 예약 07:40 UTC다. 처음에는 `message` 문자열 안에 JSON이 있는 행만 찾느라 앱 로그를 놓쳤다. Railway CLI는 구조화 로그를 개별 최상위 필드로 반환하며, 조회 결과에 `component`, `event`가 직접 포함되어 있었다.
- **실제 실행:** 07:30:48.921 UTC `run_started`에서 전체 3개, 활성 0개, 건너뜀 3개를 확인했다. 07:30:48.926 UTC `run_completed`에서 성공 0개, 건너뜀 3개를 확인했다. 이는 운영 기능·정책 플래그가 꺼져 해당 결제·AI·구독 작업을 호출하지 않고 정상 종료한 결과다.
- **DB 보존 확인:** 사용자가 보존을 지정한 production `Postgres` 서비스(`3873fc24-8a50-4575-a71e-98c511a13011`)는 `RUNNING`; 연결된 `postgres-volume`(159.482MB)은 `serviceId`가 동일하고 삭제 대기가 아니다. 고아 `postgres-volume-a1qN`(132.882MB)은 별도 서비스 연결 없이 기존 승인에 따른 삭제 대기(`2026-09-29 04:33:57 UTC`) 상태다. 이번 확인에서는 서비스·볼륨·DB를 변경하지 않았다.
- **다음:** 17:00 UTC daily cron에서 `analytics_rollup` 시작·완료 이벤트를 같은 최상위 필드 방식으로 확인한다. 10분 cron은 다음 07:40 UTC 실행에서 재현성을 확인한다. production Sentry DSN/알림 수신과 2026-09-29 UTC 고아 볼륨 제거 여부는 별도 미완료 항목이다.

## 2026-09-27 Phase 0 보안 헤더 운영 회귀 게이트

- **근거:** 계획서 Phase 0 DoD는 보안 헤더 적용을 요구한다. `next.config.ts`는 `/:path*`에 HSTS, nosniff, Referrer-Policy, Permissions-Policy, CSP Report-Only를 설정하며, 운영 도메인 HEAD 응답에서 다섯 헤더와 `default-src 'self'`·`frame-ancestors 'none'`을 확인했다. Next.js 16.3.1 로컬 공식 문서의 `headers()` 규칙과 일치한다.
- **변경:** `scripts/railway-smoke.mjs`의 홈페이지 검사에 이 헤더 조건을 추가했고, CSP Report-Only 누락을 거부하는 단위 검증과 실행 절차를 배포 문서에 기록했다. 이 변경은 로컬 검증 도구와 문서에만 적용했으며 production 앱을 재배포하지 않았다.
- **검증:** `pnpm.cmd test:railway-smoke` 9/9, ESLint, typecheck, 전체 Vitest(145개 파일·1,196개 테스트), Next production build가 통과했다. skill-manager `verify --run`은 bare `pnpm` 실행에서 `WinError 2`였지만, 같은 네 품질 게이트를 `pnpm.cmd`로 직접 실행해 모두 통과했다. 운영 도메인 read-only smoke 16/16, 분석 이벤트 전송 0건이다.
- **운영 cron·DB 확인:** 07:40:50.162 UTC `run_started`는 전체 3개·활성 0개·건너뜀 3개, 07:40:50.166 UTC `run_completed`는 성공 0개·건너뜀 3개를 반환했다. 현재 `Postgres` 서비스는 `RUNNING`, 연결된 `postgres-volume`은 159.482MB·`PendingDeletion=false`다.
- **다음:** 17:00 UTC daily cron의 `analytics_rollup` 시작·완료 이벤트와 집계 결과를 확인한다. CSP 정책은 계속 Report-Only이며 위반 보고 수집 자체는 이 smoke 범위 밖이다. production Sentry DSN·알림 수신은 미확인이다.

## 2026-09-27 Neon Auth 신규 가입 차단과 production Postgres 보존

- **Phase 0 완료:** Neon 공식 CLI의 production `production` 브랜치 설정에서 `email_and_password.disable_sign_up`을 `true`로 변경했다. 이메일·비밀번호 인증은 계속 활성화돼 직원 기존 계정 로그인은 유지된다. 직원 로그인 경로가 이메일 전용이고 회원용 Google 로그인은 별도 `/api/account/auth`를 사용함을 코드로 확인한 뒤, 직원용 Neon Auth에만 연결된 Google OAuth 제공자를 삭제했다. 기존 사용자·세션 데이터는 삭제하지 않았다.
- **운영 검증:** provider 설정 재조회에서 `disable_sign_up: true`, `enabled: true` 및 OAuth 제공자 목록 `[]`를 확인했다. `lumina.jack.ai.kr`에 무효 JSON만 보내는 읽기 검증성 요청으로 `/api/auth/sign-up/email`과 `/api/auth/sign-in/social`이 모두 403을 반환했다. 직접 Neon Auth에 가입 요청을 보내 사용자 레코드를 만들 수 있는 위험을 피하기 위해 provider 엔드포인트에 가입 요청은 하지 않았다.
- **Railway 보존:** production `Postgres` 서비스 `3873fc24-8a50-4575-a71e-98c511a13011`은 `RUNNING`; 연결된 `postgres-volume`은 159.482MB·`PendingDeletion=false`다. `postgres-volume-a1qN`은 기존 승인대로 서비스 연결 없이 132.882MB·삭제 대기 상태이며 2026-09-29 04:33:57 UTC 제거 예정이다. 이번 순환에서 Railway DB·서비스·볼륨에는 변경이 없다.
- **운영 루프:** `cron-10min`의 07:50:46 UTC `run_started`와 07:50:46 UTC `run_completed` 이벤트를 확인했다. daily 분석 롤업은 17:00 UTC 실행 뒤 확인한다.
- **로컬 품질 게이트:** `pnpm.cmd run lint`, `pnpm.cmd run typecheck`, 전체 Vitest 145개 파일·1,196개 테스트, `pnpm.cmd run build`가 모두 통과했다. skill-manager 사후 실행은 bare `pnpm`을 찾지 못해 `WinError 2`였으며 동일 명령을 `pnpm.cmd`로 직접 실행해 통과했다.
- **남은 확인:** 실제 직원 계정 로그인은 자격 증명을 사용하지 않아 실행하지 않았다. 고아 볼륨은 삭제 예약 시각 이후 상태를 확인하고, daily 분석 집계·Sentry 경보 설정도 계속 추적한다. 직원 Google OAuth가 다시 필요해지면 로그인 UI·정책 승인과 provider 설정을 함께 재검토한다.

## 2026-09-27 08:15 UTC Railway 인증 가드 smoke 회귀 검증

- **관찰:** production smoke는 기존 16개 GET/HEAD 확인만으로는 직원용 Neon Auth 공개 가입 차단을 지속 검증하지 않았다. provider는 가입 차단 상태지만 앱 라우트의 이메일 가입·소셜 로그인 방어가 회귀하면 자동 점검에서 놓친다.
- **변경:** `scripts/railway-smoke.mjs`에 `/api/auth/sign-up/email` 및 `/api/auth/sign-in/social`을 빈 JSON `{}`로 호출하는 항목을 추가하고, 각각 예상 403과 정확한 차단 사유까지 확인한다. 테스트는 두 POST 이외의 쓰기 요청이 생기지 않는지 확인하며 Railway 배포 안내에 비변경 요청임을 기록했다. 이 smoke 도구와 문서만 바뀌었고 앱 배포·DB·Railway 자원은 변경하지 않았다.
- **검증:** `pnpm.cmd test:railway-smoke` 9/9, 운영 도메인 smoke 18/18(인증 두 경로 403, 분석 이벤트 0건), ESLint, typecheck, Vitest 145개 파일·1,196개 테스트, Next build가 통과했다. skill-manager `verify --run`은 bare `pnpm` 실행에서 `WinError 2`였지만 같은 네 품질 게이트를 `pnpm.cmd`로 직접 통과했다. 수정 파일의 trailing whitespace는 0건이다.
- **운영 신호:** 직원 Neon Auth는 `disable_sign_up=true`, 이메일 인증 활성, OAuth 제공자 없음이다. production `Postgres`는 `RUNNING`; 연결 볼륨 159.482MB·삭제 대기 아님. 고아 `postgres-volume-a1qN`은 별도 서비스 연결 없이 132.882MB·2026-09-29 04:33:57 UTC 삭제 대기 상태다. `cron-10min`의 08:10:43.968 UTC `run_started`와 08:10:43.972 UTC `run_completed`를 확인했고 `cron-daily`는 17:00 UTC 예약 상태다. web 로그에는 Sentry 설정 누락 경고가 남아 있다.
- **다음 우선순위:** 17:00 UTC daily 롤업의 실제 이벤트·집계값을 대조하고 Sentry DSN/알림 수신의 설정 여부와 담당자를 확인한다. 고아 볼륨은 예약 시각이 지난 뒤 영구 제거 상태를 확인한다.
## 2026-09-27 08:35 UTC Railway 사전 점검 경고 신뢰성 개선
- **관찰:** production Sentry 미설정 경고가 stderr에 기록되어 Railway에서 error 등급으로 보였고, 다른 사전 점검이 실패해도 경고 문구가 서버 시작을 계속한다고 오해시킬 수 있었다. Railway 공식 로그 문서는 stderr를 error 등급으로 분류하고 JSON stdout의 level 필드를 로그 등급으로 해석한다.
- **변경:** scripts/railway-preflight.mjs의 Sentry 경고를 level warn 구조화 JSON stdout으로 기록하고, 시작 여부를 주장하지 않도록 문구를 고쳤다. Sentry 플래그 오류와 별도 성장 기능 게이트 오류가 겹치는 조합을 Node/Vitest 회귀 테스트에 추가했다.
- **검증:** 사전 점검 Node 테스트 4/4, featureGate.test.ts 47/47, 전체 Vitest 145개 파일·1,197개 테스트, lint, typecheck, Next production build가 통과했다. 코드 리뷰에서도 추가 이슈가 없었다. skill-manager verify --run은 Windows에서 bare pnpm을 찾지 못했으나 동일 네 게이트를 pnpm.cmd로 직접 실행해 모두 통과했다.
- **운영 상태:** /api/health는 200이고 production web은 배포 196ca5c4-ac2c-4395-8ce1-0e23c2928a41로 실행 중이다. 사용자가 보존을 선택한 Postgres 서비스 3873fc24-8a50-4575-a71e-98c511a13011와 READY 연결 볼륨 159.482MB는 그대로다. 고아 postgres-volume-a1qN은 2026-09-29 04:33:57 UTC 삭제 예약 상태다. 이번 수정은 아직 배포되지 않아 production 경고 등급은 다음 안전한 배포 전까지 바뀌지 않는다.
- **다음 우선순위:** 17:00 UTC daily 롤업 결과와 이벤트 집계를 대조하고, production Sentry DSN/알림 수신 설정의 담당자·준비 상태를 확인한다. 변경을 배포할 때는 현재 넓은 미커밋 작업 트리에서 이 수정만 격리한 산출물인지 먼저 검증한다.
## 2026-09-27 10:06 UTC Railway cron skip 원인 관측성 보강
- **근거:** production cron-10min 최근 로그에서 8회 연속 `run_completed`를 확인했다. 각 실행은 예약 작업 3개·활성 0개·건너뜀 3개로 정상 종료하지만, 기존 요약은 작업명과 어떤 승인/기능 설정 키가 닫혔는지를 남기지 않았다. cron-daily는 UTC 17:00 예약 전이라 최근 실행 로그가 없었다.
- **변경:** `scripts/lib/railwayCronRun.mjs`에 승인 변수들을 평가하는 공통 gated-task 생성기를 추가했다. 시작·완료·실패 요약에 건너뛴 작업명과 `disabledBy` 키 이름을 포함하고, 환경변수 값은 기록하지 않는다. 10분 및 일일 cron의 게이트 판정은 기존과 동일하게 정확히 `true`만 허용한다. `scripts/railway-10min-jobs.mjs`, `scripts/railway-daily-jobs.mjs`, `scripts/test-railway-cron.mjs`, `docs/RAILWAY-DEPLOYMENT.md`를 갱신했다.
- **검증:** `pnpm.cmd test:railway-cron` 9/9, 전체 Vitest 145개 파일·1,197개 테스트, lint, typecheck, Next production build가 통과했다. 비밀값 비노출 단위 테스트도 통과했다. skill-manager `verify --run`은 bare `pnpm`을 찾지 못해 `WinError 2`였고, 동일 네 게이트를 `pnpm.cmd`로 직접 통과했다. 전용 리뷰 에이전트는 사용량 제한으로 완료하지 못했으며, 변경 코드와 테스트를 직접 검토했다.
- **운영 상태:** production `/api/health`는 200. 최근 cron-10min 작업은 모두 승인/기능 게이트로 건너뛰어졌으며 해당 동작은 계획된 안전 상태다. 최근 HTTP 5xx 2건은 비활성 회원 인증의 `/api/account/auth/get-session` 503만 관측되었고, health는 정상이다. production Sentry DSN·auth token·environment·trace-sample 설정 키는 존재하지 않는다. 보존 대상 Railway `Postgres`와 159.482MB 연결 볼륨은 `RUNNING`/`READY`; 고아 볼륨은 기존 2026-09-29 04:33:57 UTC 삭제 예약 상태다.
- **배포 경계·다음:** 이번 코드는 로컬 검증만 했고 배포하지 않았다. 현재 작업 트리는 204개 변경 항목이며 Railway CLI는 `cron-10min`에 연결되어 있어, 현재 폴더를 그대로 배포하면 의도하지 않은 코드와 서비스에 적용될 수 있다. 다음은 변경을 분리한 배포 산출물을 만들고 `web`을 명시적으로 대상으로 검증한 뒤, 새 로그에서 `skippedTasks`와 Sentry `warn` 등급을 확인하는 것이다. Sentry 수신 설정과 daily 롤업 결과는 별도 후속 확인 항목이다.
## 2026-09-27 10:30 UTC 스테이징 검증 및 Railway 배포 재개
- 재개 범위: 기존 상용화 작업물의 Railway staging/production 배포, Neon 마이그레이션 상태, 공개 엔드포인트와 BGM/PWA 브라우저 동작을 확인했다.
- Neon staging/production은 각각 14개 마이그레이션 체크섬이 적용되어 있고 pending 0건이다. Staging apply는 applied 0건으로 종료했다.
- Railway staging web 배포 3b6429d4-8585-482f-9e07-a1c852cb9d58, production web 4a25f8b9-6e77-4f7f-801c-ce232ac4e3f5, cron-10min 49e5b2b5-1829-4f6a-998e-6d1118180050, cron-daily f648b6a4-0381-4375-b61f-afa4c6426a71가 모두 성공했다.
- Staging과 production 각각 공개 smoke 18/18. Production health 200, BGM 파일 HTTP 200 (audio/mpeg, 5,351,343 bytes). Staging Playwright 시나리오는 BGM 3/3, PWA 5/5 통과했다. 최초 일괄 실행에서 locale helper가 localhost 쿠키를 설정해 1건이 실패했지만, 해당 사용자 재생 재시도 시나리오는 한국어 locale로 격리 재실행하여 1/1 통과했다.
- cron-10min 실제 실행 로그는 run_started와 run_completed를 남겼다. 예약 작업 3개는 모두 비활성화 정책 게이트로 skip됐고 오류는 없었다. cron-daily는 다음 예약 시각이 오기 전이어서 실제 분석 집계 실행은 확인하지 않았다.
- 남은 운영 확인: Sentry DSN 미설정 경고, production RLS 교차 사용자 E2E 계정 미제공, cron-daily 실제 예약 실행 확인 대기. 기존 production Postgres와 연결 볼륨은 사용자 지시에 따라 보존했다.
## 2026-09-27 10:39 UTC Playwright baseURL 쿠키 범위 수정
- 관찰: staging BGM 재생 차단 후 사용자 재시도 테스트는 locale 쿠키가 고정된 localhost origin에 설정되어 한국어 화면을 선택하지 못했다. 제품 페이지는 정상이고, 테스트 설정의 origin 불일치였다.
- 변경: 공통 locale-cookie 헬퍼가 Playwright baseURL을 받아 origin 범위로 쿠키를 설정하게 하고, 세 BGM 시나리오가 현재 baseURL fixture를 전달하도록 했다.
- 검증: staging에서 BGM 시나리오 3/3, 변경 파일 ESLint, 전체 TypeScript typecheck가 통과했다. 전체 E2E나 앱 코드를 변경하지 않았으며 런타임 재배포는 하지 않았다.
- 사후 검사기 verify --run은 Windows에서 pnpm 실행 파일을 찾지 못해 네 명령 모두 WinError 2로 실패했다. 직접 실행한 pnpm.cmd lint/typecheck와 Playwright staging 테스트는 통과했다.
- 운영 대기 항목은 유지한다: Sentry DSN/알림 수신, production RLS 교차 사용자 E2E 계정, 다음 cron-daily 실제 롤업 결과.
## 2026-09-27 11:20 UTC 2027 리포트 전환 동선과 수익 목표
- **근거:** 상품 상세의 기존 무료 사주 분석 CTA와 정책 게이트 구매 제안이 네 개의 긴 미리보기 카드 뒤에 있었다. 공개 경쟁 서비스는 콘텐츠 카탈로그 폭 또는 구독형 인사이트를 제공하므로, LUMINA는 계산 근거와 해석 한계를 확인할 수 있는 단건 리포트로 차별화를 검증한다.
- **변경:** 무료 분석 CTA를 히어로 다음으로 이동하고, 구매 제안은 승인된 판매 정보가 있을 때만 미리보기 설명 바로 뒤에 노출한다. 개선 루프에 결제·확정 환불 기준 순매출, 첫 30일 1,000회 적격 방문·2% 전환 가설과 2,500회 확장 목표를 추가했다. ₩9,900은 미승인 가격 가설로 표시했다.
- **검증:** premium landing Playwright 1/1, ESLint, typecheck, Vitest 145개 파일·1,197개 테스트, Next production build가 통과했다. 사후 검사기 `verify --run`은 Windows에서 `pnpm`을 찾지 못해 WinError 2를 반환했으나, 직접 `pnpm.cmd`로 동일 lint/typecheck/test/build를 통과했다.
- **운영 상태와 다음 단계:** production 결제 플래그, 결제 DB 연결, Toss 키와 법률 문서 승인 버전이 준비되지 않아 구매 제안은 계속 닫혀 있다. 배포나 DB 변경은 하지 않았다. 정책·계정·결제 준비 후 적격 방문 표본과 원장 순매출을 대조하며 가격을 검증한다.

## 2026-09-28 production 결제 개통 사전 차단

- **관찰:** Railway production 변수 목록을 비밀값 출력 없이 점검했다. `FEATURE_MEMBER_AUTH`와 `FEATURE_BILLING`은 꺼져 있고, 결제 전용 DB URL, Toss 운영 키, 승인 문서 버전은 설정되지 않았다. 사용자는 정책과 PG가 아직 준비되지 않아 기술 기반을 계속 보강하라고 확인했다.
- **변경:** web 시작 preflight가 billing 기능 플래그 형식을 검사하고, 결제를 켤 때 Better Auth·회원 동의·DB 연결 변수·Toss 키·법무 승인 버전·AES/HMAC 키 형식을 함께 확인한다. 통합결제창 API 개별 키는 staging에서 테스트 접두사, production에서 라이브 접두사만 허용한다. production에서 billing이 꺼져 있으면 유료 주문을 받을 수 없다는 비식별 구조화 경고를 남긴다. 설정 값과 결제 게이트는 바꾸지 않았다.
- **검증 범위:** preflight 회귀는 기능 off 경고, 누락된 필수 설정 차단, 완전한 합성 staging 설정, 잘못된 키 형식, production 테스트 키 차단·라이브 키 형식을 포함한다. DB 연결·Toss 계약·법률 문서의 실승인은 이 정적 점검 범위 밖이다. Railway 변수·DB·배포는 변경하지 않는다.
- **다음:** Toss PG 승인, 확정 상품 가격·환불/철회·국외 이전 문서와 회원 동의 문서가 준비되면 staging 전용 역할과 RLS부터 검증한다. 그 뒤 production migration, 변수 등록과 live transaction/환불 확인을 각 단계 승인 아래 진행한다.

## 2026-09-28 연간 리포트 퍼널 단계비율

- **관찰:** 관리자 퍼널은 상품 페이지 조회·무료 분석 클릭·결제 시작 이벤트의 합계만 보여줘 단계별 이벤트 흐름을 비교하기 어려웠다. 이벤트 데이터는 익명 집계이며 개인별 여정을 연결하지 않는다.
- **변경:** 각 단계에 직전 단계 이벤트 수 대비 비율을 표시한다. 반복 방문·이벤트가 분자와 분모에 포함될 수 있음을 한국어·영어 안내에 명시하고, 이를 고유 사용자 전환율이나 결제 완료율로 해석하지 않도록 했다. 집계 원천·이벤트·DB·결제 설정은 변경하지 않았다.
- **검증:** 관리자 퍼널 DOM 회귀 5개와 메시지 일치 검증 8개가 통과했다. 전체 Vitest 146개 파일·1,184개 테스트, lint, typecheck, Next production build도 통과했다. 사후 검사기의 verify --run은 Windows에서 bare pnpm을 찾지 못해 WinError 2였고, 동일 게이트는 pnpm.cmd로 직접 통과했다.
- **운영 확인:** 푸시 후 Railway production 최신 배포는 기존 d7c21db4-e8cb-4424-b008-3215f3d62448이며 이 변경은 배포되지 않았다. 읽기 전용 preflight는 9개 성장 게이트를 통과했고, Sentry·billing 비활성 경고가 예상대로 출력됐다. /api/health는 200이었다. 분석 이벤트·환경 변수·DB는 변경하지 않았다.
- **다음:** production의 동의된 집계 이벤트 표본을 확인하되, 실제 주문·환불·순매출은 승인 후 결제 원장과 별도로 대조한다. 결제·회원 인증은 계속 비활성으로 둔다.

## 2026-09-28 연간 리포트 퍼널 기준 수정

- **관찰:** 이벤트 핸들러를 대조한 결과 무료 분석 클릭은 `/saju`로 이동하는 선택 행동이고 결제 시작은 별도의 주문 요청 직전에 기록된다. 둘은 순차 단계를 이루지 않으므로 결제 시작 수를 무료 분석 클릭 수로 나누면 실제 사용 경로를 왜곡한다.
- **변경:** 무료 분석 클릭과 결제 시작을 각각 상품 페이지 조회 이벤트 수와 비교하도록 고쳤다. 화면 레이블과 설명은 기준 분모를 명시하며, 반복 이벤트를 포함하므로 고유 사용자 전환율이나 매출 전환율이 아니라는 점도 한·영으로 알린다. 지표 계산을 `baselineViews`로 표현해 단계 간 전환으로 오해하기 어렵게 했다. 이벤트 수집·DB·결제 설정은 변경하지 않았다.
- **검증:** 집중 DOM·메시지 테스트 13/13, 전체 Vitest 146개 파일·1,184개 테스트, lint, typecheck, Next production build가 통과했다. skill-manager `verify --run`은 bare `pnpm` 실행 파일을 찾지 못해 Windows `WinError 2`였고 `pnpm.cmd`로 직접 게이트를 실행했다.
- **배포 경계·다음:** 이번 수정은 코드 검증과 저장소 반영 범위이며 Railway 배포와 DB 변경은 하지 않는다. 보고 비율은 이벤트 수 기준이라 순사용자 여정·유료 결제 전환을 입증하지 않는다. 실제 결제 성과는 승인된 결제 원장으로 대조해야 한다.

## 2026-09-28 연간 리포트 행동 지표 의미 정합성

- **관찰:** 무료 분석 클릭과 결제 시작은 독립 행동인데도 관리자 화면 제목은 `퍼널`, 항목은 순서형 목록이었다. 분모를 바로잡은 뒤에도 화면 구조가 단계 전환을 암시할 수 있었다.
- **변경:** 섹션을 행동 지표로 이름 붙이고 순서형 목록을 비순서 목록으로 바꿨다. 기준 이벤트와 페이지 조회 대비율을 각 카드에 명시한다. 집계 이벤트·DB·결제 설정은 바꾸지 않았다.
- **검증:** 관리자 DOM·메시지 테스트 13/13, 전체 Vitest 146개 파일·1,184개 테스트, lint, typecheck, Next production build가 통과했다. Railway staging/production 사전 점검은 각각 9개 성장 게이트를 통과했다. skill-manager 검증기는 bare `pnpm`을 찾지 못해 `WinError 2`였으며 `pnpm.cmd` 직접 게이트는 통과했다.
- **운영·다음:** production `web`에는 이전 배포 `d7c21db4-e8cb-4424-b008-3215f3d62448`가 활성이고 이 코드는 아직 배포 전이다. staging `web`에는 공개 도메인이 없으므로 새로 외부 노출하지 않고 내부 상태로 확인한다. Vercel `lumina-cognitive`는 이미 삭제되어 재조회 결과 `project_not_found`다. 변경 코드를 별도 산출물로 업로드해 staging과 production 웹만 갱신한 뒤 실제 운영 smoke를 실행한다. Neon·Railway Postgres와 기능 플래그는 변경하지 않는다.

## 2026-09-28 Vercel 전환 잔여물 정리와 production 배포

- **관찰:** 삭제된 Vercel 프로젝트를 대상으로 하는 환경 동기화 명령과 Vercel cron 설정이 저장소에 남아 있었다. 분석 API fallback·과거 Vercel import 도구, 테스트와 관리자 안내서의 2주 롤백·수동 backfill 절차도 현재 운영 경로와 맞지 않았다. 로컬 `.vercel` 연결은 삭제된 `lumina-cognitive`를 가리켰다.
- **변경:** `vercel.json`, Vercel env-sync/import 스크립트, 미사용 분석 adapter·테스트, 추적되지 않는 Vercel 로고와 로컬 link를 제거했다. 과거 집계를 표시할 Neon source/schema는 보존했다. 인지 파일럿 설정 안내서를 Railway 기준으로 이동·수정하고, 대안 Supabase 문서는 보관 제안임을 표시했다. 관리자 DOCX 생성 원본과 산출물에서 죽은 Vercel 설정과 지원하지 않는 수동 backfill 명령을 제거했다.
- **검증:** `pnpm.cmd lint`, `typecheck`, 전체 Vitest(145개 파일·1,183개 테스트), Next production build 통과. DOCX ZIP 구조와 여섯 가지 cutover 문구 검사 통과. skill-manager `verify --run`은 bare `pnpm`을 찾지 못해 네 항목 모두 Windows `WinError 2`였으나, 직접 `pnpm.cmd` 검증은 통과했다. Word·LibreOffice가 없어 페이지 레이아웃 시각 검토는 하지 않았다.
- **배포:** 커밋 `31a9323`을 staging 배포 `94b40b76-c038-4365-b111-f862653d7341`과 production 배포 `a2769d8f-b569-4725-9de8-972bf8a7db08`에 반영했다. 양쪽 preflight는 각각 9개 성장 게이트를 통과하고 Next 서버가 준비됐다. `lumina.jack.ai.kr` 비변경 smoke 18/18, 배포 후 15분 HTTP 5xx 0건. Vercel 재조회는 `project_not_found`였다. DB·환경 변수·기능 플래그·분석 이벤트는 변경하지 않았다.
- **남은 운영 항목:** Sentry production DSN과 알림 수신은 미설정이다. 유료 결제는 상품·법무·PG 승인이 없어 계속 비활성이다. 최근 3일보다 오래된 Umami 집계 backfill CLI는 제공하지 않는다. 이 항목은 승인·절차가 준비될 때까지 열어 둔다.

## 2026-09-30 Toss 웹훅 원장 상태 정합성

- **관찰:** 결제 완료 주문에 새 Toss 전송 ID가 도착하면 권한을 중복 생성하지 않고 이벤트 결과도 `ignored`로 반환하지만, `billing.webhook_events.status`는 기본값 `applied`로 남았다. 서로 다른 전송 ID로 같은 결제 상태가 재전달될 때 이벤트 원장과 처리 결과가 달라질 수 있었다.
- **변경:** 이미 결제된 주문의 새 이벤트를 명시적으로 `ignored`로 갱신한다. 유효 결제, 동일 전송 ID 재전송, 이미 결제된 주문, 결제 금액 불일치의 핵심 전이를 외부 Neon/Toss 없이 검증하는 서버 단위 테스트를 추가했다.
- **검증:** 전용 Vitest 4/4, 수정 파일 ESLint, 전체 TypeScript typecheck, 전체 Vitest 146개 파일·1,187개 테스트, Next.js production build가 통과했다. skill-manager `verify --run`은 Windows에서 bare `pnpm`을 찾지 못해 `WinError 2`였고, 동일한 lint·typecheck·test·build를 `pnpm.cmd`로 직접 실행해 모두 통과했다.
- **운영 경계:** Railway 읽기 전용 상태에서 `web`, 두 Postgres 서비스, 두 cron이 Online/Completed였고 daily 분석 롤업은 2026-09-29 17:01 UTC에 성공했다. production health·privacy·2027 상품 HEAD는 HTTP 200이며, 운영 결제·DB·배포는 변경하지 않았다.
- **다음:** 이 회귀 검증은 SQL 동작을 모의한 단위 범위다. staging Toss 결제·동일 웹훅 5회 재전송·환불·RLS 검증과 production 활성화는 계약·법무·운영 승인 이후 별도로 진행한다.

## 2026-09-30 Checkout 설정과 환불 재시도 안전성

- **관찰:** 체크아웃은 사이트 원본 URL과 사용자 참조 HMAC을 주문을 기록한 뒤 검사해 설정 오류 시 30분 만료 대기 주문이 남을 수 있었다. 또 Toss 환불 요청이 모호하게 실패해 예약을 보존한 경우, 사용자의 재시도는 `refunding` 상태에서 거절돼 동일한 Toss 멱등 키로 복구할 수 없었다.
- **변경:** 주문 기록 트랜잭션 전에 사이트 원본과 HMAC 키를 검증한다. 서버 가격표를 사용하는 주문 생성, 브라우저 금액 위조 거부, EU 철회권 포기 동의, 소유자 자신의 pending 환불 재사용, 관리자 예약 격리, 보고서 열람·시간 조건과 환불 완료 시 권한 회수를 테스트한다. Toss 공식 API 가이드의 15일 멱등 키 유효기간에 맞춰 자동 재시도는 14일까지만 허용한다([Toss Payments API guide](https://docs.tosspayments.com/en/api-guide)).
- **검증:** 핵심 결제/체크아웃/환불 테스트 20/20, 전체 Vitest 149개 파일·1,203개 테스트 통과. 전체 ESLint, TypeScript typecheck, Next production build 통과. `test:cov` 테스트는 통과했지만 전역 statements/lines 63.09%, functions 75.92%, engine 94.68%로 설정 임계치에 미달했다. 결제 `service.ts`는 statements/lines 44.01%, billing 디렉터리는 12.98%다. skill-manager는 bare `pnpm` 실행이 Windows `WinError 2`였고 `pnpm.cmd` 직접 실행은 통과했다.
- **운영 경계:** 변경은 로컬 코드와 테스트뿐이다. DB·Toss·기능 플래그·production 배포는 건드리지 않았다. 현재 테스트는 모의 SQL 기반이며 실제 staging DB/RLS, Toss sandbox의 모호한 응답 재시도와 환불까지 증명하지 않는다.
- **다음:** 14일이 지난 미확정 환불은 자동 재호출하지 않고 지원 문의를 통해 수동 조정해야 한다. 결제 주요 경로의 테스트 커버리지를 확장하고, 승인된 staging 환경에서 Toss·RLS·실제 권한 회수 여정을 검증한다. production 유료 판매는 상품·법무·PG 승인 및 별도 운영 검증이 끝나기 전까지 활성화하지 않는다.

## 2026-09-30 미확정 환불 결제사 대사 경로

- **관찰:** Toss 멱등 키 유효기간 뒤에는 안전한 자동 재호출이 차단되지만, `/admin/billing`은 `refunding` 주문에 조치 항목을 표시하지 않아 결제사에서 이미 완료된 취소를 내부 권한 상태와 대조할 수 없었다.
- **변경:** 관리자 청구 화면에 취소 상태 대조 액션을 추가했다. 소유자 권한·같은 출처 요청을 검증하고, 서버에서 주문/예약/결제 금액 및 KRW 통화를 맞춘 뒤 Toss 주문 조회 결과가 같은 결제 키·주문·금액이며 `CANCELED`, `DONE` 취소 합계 전액임을 확인할 때만 주문·환불·권한을 내부 완료 처리한다. 부분 취소, 조회 실패, 불일치, 미완료 취소는 그대로 보류한다. 보류 주문은 관리자 최근 200건에서 우선 노출한다. ([Toss 코어 API](https://docs.tosspayments.com/reference))
- **검증:** 환불 대사/관리자 API/환불 서비스 테스트 23/23, 전체 Vitest 151개 파일·1,218개 테스트, 전체 ESLint, TypeScript typecheck, Next.js production build 통과. 별도 `test:cov`도 전체 테스트는 통과했으나 global statements/lines 63.03%, functions 75.89%, engine statements/lines 94.68%로 임계치(80%/95%)에 미달해 exit 1이었다. billing `service.ts`는 42.26%, billing 디렉터리는 13.96%다. skill-manager `verify --run`은 Windows에서 bare `pnpm` 실행이 `WinError 2`로 실패했지만 `pnpm.cmd`로 lint/typecheck/test/build를 직접 검증했다.
- **운영 경계:** 변경은 로컬 코드다. 실제 Neon/RLS 및 Toss sandbox 대사는 검증하지 않았고, DB·결제사·기능 플래그·배포에 쓰기를 수행하지 않았다. 결제사 조회 결과가 전액 취소를 증명하지 않으면 운영자가 Toss 상태를 확인해야 한다. 판매 활성화는 상품·법무·PG 승인과 staging 종단간 결제/환불 검증 이후 별도 단계다.
- **다음:** 테스트 커버리지의 결제 핵심 경로 부족을 보완하고, 승인된 staging에서 Toss 결제·웹훅 중복·환불·권한 회수 및 RLS를 검증한다.

## 2026-09-30 Toss 웹훅 입력 제한과 HTTP 경로 회귀 검증

- **관찰:** 웹훅 경로는 32KB 초과 여부를 확인하기 전에 `request.clone().arrayBuffer()`로 전체 본문을 메모리에 읽었다. 서비스 단위 테스트는 웹훅 HTTP 입력 검증, 결제사 상태 조회, 원문 해시 전달을 직접 확인하지 않았다.
- **변경:** `readBoundedBody` 스트리밍 제한기를 추가하고 기존 `readBoundedJson`의 반환 형식은 유지했다. 웹훅은 32KB 이내 본문만 읽고 그 바이트로 이벤트 해시를 만든다. 콘텐츠 타입·전송 ID·크기 제한·미지원 이벤트·결제사 기준 상태 조회·주문 불일치·일반화된 재시도 응답을 검사하는 라우트 테스트 6개를 추가했다. 기존 결제 어댑터/제공자/영수증/주문/환불 테스트도 함께 유지했다.
- **검증:** 전용 웹훅 테스트 6/6, 전체 Vitest 156개 파일·1,266개 테스트 통과, ESLint, TypeScript typecheck, Next.js production build 통과. `test:cov`도 전체 테스트는 통과했지만 statements/lines 64.12%, functions 77.63%, engine statements/lines 94.68%로 설정 임계치(80%/95%)에 미달해 exit 1이었다. billing `service.ts` 커버리지는 46.4%다. 코드 리뷰에서 수정 사항은 보고되지 않았다. skill-manager `verify --run`은 bare `pnpm`을 실행하지 못해 Windows `WinError 2`였고 직접 `pnpm.cmd` 검증 결과로 게이트를 확인했다.
- **운영 경계·다음:** 변경은 로컬 코드·테스트·문서에 한정했다. Neon/RLS, Toss sandbox, DB, 결제 플래그, 외부 배포는 검증하거나 변경하지 않았다. 다음은 승인된 staging에서 실제 Toss 결제·동일 웹훅 중복·환불 및 RLS 여정을 확인하는 일이며, 상품·법무·PG 승인과 production 판매 활성화는 별도 운영 게이트다.

## 2026-09-30 결제 대사·회원 주문 조회 회귀 범위

- **관찰:** 결제사 환불 대사 검사는 예약/주문/결제 데이터 간 금액·통화 일치와 잠금 조건을 서비스 쿼리 수준에서 직접 고정하지 않았다. 회원 주문 조회 테스트도 쿼리에 `user_id` 조건을 확인했지만, 트랜잭션 경계에 로그인 사용자 ID가 전달되는지 검증하지 않았다.
- **변경:** 환불 대사 대상 조회의 Toss 제공자·전체 금액·KRW 조건, 대기 상태와 `FOR UPDATE` 절, 잘못된 식별자 및 결과 0/복수 건 처리를 검증하는 서비스 테스트 9개를 추가했다. 회원 주문 단건/목록 테스트 3개는 잘못된 ID와 비소유 주문의 동일한 not-found 응답, 회원 범위 쿼리, 최대 100건 제한, 서버 환불 가능 표시를 검사하고 트랜잭션 래퍼가 `member-1`을 받는지도 고정한다.
- **검증:** 전체 158개 Vitest 파일·1,278개 테스트가 통과했고, 수정 테스트 2개 파일 12/12와 해당 ESLint가 추가 수정 후 통과했다. 전체 typecheck와 Next.js production build도 통과했다. `test:cov` 테스트는 모두 통과했지만 global statements/lines 64.93%, functions 76.63%, branches 84.05%, engine statements/lines 94.68%로 임계치(80%/75%/95%)에 미달해 exit 1이었다. billing `service.ts`는 statements/lines 56.04%, billing 디렉터리는 31.85%다. skill-manager `verify --run`은 Windows에서 bare `pnpm`을 찾지 못해 네 명령 모두 `WinError 2`였으며, `pnpm.cmd` 직접 검증을 병행했다.
- **운영 경계·다음:** 코드·테스트·문서만 수정했다. 테스트 DB 쿼리를 모의했으므로 실제 Neon 행 잠금이나 RLS 정책은 증명하지 않으며, Toss sandbox 결제/환불과 production 판매도 검증·변경하지 않았다. 결제 기능의 높은 미검증 범위를 더 줄이고, 승인된 staging에서 결제·중복 웹훅·환불·권한 회수·RLS 종단간 경로를 검증한 뒤에만 상용 판매 게이트를 재평가한다.

## 2026-09-30 계정 구매·구독 조회 장애 표시

- **관찰:** 계정 페이지는 구매와 구독 조회가 실패하면 각각 빈 배열로 대체해 “구매 내역이 없습니다” 또는 “구독 내역이 없습니다”로 표시했다. 결제한 사용자가 일시적인 billing DB 장애를 실제 기록 부재로 오해하고 환불·구매 접근 경로를 찾지 못할 수 있었다.
- **변경:** 서버 계정 페이지가 구매와 구독 목록을 병렬로 읽고 각 실패를 별도로 보존한다. 실패한 목록에는 일시적 조회 불가 안내와 해당 기록을 다시 불러오는 링크를 표시하고, 정상적으로 조회된 다른 목록은 그대로 보여 준다. 회원 인증과 기존 사용자 범위 조회는 유지했다.
- **검증:** 장애 조합 두 가지를 확인하는 DOM 테스트 2/2, 전체 Vitest 159개 파일·1,280개 테스트, 전체 ESLint, TypeScript typecheck, Next.js production build가 통과했다. `test:cov`의 테스트는 전부 통과했으나 global statements/lines 64.93%, functions 76.63%, branches 84.04%, engine statements/lines 94.68%로 설정 임계치에 미달해 exit 1이었다. skill-manager `verify --run`은 Windows에서 bare `pnpm`을 찾지 못해 실패했고, 동등한 `pnpm.cmd` 명령을 직접 실행했다. 코드 리뷰에서 수정 사항은 보고되지 않았다.
- **운영 경계·다음:** 변경은 코드·테스트·문서에 한정했다. 두 가지 장애 상태는 모의 함수로 검증했으므로 실제 Neon 장애 복구나 RLS를 증명하지 않는다. 다음은 승인된 staging에서 고객 계정의 결제 완료·구매 이력·리포트 열람·셀프 환불을 연결해 검증하고, 운영 Sentry 알림과 롤백 리허설을 완료하는 일이다.

## 2026-09-30 계정 리포트·공유 조회 장애 격리

- **관찰:** 구매·구독 목록은 각각 조회 실패를 보존하도록 바뀌었지만, 저장 리포트와 공유 링크는 `Promise.all`의 공통 예외 처리 때문에 둘 중 하나만 실패해도 계정 페이지 전체가 중단됐다. 정상 조회된 구매·환불 및 구독 정보도 숨겨질 수 있었다.
- **변경:** 저장 리포트와 공유 링크를 독립적으로 조회하고, 실패한 영역에 일시적 조회 불가 안내와 재시도 링크를 표시한다. 둘 다 정상 조회된 경우에만 공유 관리 클라이언트 컴포넌트를 렌더링해 불완전한 데이터로 공유·해지 조작을 허용하지 않는다. 계정 구매 및 구독 목록은 계속 표시한다.
- **검증:** 계정 DOM 실패 조합 4/4, 전체 Vitest 159개 파일·1,282개 테스트, 전체 ESLint, TypeScript typecheck, Next.js production build 통과. `test:cov` 테스트는 모두 통과했지만 global statements/lines 64.93%, functions 76.63%, engine statements/lines 94.68%로 각각 설정 임계치 80%/95%에 미달했다. skill-manager `verify --run`은 Windows에서 bare `pnpm` 실행이 `WinError 2`로 실패했으며 동등한 `pnpm.cmd` lint/typecheck/test/build 검증을 직접 실행했다.
- **운영 경계·다음:** 코드·테스트·문서만 수정했다. 실제 Neon/RLS, 승인 staging의 결제·환불 및 알림·롤백 리허설은 확인하지 않았고 DB, 결제 플래그, Toss sandbox, 배포를 변경하지 않았다. 다음은 승인된 staging에서 결제 완료부터 주문 조회·리포트 접근·환불·권한 회수까지의 사용자 여정과 RLS를 검증하는 일이다.

## 2026-09-30 결제 준비 게이트에서 멤버 인증 확인

- **관찰:** 결제 준비 함수가 결제 플래그와 PG·암호화·법률 설정은 확인했지만 멤버 인증 설정은 확인하지 않았다. 이 경우 상품 페이지가 판매가를 표시해도 주문 단계에서 결제가 막힐 수 있었다.
- **변경:** 결제 준비 조건에 `isMemberAuthConfigured()`를 포함해 멤버 인증 기능 또는 필수 설정이 준비되지 않은 동안 상품 노출과 주문 생성을 함께 차단한다. 인증 기능 플래그, 회원 법률 승인, 결제 법률 승인을 각각 끈 테스트에서 세션 조회와 결제 DB 호출이 발생하지 않는지도 확인한다.
- **검증:** 결제 준비 테스트 8/8, 전체 Vitest 159개 파일·1,285개 테스트, ESLint, TypeScript typecheck, Next.js production build 통과. 리뷰어 승인. `test:cov`는 테스트 자체는 통과했으나 전역 statements/lines 64.93%, functions 76.9%, 엔진 statements/lines 94.68%로 설정 기준 80%/95%에 미달해 종료 코드 1이다. skill-manager `verify --run`은 bare `pnpm` 실행 경로를 찾지 못했지만 `pnpm.cmd`로 해당 lint·typecheck·test·build를 직접 통과했다.
- **운영 경계:** 코드와 로컬 검증만 진행했다. 실제 Neon/RLS, Toss sandbox 결제·환불, 운영 알림·롤백, 법무·PG 승인, production 배포는 확인하거나 변경하지 않았다.

## 2026-09-30 암호화 키 교체와 암호문 검증 강화

- **관찰:** 결제 데이터 복호화가 활성 키 하나만 사용해 버전 전환 뒤 과거 키·영수증을 읽지 못했고, 암호문에서 payload 구분자가 빠져도 빈 payload로 처리될 수 있었다. 회원 데이터 AAD의 U+001F 구분자는 허용된 ID에 포함될 수 있어 서로 다른 사용자·레코드 조합이 같은 인증 문맥을 만들 수 있었다. base64url 디코더도 비정규 payload 인코딩을 허용했다.
- **변경:** 결제 암호화는 활성 키·버전을 쓰고, 복호화는 과거 버전의 BILLING_ENCRYPTION_KEY_V<version> 보관 키를 조회한다. 두 복호화 경로에서 누락 필드는 거부하되 정당한 빈 payload는 보존하고, base64url 정규 인코딩만 통과시킨다. 회원 ID의 AAD 구분자 포함도 거부하되 기존 AAD 직렬화 형식은 유지했다. .env.example와 Railway 키 교체 절차를 갱신했다.
- **검증:** 집중 암호화 테스트 52/52, 전체 Vitest 161개 파일·1,337개 테스트, ESLint, TypeScript typecheck, Next production build 통과. 리뷰어 승인. test:cov 테스트는 모두 통과했지만 전역 statements/lines 65.52%, functions 77.45%, 엔진 statements/lines 94.68%로 설정 기준 80%/95%에 미달했다. skill-manager verify --run은 Windows bare pnpm을 찾지 못해 네 체크가 모두 WinError 2였고, 같은 lint·typecheck·test·build를 pnpm.cmd로 직접 통과했다.
- **운영 경계·다음:** 키 회전, Neon/DB 변경, 결제 플래그, Toss 결제, 배포는 하지 않았다. 운영 도메인의 기존 버전 read-only smoke는 18/18이었으며 이 코드 변경은 아직 배포되지 않았다. 실제 staging RLS, Toss sandbox 결제·중복 웹훅·환불·권한 회수, 법무·PG 승인, 운영 Sentry 알림과 롤백 리허설을 확인한 뒤에만 유료 판매 준비도를 재평가한다.

## 2026-09-30 회원 로컬 데이터 claim 경계 검증

- **관찰:** `claimOwnLocalData`는 계정 프로필과 브라우저 로컬 결과의 서버 저장 경계지만 직접 회귀 테스트가 없었다. 실제 staging 교차 사용자 RLS 검증은 별도 운영 게이트로 남아 있다.
- **변경:** 새 DAL 테스트에서 인증·필수 동의가 없을 때 저장 트랜잭션을 차단하고, 추가 필드가 포함된 프로필·원시 응답을 담은 snapshot·중복 snapshot ID를 저장 전에 거부하는 동작을 고정했다. 프로필 행 잠금과 기존 ID 재사용, 회원 ID 범위의 upsert, 결과 재요청 시 충돌 무시와 첫 삽입만 집계하는 동작도 확인한다.
- **검증:** 집중 DAL 테스트 6/6, 전체 Vitest 162개 파일·1,343개 테스트, ESLint, TypeScript typecheck, Next.js production build 통과. 코드 리뷰 승인. skill-manager `verify --run`은 Windows에서 bare `pnpm`을 찾지 못해 실패했지만, 동일 gate를 `pnpm.cmd`로 직접 실행해 통과했다.
- **운영 경계·다음:** DB 호출은 모의 환경에서 검증했다. staging의 실제 RLS 양방향 소유권, 결제·환불 사용자 여정, Sentry 알림과 롤백, 법무·PG 승인은 확인하지 않았고 데이터베이스·배포·결제 설정도 변경하지 않았다.

## 2026-09-30 결제 worker 재조정·영수증 큐 검증

- **관찰:** `billing/service.ts`의 재조정 주문 조회, 만료 미결제 주문 회수, 영수증 작업 claim·완료 처리 함수가 직접 테스트되지 않았다. 이 경로들은 결제 상태 정리와 결제 완료 후 영수증 전달을 담당한다.
- **변경:** 9개 테스트로 Toss 재조정 배치 제한과 SQL `LIMIT`, 만료된 pending Toss 주문만 취소하는 조건, 유료 주문·최대 재시도·lease 만료·`SKIP LOCKED`에 따른 receipt claim과 processing 전이를 검증한다. 영수증 완료 표시는 현재 attempt에만 적용되고 공급자 메시지 ID를 200자로 제한하는지 확인한다.
- **검증:** 집중 테스트 9/9, 전체 Vitest 163개 파일·1,352개 테스트, ESLint, TypeScript typecheck, Next.js production build 통과. 코드 리뷰 승인. `test:cov`의 테스트는 통과했지만 전역 statements/lines 66.78%, branches 84.47%, functions 76.99%로 임계치(각 80%/75%/80%) 중 statements/lines와 functions가 미달하고, engine statements/lines 94.68%도 95% 기준에 미달했다. `billing/service.ts`는 statement counter 421/655, function counter 24/36, branch counter 121/142가 실행됐다.
- **운영 경계·다음:** DB transaction은 mock으로 실행했으며 실제 Neon의 행 잠금·`SKIP LOCKED`, Railway worker schedule, Resend 전달, Toss sandbox는 검증하지 않았다. staging RLS 테스트 계정 ID 두 개가 현재 로컬 설정에 없어 교차 사용자 RLS를 실행하지 못했다. 실제 결제·영수증·권한 여정과 Sentry 알림·롤백 리허설은 해당 staging 계정과 외부 승인을 준비한 뒤 검증한다.

## 2026-09-30 Toss 환불 거절·상태 복구 경계

- **관찰:** 환불 취소 API의 모든 4xx를 실패로 처리해 예약을 해제하고 주문을 `paid`로 복구했다. Toss는 이미 취소된 결제도 `ALREADY_CANCELED_PAYMENT`와 HTTP 400으로 응답할 수 있어, PG는 취소됐는데 로컬 주문이 유료로 되돌아갈 수 있었다. 실패 복구 쿼리도 환불 예약이 실제로 `pending`에서 `failed`로 바뀌었는지 확인하지 않았다.
- **변경:** Toss 오류 응답에서 형식이 검증된 오류 코드만 읽고, 요청 검증·인증 또는 만료·취소 불가가 명시된 코드에만 예약 복구를 허용한다. `ALREADY_CANCELED_PAYMENT`, 알 수 없는 코드, 서버 오류는 환불 상태에 남겨 대사하도록 했다. 두 환불 API 모두 같은 판정기를 사용한다. 복구 트랜잭션은 먼저 `refunding` 주문을 잠그고, 해당 주문에 속한 `pending` 환불 행이 실제 갱신된 경우에만 주문을 `paid`로 복구한다.
- **검증:** 환불·Toss 집중 테스트 27/27, 전체 Vitest 163개 파일·1,356개 테스트, ESLint, TypeScript typecheck, Next.js production build 통과. `test:cov`는 테스트 자체는 통과했지만 전역 statements/lines 66.89%, functions 77.14%, `src/engine/**` statements/lines 94.68%로 각각 80%/95% 임계치에 미달해 exit 1이었다. skill-manager `verify --run`은 Windows에서 bare `pnpm` 실행 경로를 찾지 못해 네 체크 모두 `WinError 2`로 종료했으며, 같은 lint/typecheck/test/build 명령은 `pnpm.cmd`로 직접 실행해 통과했다.
- **운영 경계·다음:** DB 동시성은 모의 트랜잭션으로만 검증했고 Neon staging, Toss sandbox·실결제, 배포는 실행하지 않았다. 모호한 PG 오류는 의도적으로 주문을 `refunding`에 유지하므로 실제 대사 후 복구 절차와 알림은 운영 계정으로 계속 검증해야 한다.

## 2026-09-30 환불 제공자 초기화·예약 경합 순서

- **관찰:** 제공자를 해석하기 전에 환불 예약을 만들면 설정 오류가 신규·재사용 예약을 잘못 해제할 수 있었다. 같은 Toss 멱등 요청 두 개가 성공하는 경우에는 첫 요청이 환불을 끝낸 뒤 두 번째 요청이 이미 완료된 같은 환불을 `400`으로 응답할 수 있었다.
- **변경:** 회원 환불은 회원 인증·필수 동의를 확인하고, 관리자 환불은 owner 권한을 확인한 뒤 결제 제공자를 먼저 해석한다. 제공자 준비 뒤에만 예약을 만들고, 실제 취소 요청 후 Toss의 명시적 거절 코드가 확인된 경우에만 예약을 복구한다. 이미 `refunded`인 주문은 동일 결제에 속한 동일 `refundId`가 `succeeded`일 때만 성공으로 재응답하며 감사·권한 변경을 반복하지 않는다. 다른 환불 ID나 결제 ID는 거부한다.
- **검증:** 환불 라우트·서비스 집중 테스트 28/28, 전체 Vitest 165개 파일·1,373개 테스트, ESLint, TypeScript typecheck, Next.js production build 통과. 코드 리뷰 승인. `test:cov`의 테스트는 통과했지만 전역 statements/lines 66.89%, functions 77.06%, `src/engine/**` statements/lines 94.68%로 설정 기준 80%/95%에 미달해 exit 1이다. skill-manager `verify --run`은 Windows bare `pnpm` 실행을 찾지 못해 네 체크가 `WinError 2`였고, 같은 lint·typecheck·test·build는 `pnpm.cmd`로 직접 통과했다.
- **운영 경계·다음:** 변경은 로컬 코드·테스트·문서에 한정했다. 실제 Neon transaction/RLS, Toss sandbox 환불·대사, Sentry 알림·롤백 리허설, 법무·PG 승인과 운영 배포는 확인하지 않았다. 이 운영 증거와 엔진 커버리지 기준을 확보한 뒤 유료 판매 준비도를 다시 평가한다.

## 2026-09-30 엔진 근거 블록·규준 검증 보강

- **관찰:** 인지 점수 규준 표의 연령 범위·단조성·theta grid 오류와 MBTI 64유형 해설의 잘못된 한·영 문안, 인용·근거 블록 생성 경로를 직접 검증하는 테스트가 부족했다. 이 조건은 승인 규준 적용과 유료 리포트의 완결성에 영향을 준다.
- **변경:** 인지 규준이 비어 있거나 범위가 불완전하고, 환산 표가 비단조·비유한 값·잘못된 theta grid를 포함하거나, 버전·모집단·입력 메타데이터가 맞지 않을 때 거부되는 사례를 추가했다. MBTI 유형별 해설의 비진단적 영문·국문 방법 문구, 유효 인용과 근거 ID, 잘못된 문안 길이·키워드·성장 질문 수 거부, 결과 불변성을 검증했다. 규준 미승인 상태의 점수 공개 차단은 변경하지 않았다.
- **검증:** 집중 테스트 31/31, 전체 Vitest 165개 파일·1,381개 테스트, ESLint, TypeScript typecheck, Next.js production build 통과. 엔진 커버리지는 statements 95.10%, branches 92.50%, functions 98.18%로 설정 기준 95%/90%/95%를 통과했다. `test:cov` 전체는 statements/lines 67.06%, branches 85.16%, functions 77.26%로 전역 기준 80%/75%/80% 중 statements/lines와 functions가 미달해 exit 1이다. 코드 리뷰 승인.
- **운영 경계·다음:** skill-manager `verify --run`은 Windows에서 bare `pnpm`을 찾지 못해 네 체크가 `WinError 2`로 종료됐다. 직접 실행한 `pnpm.cmd` 검사 결과는 별도로 통과했다. 실제 Neon RLS, Toss sandbox 결제·환불, Sentry 알림·롤백 리허설, 법무·PG 승인, production 배포는 확인하거나 변경하지 않았다. 이 외부 운영 증거와 전역 서버 커버리지 개선을 계속 진행한다.

## 2026-09-30 관리자 AI 원가율 안내의 null 원인 구분

- **관찰:** 순매출이 0이면 분모가 없어 `aiCostSharePercent`가 `null`인데, 화면은 모든 `null`을 재무 승인 환율 누락으로 표시했다. AI 원가 원장 조회 실패도 같은 안내로 합쳐져 운영자가 원인을 잘못 해석할 수 있었다.
- **변경:** 매출 분모가 0인 상태, AI 사용 원가 데이터 부재, 재무 승인 환율 누락을 별도 한국어·영어 문구로 표시한다. 서버 컴포넌트 DOM 회귀 테스트에서 무매출 문구는 두 언어를 확인하고, 원가 데이터 부재와 환율 누락도 따로 확인한다.
- **검증:** 집중 DOM 테스트 3/3, 전체 Vitest 167개 파일·1,387개 테스트, ESLint, TypeScript typecheck, Next.js production build 통과. 코드 리뷰 승인. skill-manager `verify --run`은 Windows bare `pnpm` 경로 문제로 네 항목이 `WinError 2`였고 동일 검사를 `pnpm.cmd`로 직접 통과했다.
- **운영 경계·다음:** Neon 실데이터·재무 승인 환율·Toss 결제/환불·RLS와 외부 운영 절차는 검증하거나 변경하지 않았다. 법무·PG 승인과 운영 대사, Sentry 알림·롤백 리허설은 유료 판매 전 별도 DoD로 유지한다.

## 2026-10-01 2027 report expert review release gate

- **관찰:** Phase 4 완료 조건에는 전문가 검수 서명이 있지만 판매·주문 생성 경로가 이를 강제하지 않았다. AI는 승인 boolean만 확인했고, 기존 구매자에게 새 미승인 보고서가 제공되거나 열람 기록이 먼저 남을 위험도 확인됐다.
- **변경:** 검수 boolean과 보고서 버전 2027-saju-report-v1이 모두 일치할 때만 판매·주문·AI를 허용하도록 공통 서버 게이트를 추가했다. 기존 구매자도 승인 전에는 보고서와 AI 본문을 볼 수 없고, 승인 후에만 열람 기록을 남긴다. 오프라인 프로덕션 빌드를 위해 이미 설치된 Fontsource Latin CSS와 명시적인 OS CJK 서체 대체를 적용했다.
- **검증:** 집중 검수 게이트 16/16, 전체 Vitest 170개 파일·1,395개 테스트, ESLint, TypeScript typecheck, Next.js production build, git diff --check 통과. 코드 리뷰 승인. skill-manager verify --run은 Windows에서 bare pnpm을 찾지 못해 WinError 2였고, 같은 lint·typecheck·test·build를 pnpm.cmd로 직접 통과했다.
- **운영 경계·다음:** .env.example은 승인 false를 유지한다. 운영 환경 승인값, 실제 전문가 서명, Neon/RLS, Toss sandbox 결제·환불, 법무·PG 승인, Sentry 경보·롤백 리허설과 production 배포는 확인하거나 변경하지 않았다. 정확한 버전 검수 증거를 받은 뒤 staging 검증을 이어간다.
- **Phase 4 DoD 확인:** 기존 골든 케이스는 2027 입춘 전후 5분, 출생 시각 미상, 23:15 야자시를 직접 검증하고 16개 서술 블록의 evidenceRefs를 확인한다. yearForecast.ts 집중 커버리지는 statements/lines 98.79%, branches 92.3%, functions 100%다. 전문가의 실제 서명은 여전히 별도 승인 조건이다.

## 2026-10-01 회원 데이터 내보내기·계정 삭제 경계

- **관찰:** 상용화 Phase 2의 회원 데이터 접근을 구현한 DAL에는 프로필·저장 결과 조회, 전체 개인정보 내보내기, 계정 삭제의 직접 회귀 테스트가 없었다. 계정 삭제는 청구 데이터를 먼저 정리한 다음 인증 DB의 사용자 행을 삭제한다.
- **변경:** 프로필·결과 조회의 회원 범위와 복호화 AAD, 내보내기의 개인정보·결제·구매 동의 포함 및 결제 저장소 미설정 분기, 이메일 소유 확인과 청구 정리 선행, identity 삭제 트랜잭션의 성공·실패 복구를 8개 테스트로 고정했다. 애플리케이션 로직과 DB 스키마는 변경하지 않았다.
- **검증:** DAL 집중 테스트 14/14, 전체 Vitest 170개 파일·1,403개 테스트, ESLint, TypeScript typecheck, Next.js production build, `git diff --check` 통과. 코드 리뷰 승인. `test:cov`는 테스트 전체 통과 후 statements/lines 68.08%, branches 85.07%, functions 78.15%로 전역 기준 80%/75%/80% 중 statements/lines와 functions가 미달해 exit 1이다. skill-manager `verify --run`은 Windows의 bare `pnpm` 탐색 오류(WinError 2)로 실패했으며 직접 실행한 `pnpm.cmd` 네 검사 결과는 통과했다.
- **운영 경계·다음:** DB 응답은 모의 환경에서만 확인했다. 실제 Neon/identity RLS와 다중 DB 계정 삭제 동작, staging 회원 내보내기·삭제 여정은 확인하지 않았다. 전체 서버 커버리지 게이트와 Sentry 운영 알림·롤백, 결제 staging E2E, 법무·PG 승인은 계속 출시 전 DoD로 남긴다.

## 2026-10-01 프로필 세션 서버 만료·재사용 방지

- **관찰:** 리포트 프로필 세션은 브라우저 쿠키에만 30분 만료가 설정되어 있었다. 쿠키 값을 복사하면 만료 뒤에도 서버 복호화가 이를 받아들여 개인정보가 든 birth/compatibility 프로필을 계속 재사용할 수 있었다.
- **변경:** 암호화된 세션 안에 버전과 서버 검증 만료 시각을 포함하고, 만료·구버전·변조·잘못된 종류의 페이로드를 거부한다. 쿠키 만료도 동일한 TTL 상수를 사용한다. 회귀 테스트는 정확히 30분 경계, 쿠키 보안 속성, 키·암호문 오류, 미설정 쿠키, 기존 URL 공유 프로필 호환 경로와 잘못된 프로필 거부를 확인한다. 배포 시 기존 v1 임시 세션 쿠키는 재입력 대상으로 무효화된다.
- **검증:** 집중 테스트 19/19, 전체 Vitest 172개 파일·1,444개 테스트, ESLint, TypeScript typecheck, Next.js production build, `git diff --check` 통과. 프로필 세션 모듈은 statements/lines 97.93%, branches 90.47%, functions 100%다. `test:cov` 전체 테스트는 통과했지만 전역 statements/lines 68.84%, branches 85.43%, functions 78.52%로 전역 기준 80%/75%/80% 중 statements/lines와 functions가 미달해 exit 1이다. skill-manager `verify --run`은 Windows의 bare `pnpm` 경로 오류(WinError 2)로 실패했고, 같은 lint·typecheck·test·build를 `pnpm.cmd`로 직접 실행해 통과했다.
- **운영 경계·다음:** 변경은 로컬 코드·테스트·기록뿐이다. Neon/RLS, staging 쿠키 회전·로그인 및 실제 배포는 확인하지 않았다. 기존 공유 URL 경로는 테스트로 확인했지만 실제 브라우저 여정과 production 비밀키 교체 영향은 별도 staging에서 검증해야 한다. 미달한 전체 커버리지는 서버의 고위험 결제·회원 경로부터 행동 기반 테스트로 보강하고, 결제 staging E2E·Sentry 경보/롤백·법무/PG 승인도 유료 판매 전 DoD로 계속 추적한다.

## 2026-10-01 음력 공유 프로필 날짜 검증 호환

- **관찰:** `memberProfileSchema`가 양력 월 길이를 모든 프로필에 적용해, 엔진의 공통 입력 검증기와 공유 URL 디코더가 허용하는 유효한 음력 날짜 1990-02-30을 거부했다. 이 검증은 신규 프로필 세션, 세션 복호화, 기존 호환성 공유 URL에 모두 영향을 줬다.
- **변경:** 회원 프로필 스키마가 엔진의 `assertValidBirthInput`을 사용하도록 맞춰 양력 날짜만 그레고리 월 길이를 검사하게 했다. 회귀 테스트는 음력 프로필을 신규 birth/compatibility 세션에 저장·복호화하고, 기존 compatibility 공유 URL에서도 유지되는지 확인한다.
- **검증:** 집중 테스트 20/20, 전체 Vitest 172개 파일·1,445개 테스트, ESLint, TypeScript typecheck, Next.js production build 통과. `test:cov` 테스트는 전체 통과했지만 statements/lines 68.85%, branches 85.43%, functions 78.52%로 전역 기준 80%/75%/80% 중 statements/lines와 functions가 미달해 exit 1이다. `profileSchema.ts` 커버리지는 statements/lines 90%, branches 66.66%, functions 100%다. skill-manager `verify --run`은 Windows bare `pnpm` 탐색 오류(WinError 2)로 실패했고 직접 실행한 `pnpm.cmd` 검사는 통과했다.
- **운영 경계·다음:** 달력별 입력과 URL 호환만 로컬 코드에서 검증했다. Neon/RLS, staging 로그인·결제, Sentry 경보/롤백, 법무·PG 승인은 확인되지 않아 유료 판매 전 DoD로 남아 있다. 다음 단계에서 회원·결제 서버 경로의 행동 커버리지를 높이고 실제 staging 검증 증거를 확보한다.

## 2026-10-01 음력 실제 변환 가능성 검증

- **관찰:** 형식상 날짜 범위 검사만으로는 변환표에 없는 윤달 날짜와 변환 지원 범위를 넘는 음력 연도를 저장할 수 있었다. 이런 세션은 나중에 사주 계산 시 변환 오류를 일으킬 수 있었다.
- **변경:** 프로필 스키마가 한국 음력 변환기의 지원 연도와 실제 날짜 변환을 확인한다. 변환 불가 연도와 존재하지 않는 날짜는 신규 세션 저장 단계와 암호화 세션 해석 단계에서 거부하고, 유효한 음력 2월 30일 및 기존 공유 URL은 허용한다.
- **검증:** 프로필 세션·회원 DAL 집중 테스트 35/35, 전체 Vitest 172개 파일·1,446개 테스트, ESLint, TypeScript typecheck, Next.js production build 통과. `test:cov` 전체 테스트는 통과했지만 statements/lines 68.87%, branches 85.50%, functions 78.52%로 전역 기준 80%/75%/80% 중 statements/lines와 functions가 미달해 exit 1이다. `profileSchema.ts` 커버리지는 statements/lines 92.30%, branches 80%, functions 100%다. skill-manager `verify --run`은 Windows bare `pnpm` 탐색 오류(WinError 2)로 실패했고, 같은 네 검사를 `pnpm.cmd`로 직접 통과했다.
- **운영 경계·다음:** 음력 유효성은 현재 설치된 한국 음력 변환기와 로컬 테스트로 확인했다. Neon/RLS, staging 로그인·결제, Sentry 경보·롤백, 법무·PG 승인은 확인하지 않았다. 출시 전에는 실제 staging에서 회원·결제 여정을 확인하고 전역 커버리지 게이트를 충족해야 한다.

## 2026-10-01 회원 인증 설정의 줄바꿈 입력 차단

- **관찰:** 회원 인증 준비 판정은 `AUTH_EMAIL_FROM`과 Turnstile 키가 줄바꿈을 포함해도 구성 완료로 판단할 수 있었다. 발신 주소는 인증 초기화 시 예외를 일으키고 CAPTCHA 사이트 키는 화면 제공 단계에서 숨겨져, readiness 결과와 실제 사용 가능성이 달라질 수 있었다.
- **변경:** 발신 주소와 Turnstile 비밀 키·사이트 키의 CR/LF를 공통 검사해 인증을 fail-closed 처리한다. CAPTCHA 사이트 키 getter에도 같은 검사를 적용하고 정상값은 그대로 유지한다.
- **검증:** 집중 테스트 4/4, 전체 Vitest 173개 파일·1,450개 테스트, ESLint, TypeScript typecheck, Next.js production build, `git diff --check` 통과. 코드 리뷰 승인. skill-manager `verify --run`은 Windows bare `pnpm` 탐색 오류(WinError 2)로 실패했으나 동일 gate를 `pnpm.cmd`로 직접 실행해 통과했다.
- **운영 경계·다음:** 로컬 코드·테스트·문서만 변경했다. 회원 인증 환경값, Neon/RLS, staging 로그인·결제, 배포는 변경하거나 확인하지 않았다. 실제 staging의 교차 사용자 RLS와 로그인·결제 여정, Sentry 알림·롤백, 법무·PG 승인은 출시 전 DoD로 남아 있다.

## 2026-10-01 LUMINA Plus 자동결제와 알림 검증 확장

- **관찰:** Plus 구독 판매 준비, 빌링 키 등록, PG 응답 확인, 결제 원장 반영, 재시도·해지·정리 작업, 구독 통지는 상용 과금 흐름의 핵심인데 단위 검증이 부족했다. 전체 테스트 통과와 별개로 statements/lines 커버리지도 전역 출시 게이트에 미달했다.
- **변경:** 인증 메일 전송이 거부되거나 예외를 던질 때 공급자 세부 오류가 외부로 나가지 않도록 일반 오류로 정규화했다. Plus 가격·체크아웃·빌링 키 등록·내 구독 취소·갱신 청구·재시도·만료·빌링 키 정리와 알림 outbox의 승인 게이트, 결제 불일치, 원장 반영, 이메일 escape·idempotency·재시도 테스트를 추가했다.
- **검증:** 전체 Vitest 178개 파일·1,537개 테스트, ESLint, TypeScript typecheck, Next.js production build 통과. `test:cov`의 테스트는 모두 통과했으며 커버리지는 statements/lines 74.62%, branches 85.43%, functions 81.25%다. 전역 statements/lines 기준 80%를 채우지 못해 coverage 명령은 exit 1이다. 두 구독 모듈은 각각 statements/lines 95.48%와 96.95%다. `skill_manager verify --run`은 Windows bare `pnpm` 실행 파일 탐색 오류(WinError 2)로 중단됐고 동일 lint/typecheck/test/build는 `pnpm.cmd` 직접 실행으로 통과했다.
- **운영 경계·다음:** DB 드라이버, PG, Resend를 모의한 로컬 테스트만 실행했다. Neon staging RLS, 실제 로그인·결제·환불·이메일 전달, Sentry 경보·롤백, 법무·PG 승인은 확인하거나 변경하지 않았다. 전역 statements/lines 80%와 실제 staging 회원·결제 여정 및 RLS 검증은 출시 전 DoD로 남아 있다.

## 2026-10-01 구독 알림 lease와 원장 연결 검증 보강

- **관찰:** 구독 알림 재청구 기준이 생성 시각이어서 오래된 알림은 claim 직후 다른 worker가 다시 가져갈 수 있었다. 암호화 수신 주소가 없는 알림도 claim 뒤 필터링돼 `processing`에 남을 수 있었고, 최대 10회 처리 중 worker가 중단되면 DB 시도 횟수 제한을 넘어 재청구될 여지도 있었다. 체크아웃·갱신 성공·최종 실패 테스트는 일부 쿼리 존재만 확인했다.
- **변경:** 현재 스키마에 있는 `send_after`를 lease 시각으로 갱신하고, lease가 만료된 작업만 회수한다. 수신 암호문과 유효 키 버전이 있는 구독만 claim하며, lease가 만료된 10회 처리 작업은 `attempt_limit`으로 종료한다. 테스트가 체크아웃 구독·동의 INSERT, 결제 ledger·권한 만료·구독 기간 연결, 최종 `expired` 상태의 바인딩 값을 확인한다. 새 마이그레이션은 만들거나 실행하지 않았다.
- **검증:** 전체 Vitest 178개 파일·1,538개 테스트, ESLint, TypeScript typecheck, Next.js production build, `git diff --check`가 통과했다. `test:cov` 테스트도 모두 통과했지만 전역 커버리지는 statements/lines 74.63%, branches 85.42%, functions 81.25%로 statements/lines 80% 기준을 충족하지 못해 명령이 exit 1이다. `subscriptionNotices.ts` 97.20%, `subscriptions.ts` 95.48%다. skill-manager `verify --run`은 bare `pnpm`을 찾지 못해 4개 명령 모두 `WinError 2`였고, 직접 실행한 `pnpm.cmd` lint·typecheck·test·build는 통과했다.
- **운영 경계·다음:** 결제 DB 쿼리는 모의 테스트로만 검증했다. 실제 PostgreSQL의 CTE 실행, staging RLS, 로그인·Toss 결제·환불·Resend 전달, Sentry 알림·롤백, 법무·PG 승인은 확인하거나 변경하지 않았다. 전역 statements/lines 80%와 실제 staging 회원·결제 여정 및 RLS 검증, 외부 승인 항목이 출시 전 DoD로 남아 있다.

## 2026-10-01 AI 생성량·비용 한도 경계

- **관찰:** AI 생성량과 원가 경로에는 상품별·일별·월별 생성 한도, 예산 초과 예약 차단, 예약 해제, 원가 원장 기록을 함께 고정하는 직접 회귀 테스트가 없었다. 음수 원가가 들어오면 일일 지출액은 감소시키면서 원장에는 0을 기록할 수 있었다.
- **변경:** 중복 요청은 할당량을 재사용하고, 신규 요청은 상품·일·월 한도를 예약한 뒤에만 큐에 들어가는지 검증한다. 요청 원가가 남은 일일 예산을 넘으면 예약을 거부하며, 실제 사용료·예약액·토큰·모델은 정산 원장에 연결한다. 사용료는 일일 예산과 원장에서 동일한 0 이상 값으로 정산하고, 예약 해제 및 집계 기간·안전 정수 경계도 검증한다.
- **검증:** AI service/database 집중 테스트 22/22, 전체 Vitest 180개 파일·1,560개 테스트, ESLint, TypeScript typecheck, Next.js production build 통과. DB 테스트는 non-superuser·non-BYPASSRLS 역할 제한, 성공 commit, 오류 시 rollback과 원래 오류 보존을 확인한다. 코드 리뷰 승인. `test:cov`의 테스트는 모두 통과했지만 전역 statements/lines 76.43%로 80% 기준에 못 미쳐 명령은 exit 1이다. `skill_manager verify --run`은 Windows에서 bare `pnpm`을 찾지 못해 4개 항목이 `WinError 2`로 종료됐고 직접 실행한 `pnpm.cmd` 검사 결과는 통과했다.
- **운영 경계·다음:** 비용 예약 테스트는 모의 DB로만 검증했다. 실제 Neon 동시성·RLS, OpenRouter 과금 응답, 결제·환불 staging, Sentry 알림·롤백, 법무·PG 승인은 확인하거나 변경하지 않았다. 전역 커버리지 기준과 실제 staging 회원·결제·RLS 검증, 운영 알림, 외부 승인은 유료 판매 전 DoD로 남아 있다.

## 2026-10-03 AI 내러티브 안전 검증의 Unicode 우회 차단

- **관찰:** AI 문장 필터가 ASCII 숫자만 확인했고, 금칙 표현 탐색에는 제한된 혼동 문자 목록을 사용했다. 전각 텍스트, 기본 무시 문자, 다른 스크립트의 시각적 유사 문자를 사용하면 숫자 판정이나 금칙 표현 탐색을 우회할 수 있었다.
- **변경:** 검증 전 NFKC 정규화와 기본 무시 문자 제거를 적용한다. 십진 숫자는 원문 정규화 결과와 혼동 문자 변환 결과에서 모두 확인한다. Unicode 18 UTS #39 데이터에서 단일 코드포인트가 ASCII 영숫자로 대응되는 1,792개 매핑을 추출해 금칙 표현 탐색에 사용하고, 소스·라이선스 고지를 포함했다([Unicode 18 confusables data](https://www.unicode.org/Public/18.0.0/security/confusables.txt), [Unicode License v3](https://www.unicode.org/license.txt)). 근거 lane·존재하지 않는 인용·월별 인용 대상·90% 커버리지 경계와 Unicode 우회 사례를 직접 검증한다.
- **검증:** AI 검증 집중 테스트 20/20, 전체 Vitest 181개 파일·1,580개 테스트, ESLint, TypeScript typecheck, Next.js production build 통과. `validation.ts` 커버리지는 statements/lines 95.94%, branches 91.42%, functions 100%이며 `unicodeConfusables.ts`는 statements/lines·branches·functions 100%다. 전체 커버리지는 statements/lines 78.63%, branches 85.38%, functions 81.55%로 80% statements/lines 기준에 미달해 coverage 명령은 exit 1이다. skill-manager `verify --run`은 Windows에서 bare `pnpm` 탐색 오류(WinError 2)로 4개 명령 실행에 실패했다.
- **운영 경계·다음:** 검증은 로컬 코드와 테스트에 한정한다. 실사용 AI 출력 품질 골든셋, OpenRouter 응답·과금, Neon 동시성/RLS, staging 회원·결제, Sentry 알림·롤백, 법무·PG 승인은 확인하지 않았다. 전역 커버리지와 실제 staging 검증 및 외부 승인 항목은 유료 판매 전 DoD로 남아 있다.

## 2026-10-03 AI 파이프라인·결제 계정 생명주기 커버리지 보강

- **관찰:** AI 사실 구성·공급자 비용 기록·worker 재시도 경계와 결제 주문 조회·권한 대체·계정 삭제 정리는 유료 서비스의 정확성 및 비용·개인정보 보호에 중요하지만 직접 행동 검증이 부족했다. 직전 전체 커버리지는 statements/lines 79.54%로 저장소의 80% 문턱을 넘지 못했다.
- **변경:** AI facts/provider/worker에 28개 테스트를 추가해 골든 사실·설정·예산 차단·재시도·실패 fallback을 확인한다. 결제 서비스에는 회원 범위 주문과 비식별 운영자 조회, Plus 권한 대체, 계정 삭제 시 미결제 주문/처리 중 invoice 차단 및 구독 종료·수신 정보 삭제, 영수증 오류 상태 변경을 검증하는 13개 테스트를 추가한다. 서비스 동작 코드는 수정하지 않았다.
- **검증:** 결제 서비스 집중 테스트 22/22, 전체 Vitest 184개 파일·1,621개 테스트 통과. 전체 statements/lines 80.07%, branches 85.64%, functions 82.61%로 전역 기준을 통과했다. `server/billing/service.ts`는 statements/lines 91.55%, branches 85.98%, functions 89.18%다. ESLint, TypeScript, Next.js production build, `git diff --check`도 통과했다. skill-manager `verify --run`은 Windows bare `pnpm` 탐색 오류(WinError 2)였고 동등한 명령을 `pnpm.cmd`로 직접 실행해 통과했다.
- **운영 경계·다음:** 결제 DB 테스트는 모의 transaction이며 Neon/RLS, Toss sandbox 승인·환불, OpenRouter 실사용 과금, staging 여정, Sentry 경보·복구, 법무·PG 승인은 확인하지 않았다. 코드는 로컬에만 두었고 마이그레이션·배포·push를 실행하지 않았다. 상용 판매 전 실제 staging 결제와 교차 계정 RLS 증거를 추가 확보해야 한다.

## 2026-10-08 production cron 배포 정렬

- **관찰:** production `cron-10min`의 9월 29일 배포는 저장소와 다른 4개 작업 목록을 실행했고, 그중 `billing_reconcile`이 10분 일정에 포함돼 있었다. 네 작업 모두 승인 게이트가 닫혀 실행되지는 않았다. 저장소와 배포 문서는 대사를 `cron-daily`에 둔다.
- **변경:** 저장소의 Docker 이미지를 production `cron-10min`에 배포해 예약 작업 구성을 현재 코드와 맞췄다. 데이터베이스 마이그레이션이나 운영 기능 게이트는 변경하지 않았다.
- **검증:** `scripts/test-railway-cron.mjs` 9/9 통과. Railway 배포 `2e87adaf-51bd-4601-ac09-33906b25db34`와 서비스 상태가 `SUCCESS`; 첫 예약 실행은 UTC 23:10에 예상한 `billing_receipts`, `ai_sweeper`, `subscription_sweeper` 3개를 모두 건너뛰었다. `cron-daily`의 17:00 UTC 실행은 분석 작업 1건 성공, 건너뜀·실패 0건이었다. staging 환경에는 `web`만 있고 cron 서비스는 없다.
- **운영 경계·다음:** 결제·AI·구독 작업은 계속 승인 게이트로 비활성이다. Sentry server 보고도 production DSN이 없어 꺼져 있다. 실제 작업 효과, Toss 결제·환불, staging 회원/RLS 흐름은 외부 설정과 승인이 갖춰진 뒤 검증한다.

## 2026-10-10 판매자 정보 전역 표시와 결제 개통 게이트

- **관찰:** 토스 카드사 심사는 홈페이지 하단에 상호·대표자·사업자등록번호·주소·고객센터 연락처·통신판매업 신고번호를 요구한다([토스 체크리스트](https://www.tosspayments.com/blog/articles/53711)). 기존 `BusinessInfoFooter`는 `/refund-policy`에만 있었고 대표자·신고번호·전화·호스팅 제공자가 없었다. preflight도 판매자 정보 없이 `FEATURE_BILLING=true`를 허용했다. Dockerfile에 `ARG`가 없어 Railway 변수 `NEXT_PUBLIC_SELLER_*`가 빌드에 전달되지 않았다([Railway 문서](https://docs.railway.com/guides/build-time-vs-runtime-secrets)).
- **변경:** 판매자 정보 8개 항목을 루트 레이아웃 하단에 표시한다. 한 항목이라도 비면 아무것도 그리지 않으며, 세션을 읽지 않는 동기 컴포넌트라 정적 렌더링을 유지한다. builder 단계에 8개 `ARG`를 추가했고, 결제를 켜면 preflight가 8개 변수를 모두 요구하며 줄바꿈을 거부한다. Dockerfile ARG 목록과 preflight 목록이 어긋나면 테스트가 실패한다. 외부 승인 항목은 `docs/LAUNCH-APPROVAL-READINESS.md`로 정리했다.
- **검증:** preflight 11/11, cron 9/9, 푸터 DOM 10/10, 전체 Vitest 185개 파일·1,631개 테스트, ESLint, typecheck, Next.js production build 통과.
- **운영 경계·다음:** 변수가 설정되지 않은 현재 운영 화면에는 변화가 없다. Railway 변수 등록·배포·push는 하지 않았다. 판매자 변수 등록 후 재배포하고 운영 홈 하단 표시를 확인한다. 코드 리뷰의 후속 개선 2건(다건 부분 취소 시 `provider_refund_id` 미기록, 환불 라우트의 항상 같은 값으로 평가되는 분기)은 금액 흐름에 영향이 없어 보류했다.
