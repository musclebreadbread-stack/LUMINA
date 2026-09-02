# LUMINA — SEO / AdSense 준비 상태 (실측 기록)

이 문서는 **실제로 확인한 것만** 기록한다. 확인하지 못한 항목은 "미확인"으로 남긴다.
계획·배경은 `DEVELOPMENT-PLAN.md`에 있고, 이 문서는 그 계획의 *현재 검증 상태*만 다룬다.

마지막 실측: 2026-08-31 (프로덕션 `https://lumina.jack.ai.kr` + 로컬 dev 서버)

---

## 1. URL·언어 구조

| 언어 | URL 형태 | 처리 |
|---|---|---|
| 한국어(기본) | `/cognitive` | 접두사 없음 |
| 영어 | `/en/cognitive` | `src/proxy.ts`가 `/en/*`를 원본 경로로 rewrite |

로케일 판정: 쿠키(`lumina.locale`) → `Accept-Language` → 기본 한국어.

---

## 2. Technical SEO 실측 결과

| 항목 | 상태 | 근거 |
|---|---|---|
| robots.txt | ✅ | `src/app/robots.ts` — `/admin`, `/api/`, `/cognitive/internal-preview` 차단 |
| sitemap.xml | ✅ | `src/app/sitemap.ts` — 41 URL, 전부 ko/en/x-default hreflang |
| canonical | ✅ | 전 페이지. `src/lib/seoAlternates.ts` → 루트 레이아웃에서 상속 |
| hreflang (HTML) | ✅ | ko / en / x-default 3종, 전 페이지 |
| JSON-LD | ✅ | `Organization` + `WebSite` (`src/components/seo/JsonLd.tsx`) |
| noindex 분리 | ✅ | 개인 결과·관리자·공유 링크 등 22개 라우트 |
| 크롤러 접근 | ✅ | Googlebot이 한국어 URL에서 200 (이전에는 307로 `/en`으로 튕김) |
| OG / Twitter 카드 | ✅ | 동적 OG 이미지 4종(`/r`, `/s`, `/tarot`, `/horoscope`) |
| 모바일 반응형 | ✅ | 코드 기준. 실기기 확인은 미완 |
| sitemap `lastmod` | ❌ 의도적 미적용 | 4절 참고 |
| GA4 | ❌ 미도입 | `@vercel/analytics` + 자체 이벤트(`src/lib/analytics.ts`) 사용 |
| Search Console 소유확인 | ⚠️ 미확인 | 사용자 계정 작업 |
| Core Web Vitals 실측 | ⚠️ 미측정 | — |

### 재검증 명령

```bash
# canonical / hreflang (기대: canonical 1 + alternate 3)
curl -s https://lumina.jack.ai.kr/cognitive | grep -E '<link rel="(canonical|alternate)"'

# JSON-LD 존재 여부
curl -s https://lumina.jack.ai.kr/ | grep -c 'application/ld+json'

# Googlebot이 한국어 URL에서 리다이렉트되지 않는지 (기대: 200, redirect 비어 있음)
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  -H "Accept-Language: en-US,en;q=0.9" -A "Googlebot" \
  https://lumina.jack.ai.kr/cognitive
```

---

## 3. AdSense 신청 전 체크리스트

"게시물 몇 개 / 트래픽 얼마"를 공식 승인 기준으로 단정하지 않는다. 아래는 구글이
문서로 요구하는 항목과 이 저장소에서 확인 가능한 상태다.

- [x] 독자적 콘텐츠 — 문항·해설 전부 LUMINA 자체 저작
- [x] 명확한 내비게이션 — 헤더 + `InfoNav`(references / glossary / methodology)
- [x] 개인정보처리방침 `/privacy`
- [x] 이용약관 `/terms`
- [x] 방법론 `/methodology`
- [x] 참고문헌 `/references`
- [x] 용어집 `/glossary`
- [x] 쿠키·광고 동의 UI — `src/components/ads/ConsentBanner.tsx` (동의/거부 명시 선택)
- [x] 비개인화 광고 대응 — 거부 시 `data-npa="1"`, 미선택 시 광고 요청 자체를 안 함
- [x] robots.txt / sitemap.xml / canonical / hreflang
- [x] 가짜 논문·DOI·통계 없음 — 인지검사 IQ는 "이론 분포 추정치"로 명시 라벨링
- [x] 오클릭 유발 배치 없음 — `AdSlot`은 문항 화면에 없고 결과·랜딩 하단에만 배치
- [ ] **About 페이지** — 없음. 제작 필요
- [ ] **Contact 페이지** — 없음. 제작 필요
- [ ] **`public/ads.txt` 유효화** — 현재 전 줄이 주석이라 **무효 파일**. 게시자 ID 발급 후 해제 필요
- [ ] Search Console 소유확인 — 사용자 계정 작업
- [ ] AdSense 게시자 ID 발급 — 사용자 계정 작업
- [ ] Core Web Vitals 실측

### 광고를 켜는 법

`NEXT_PUBLIC_ADSENSE_CLIENT`에 실제 게시자 ID를 넣으면 **코드 변경 없이** 켜진다.
값이 없으면 `AdSlot`은 DOM에 아무것도 렌더하지 않아 CLS도 생기지 않는다
(`src/components/ads/AdSlot.tsx`). 가짜 ID는 넣어 두지 않았다.

---

## 4. 하지 않은 것과 그 이유

- **sitemap `lastmod`** — 배포마다 바뀌는 값을 넣으면 구글이 그 신호를 통째로 무시한다.
  실제 콘텐츠 변경 시각을 추적하는 구조(CMS 또는 git mtime 수집)가 생긴 뒤에 넣는다.
- **FAQ / Article / Breadcrumb JSON-LD** — 대응하는 화면 콘텐츠가 아직 없다.
  보이지 않는 것을 구조화 데이터에 넣는 것은 구글 정책 위반이다.
- **`/saju`, `/astro` 색인 해제** — 현재 `noindex`. 검색 수요는 크지만 두 페이지는
  지금 입력 폼 위주라 색인시키면 thin content가 된다. **설명 콘텐츠를 먼저 채운 뒤**
  `noindex`를 푸는 순서를 권장한다.

---

## 5. 사용자가 직접 해야 하는 외부 작업

| 작업 | 환경변수 / 위치 |
|---|---|
| Search Console 소유확인 + 사이트맵 제출 | `https://lumina.jack.ai.kr/sitemap.xml` |
| AdSense 게시자 ID 발급 후 등록 | `NEXT_PUBLIC_ADSENSE_CLIENT` |
| `public/ads.txt` 주석 해제 | 게시자 ID 발급 후 |
| (선택) GA4 도입 | `NEXT_PUBLIC_GA_MEASUREMENT_ID` — 현재 연동 지점 없음 |
| (선택) 카카오 공유 SDK | `NEXT_PUBLIC_KAKAO_JS_KEY` — 현재 연동 지점 없음 |
