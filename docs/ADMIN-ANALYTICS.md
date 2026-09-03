# 관리자 분석 콘솔 운영 메모

## 제공 범위

- `/admin/login`: Neon Auth 이메일 로그인과 관리자 멤버십 확인
- `/admin/analytics`: 오늘·최근 7/30/90일·사용자 지정 기간의 방문자, 페이지뷰, 솔루션 퍼널, 일별 추세
- 일별 솔루션 이벤트: `solution_entry`, `test_start`, `test_complete`, `result_view`, `share_open` 및 궁합·통합 리포트 이벤트
- 저장 데이터: 집계된 날짜·솔루션·이벤트 수와 방문자 수만 저장하며 URL, 쿼리, 생년월일, 응답, 공유 코드, subject ID는 저장하지 않음

## 활성화 순서

1. 스테이징에서 `neon/migrations/20260830000000_ops_analytics.sql`을 검토한 뒤 `pnpm db:neon:migrate`로 적용합니다. 운영 적용은 `NEON_ALLOW_PRODUCTION=1`을 명시적으로 설정한 승인된 admin env에서만 수행합니다.
2. Neon Auth 사용자 ID를 확인한 뒤 owner 연결로 `ops.admin_members`에 `viewer`, `analyst`, 또는 `owner` 역할을 등록합니다. 공개 회원가입은 관리자 권한을 만들지 않습니다.
3. Vercel Production의 서버 전용 환경 변수에 `VERCEL_PROJECT_ID`, `VERCEL_ANALYTICS_READ_TOKEN`, `CRON_SECRET`, `ANALYTICS_ROLLUP_DATABASE_URL`을 등록합니다. 마지막 값은 Cron 롤업 전용 관리자 연결이며 `NEXT_PUBLIC_*`로 등록하면 안 됩니다.
   - `viewer`도 집계값과 함께 동기화 상태·요청 범위·완료 시각 등 비식별 Health 메타데이터를 읽습니다. 감사 로그 자체는 `analyst`·`owner`만 읽을 수 있습니다.
4. 배포 후 Cron은 UTC 17:00(한국 시간 매일 02:00)에 `/api/internal/analytics-rollup`을 호출합니다. 최근 3일을 다시 수집하므로 지연·수정된 원천 집계를 보정할 수 있습니다.
5. 초기 수동 보정이 필요하면 승인된 admin env에서 `pnpm db:neon:analytics-rollup`을 사용하고, `--since=YYYY-MM-DD --until=YYYY-MM-DD`로 최대 31일 범위를 지정합니다.

## 해석 주의

- Vercel Web Analytics 읽기 토큰이 있으면 기간 조회는 실시간 집계를 우선 사용합니다.
- 원천 API가 일시적으로 실패하면 최근 Neon 롤업으로 대체하며, 롤업 기간의 방문자 수는 일별 고유 방문자의 합이므로 전체 기간의 고유 방문자와 다를 수 있습니다.
- 동의가 기록되지 않은 브라우저에서는 이벤트를 전송하지 않습니다. 동의 거부 시에도 익명 이벤트 계측 정책은 기존 동의 배너 정책을 따릅니다.
- `ops.admin_members`와 모든 분석 테이블은 RLS를 강제합니다. 애플리케이션 조회는 인증된 Neon Auth 사용자 ID를 트랜잭션 범위에 설정한 뒤 수행합니다.

## 점검

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- 배포 후 비인증 `GET /admin/analytics`가 로그인 화면으로 이동하는지, 비밀 헤더 없는 `GET /api/internal/analytics-rollup`이 `401`을 반환하는지 확인합니다.
