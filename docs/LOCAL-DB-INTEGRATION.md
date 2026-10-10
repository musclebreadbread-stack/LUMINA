# 로컬 DB 통합 테스트(RLS·결제 상태 전이)

`src/server/__integration__/`의 테스트는 저장소의 Neon 마이그레이션 전체를 **로컬 일회용 PostgreSQL 18**에 적용한 뒤 다음을 검증한다.

- `rls.integration.test.ts`: 5개 업무 스키마 전 테이블의 RLS·FORCE RLS·정책 존재. `lumina_member_app` 역할에서 본인 행 1건/타인 행 0건, 신원 미설정 시 0건. 타인 명의 프로필 쓰기와 권한 자가 부여 차단.
- `billingFlow.integration.test.ts`: 운영용 `lumina_billing_worker` 역할(비슈퍼유저·RLS 우회 불가 검사 포함)로 실제 서비스 함수를 실행한다. 같은 웹훅 6회 재전송에도 권한 1건, 금액 변조 무시, 환불 예약 재시도 동일성, 환불 완료 후 권한 회수·감사 1건·다건 거래키 기록, 결제사 거절 시 `paid` 복구.

CI의 `db-integration` job(`.github/workflows/ci.yml`)이 PG18 서비스 컨테이너에 마이그레이션을 적용하고 같은 테스트를 실행한다. 이 job은 `LUMINA_IT_REQUIRED=1`이라서, DB URL이 빠지면 조용히 건너뛰지 않고 실패한다.

`LUMINA_IT_DATABASE_URL`이 없으면(그리고 `LUMINA_IT_REQUIRED`가 아니면) 두 파일은 건너뛴다. 호스트가 `127.0.0.1`/`localhost`가 아니면 실행을 거부하므로 Neon(운영·staging)에는 연결되지 않는다. RLS 테스트는 끝에 롤백하고, 결제 테스트는 매번 새 ID로 합성 행을 커밋하므로 컨테이너는 검증 후 삭제한다.

## 실행(PowerShell)

```powershell
$pw = -join ((1..36) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
docker run -d --name lumina-it-pg -e POSTGRES_PASSWORD=$pw -e POSTGRES_DB=lumina -p 127.0.0.1:55432:5432 postgres:18
docker exec lumina-it-pg pg_isready -U postgres -d lumina   # accepting connections가 나올 때까지 반복
docker cp neon/migrations lumina-it-pg:/migrations
Get-ChildItem neon/migrations/*.sql | Sort-Object Name | ForEach-Object {
  docker exec lumina-it-pg psql -U postgres -d lumina -v ON_ERROR_STOP=1 -q -f "/migrations/$($_.Name)"
  if ($LASTEXITCODE -ne 0) { throw "migration failed: $($_.Name)" }
}
$env:LUMINA_IT_DATABASE_URL = "postgresql://postgres:$pw@127.0.0.1:55432/lumina"
pnpm test:integration
docker rm -f lumina-it-pg
```

- SQL 파일은 `docker cp` 후 `psql -f`로 적용한다. PowerShell 파이프로 넘기면 한글 리터럴이 깨져 구문 오류가 난다.
- Git Bash에서 `docker pull`이 `docker-credential-desktop`을 찾지 못하면 PowerShell에서 실행한다.

## 검증 범위 밖

Neon 고유 동작(풀러, 역할 비밀번호 구성 스크립트), Toss 실제 결제창·승인·취소 API, 회원 로그인 세션은 이 테스트가 다루지 않는다. 이 항목은 staging에서 `docs/LAUNCH-APPROVAL-READINESS.md` §4 절차로 확인한다.
