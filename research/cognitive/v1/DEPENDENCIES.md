# R 환경 요구사항

실제 규준 표본을 다루기 전에 아래 최소 버전을 만족하는지 확인한다.

```
Rscript research/cognitive/v1/R/00-check-environment.R
```

| 항목 | 최소 버전 | 용도 |
|---|---|---|
| R | 4.3.0 | 런타임 |
| mirt | 1.41 | IRT 보정 — 통계 담당자가 R 세션에서 대화형으로 실행(이 저장소의 배치 스크립트는 mirt를 직접 호출하지 않는다) |
| testthat | 3.1.0 | 단위 테스트 |
| digest | 0.6.30 | 증거 해시(SHA-256) |
| jsonlite | 1.8.0 | manifest·검토기록 JSON 읽기/쓰기 |

버전을 고정하는 이유: `mirt`의 IRT 보정 결과는 메이저 버전 간 알고리즘 변경으로 재현되지 않을 수 있다.
실제 표본으로 분석을 실행하기 전, 해당 세션의 `sessionInfo()` 출력을 release evidence와 함께 보관한다.

`00-check-environment.R`의 임계값을 바꾸면 이 표와 함께 갱신한다 — 두 값이 어긋나면 어느 쪽이 사실인지
알 수 없게 된다.
