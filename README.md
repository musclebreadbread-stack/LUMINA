# LUMINA

LUMINA는 사주·점성술·타로·수비학·성향검사·오늘의 운세를 한 화면에서 선택하는 자기성찰 플랫폼입니다. 계산 엔진은 `src/engine`에, 문장과 화면 조합은 `src/lib` 및 `src/app`에 분리되어 있습니다.

## 시작하기

```bash
pnpm install
pnpm dev
```

개발 서버는 [http://localhost:3000](http://localhost:3000)에서 실행됩니다. 선택 사항인 환경변수는 `.env.example`을 기준으로 설정합니다.

## 검증 명령

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:cov
pnpm build
pnpm test:e2e
```

이미지 파생 자산과 OG용 로컬 폰트는 다음 명령으로 재생성할 수 있습니다.

```bash
pnpm images:optimize
pnpm fonts:prepare
```

## 주요 경로

- `/` — 기능 허브와 점진적으로 공개되는 사주 입력
- `/saju` — 저장된 프로필을 이용한 사주 진입
- `/horoscope` — 별자리·띠별 공개 운세
- `/numerology` — 생년월일 기반 수비학
- `/psychometrics` — IPIP-50 성향검사와 URL 기반 결과
- `/tarot` — 시드가 포함된 재현 가능한 타로 결과
- `/compatibility` — 두 출생 프로필의 사주 합·충·오행 관계 비교
- `/characters` — 사주 분석으로 만난 오행 정령 도감
- `/references`, `/glossary`, `/methodology` — 출처·용어·검증 방법 공개
- `/privacy`, `/terms` — 운영 전 법률 검토가 필요한 정책 초안
- `/en/...` — 영어 locale 접두사 경로. 기본 한국어 경로는 접두사가 없습니다.

## 구조와 데이터 경계

- 엔진 함수는 현재 시각이나 브라우저 API를 직접 읽지 않고 입력으로 받습니다.
- 프로필과 검사 초안은 브라우저 `localStorage`에만 저장됩니다. 공유 결과는 URL에 압축되어 포함됩니다.
- 현재 저장소에는 Supabase 연결·마이그레이션·RLS 정책이 없습니다. DB를 추가할 때는 클라이언트에 `service_role` 키를 노출하지 않고 RLS를 먼저 설계해야 합니다.
- 사주·점성술·타로·수비학·운세는 문화적 해석 또는 엔터테인먼트 계층입니다. IPIP-50은 영어권 온라인 공개 표본의 전체 집단 규준을 사용하며 한국인 인구 규준이나 의료 진단이 아닙니다.

## 운영 전 사람이 확인할 항목

- Vercel의 `NEXT_PUBLIC_SITE_URL` 설정과 실제 도메인 확인
- 실제 게시자 ID를 받은 뒤에만 AdSense 환경변수와 `public/ads.txt` 활성화
- Google Funding Choices 등 CMP 연결 및 지역별 동의 문구 검토
- `/privacy`, `/terms` 초안에 대한 법률 검토와 시행일 확정
- 타로·조디악 원본 PNG를 삭제하거나 외부 전송하기 전 백업 및 확인
- 실제 AdSense 게시자 ID와 Google 인증 CMP를 연결하기 전 정책 검토
- 배포·Supabase 프로젝트 생성·마이그레이션·git push
