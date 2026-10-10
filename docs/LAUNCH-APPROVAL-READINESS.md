# 2027 신년운세 리포트 출시 승인 준비표

기준일: 2026-10-10 · 목표: 2026-12-01 국내 소프트 런치(토스 단건, 상품 1종) · 근거 계획: `COMMERCIALIZATION-PLAN.md` D10

이 문서는 사람이 처리해야 하는 외부 승인 항목과, 승인 후 켜야 하는 운영 변수를 한곳에 정리한다. 여기 적힌 승인 변수는 **실제 승인 증거를 받은 뒤에만** 설정한다. 코드·에이전트가 대신 켜지 않는다.

## 1. 일정 위험이 큰 순서

| 순위 | 항목 | 담당 | 리드타임(확인된 범위) | 막히는 것 |
|---|---|---|---|---|
| 1 | 토스페이먼츠 계약 + 카드사 심사 | 대표자 | 계약 완료 후 최대 10~14영업일 ([토스 체크리스트](https://www.tosspayments.com/blog/articles/53711)) | 라이브 키 → 결제 전체 |
| 2 | 통신판매업 신고 | 대표자 | 관할 지자체 처리 기간 확인 필요 | 카드사 심사(신고번호 누락 시 반려) |
| 3 | 법무 검토(약관·처리방침·환불/청약철회·국외 이전·회원 동의) | 법무 | 미정 | `BILLING_LEGAL_DOCUMENTS_APPROVED`, `MEMBER_LEGAL_DOCUMENTS_APPROVED` |
| 4 | 2027 리포트 전문가 검수 서명(`2027-saju-report-v1`) | 명리 전문가 | 미정 | `YEAR_FORECAST_EXPERT_REVIEW_APPROVED` |
| 5 | 로그인 연동(카카오 비즈앱, Google OAuth) | 대표자 | 미정 | 회원 로그인 → 구매 |
| 6 | 가격 확정(현재 가설 ₩9,900) | 대표자 | 즉시 | 상품 노출 |

통신판매업 신고 → 토스 계약·심사가 직렬 경로다. 12-01에 맞추려면 늦어도 10월 중 신고와 토스 계약 신청을 마쳐야 한다.

## 2. 토스 카드사 심사 요건과 현재 상태

출처: [토스페이먼츠 카드사 심사 통과 체크리스트](https://www.tosspayments.com/blog/articles/53711)

| 요건 | 현재 상태 |
|---|---|
| 홈페이지 하단에 사업자등록번호, 상호, 사업장 주소, 대표자명(사업자등록증과 일치) | 전역 푸터 `BusinessInfoFooter`로 표시. `NEXT_PUBLIC_SELLER_*` 7개와 `NEXT_PUBLIC_HOSTING_PROVIDER`를 모두 설정하고 **재빌드**해야 나타난다(§4) |
| 고객센터 전화·이메일 | 위와 같음 |
| 통신판매업 신고번호 | 위와 같음. 신고 완료 후 입력 |
| 환불 정책 기재 | `/refund-policy` 존재. 현재 "초안" 문구 → 법무 확정본으로 교체 필요 |
| 구매 가능한 상품 1개 이상, 표시 금액 = 결제 금액 | **충돌**: 승인 게이트가 닫혀 있으면 구매 제안이 숨겨진다. 아래 결정 필요 |
| 업종 적격성 | 운세·점술 업종이 토스 "등록유의업종"에 해당하는지 공식 문서로는 미확인. 계약 신청 때 토스 영업 담당에게 확인한다 |

**결정 필요(대표자):** 카드사 심사 기간에 상품 페이지와 가격, 구매 버튼을 어떻게 보여줄지 정해야 한다. 토스 담당자에게 심사용 노출 방식(테스트 키 결제창 허용 여부)을 먼저 확인한 뒤 정하는 것을 권장한다. 승인 플래그를 미리 켜서 해결하지 않는다.

## 3. 승인 후 설정하는 운영 변수(값은 저장소에 쓰지 않음)

| 단계 | 변수 | 조건 |
|---|---|---|
| 사업자 표시 | `NEXT_PUBLIC_SELLER_NAME`, `NEXT_PUBLIC_SELLER_REPRESENTATIVE`, `NEXT_PUBLIC_SELLER_REGISTRATION_NUMBER`, `NEXT_PUBLIC_SELLER_MAIL_ORDER_NUMBER`, `NEXT_PUBLIC_SELLER_ADDRESS`, `NEXT_PUBLIC_SELLER_PHONE`, `NEXT_PUBLIC_SELLER_CONTACT_EMAIL`, `NEXT_PUBLIC_HOSTING_PROVIDER` | 사업자등록증·신고증과 글자 단위로 일치 |
| 회원 | `FEATURE_MEMBER_AUTH`, `BETTER_AUTH_*`, `IDENTITY_DATABASE_URL`, `MEMBER_DATABASE_URL`, OAuth 키, `MEMBER_LEGAL_DOCUMENTS_APPROVED` | 법무 승인 + staging RLS 교차 검증 통과 |
| 결제 | `FEATURE_BILLING`, `BILLING_DATABASE_URL`, `TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY`(production은 `live_`), 암호화·HMAC 키, `BILLING_LEGAL_DOCUMENTS_APPROVED` | 카드사 심사 통과 + staging 결제→환불 리허설 통과 |
| 상품 | `YEAR_FORECAST_EXPERT_REVIEW_APPROVED`, `YEAR_FORECAST_EXPERT_REVIEW_VERSION=2027-saju-report-v1` | 해당 버전 서명본 보관 |

`node scripts/railway-preflight.mjs`는 `FEATURE_BILLING=true`인데 위 조건(사업자 표시 포함)이 빠져 있으면 웹 프로세스 시작을 막는다. 이 검사는 값이 있는지와 형식만 확인하며, 실제 승인을 대신하지 않는다.

## 4. 엔지니어링 출시 전 확인(승인과 별개)

로컬에서 끝낸 검증(2026-10-10, 실제 PostgreSQL 18 + 운영 역할, 절차는 `docs/LOCAL-DB-INTEGRATION.md`):

- [x] 마이그레이션 14개가 빈 DB에 순서대로 적용된다.
- [x] 37개 업무 테이블 모두 RLS·FORCE RLS·정책 존재. 회원 역할에서 타인 행 0건, 타인 명의 쓰기·권한 자가 부여 차단.
- [x] 결제 worker 역할로 같은 웹훅 6회 재전송에도 권한 1건, 금액 변조 무시, 환불 완료 시 권한 회수·감사 1건, 결제사 거절 시 `paid` 복구.
- [x] 롤백 계약: `FEATURE_BILLING=false`이면 새 주문은 DB 접근 전에 거부되고 기존 구매자 열람은 유지된다(`src/server/billing/rollback.test.ts`).

외부 자격 증명이 있어야 하는 검증(staging):

- [ ] staging: Toss **테스트 키**로 결제창 → 확정 → 열람 → 셀프 환불을 끝까지 한 번 수행하고, 웹훅을 토스 개발자센터에서 재전송해 권한이 1건인지 확인
- [ ] staging: 회원 2명 RLS 교차 조회 0행(`pnpm db:neon:verify-rls`) — Neon 실제 역할 비밀번호·풀러 경로 확인
- [ ] Sentry: DSN과 `SENTRY_SERVER_ENABLED=true` 등록 후 `railway run --service web --environment production -- node scripts/sentry-verify.mjs --send`로 합성 이벤트 1건을 보내고, 출력된 `verificationId`가 Sentry와 알림 채널에 도착했는지 확인. SDK의 flush 성공은 도착을 보장하지 않는다
- [ ] 롤백 리허설: staging에서 `FEATURE_BILLING=false`로 재시작 후 구매 버튼이 사라지고 구매 완료 계정이 리포트를 계속 여는지 확인
- [ ] 사업자 변수 설정 후 **재배포**하고 운영 홈 하단에 8개 항목이 표시되는지 확인. `NEXT_PUBLIC_*`는 빌드 시점에 코드에 들어가며, Railway Dockerfile 빌드는 `ARG`로 선언한 변수만 전달한다([Railway 문서](https://docs.railway.com/guides/build-time-vs-runtime-secrets))
- [ ] production 첫 실결제 1건 → 환불 리허설
