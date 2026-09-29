# Railway 배포 준비

## 웹 서비스

- 저장소 루트의 `Dockerfile`을 사용합니다. 빌드는 Next.js standalone 출력을 포함하고, 런타임은 Node 22의 비루트 사용자로 실행합니다.
- Dockerfile 기본 시작 명령은 Railway 제공 `RAILWAY_SERVICE_NAME`으로 프로세스를 분기합니다. `web`은 `server.js` 전에 `scripts/railway-preflight.mjs`를 실행하고, `cron-10min`·`cron-daily`는 각각 예약 작업 스크립트를 바로 실행합니다. 알 수 없는 서비스명은 실패 처리합니다. Railway Start Command가 비어 있어도 cron이 웹 서버를 대신 실행하지 않습니다.
- 웹 preflight는 `APP_ENV`, Phase 9 기능 플래그의 값 형식, 기능별 정책 승인, 마케팅 정책 버전과 결제 기능의 출시 준비를 검사하고 변수값은 출력하지 않습니다. `FEATURE_BILLING=true`이면 회원 인증·동의 버전, 결제 DB·토스 키, 법무 승인 버전과 암호화/HMAC 키 형식까지 필요합니다. 현재 결제창형 SDK 연동은 API 개별 연동 키를 사용하므로 staging에는 `test_ck_`·`test_sk_`, production에는 `live_ck_`·`live_sk_` 접두사를 요구합니다([토스 API 키 안내](https://docs.tosspayments.com/reference/using-api/api-keys), [통합결제창 연동](https://docs.tosspayments.com/guides/v2/payment-window/integration)). production에서 기능이 꺼져 있으면 결제를 받을 수 없다는 구조화 경고를 남기며, 준비가 덜 된 상태에서 기능을 켜면 웹 프로세스 시작을 차단합니다. 이 검사는 환경 값의 존재·형식만 확인하므로 PG 계약·법무 문서의 실제 승인과 Neon 역할/RLS·연결 검증을 대신하지 않습니다. 검증 실패 시 새 서버 프로세스를 시작하지 않습니다. 로컬에서 Railway 환경을 점검할 때는 `railway run --service web --environment production -- node scripts/railway-preflight.mjs`를 사용합니다.
- Sentry가 설정되지 않은 production 경고는 `stdout`의 단일 JSON `level: "warn"` 로그로 기록합니다. Railway는 일반 `stderr` 출력을 `error` 등급으로 분류하므로 경고 등급을 유지하려면 구조화 로그 형식을 보존합니다. 회귀 검증은 `pnpm test:railway-preflight`로 실행합니다.
- cron의 `run_started`, `run_completed`, `run_failed` 요약에는 건너뛴 작업명과 `disabledBy` 설정 키 이름이 포함됩니다. 설정 값이나 시크릿은 로그에 기록하지 않습니다. 10분 작업의 회귀 검증은 `pnpm test:railway-cron`으로 실행합니다.
- 헬스체크 경로는 `/api/health`입니다. 이 경로는 비밀 정보와 DB 상태를 노출하지 않는 200 응답만 반환합니다.
- 배포 후 공개 경로를 비변경 방식으로 확인하려면 `railway run --service web --environment production -- node scripts/railway-smoke.mjs`를 실행합니다. HTTPS origin, 홈페이지, 헬스체크, 세션 조회, 빈 JSON을 보내는 직원 가입·소셜 로그인 차단(403), 비인증 내부 롤업의 401, Umami 스크립트, BGM HEAD 응답과 5개 로케일의 `/p`·`/r` 공유 경로 `no-referrer`·`private, no-store` 헤더를 확인하며 분석 이벤트는 보내지 않습니다. 인증 POST는 필수 필드가 없는 빈 JSON만 사용해 계정을 생성하지 않습니다. `APP_ENV=staging`에서는 Umami가 구성되지 않은 상태의 503을 기대하고, production에서는 tracker JavaScript 200을 기대합니다. 별도 도메인은 `node scripts/railway-smoke.mjs --origin https://example.com`으로 지정할 수 있습니다. 오프라인 회귀 검증은 `pnpm test:railway-smoke`로 실행합니다. 공유 경로 검사가 실패하면 코드만으로 통과 처리하지 말고 Railway 배포 후 다시 확인합니다.
- 홈페이지 스모크는 Phase 0 보안 헤더(HSTS, `nosniff`, Referrer-Policy, Permissions-Policy, CSP Report-Only의 `default-src`·`frame-ancestors`)도 검사합니다. 보안 헤더를 바꾸면 `pnpm test:railway-smoke`와 운영 도메인의 read-only smoke를 함께 확인합니다.
- `staging`과 `production`은 Railway 환경 및 변수 집합을 분리하고, 각각 `APP_ENV=staging`과 `APP_ENV=production`을 설정합니다.
- 배포 전 자동 마이그레이션 명령은 설정하지 않습니다. `db:neon:migrate`는 기본 dry-run이며, DB 반영은 승인된 변경 절차에서 별도로 수행합니다.
- 초기 운영은 단일 replica로 시작합니다. 다중 replica 전환 전에 Next.js Server Actions encryption key와 캐시·태그 무효화 방식을 별도로 구성합니다.
- Railway cron 서비스도 같은 저장소의 Docker 이미지를 사용합니다. 런타임 스크립트는 `scripts/railway-*.mjs`, 공통 요청·실행 모듈은 `scripts/lib/railway*.mjs`에서 이미지로 복사합니다. 서비스명 분기는 Railway의 `RAILWAY_SERVICE_NAME` 시스템 변수에 의존하므로 서비스명을 바꾸면 Dockerfile과 cron 검증을 함께 수정합니다.

## 비밀 환경 변수

웹 서비스에는 런타임에 필요한 인증, 데이터베이스, 외부 API 값을 서버 전용 변수로 등록합니다. Neon 관리자 연결 문자열은 웹 서비스에 넣지 않습니다. 분석 롤업은 `lumina_jobs_worker`, 빌링 작업은 `lumina_billing_worker`, AI 작업은 `lumina_ai_worker` 전용 URL을 사용합니다. 각 작업자의 URL은 지정된 역할과 RLS를 확인하고, 선택 환경의 Neon endpoint에 연결해야 합니다. `CRON_SECRET`, `BILLING_CRON_SECRET`, `AI_CRON_SECRET`은 별도 난수로 만들고 해당 웹·cron 서비스에만 등록합니다. 어떤 비밀도 `NEXT_PUBLIC_*` 이름으로 등록하지 않습니다.

## 분석 cron

- `cron-daily`는 `node scripts/railway-daily-jobs.mjs`로 분석 롤업만 실행합니다.
- UTC 17:00 스케줄은 한국 시간 매일 02:00에 최근 3일 롤업을 다시 수집합니다.
- `INTERNAL_WEB_ORIGIN`에는 웹 서비스의 HTTPS origin 또는 Railway private-network origin을 설정합니다. 호출 스크립트는 production 환경, 내부 origin 형식, 최소 32자 비밀값을 확인하고 응답 본문이나 토큰을 로그에 남기지 않습니다.
- `cron-10min`은 `node scripts/railway-10min-jobs.mjs`를 실행합니다. 영수증 발송은 `BILLING_RECEIPTS_ENABLED`와 법무 승인, **결제 대사(reconcile)는 `BILLING_RECONCILE_ENABLED`와 법무 승인**(토스 타임아웃으로 `refunding`에 고착된 환불을 최대 몇 분 안에 재시도하기 위해 일간이 아닌 10분 주기로 옮김), AI sweeper는 기능·법무·데이터 출처·콘텐츠 라이선스·전문가·골든셋 승인 플래그, 구독 worker는 Toss 정기결제 계약·법무 승인·기능 플래그가 모두 켜진 경우에만 호출됩니다. 모든 플래그는 기본 `false`입니다.
- cron 실행 로그는 `railway logs --service cron-10min --environment production --since 10m --json`처럼 JSON 모드로 확인합니다. Railway는 앱의 JSON 로그를 `component`, `event`, `schedule` 같은 최상위 필드로 펼치므로 `message` 안에 JSON 문자열이 있다고 가정하지 않습니다. `component=railway-cron` 행의 `run_completed` 또는 `run_failed`를 실행 결과로 보고, `run_started`의 활성·건너뜀 수와 함께 대조합니다. 인스턴스 `EXITED`만으로 성공 여부를 판단하지 않습니다.

## RLS 확인

- staging에 테스트용 회원 두 명과 각 회원의 프로필이 준비된 뒤 `RLS_TEST_USER_A_ID`, `RLS_TEST_USER_B_ID`, `MEMBER_DATABASE_URL`을 로컬 셸에 설정하고 `pnpm db:neon:verify-rls`를 실행합니다.
- 스크립트는 선택된 Neon 관리자 endpoint와 회원 endpoint가 같은지 확인한 다음 업무 스키마의 RLS/FORCE RLS·정책 존재와 두 계정 간 프로필 교차 조회 0행을 확인합니다. 계정 ID나 연결 문자열은 출력하지 않습니다.
- staging과 production Neon migration은 적용되어 있고, `pnpm db:neon:migrate --dry-run`에서 미적용 migration이 없는지 확인합니다. 스키마 변경과 Railway 배포는 별도 절차로 관리합니다.
- 2026-09-27 staging 직접 검증: dry-run에서 원장과 기준 스키마 일치, 대기 migration 0건을 확인했고 `--apply`를 두 번 실행해 모두 `appliedCount: 0`이었습니다. RLS 검증기는 5개 스키마의 38개 테이블을 확인했으며 임시 합성 사용자 두 명의 양방향 조회에서 본인 1행·상대 0행을 통과했습니다. 합성 행은 삭제했고 `lumina_member_app` 비밀번호도 미설정 상태로 복구했습니다.

## 현재 운영 상태와 정책 의존 항목

- 애플리케이션 `DATABASE_URL`은 Neon Production의 `lumina_cognitive_app` 역할을 계속 사용합니다. Railway Postgres는 Umami 분석 저장소 전용이며 LUMINA 업무 DB를 대체하지 않습니다.
- Railway `web`에 운영 Neon Auth URL과 production 전용 서명 키를 반영했습니다. 공개 로그인은 `GET /api/auth/get-session`과 관리자 경로로 다시 검증합니다.
- Railway `web`은 `lumina.jack.ai.kr`에서 제공됩니다. 웹 컨테이너 내부 포트는 8080이며 `cron-daily`의 `INTERNAL_WEB_ORIGIN`은 `http://web.railway.internal:8080`입니다.
- `cron-daily`는 UTC 17:00(한국 시간 매일 02:00)에 실행되도록 배포했고, 운영 웹 컨테이너에서 같은 내부 작업 경로로 분석 롤업을 직접 확인했습니다. `cron-10min`도 10분 스케줄이 활성화되어 있으며 Railway가 다음 실행 시각을 예약합니다. 작업 사이에는 일회 실행 인스턴스가 중지 상태로 대기합니다.
- `lumina.jack.ai.kr` CNAME과 Railway 소유권 TXT가 공개 DNS에서 전파·검증됐고, Railway TLS 인증서도 유효합니다. 실제 도메인의 홈페이지·헬스체크·관리자 경로·BGM 파일을 확인했습니다.
- Umami는 Railway 내부에서 실행 중이며 공개 도메인이 없습니다. 관리자 자격 증명을 교체하고 LUMINA 웹사이트와 읽기 전용 API key를 구성했습니다. 수집 스크립트는 같은 도메인의 `/api/umami/script.js`와 `/api/umami/api/send` 프록시를 사용하며, 분석 롤업은 Neon에 저장됩니다.
- Railway 제공 경로, 헬스체크, Umami 프록시 및 BGM 파일을 운영 도메인에서 확인했습니다. Vercel `lumina-cognitive` 프로젝트는 삭제 후 재조회로 제거를 확인했고, Vercel Analytics 패키지와 런타임 대체 경로도 제거했습니다.
- 결제·구독·AI 서술·마케팅 등 정책, 계약 또는 외부 제공자 승인이 필요한 기능 플래그는 모두 기본 `false`입니다. 관련 조건이 충족되기 전까지 예약 작업은 해당 기능을 실행하지 않습니다.

Railway의 프로젝트 구성은 현재 IaC(TypeScript) 방식으로 관리할 수 있습니다. IaC는 대상 환경의 서비스와 변수를 실제로 바꿀 수 있으므로, 이 저장소에는 연결되지 않은 프로젝트를 추측해 정의하는 파일을 추가하지 않았습니다. 프로젝트가 준비된 뒤 `railway config pull`과 `railway config plan`으로 실제 구성을 검토하고, 표시된 변경을 확인한 다음에만 적용합니다.

## 2026-09-27 production cron 권역 정렬

- 운영 Railway `web`, `cron-daily`, `cron-10min`은 `asia-southeast1-eqsg3a`이며, 웹의 Neon 분석 작업 endpoint hostname은 `ap-southeast-1`을 가리킵니다.
- `cron-10min` 배포 `bd4d7b76-255b-4c55-9d0f-b6c2d4676195`는 `*/10 * * * *`, `cron-daily` 배포 `2e0d9a6a-9754-4fa4-aa9b-3b792af89236`는 `0 17 * * *` 예약을 유지합니다. cron별 시작 명령도 각각 보존됐습니다.
- 권역 변경만 한 `cron-daily` 재빌드에서 `@vercel/analytics`가 남은 구형 소스 스냅샷을 발견해 현재 저장소를 다시 업로드했습니다. 최신 이미지의 의존성 목록에는 해당 패키지가 없고 Docker 빌드와 배포가 성공했습니다.
- 운영 도메인 읽기 전용 smoke는 16/16 통과했고 분석 이벤트를 보내지 않았습니다. `cron-10min`은 03:50 UTC 예약 실행 뒤 다음 실행을 04:00 UTC로 표시했습니다. 다음 실제 `cron-daily` 실행은 17:00 UTC이므로 새 권역에서의 롤업 결과는 아직 관찰 전입니다. DB 마이그레이션·환경 변수·정책 기능 플래그는 변경하지 않았습니다.
- Railway Umami와 볼륨이 연결된 Postgres는 SFO에 남아 있습니다. 이번에는 무상태 웹·cron만 Singapore로 정렬했으며, 분석 저장소는 데이터 보존을 위한 백업·복원과 전환·롤백 검증 후 이동 대상으로 대기열에 남겼습니다.

## 분석 DB 권역 이동 전 확인 사항

- Railway에서 PostgreSQL 유형을 고르면 새 DB 서비스가 즉시 만들어질 수 있으므로, 권역 설정을 조사할 때 Create > Database 흐름을 사용하지 않는다. 기존 DB의 설정 > Scale > Regions에서 현재 권역을 읽는다.
- 기존 `Postgres` 서비스는 SFO, Umami도 SFO이며, production `web`과 cron은 Singapore다. 기존 Postgres에는 persistent volume이 연결되어 있다. 권역 이동은 Railway 볼륨 이행과 서비스 중단을 수반하므로, 변경 전에 오프사이트 논리 백업과 별도 복원 검증, 전환·롤백 절차를 마련한다. Railway 공식 문서: [Regions](https://docs.railway.com/deployments/regions), [Postgres backups and restores](https://docs.railway.com/guides/postgres-backups-restores).
- 2026-09-27 점검 중 생성된 `Postgres-b2aR`와 `postgres-volume-a1qN`은 SFO에서 자동 배포됐으나, 배포는 `railway down`으로 중지했다. 이 신규 서비스에는 Umami나 업무 DB를 연결하지 않았고 기존 데이터도 복사하지 않았다. 서비스 삭제와 볼륨 삭제는 각각 복구 불가능한 작업이므로 사용자 선택 전에는 보존한다. CLI 확인 시 deployment는 없고 volume은 READY 상태였다.
- Railway Hobby 환경에서는 현재 Backups 화면에 새 백업 생성 및 PITR 사용 불가로 표시된다. 논리 백업 파일을 안전한 별도 저장소에 확보하고 복원을 검증하기 전에는 기존 분석 DB의 권역 변경을 실행하지 않는다.

## 2026-09-28 Vercel 잔여물 정리 후 운영 배포

- `31a9323`을 Railway staging `web`에 배포한 결과 `94b40b76-c038-4365-b111-f862653d7341`은 `SUCCESS`이며 preflight 9개 성장 게이트와 Next 서버 준비를 확인했다.
- 같은 커밋을 production `web`에 배포한 결과 `a2769d8f-b569-4725-9de8-972bf8a7db08`은 `SUCCESS`다. production preflight 9개 게이트를 통과했고 Next 서버가 준비됐다.
- `https://lumina.jack.ai.kr` 비변경 smoke 18/18 통과: 홈페이지·health·auth session, 회원 API의 닫힌 상태(403), 내부 롤업 비인증 차단(401), BGM audio/mpeg, Umami 프록시, ko/en/ja/zh-Hant/es 비공개 공유 경로의 응답·캐시·referrer 헤더. 분석 이벤트는 보내지 않았다. 배포 후 15분 Railway HTTP 5xx는 0건이었다.
- Vercel CLI의 `lumina-cognitive` 읽기 전용 재조회 결과 `project_not_found`였다. Vercel 프로젝트는 앞서 삭제 완료했고, 이번 저장소 정리에서 `vercel.json`, 환경 동기화·분석 fallback/import 코드 및 로컬 `.vercel` 링크를 제거했다.
- DB 마이그레이션, Railway 환경 변수, 기능 플래그는 변경하지 않았다. Sentry DSN 미설정과 결제 비활성은 의도된 현재 상태다.

## 2026-09-29 수익화 실행 계획 운영 DB 마이그레이션

- 대상은 Neon `LUMINA-cognitive` 프로젝트의 `production` 브랜치(기본 브랜치)다. 적용 전 원장(`ops.schema_migrations`) 14개 항목의 체크섬이 저장소 마이그레이션 파일의 sha256과 모두 일치함을 확인했고, 대기 중인 마이그레이션은 아래 3개뿐이었다. 접속 역할은 `neondb_owner`, `billing.orders`는 0행이었다.
- 롤백 기준으로 적용 직전에 Neon 스냅샷 `pre-migration-20261006-08-monetization`(`snap-calm-truth-azitmgoq`, 2026-09-29T01:16:04Z)을 만들었다.
- `20261006000000_billing_orders_receipt_locale_grant.sql`, `20261007000000_billing_order_profiles.sql`, `20261008000000_billing_order_attribution.sql`을 순서대로 적용했다. 각각 단일 트랜잭션으로 어드바이저리 락(`db:neon:migrate`와 같은 키) → 본문(바깥 BEGIN/COMMIT 제거) → 원장 기록을 실행했다. 이 환경에는 `.env.production.admin.local`이 없어 `db:neon:migrate --apply` 대신 Neon MCP로 같은 절차를 수행했다.
- 검증: 원장 17행과 새 3행 체크섬 일치, 새 테이블 2개의 RLS 활성·강제, 정책 5개, 컬럼·테이블 권한의 허용/차단(`lumina_member_app`의 `receipt_locale` insert 허용, `order_attribution` select·`created_at` insert 차단 등)을 카탈로그 조회로 확인했다. 기존 데이터는 변경하지 않았고 새 테이블 2개와 컬럼 grant 1개만 추가했다.
- 주의: 이 3개 파일은 PR #5 머지 전까지 `master`에 없다. 그 사이 `master` 체크아웃에서 `db:neon:migrate`를 실행하면 "Migration ledger contains an unknown file"로 중단되므로, 머지 후 또는 이 브랜치에서 실행한다.
- 코드 배포(`web`, `cron-10min`, `cron-daily`)는 아직 하지 않았다. Railway 운영 웹은 `31a9323` 그대로다.

## 2026-09-29 수익화 실행 계획 운영 코드 배포

- 배포 대상은 `master` 머지 커밋 `1b1550d`(PR #5)이며, 앞 섹션의 운영 DB 마이그레이션 3개(20261006~08)가 이미 적용된 상태에서 진행했다. 배포 전 `railway run --service web --environment production -- node scripts/railway-preflight.mjs`가 통과했다(9개 성장 게이트, Sentry 미설정·결제 비활성 경고 2건은 의도된 현재 상태).
- 배포는 `railway up --ci`로 `web` → `cron-10min` → `cron-daily` 순서로 실행했다. 결과는 모두 `SUCCESS`이며 이전 배포 3건은 `REMOVED`가 됐다.

| 서비스 | 새 배포 ID | 생성(UTC) |
| --- | --- | --- |
| `web` | `1c16d9cf-63e0-44ce-9e78-ec7cfcb11e9a` | 02:01 |
| `cron-10min` | `6e55fa63-25ea-47ff-923f-dcaf3254b399` | 02:05 |
| `cron-daily` | `c5d79ac4-3abc-4d51-826b-30701b1d4238` | 02:07 |

- 검증: `web` 시작 로그에서 production preflight 통과와 Next 서버 준비를 확인했다. `railway-smoke`는 `lumina.jack.ai.kr`에서 19/19 통과했고 분석 이벤트는 보내지 않았다. `GET /pricing`은 200(2회)이었다. 배포 후 web 로그의 error 등급 행은 0건이었다.
- `cron-10min`은 새 이미지에서 02:10 UTC 예약 실행이 `run_started`로 시작됐다. 결제 영수증·대사, AI 서술 등은 기능 플래그가 꺼져 있어 `skippedTasks`로 기록됐다. 실행 완료(`run_completed`)와 다음 `cron-daily` 17:00 UTC 롤업은 아직 관찰 전이다. cron 스케줄 문자열은 이번에 다시 읽지 못했으므로(CLI 조회에 표시되지 않음) 이전 기록(`*/10 * * * *`, `0 17 * * *`)을 그대로 따른다.
- 이번 작업에서 DB 마이그레이션, Railway 환경 변수, 기능 플래그는 변경하지 않았다.

## 2026-09-29 결과 미출력 수정 운영 배포 (PR #6)

- 배포 대상은 `master` 머지 커밋 `03bb6a9`(PR #6)다. 배포 전 작업 트리가 `origin/master`와 동일함을 확인했고, production preflight가 통과했다(9개 성장 게이트, Sentry 미설정·결제 비활성 경고 2건은 의도된 상태).
- `railway up --ci`로 `web` → `cron-10min` → `cron-daily` 순서로 배포했고 모두 `SUCCESS`다. 이전 배포 3건은 `REMOVED`가 됐다.

| 서비스 | 새 배포 ID | 생성(UTC) |
| --- | --- | --- |
| `web` | `fe68a5f6-9986-47f0-8743-bf94fa465ce5` | 07:01 |
| `cron-10min` | `9a05031a-e76f-4eb1-a43c-5d112b98d390` | 07:06 |
| `cron-daily` | `ddbe9ee8-3196-4bc4-9dc7-ad0af3b0d8fb` | 07:08 |

- 검증: `web` 시작 로그에서 preflight 통과와 Next 서버 준비를 확인했고 `/api/health`는 200이다. `railway-smoke`는 `lumina.jack.ai.kr`에서 19/19 통과했으며 분석 이벤트는 보내지 않았다. `/pricing`, `/en/pricing`, `/en/compatibility`, `/cognitive`, `/es/cognitive`는 모두 200이다.
- 수정 동작의 운영 확인: (1) 궁합 세션 쿠키 발급 응답에 `Path=/compatibility`와 `/en`·`/ja`·`/zh-Hant`·`/es` 접두사 경로의 `Set-Cookie` 5개가 들어 있다. 합성 프로필로 쿠키만 발급했고 서버에는 아무것도 저장하지 않는다. (2) 그 쿠키를 보낸 `/en/compatibility/current/current`는 본문 `<h1>`이 "Two charts, several ways to meet"로 렌더링되고, 쿠키가 없으면 본문 제목이 없다. (3) 타로(`/tarot/single/...`) og:image는 158,488바이트, 별자리(`/horoscope/zodiac/aries`) og:image는 383,216바이트로 삽화가 실린 크기다.
- 확인하지 못한 것: 인지 검사 20문항을 운영에서 끝까지 풀어 추정 결과 화면을 보는 것은 운영 DB에 응답을 쓰게 되므로 하지 않았다. 해당 화면은 단위·컴포넌트 테스트와 로컬 e2e로만 확인했다. 배포 후 담당자가 한 번 직접 완료해 보는 것이 좋다. `cron-10min`의 새 이미지 예약 실행과 다음 `cron-daily` 17:00 UTC 롤업은 아직 관찰 전이다.
- 이번 작업에서 DB 마이그레이션, Railway 환경 변수, 기능 플래그는 변경하지 않았다.
