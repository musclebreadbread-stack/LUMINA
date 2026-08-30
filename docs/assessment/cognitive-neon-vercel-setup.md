# 인지능력 파일럿 — Neon 연결 및 배포 경계

## 연결 상태

- Organization: `ESGBRAIN` (`org-patient-shadow-81536167`)
- Project: `LUMINA-cognitive` (`rapid-waterfall-65990644`)
- Branch: `production` (`br-delicate-meadow-az3q4xrj`)
- Region: `aws-ap-southeast-1` (Singapore)
- Staging branch: `staging` (`br-odd-recipe-azz5ep5d`), dedicated role `lumina_cognitive_app`
- Plan: Free
- Vercel: `muscles-projects/lumina-cognitive` (`prj_1g7LiM2mFij73dpkEKtlspPI7Hm7`)

저장소에는 `.neon` 링크와 `neon.ts` 서비스 선언이 있으며, 로컬 `.env.local`에는
Neon CLI가 발급한 `NEON_BRANCH`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
`NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` 키가 기록됩니다. 값 자체는 저장소나 로그에
기록하지 않습니다.

## 서비스 매핑

| Neon 서비스 | 애플리케이션 연결 | 현재 사용 여부 |
| --- | --- | --- |
| Lakebase Postgres | `src/lib/neon/server.ts`의 server-only pooled driver, 인지능력 DAL | 사용 |
| Neon Auth | `src/lib/neon/auth.ts`, `/api/auth/[...path]` | 계정 인증용 제공, 파일럿은 익명 쿠키 유지 |
| Data API | 미사용 — 서버 전용 DAL로 직접 SQL 실행 | 미사용 |
| Object Storage / Functions / AI Gateway | 현재 기능 요구 없음; 이 프로젝트 리전의 베타 서비스 제약도 있음 | 미사용 |

일반 요청은 풀링된 `DATABASE_URL`을 사용하고, 마이그레이션은 반드시 직접 연결인
`DATABASE_URL_UNPOOLED`를 사용합니다. 브라우저에는 어느 연결 문자열도 전달하지
않습니다.

## 익명 파일럿 주체와 RLS

Neon Auth의 계정 세션과 파일럿 익명 참여를 혼합하지 않기 위해, 파일럿 시작 시
서버가 `lumina-cognitive-subject` HttpOnly 쿠키를 발급합니다. 쿠키 값은
`COGNITIVE_SUBJECT_COOKIE_SECRET`로 HMAC 서명되며 32자 미만의 비밀값은 거부됩니다.
DB 쿼리는 transaction-local `app.current_subject_id`를 설정하고, 마이그레이션의
`lumina_cognitive_app` (`NOBYPASSRLS`) 역할과 소유자 정책을 함께 사용합니다.

Neon 기본 `neondb_owner`는 RLS 우회 권한을 가질 수 있으므로 운영 연결 문자열에는
사용하지 않습니다. staging에는 `lumina_cognitive_app` (`NOSUPERUSER`, `NOBYPASSRLS`)
비밀번호와 pooled/direct 연결 문자열을 발급해 `.env.staging.local`에 반영했습니다.
production은 별도 마이그레이션과 role 연결 승인이 필요하며, 전용 role 비밀번호는 이
저장소에 기록하지 않습니다.

## 마이그레이션 승인 게이트

SQL 초안은 `neon/migrations/20260828000000_cognitive_pilot.sql`에 있습니다. 원격
브랜치에 적용하는 명령은 되돌릴 수 없는 스키마 변경이므로 별도 사람 승인이 필요합니다.
승인받은 staging에는 다음 순서가 완료되었습니다.

1. `production`에서 staging 브랜치를 만들었다.
2. owner 전용 `.env.staging.admin.local`을 대상으로 `pnpm db:neon:migrate`를 실행했다. 런타임용 `.env.staging.local`과 분리하며, 스크립트는 직접 연결 문자열만 사용한다.
3. `pnpm db:neon:configure-staging-role`로 전용 role과 pooled/direct URL을 구성하고, `pnpm db:neon:configure-staging-secrets`로 staging 전용 앱 비밀값을 생성했다.
4. 전용 role의 owner read/cross-owner deny 검사를 트랜잭션 rollback으로 수행했다.
5. staging에서 RLS·문항 수·라이브 실행 경로를 확인한 뒤 별도 승인으로 production에도 동일한 마이그레이션과 파일럿 적재를 완료했다.

마이그레이션에는 승인된 문항은행을 자동 삽입하지 않습니다. `active` 문항은 원문·번역·
독립 검토·인지 인터뷰·IRT 보정·시각 접근성 증거를 갖춘 별도 데이터 적재 절차를 거쳐야
합니다. 현재는 그 전 단계로 `neon/seeds/cognitive-pilot-v1.mjs`의 LUMINA 원문 20문항
(gf·gc·gv·gwm·gs 각 4문항)을 `pilot` 상태로 적재합니다. 각 문항의 IRT 값은 CAT 출제용
초기값이며 표본 보정값이 아니고, 메타데이터에 표본 수 0·독립 검토/인지면담 대기 상태를
명시합니다. 후보 규준 `ko-adult-pilot-candidate-2026-08`도 같은 이유로 `candidate` 상태만
사용하며, 표준화 결과 로더는 `approved` 규준만 읽습니다. 따라서 파일럿 완료 결과는 계속
`pilot_withheld`이고 IQ·백분위·하위점수는 노출하지 않습니다. 연구 참여를 선택한 경우에는
연령 규준을 준비할 수 있도록 만 나이를 선택적으로 받아 scoring state에 저장하며, 연령을
입력하지 않은 실행은 승인 규준이 생긴 뒤에도 점수 공개 대상에서 제외됩니다.

데이터 적재는 승인된 관리자 연결에서만 수행합니다.

```text
node scripts/neon-migrate.mjs
node scripts/neon-seed-cognitive-pilot.mjs --dry-run
node scripts/neon-seed-cognitive-pilot.mjs
```

`--dry-run`은 원격 쓰기 없이 문항 수·영역 균형·선택지와 정답 키·초기 IRT 범위를 검사합니다.
실제 적재 후 staging과 production에서 각각 20개 문항과 영역별 4개가 확인되어야 하며, 이번
적용에서는 두 환경의 RLS 조회와 파일럿 시작·20문항 제출 경로까지 검증했습니다.

## 환경변수

`.env.example`에 키 이름과 용도가 기록되어 있습니다. staging 값은 Vercel Preview/
Development 환경에 민감 변수로 등록했으며, production 값은 별도 승인 후 등록합니다.
로컬/Preview/Production마다
`COGNITIVE_SUBJECT_COOKIE_SECRET`와 `NEON_AUTH_COOKIE_SECRET`는 서로 다른 무작위
비밀값을 사용합니다. Vercel CLI가 인증되지 않은 환경에서는 Dashboard의 Preview와
Production에 각각 값을 입력하고, 연결 문자열은 절대 `NEXT_PUBLIC_*`로 만들지 않습니다.
