# Hermes 성장 운영 에이전트 연동

이 문서는 LUMINA 저장소가 Hermes 성장 운영 에이전트("Lumina Growth Operator")에 제공하는 접점과 운영 경계를 정리한다. 에이전트 쪽 구현(점검·KPI·콘텐츠·게시 스크립트, 스킬, 예약 작업)은 `D:\Jack\20. Hermes\Lumina`에 있다.

## 1. 이 브랜치가 고친 운영 결함 (2026-10-10 실측)

| 결함 | 실측 근거 | 영향 | 수정 |
|---|---|---|---|
| `sitemap.xml`의 127개 URL과 `robots.txt`의 `Sitemap:` 줄이 `http://localhost:3000` | `curl https://lumina.jack.ai.kr/sitemap.xml` | 검색엔진이 사이트맵 URL을 다른 호스트로 보고 무시한다. 2027 신년운세·일주 60·띠 페이지가 사이트맵으로 제출되지 않는다. | Dockerfile 빌더 단계에 `NEXT_PUBLIC_SITE_URL` ARG/ENV |
| 운영 클라이언트 번들에 `NEXT_PUBLIC_UMAMI_WEBSITE_ID`가 인라인되지 않음 | 운영 JS 청크에 `t.default.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID`가 그대로 남아 있음 | 브라우저에서 값이 `undefined` → Umami 추적기가 로드되지 않아 방문·퍼널 집계가 비어 있다. | 같은 ARG/ENV 목록에 Umami·Sentry·Kakao·AdSense·문의 이메일 추가 |
| AdSense 슬롯이 배치 이름(`saju-bottom`)을 `data-ad-slot`으로 전송 | `src/components/ads/AdSlot.tsx` | 게시자 ID를 넣어도 광고 단위가 유효하지 않아 채워지지 않는다. | 숫자 광고 단위 ID `NEXT_PUBLIC_ADSENSE_SLOT_ID`가 있어야 렌더 |
| `public/ads.txt`가 전부 주석 | `curl /ads.txt` | 게시자 ID가 생겨도 커밋이 필요했다. | `src/app/ads.txt/route.ts`가 환경변수로 생성 |

회귀 방지:
- `scripts/test-railway-preflight.mjs`: `src/`가 읽는 모든 `NEXT_PUBLIC_*`가 Dockerfile 빌더 ARG/ENV에 있는지 검사한다. 수정 전 Dockerfile에서 실패함을 확인했다.
- Dockerfile 빌드 단계는 값이 빈 `NEXT_PUBLIC_*`를 `unset`한 뒤 빌드한다. Railway가 전달하지 않은 변수가 빈 문자열로 인라인돼 지금 동작하는 서버 런타임 읽기(Umami 수집 프록시, canonical 등)를 깨뜨리지 않게 하기 위해서다.
- `scripts/railway-smoke.mjs`: 사이트맵 `<loc>`·hreflang 대체 URL 전부와 `robots.txt`의 `Sitemap:` 줄이 점검 대상 origin을 쓰는지, `/ads.txt`가 200인지, `growth-report`가 비인증 401인지 확인한다. 현재 운영(수정 전)에서는 사이트맵·robots·growth-report가 FAIL이다.

## 2. KPI 엔드포인트 `GET /api/internal/growth-report`

- 인증: `Authorization: Bearer $GROWTH_REPORT_SECRET`(32자 이상). 값이 없으면 항상 401. `CRON_SECRET`과 분리한 읽기 전용 시크릿이다.
- 쿼리: `days=1|7`(기본 7, 그 밖의 값은 7). 원천 집계가 날짜·이벤트마다 Umami를 호출하므로 긴 범위는 받지 않는다 — 장기 추세는 에이전트가 7일 스냅샷을 쌓아 본다.
- 원천: 기존 서버 전용 Umami API(`fetchUmamiAnalyticsRollup`) + `metrics`(유입 도메인, 페이지). DB 쓰기·새 DB 권한 없음.
- 응답: 일별 페이지뷰·일별 방문자 합, 이벤트별·분석별 건수, 상위 유입 도메인 15개, 상위 공개 경로 15개, `warnings`(`referrers_unavailable` 등 — 데이터 없음과 지표 실패를 구분).
- 개인정보 경계: 경로는 먼저 브라우저 이벤트와 같은 `scrubAnalyticsUrl` 표로 정제(타로 시드·궁합 출생 데이터·인지검사 실행 ID → 자리표시자)한다. `/r`, `/p`, `/s`, `/account`, `/admin`, `/api`는 접두사로 접고(`/r/*`), 알려진 공개 첫 세그먼트가 아니면 `(other)`다. 유입값은 도메인만 남기고 IP는 `(other)`. 결제 원장(`billing.orders`)은 아직 포함하지 않는다 — 판매가 열리면 `lumina_billing_worker` 읽기 전용 경로로 별도 추가한다.
- 오류: Umami 미설정 503 `umami_not_configured`, 원천 실패 502 `growth_report_failed`(Sentry `internal-cron` 태그).

## 3. 운영 반영 순서 (사람 승인 필요)

1. Railway `web` 서비스 변수에 `NEXT_PUBLIC_SITE_URL=https://lumina.jack.ai.kr` 확인(이미 런타임에는 있음 — canonical이 정상). 이번 Dockerfile 변경으로 빌드에도 전달된다.
2. `GROWTH_REPORT_SECRET` 생성·등록(웹 서비스). 같은 값을 Hermes 워크스페이스 `.env`의 `LUMINA_GROWTH_REPORT_SECRET`에 둔다.
3. 배포 후 `pnpm railway:smoke` 23/23 확인 → Search Console·네이버 서치어드바이저에 `https://lumina.jack.ai.kr/sitemap.xml` 제출.
4. AdSense: 게시자 ID 발급 → `NEXT_PUBLIC_ADSENSE_CLIENT` 등록·재배포 → `/ads.txt`·소유확인 메타 확인 → 사이트 검토 신청 → 승인 후 디스플레이 광고 단위를 만들어 `NEXT_PUBLIC_ADSENSE_SLOT_ID` 등록·재배포.

## 4. 에이전트 자율 범위

| 허용(자동) | 승인 필요 |
|---|---|
| 운영 사이트 비변경 점검(GET/HEAD), KPI 조회, 콘텐츠 초안, 운영 중인 Threads 계정 게시(일 한도 내), 개선 작업 카드·브랜치·Draft PR | 운영 배포·DB 마이그레이션·기능 플래그·결제 활성화, 광고비 지출, 네이버 블로그 발행(공식 쓰기 API 종료 — 사람이 발행), 가격·정책 변경 |
