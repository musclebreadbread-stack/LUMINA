# LUMINA 수익화 준비 결과와 직접 실행 안내

기준일: 2026-10-11 (KST)  
대상: `https://lumina.jack.ai.kr`  
참고 원문: `LUMINA_수익화_직접_할_일_가이드_2026-10-10.docx`

이 문서는 원문 가이드의 전체 항목을 현재 코드와 대조한 결과, 코드에 반영한 내용, 운영자가 직접 해야 하는 일을 순서대로 정리합니다. 계정 승인, 비밀값 입력, PR 승인, 운영 배포, 결제·법무 결정은 담당자가 직접 진행해야 합니다.

## 1. 지금 확인된 상태

- GitHub [PR #8](https://github.com/musclebreadbread-stack/LUMINA/pull/8)은 확인 시점에 `OPEN`, `Draft`였습니다. `verify`와 `db-integration` 검사는 모두 성공 상태였습니다.
- PR #8에는 사이트맵·Umami KPI·문의 이메일·AdSense 준비 코드가 이미 있습니다. 이번 작업에서는 Google Search Console과 네이버 소유확인 메타값을 코드에서 받을 수 있도록 추가했습니다.
- 이번에 추가한 코드와 이 안내 문서는 현재 로컬 브랜치에만 있습니다. PR에 반영하려면 아래 2절처럼 관련 파일만 확인해 커밋·푸시한 뒤 PR 검사를 다시 확인해야 합니다.
- 이 작업에서 PR을 승인·병합하거나 Railway에 배포하지 않았습니다. 운영 환경 변수, 비밀값, 데이터베이스, 결제 기능도 변경하지 않았습니다.
- 작업 트리에는 이 작업과 무관한 미추적 파일이 있습니다. 모두 유지하고, `git add .` 또는 `git add -A`로 한꺼번에 올리지 마세요. Railway CLI는 `.gitignore`와 `.railwayignore`를 업로드 제외에 사용하며 `.dockerignore`만으로는 업로드 자체를 막을 수 없습니다. 따라서 아래 배포 안내는 이 작업 폴더가 아니라 새로 복제한 깨끗한 체크아웃을 사용합니다.

## 2. 코드에서 준비된 내용

| 항목 | 코드 상태 | 사람이 남긴 작업 |
|---|---|---|
| 운영 주소가 들어가는 사이트맵·robots | `NEXT_PUBLIC_SITE_URL` 기반으로 생성하고 Docker 빌드 변수로 전달 | production `web` 변수 값 확인, 배포 후 URL 확인 |
| Umami 방문·전환 지표 | 동의 후 tracker를 불러오며, 서버 전용 Umami API를 읽는 보호된 KPI 경로가 있음 | Railway 변수와 `GROWTH_REPORT_SECRET` 설정, Hermes 연결 확인 |
| 문의 페이지 | `NEXT_PUBLIC_CONTACT_EMAIL`이 설정되면 주소를 표시하고 색인 대상에 포함. 값이 없으면 noindex이며 사이트맵에서도 제외 | 공개용 문의 이메일 결정 후 변수 입력·재빌드 |
| AdSense | 게시자 ID 형식이 유효할 때만 스크립트와 `/ads.txt`를 만들며, 승인 후 숫자 슬롯 ID가 있을 때만 광고 표시. 기존 `google-adsense-account` 메타 유지 | 계정·사이트 심사, 광고 단위 생성, 동의 요건 확인 |
| 검색 소유확인 | `GOOGLE_SITE_VERIFICATION`, `NAVER_SITE_VERIFICATION`을 서버 레이아웃에서 루트 `<head>` 메타로 출력. 서버 전용 런타임 환경 변수 | 각 서비스에서 받은 `content` 값을 Railway `web` 런타임 변수에 넣고 서비스 재시작·배포 후 소유 확인 |
| Threads·네이버 블로그 | 이 저장소에서 계정 토큰 발급·게시 작업은 하지 않음 | Hermes 예약 작업과 계정 토큰을 운영자가 확인하고, 블로그 글은 직접 발행 |
| 유료 판매 | 기존 결제 코드는 승인 플래그와 설정이 닫힌 상태 | 사업·PG·법무·전문가 승인과 staging 리허설 뒤 별도 출시 절차 진행 |

검색 소유확인 변수는 사이트 HTML에서 공개될 값입니다. `NEXT_PUBLIC_`로 브라우저 번들에 넣지 않고 서버 레이아웃의 메타데이터로만 출력합니다. Railway `web` 런타임 변수로 설정하면 되며, 변경 후 새 인스턴스가 해당 변수를 읽는지 배포 상태와 페이지 소스로 확인합니다. `NEXT_PUBLIC_*` 값은 기존처럼 Docker 빌드 시점에 반영됩니다.

## 3. 먼저 PR에 이번 코드 변경 반영하기

1. 현재 저장소에서 `git status --short`를 실행합니다. 기존 미추적 파일을 삭제하거나 정리하지 않습니다.
2. 다음 파일의 변경 내용만 읽습니다.

   ```powershell
   git diff -- .env.example src/app/layout.tsx
   Get-Content docs/LUMINA-MONETIZATION-IMPLEMENTATION-2026-10-11.md
   ```

3. 변경 내용이 예상과 같으면 아래 파일만 stage 합니다. 문서 경로도 목록에 넣어 PR 검토 기록에 포함합니다.

   ```powershell
   git add -- .env.example src/app/layout.tsx docs/LUMINA-MONETIZATION-IMPLEMENTATION-2026-10-11.md
   git diff --cached
   ```

4. stage된 변경만 한 번 더 확인하고 커밋·푸시합니다. 다른 작업 파일은 stage하지 않습니다.

   ```powershell
   git commit -m "feat: add search verification metadata"
   git push origin hermes/growth-operator
   ```

5. [PR #8](https://github.com/musclebreadbread-stack/LUMINA/pull/8)을 새로고침합니다. `verify`와 `db-integration`이 성공인지 확인하고, 변경 사항을 검토합니다.
6. 내용을 승인할 수 있으면 `Ready for review`를 누른 뒤 `Merge pull request` → `Confirm merge`를 선택합니다. 이 선택은 사람이 직접 승인합니다. 검사 실패나 예상하지 못한 변경이 있으면 병합하지 말고 원인을 먼저 해결합니다.

## 4. Railway production에 반영하고 확인하기

운영 배포는 PR 병합 후 진행합니다. 현재 체크아웃에는 이번 작업과 무관한 미추적 문서·오디오·작업 파일이 있습니다. Railway CLI는 현재 디렉터리를 압축해 올리며 `.gitignore`와 `.railwayignore`로 제외 대상을 정합니다. `.dockerignore`는 Docker 빌드 내부에서만 적용되므로 업로드 전 보호 수단이 아닙니다. 미추적 파일을 삭제하지 말고, 새 폴더에 원격 `master`를 복제해 배포합니다.

1. PR이 병합된 것을 GitHub에서 확인합니다.
2. 현재 작업 폴더와 분리된 새 폴더에 깨끗한 `master` 체크아웃을 만듭니다.

   ```powershell
   cd "D:\Jack\17. Paseo"
   git clone --branch master --single-branch https://github.com/musclebreadbread-stack/LUMINA.git LUMINA-production
   cd "D:\Jack\17. Paseo\LUMINA-production"
   git status --short
   ```

   `git status --short` 결과가 비어 있는지 확인합니다. 출력이 있으면 배포를 멈추고, 새 폴더에 잘못된 파일이 복사되지 않았는지 확인합니다. 기존 작업 폴더를 이 새 폴더로 덮어쓰거나 미추적 파일을 옮기지 않습니다.

3. Railway 대시보드에서 프로젝트 `LUMINA` → `production` → `web` → `Variables`를 엽니다. 배포 전에 다음 공개 빌드 변수와 검색 소유확인 런타임 변수의 존재와 값을 확인합니다.

   | 변수 | 확인할 내용 |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://lumina.jack.ai.kr` |
   | `NEXT_PUBLIC_UMAMI_SCRIPT_URL` | 공개 tracker 주소. 기본 경로는 `https://lumina.jack.ai.kr/api/umami/script.js` |
   | `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | 실제 LUMINA Umami Website ID |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | 공개해도 되는 실제 문의 이메일. 정한 경우에만 입력 |
   | `GOOGLE_SITE_VERIFICATION` | Google Search Console에서 받은 값. `web` 런타임 변수로 입력 |
   | `NAVER_SITE_VERIFICATION` | 네이버 서치어드바이저에서 받은 값. `web` 런타임 변수로 입력 |
   | `NEXT_PUBLIC_ADSENSE_CLIENT` | AdSense 계정 생성 후 받은 `ca-pub-숫자` 형식 값 |
   | `NEXT_PUBLIC_ADSENSE_SLOT_ID` | 사이트 승인 및 광고 단위 생성 후 받은 숫자 ID. 승인 전에는 비워 둠 |

   Umami 서버 연결 변수(`UMAMI_API_URL`, `UMAMI_API_KEY`, `UMAMI_WEBSITE_ID`)도 확인합니다. `UMAMI_API_KEY`와 `GROWTH_REPORT_SECRET`은 서버 전용이며 `NEXT_PUBLIC_`로 시작하는 변수에 넣지 않습니다. 공개 이메일, Google/Naver 확인값, AdSense ID는 공개 정보지만, 비밀값은 채팅·문서·코드에 복사하지 않습니다.

4. 새 체크아웃의 터미널에서 `railway link`를 실행합니다. 대화형 목록에서 기존 `LUMINA` 프로젝트, `production` 환경, `web` 서비스를 선택합니다. 새 프로젝트를 만들지 않습니다. 이어서 `railway status` 출력에서 프로젝트와 환경이 정확한지 확인하고, 다르면 중단합니다.
5. 필요한 변수를 저장합니다. `NEXT_PUBLIC_*` 값은 Docker 빌드에 반영되어야 합니다. 검색 소유확인 값은 `web` 런타임 변수입니다. Railway가 변수 변경으로 새 배포를 시작했는지 대시보드에서 확인합니다.
6. 새 체크아웃에서 서비스를 차례로 배포합니다.

   ```powershell
   railway up --ci --service web
   railway up --ci --service cron-10min
   railway up --ci --service cron-daily
   ```

   각 서비스가 `SUCCESS`인지 확인합니다. 운영 배포는 사람이 화면과 대상을 확인한 뒤 직접 실행합니다.

7. 배포 후 공개 URL을 확인합니다.

   ```powershell
   pnpm.cmd railway:smoke
   ```

   현재 PR의 기준 기대값은 `23/23 passed`입니다. 브라우저에서도 다음을 확인합니다.

   - `https://lumina.jack.ai.kr/sitemap.xml`: 모든 `<loc>`와 hreflang URL이 운영 도메인으로 시작하고 `localhost`가 없음.
   - `https://lumina.jack.ai.kr/robots.txt`: `Sitemap: https://lumina.jack.ai.kr/sitemap.xml`이 표시됨.
   - `https://lumina.jack.ai.kr/contact`: 공개 이메일을 설정했다면 주소와 `mailto:` 링크가 표시됨.
   - 페이지 소스의 `<head>`에서 설정한 `google-site-verification`, `naver-site-verification`을 찾음.
   - `https://lumina.jack.ai.kr/ads.txt`: AdSense 게시자 ID를 아직 설정하지 않았다면 안내 주석만 보임. 설정 후에는 해당 계정의 `pub-...` 값으로 `google.com, pub-..., DIRECT, f08c47fec0942fa0` 줄이 나옴.
   - `GET /api/internal/growth-report`를 인증 없이 열면 `401`이 나옴. 이 응답은 비밀값을 노출하지 않음.

## 5. KPI를 Hermes에 연결하기

배포가 끝난 뒤 읽기 전용 KPI 연결용 비밀값을 하나 생성합니다.

1. PowerShell에서 아래 명령을 실행합니다. 출력은 비밀이므로 터미널 밖에 공개하지 않습니다.

   ```powershell
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

2. Railway `production` → `web` → `Variables`에 `GROWTH_REPORT_SECRET`을 추가하고 방금 생성한 값을 저장합니다. 변수 적용을 위해 화면 안내에 따라 `web`을 재배포합니다.
3. Hermes 설정 파일을 엽니다.

   ```powershell
   notepad "D:\Jack\20. Hermes\Lumina\.env"
   ```

4. 파일의 `LUMINA_GROWTH_REPORT_SECRET=` 뒤에 같은 값을 입력하고 저장합니다. 값은 이 문서나 채팅에 넣지 않습니다.
5. Hermes 작업공간에서 연결을 확인합니다.

   ```powershell
   cd "D:\Jack\20. Hermes\Lumina"
   python -m growth.kpi
   ```

   출력에 `"status": "ok"`가 있어야 합니다. `401`이면 두 곳의 값이 같은지 확인하고, `endpoint_missing`이면 PR 배포가 끝났는지 확인합니다. `umami_not_configured`이면 LUMINA Railway `web`의 서버 전용 Umami 변수를 점검합니다.

## 6. Google Search Console과 네이버 등록하기

각 계정에서 발급하는 소유확인 값은 코드가 아닌 Railway 변수에 설정합니다.

### Google Search Console

1. [Google Search Console](https://search.google.com/search-console)에 로그인하고 속성을 추가합니다.
2. 도메인 속성이 아니라 URL 접두어 속성을 선택하고 `https://lumina.jack.ai.kr/`을 입력합니다.
3. 소유확인 방법에서 HTML 태그를 선택하고 `content="..."` 안의 값만 복사합니다. `<meta>` 전체를 입력하지 않습니다.
4. Railway `production` → `web` → `Variables`에 `GOOGLE_SITE_VERIFICATION`으로 추가합니다.
5. Railway가 `web`에 변수 변경을 반영한 새 배포를 완료했는지 확인하고, 페이지 소스에서 `<meta name="google-site-verification" ...>`가 보이는지 확인합니다. 변수 변경 뒤 자동 배포가 시작되지 않았다면 대시보드에서 `web`을 재배포합니다.
6. Search Console로 돌아가 `확인`을 누릅니다. 확인 후 `Sitemaps`에 `sitemap.xml`을 제출합니다.
7. URL 검사에서 아래 공개 페이지를 확인하고 필요한 경우 색인 생성 요청을 보냅니다.

   - `https://lumina.jack.ai.kr/saju/2027`
   - `https://lumina.jack.ai.kr/premium/saju-2027`
   - `https://lumina.jack.ai.kr/psychometrics/types`

사이트맵 제출·색인 요청은 검색 노출을 보장하지 않습니다. 처리 상태는 Search Console 보고서에서 나중에 확인합니다.

### 네이버 서치어드바이저

1. [네이버 서치어드바이저](https://searchadvisor.naver.com)에 로그인하고 웹마스터 도구에 `https://lumina.jack.ai.kr`을 등록합니다.
2. HTML 태그 소유확인에 표시되는 `content` 값을 복사합니다.
3. Railway `production` → `web` → `Variables`에 `NAVER_SITE_VERIFICATION`으로 추가합니다.
4. Railway가 `web`에 변수 변경을 반영한 새 배포를 완료한 뒤 페이지 소스의 `naver-site-verification` 메타를 확인하고 서치어드바이저에서 소유확인을 완료합니다. 자동 배포가 시작되지 않았다면 대시보드에서 `web`을 재배포합니다.
5. 사이트의 사이트맵 제출 메뉴에서 `https://lumina.jack.ai.kr/sitemap.xml`을 제출합니다. 주요 페이지 수집 요청도 현재 화면의 안내에 따라 보냅니다.

두 확인값을 같은 배포 전에 모아 입력하면 각각 따로 배포할 필요가 없습니다. 문의 이메일은 `NEXT_PUBLIC_*`이므로 새 빌드가 필요하고, 검색 소유확인 값은 서버 런타임 변수이므로 새 인스턴스에서 적용 여부를 확인합니다.

## 7. 문의 이메일과 AdSense

### 문의 이메일

1. 공개 가능한 문의 전용 이메일을 정합니다. 실제로 받을 수 있는 주소만 사용합니다.
2. Railway `production` → `web` → `Variables`에 `NEXT_PUBLIC_CONTACT_EMAIL`을 등록합니다.
3. `web`을 다시 빌드·배포합니다.
4. `/contact`에 이메일이 보이고 `sitemap.xml`에 `/contact` URL이 포함됐는지 확인합니다. `NEXT_PUBLIC_SELLER_CONTACT_EMAIL`은 사업자 푸터용 별도 변수라 두 설정을 혼동하지 않습니다.

### AdSense

1. 신청 전 사이트의 개인정보처리방침·이용약관·환불 안내에 남아 있는 초안 문구를 찾아 법률 검토와 시행일 결정을 마칩니다. 이 저장소는 법률 검토나 AdSense 승인을 대신하지 않습니다.
2. [AdSense](https://adsense.google.com)에서 계정을 만들고 `lumina.jack.ai.kr`을 등록합니다. 계정 정보에서 Publisher ID를 확인합니다.
3. Publisher ID의 `pub-숫자` 앞에 `ca-`를 붙인 `ca-pub-숫자`를 Railway `production` → `web`의 `NEXT_PUBLIC_ADSENSE_CLIENT`로 설정합니다. 이 값은 공개 식별자입니다.
4. `web`을 다시 빌드·배포하고 `/ads.txt`, 페이지의 `google-adsense-account` 메타와 AdSense 코드가 예상한 계정 ID를 사용하는지 확인한 뒤 AdSense에서 사이트 검토를 요청합니다.
5. 심사 중에는 광고가 나오지 않을 수 있습니다. 승인 메일을 받은 뒤 AdSense에서 반응형 디스플레이 광고 단위를 만들고 숫자 슬롯 ID만 `NEXT_PUBLIC_ADSENSE_SLOT_ID`에 등록합니다.
6. `web`을 다시 빌드·배포합니다. 광고 동의 전에는 광고 요청이 없어야 하고, 미동의 선택에서는 코드가 비개인화 광고 요청을 사용합니다. 본인 광고를 클릭하거나 다른 사람에게 클릭을 부탁하지 않습니다.
7. EEA·영국·스위스 방문자에게 개인화 광고를 제공할 계획이면 Google의 현재 인증 CMP 요구사항을 확인하고, AdSense `Privacy & messaging`의 유럽 규정 메시지 또는 Google이 인증한 CMP를 설정합니다. 자체 동의 배너만으로 인증 CMP 요건이 충족된다고 가정하지 않습니다.

## 8. Threads와 네이버 블로그

### Threads 예약 게시

1. 공식 LUMINA Threads 계정에 연결된 Meta 계정으로 [Meta for Developers](https://developers.facebook.com)에 로그인합니다.
2. 새 앱을 만들고 현재 대시보드의 안내에 따라 Threads API 사용 사례를 추가합니다. `threads_basic`, `threads_content_publish` 권한이 필요한지와 앱 역할/검수 조건을 해당 계정 화면에서 확인합니다. 계정·권한 정책은 바뀔 수 있으므로 예전 화면 안내만 믿지 않습니다.
3. 앱 역할에서 본인 Threads 계정을 테스터로 등록하고, Threads 앱 또는 웹에서 초대를 수락합니다.
4. 사용자 토큰을 발급합니다. 짧은 토큰을 장기 토큰으로 교환할 때 Meta 앱 시크릿이 필요할 수 있으므로 토큰이나 앱 시크릿을 Hermes 채팅에 보내지 않습니다.
5. Hermes `.env`에서 `THREADS_ACCESS_TOKEN`을 설정합니다. `THREADS_USER_ID=me`는 기존 작업 설정을 유지합니다.
6. Hermes에서 `python -m growth.threads status`를 실행하고 `status: ok` 및 LUMINA 계정 표시를 확인합니다.
7. 첨부 가이드에 적힌 매일 20:30 예약 작업과 작업 ID가 Hermes의 현재 예약 목록에 존재하는지 확인합니다. 이 작업에서는 별도 Hermes 워크스페이스와 예약 목록을 열거나 변경하지 않았습니다.
8. Meta가 반환한 만료 정보(`expires_in`)와 현재 공식 문서를 따릅니다. 안내 원문은 60일을 기준으로 적었으므로 월 1회 갱신을 안전 간격으로 삼되, 만료된 토큰은 갱신되지 않을 수 있어 만료 전에 새 토큰을 준비합니다. 갱신 명령은 Hermes에서 실행합니다.

   ```powershell
   cd "D:\Jack\20. Hermes\Lumina"
   python -m growth.threads refresh
   ```

### 네이버 블로그 초안 발행

1. 첨부 가이드에 안내된 Hermes 예약 작업이 생성한 `content-queue\(날짜)` 폴더에서 `naver-....md`와 `naver-....json`을 엽니다. 해당 예약 파일은 이번 LUMINA 저장소 작업에서 확인하지 않았습니다.
2. 제목·본문·연결 URL을 읽고 사실과 과장 표현을 검토합니다. 본문을 네이버 블로그 스마트에디터에 붙여넣고, JSON의 `image_url` 이미지와 태그를 등록합니다.
3. 미리보기에서 모바일 줄바꿈과 링크를 확인한 뒤 직접 발행합니다. 이 작업에서 블로그 글을 대신 게시하지 않았습니다.
4. 발행 URL을 복사해 로컬 기록에 남깁니다.

   ```powershell
   cd "D:\Jack\20. Hermes\Lumina"
   python -m growth.ledger mark-published --channel naver --path /saju/2027 --post-url "https://blog.naver.com/내아이디/글번호"
   ```

네이버 개발자센터는 로그인 방식 블로그 글쓰기 API를 2020-05-06 종료했다고 공지했습니다. 따라서 이 안내는 사람이 직접 발행하는 흐름으로 작성했습니다.

## 9. 매일·매주 확인하기

1. 하루 한 번 Hermes에 `오늘 LUMINA 브리핑 보여줘`라고 요청하고 사이트맵·robots·Umami·문의 페이지 경고를 확인합니다.
2. 매일 20:30 이후 Threads 게시 결과와 ledger 기록을 확인합니다. 실패·중복·가드레일 차단 결과가 있으면 원인을 확인한 뒤 재게시 여부를 사람이 결정합니다.
3. 매주 목요일 네이버 초안을 검토·발행하고 ledger에 발행 URL을 기록합니다.
4. 매주 월요일 주간 성장 리뷰와 지표를 확인합니다. 지표가 비어 있으면 데이터 수집이 시작된 시점과 KPI 연결 상태를 먼저 점검합니다.
5. 자동 작업 ID와 결과 파일 위치는 Hermes 예약 화면에서 확인합니다. 첨부 가이드에 있는 ID가 현재 설정과 다르면 현재 Hermes 화면을 기준으로 정정합니다.

## 10. 유료 판매 전 사람 승인 항목

아래는 코드만으로 끝낼 수 없는 출시 조건입니다. 순서와 자격은 세무·법률·PG 담당자와 확인합니다.

1. 사업자 등록과 업종 분류를 세무 전문가 또는 관할 기관에 확인합니다.
2. 토스페이먼츠 계약 및 카드사 심사를 신청합니다. 등록 유의 업종 여부와 필요한 공개 정보는 토스 담당자에게 확인합니다.
3. 통신판매업 신고와 구매안전서비스 확인증 필요 여부를 관할 기관에 확인합니다.
4. 이용약관·개인정보처리방침·환불/청약철회·국외 이전 문구를 법무 담당자가 검토하고 시행일을 확정합니다.
5. `2027-saju-report-v1` 전문가 검수와 승인 기록을 확보합니다.
6. 사업자 서류와 일치하는 8개 공개 푸터 변수(`NEXT_PUBLIC_SELLER_NAME`, `NEXT_PUBLIC_SELLER_REPRESENTATIVE`, `NEXT_PUBLIC_SELLER_REGISTRATION_NUMBER`, `NEXT_PUBLIC_SELLER_MAIL_ORDER_REGISTRATION`, `NEXT_PUBLIC_SELLER_ADDRESS`, `NEXT_PUBLIC_SELLER_PHONE`, `NEXT_PUBLIC_SELLER_CONTACT_EMAIL`, `NEXT_PUBLIC_HOSTING_PROVIDER`)를 Railway `web`에 입력하고 재빌드 후 화면을 확인합니다.
7. 승인 증빙·staging RLS 검증·테스트 결제/환불 리허설이 모두 완료된 뒤에만 별도 절차로 결제 승인 플래그와 라이브 키를 설정합니다. 운영 DB 마이그레이션과 라이브 결제 전환은 별도 승인 전까지 진행하지 않습니다.

자세한 기술·출시 게이트는 저장소의 [`docs/LAUNCH-APPROVAL-READINESS.md`](LAUNCH-APPROVAL-READINESS.md)에서 이어서 확인합니다.

## 11. 공식 참고 자료

- [Google Search Console 소유권 확인](https://support.google.com/webmasters/answer/9008080?hl=ko)
- [Google Search Console 사이트맵 보고서와 제출](https://support.google.com/webmasters/answer/7451001?hl=ko)
- [네이버 서치어드바이저 사이트 등록·소유확인](https://searchadvisor.naver.com/guide/faq-start-register)
- [네이버 SEO 사이트맵 안내](https://searchadvisor.naver.com/guide/seo-basic-intro)
- [네이버 블로그 글쓰기 API 종료 공지](https://developers.naver.com/notice/article/7527)
- [Meta 공식 Threads API 문서 모음](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api)
- [Google AdSense Publisher ID 확인](https://support.google.com/adsense/answer/105516?hl=ko)
- [Google AdSense ads.txt 안내](https://support.google.com/adsense/answer/12171612?hl=ko)
- [Google의 EEA·영국·스위스 광고 동의 CMP 요구사항](https://support.google.com/adsense/answer/13554116?hl=ko)
- [Railway CLI `up` 업로드 범위와 ignore 파일](https://docs.railway.com/cli/up)
- [Railway CLI 프로젝트 연결 `link`](https://docs.railway.com/cli/link)
