# LUMINA 인지능력 규준화 R 파이프라인 (v1)

이 디렉터리는 `analysis-plan.md`에 사전등록된 계약을 실행하는 R 함수들과, 그 산출물을 모아
`release-manifest.schema.json`에 맞는 최종 릴리스 manifest를 조립하는 배치 스크립트를 담는다.

**자동화가 만들 수 있는 최댓값은 `candidate`다. `approved`는 이 저장소의 어떤 스크립트도 만들지
않는다** — 통계·연구 책임자의 독립 검토와 out-of-band 승인(운영 DB의 `private_cognitive.norm_releases`에
사람이 직접 기록)이 있어야 한다. `R/06-release-gate.R`이 이 규칙을 강제한다.

## 0. 환경 준비

`DEPENDENCIES.md`의 최소 버전을 확인한다.

```
Rscript research/cognitive/v1/R/00-check-environment.R
```

## 1. 실행 순서

```
1. pnpm cognitive:validate-export --input <restricted-export.csv> ...   (TS, docs/assessment/cognitive-research-export-runbook.md 참고)
2. 통계 담당자가 R 세션에서 대화형으로 수행 (아래 "직접 수행해야 하는 분석" 참고)
3. Rscript research/cognitive/v1/R/00-run-release-pipeline.R ...        (이 저장소, 배치)
```

2단계가 대화형인 이유: IRT 모델 적합·확인적 구조모형·DIF 탐지는 매 표본마다 통계 담당자가 진단 그림을
보고 판단해야 하는 작업이라, 무인 배치로 "실행 후 결과를 무조건 신뢰"하는 방식은 오히려 위험하다.
`00-run-release-pipeline.R`은 그 판단 결과(파일)를 모아 사전등록된 규칙으로 다시 검증하고, 해시를 남기고,
스키마에 맞는 manifest를 쓰는 역할만 한다 — 새로운 통계 로직을 만들지 않는다.

## 2. 통계 담당자가 R 세션에서 직접 수행해야 하는 분석

이 저장소의 함수(`R/lib-models.R`, `R/lib-quality.R`)를 대화형으로 불러 쓰되, 아래 산출물을 CSV/JSON으로
저장해 3단계 배치 스크립트에 넘긴다.

| 산출물 | 파일 | 필수 컬럼 |
|---|---|---|
| IRT 모델 비교 | `--irt-comparison` (JSON) | `{"model_2pl": {"aic": <num>, "converged": <bool>}, "model_3pl": {...}}` |
| 선택 모델 보정표 | `--irt-calibration` (CSV) | `item_id,converged,a,b,c` |
| 구조 검증 | `--structure-report` (CSV) | `model,holdout_reproducible,local_dependence_ok` |
| 정밀도(holdout) | `--precision-report` (CSV) | `split,sem_iq` (`split=="holdout"` 행 필수) |
| 재검사 | `--retest` (CSV) | `first_theta,second_theta,interval_days` |
| DIF 문항 결과 | `--dif-item-report` (CSV) | `item_id,dif_status` |
| DIF 집단 크기 | `--dif-group-sizes` (CSV) | `group,n` |
| 외부 준거 타당도 | `--external` (CSV) | `lumina_theta,external_score` |
| 규준 점수 | `--norm-scores` (CSV) | `run_id,theta,sem_theta,age` (아래 "미해결 항목" 참고) |
| 독립 검토 기록 | `--review-record` (JSON, 선택) | `{"reviewer": "...", "date": "...", "statement": "..."}` |

`R/lib-io.R`의 `build_response_matrix(export)`는 검증된 export(긴 형식)를 `mirt::mirt()`가 받는
참가자×문항 행렬로 피벗해준다. 참가자 theta·SEM은 보정된 모델에 `mirt::fscores(fit, method = "EAP",
full.scores.SE = TRUE)`를 적용해 만든다.

## 3. 배치 스크립트 실행

```
Rscript research/cognitive/v1/R/00-run-release-pipeline.R \
  --export <restricted-export.csv> \
  --dictionary research/cognitive/v1/data-dictionary.csv \
  --irt-comparison <irt-comparison.json> \
  --irt-calibration <irt-calibration.csv> \
  --structure-report <structure-report.csv> \
  --precision-report <precision-report.csv> \
  --retest <retest.csv> \
  --dif-item-report <dif-item-report.csv> \
  --dif-group-sizes <dif-group-sizes.csv> \
  --external <external.csv> \
  --norm-scores <norm-scores.csv> \
  --sample-version <예: ko-adults-2026-wave1> \
  --review-record <review-record.json> \
  --out <release-manifest.json> \
  --norm-out <norm-candidate.json>
```

`item_bank_version`·`algorithm_version`은 별도 플래그가 없다 — export 자체에서 검증된 값을 그대로
사용해, manifest가 실제 분석한 데이터와 다른 버전을 주장할 수 없게 한다.

출력은 두 파일이다.

- `release-manifest.json` — `release-manifest.schema.json`을 만족하는 게이트 판정. `status`는
  `blocked` 또는 `candidate`만 가능하다. `candidate`가 아니면 스크립트는 종료 코드 1을 반환한다.
- `norm-candidate.json` — `build_norm_candidate()`의 원본 출력(IQ 평균 100·표준편차 15 척도 계수,
  표본 SEM 등). **주의: 이 파일은 전역 theta→IQ 변환계수 하나만 담고 있어, 실제 채점 엔진
  (`src/engine/cognitive-standardized/norming.ts`)이 요구하는 연령대별 `byAge` lookup 테이블
  형식이 아니다.** 통계 담당자가 이 원본을 근거로 18–64세를 빈틈없이 커버하는 연령대별
  theta→IQ·IQ→백분위 테이블을 별도로 구성해야 승인 단계로 넘어갈 수 있다.

### 사람 승인 (out-of-band)

검토·승인 자체는 `scripts/neon-approve-cognitive-norm.ts`(`pnpm cognitive:approve-norm`)를 사용한다.
이 스크립트는 `release-manifest.json`이 `candidate`인지, 연령대별 테이블(`norm-payload.json`)이
채점 엔진의 `validateNormTable` 규칙을 그대로 통과하는지 확인하고, `--confirm` 없이는 아무것도
쓰지 않는 드라이런을 기본값으로 한다. 앱의 런타임 DB 역할에는 `norm_releases` insert 권한이 없으므로,
이 스크립트는 마이그레이션과 같은 관리자 전용 자격증명으로 사람이 직접 실행해야 한다.

## 4. 테스트

```
pnpm cognitive:test-r
```

합성 fixture(`tests/fixtures/synthetic-responses.csv`, `tests/fixtures/review-record-*.json`)만
사용하며 실제 참가자 데이터는 절대 이 저장소에 두지 않는다.

## 미해결 항목: 정확한 연령

`build_norm_candidate()`는 숫자 나이(18–64)를 요구하지만, `data-dictionary.csv`가 허용하는 표준
분석 export 컬럼에는 `age_band`(연령대 구간)만 있고 정확한 나이는 없다. 이는 이번 파이프라인 정비로
해결한 문제가 아니라, 그 이전부터 존재한 설계 간극이다. `--norm-scores`의 `age` 컬럼이 숫자가 아니면
배치 스크립트는 그 자리에서 명확한 에러로 멈춘다 — 밴드 중앙값 등으로 임의 변환하지 않는다. 정확한 나이를
어떤 동의·보존 등급으로 수집할지는 데이터 관리 책임자의 정책 결정이 먼저 필요하다.
