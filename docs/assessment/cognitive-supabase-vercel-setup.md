# 인지능력 표준화 파일럿 배포 준비 런북

이 문서는 코드 배포와 데이터베이스 적용을 분리한다. 현재 저장소에는 Supabase 연결값이 없고, 승인된 한국 성인 규준·운영 문항은행도 없으므로 먼저 스테이징 프로젝트에서만 준비한다.

## 1. 대상 프로젝트 확인

1. LUMINA 담당자가 사용할 Supabase 프로젝트 ID와 환경(`staging`/`production`)을 지정한다.
2. 프로젝트 이름만으로 대상을 추측하지 않는다. 다른 제품의 프로젝트에 이 마이그레이션을 적용하지 않는다.
3. 운영 DB가 이미 있다면 먼저 백업·복구 절차와 롤백 담당자를 확인한다.

## 2. Supabase 사전 조건

- Anonymous Auth를 활성화하고, 익명 세션이 `authenticated` 역할로 동작하는지 확인한다.
- `private_cognitive`를 PostgREST의 노출 스키마에 추가해야 한다. 노출하더라도 private 테이블의 `anon`/`authenticated` 테이블 권한은 계속 `REVOKE` 상태여야 하며, 허용되는 것은 `submit_response` RPC 실행뿐이다.
- 프로젝트의 publishable key는 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`로만 사용한다.
- service-role key는 Vercel 서버 환경의 `SUPABASE_SERVICE_ROLE_KEY`에만 저장한다. 브라우저 환경변수, 클라이언트 props, 로그, 커밋에 넣지 않는다.

## 3. 마이그레이션 적용 승인 게이트

다음 확인을 모두 마친 뒤 담당자가 명시적으로 승인할 때만
`supabase/migrations/20260828000000_cognitive_pilot.sql`을 스테이징에 적용한다.

1. SQL을 사람이 검토하고 백업·롤백 계획을 기록한다.
2. `supabase/tests/cognitive_pilot_rls.test.sql`을 실행해 owner read, cross-owner deny, private table deny, RPC 경계를 확인한다.
3. 실패하면 마이그레이션을 재실행하거나 `db reset`하지 말고 원인과 로그를 보존한다.
4. 운영 적용은 스테이징 결과, 보안 검토, 연구 책임자 승인을 모두 남긴 뒤 별도로 승인한다.

## 4. 문항은행 등록

service-role 전용 적재 작업으로만 비공개 스키마에 등록한다.

- `cognitive-pilot-v1`·`ko-adult-pilot-2026-08` 버전이 일치해야 한다.
- 노출률이 0.2 이하인 활성 문항이 전체 20개 이상이고, 각 영역(`gf`, `gc`, `gv`, `gwm`, `gs`)에 최소 2개 이상 있어야 한다.
- 활성 문항은 2PL/3PL 보정값, 두 명의 독립 검토, 인지 인터뷰, 번역 검토, 시각 접근성 검토, 저작권·정답 근거를 모두 갖춰야 한다.
- 연습 문항(`practice:*`)을 점수 문항은행에 넣지 않는다.
- 보정값이나 정답 키를 public schema, 클라이언트 번들, URL에 복사하지 않는다.

## 5. Vercel 환경 설정

Vercel 프로젝트에서 Preview와 Production 환경을 분리해 다음 변수만 연결한다.

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY   # 서버 전용
```

Vercel CLI가 없으면 Dashboard에서 환경변수를 설정한다. CLI를 사용할 경우 담당자가 로컬에 `vercel`을 설치·로그인한 뒤 `vercel env` 계열 명령으로 값을 관리한다. 비밀값을 셸 출력, 이슈, 빌드 로그에 남기지 않는다.

Next.js 기본 Node.js/Fluid Compute 런타임을 사용하며 인지 Server Action을 Edge 런타임으로 강제하지 않는다. 배포 전 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, 인지 Playwright를 모두 통과시킨다.

## 6. 점수 공개 조건

마이그레이션이나 문항 등록만으로 IQ를 공개하지 않는다.

1. 한국 성인 18–64세 표본으로 사전등록 분석, IRT 보정, 구조·정밀도, 재검사·대안형, DIF/DTF, 외부 준거 타당도를 완료한다.
2. 홀드아웃 검증과 독립 검토를 거쳐 `candidate` 규준을 만든다.
3. 통계 담당자와 연구 책임자가 별도로 승인한 뒤에만 `private_cognitive.norm_releases`를 `approved`로 전환한다.
4. UI는 연구 참여를 선택한 경우에만 만 나이를 선택적으로 수집하며, 입력하지 않아도 파일럿을 진행할 수 있다. 승인 규준이 없거나 연령을 제공하지 않은 실행은 계속 `pilot_withheld`로 유지된다. 연령 데이터는 연구 export에서 사전등록된 연령대로 구간화한다.

## 7. 운영 후 점검

- 실행 시작·응답 제출·재개 시 owner RLS와 stale assignment 동작을 확인한다.
- 공개 HTML/JS에 `correctOptionId`, IRT 모수, `server_seed`, 원응답이 없는지 확인한다.
- 규준·문항 버전이 불일치하거나 철회된 문항이 있으면 점수 공개를 중지하고 새 버전으로 전체 게이트를 다시 수행한다.
