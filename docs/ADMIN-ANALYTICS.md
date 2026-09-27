# 관리자 분석 콘솔 운영 메모

## 제공 범위

- `/admin/login`: Neon Auth 이메일 로그인과 관리자 멤버십 확인
- `/admin/analytics`: 오늘·최근 7/30/90일·사용자 지정 기간의 방문자, 페이지뷰, 솔루션 퍼널, 일별 추세
- 일별 솔루션 이벤트: `solution_entry`, `test_start`, `test_complete`, `result_view`, `share_open` 및 궁합·통합 리포트 이벤트
- 저장 데이터: 집계된 날짜·솔루션·이벤트 수와 방문자 수만 저장하며 URL, 쿼리, 생년월일, 응답, 공유 코드, subject ID는 저장하지 않음

## 활성화 순서

1. 스테이징에서 `neon/migrations/20260830000000_ops_analytics.sql`, `neon/migrations/20260926000000_ops_job_worker_and_related_click.sql`, `neon/migrations/20261005000000_ops_analytics_umami.sql` 및 이후 migration을 검토합니다. `pnpm db:neon:migrate`는 기본 dry-run이며, 운영 적용에는 승인된 변경 절차와 `NEON_ALLOW_PRODUCTION=1`을 명시적으로 설정한 admin env가 필요합니다.
2. Neon Auth 사용자 ID를 확인한 뒤 owner 연결로 `ops.admin_members`에 `viewer`, `analyst`, 또는 `owner` 역할을 등록합니다. 공개 회원가입은 관리자 권한을 만들지 않습니다.
3. Railway Umami는 공개 도메인을 연결하지 않고 private networking으로만 유지합니다. 최초 설정에서는 기본 관리자 비밀번호를 교체하고 `LUMINA` 팀·웹사이트를 만든 뒤, 팀의 `view-only` 권한을 가진 전용 사용자의 API key를 생성합니다. Production `web`에는 서버 전용 `UMAMI_INTERNAL_ORIGIN=http://umami.railway.internal:3000`, `UMAMI_API_URL=http://umami.railway.internal:3000/api`, `UMAMI_API_KEY`, `UMAMI_WEBSITE_ID`를 설정합니다. 브라우저 변수는 같은 도메인의 `NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://lumina.jack.ai.kr/api/umami/script.js`와 `NEXT_PUBLIC_UMAMI_WEBSITE_ID`만 사용합니다. Next.js는 `/api/umami/script.js`와 `/api/umami/api/send`만 Umami로 전달하며 대시보드·관리 API는 외부에 노출하지 않습니다. 키는 `NEXT_PUBLIC_*`에 두지 않습니다.
   - 롤업 연결은 `lumina_jobs_worker` 전용 Neon 역할이어야 하며, 엔드포인트 ID는 운영 Neon endpoint와 일치해야 합니다. Cron writer는 `APP_ENV=production`을 확인합니다.
   - `viewer`도 집계값과 함께 동기화 상태·요청 범위·완료 시각 등 비식별 Health 메타데이터를 읽습니다. 감사 로그 자체는 `analyst`·`owner`만 읽을 수 있습니다.
4. Railway `cron-daily` 서비스는 `node scripts/railway-daily-jobs.mjs`를 UTC 17:00(한국 시간 매일 02:00)에 실행합니다. `INTERNAL_WEB_ORIGIN`은 `http://web.railway.internal:3000`, `CRON_SECRET`은 웹 서비스와 같은 서버 전용 값으로 설정합니다. 최근 3일을 다시 수집해 지연·수정된 원천 집계를 보정합니다. Umami 사용자·팀·웹사이트·읽기 전용 API key와 `web`의 private proxy 설정을 검증한 뒤 배포합니다.
5. `cron-10min`은 결제·구독·AI 관련 별도 기능 플래그가 모두 승인된 경우에만 해당 작업을 실행합니다. 분석 롤업에는 사용하지 않습니다.

## 해석 주의

- Umami API 집계는 Neon 일별 롤업에 저장됩니다. 대시보드에는 첫 Umami 수집일이 표시됩니다. Neon에 보존된 기존 Vercel 집계가 없어 과거 Vercel 집계는 롤업 데이터로 이전되지 않았습니다.
- Umami 원천 API가 일시적으로 실패하면 마지막으로 저장된 Neon 롤업을 표시합니다. 롤업 기간의 방문자 수는 일별 고유 방문자의 합이므로 전체 기간의 고유 방문자와 다를 수 있습니다.
- 선택이 기록되기 전에는 tracker를 불러오지 않습니다. 기존 동의 안내처럼 광고 개인화 선택과 무관하게 익명 방문 통계는 수집됩니다.
- `ops.admin_members`와 모든 분석 테이블은 RLS를 강제합니다. 애플리케이션 조회는 인증된 Neon Auth 사용자 ID를 트랜잭션 범위에 설정한 뒤 수행합니다.

## 점검

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- 배포 후 비인증 `GET /admin/analytics`가 로그인 화면으로 이동하는지, 비밀 헤더 없는 `GET /api/internal/analytics-rollup`이 `401`을 반환하는지 확인합니다.
