# LUMINA MBTI(융 유형 4축) 분석 추가 계획

> 이 문서는 LUMINA에 대중적으로 알려진 16개 코드 화면을 추가하되, 공식 MBTI® 검사·문항·규준을 복제하지 않고 기존 IPIP-50 Big Five 결과를 학술 문헌에 따라 재표현하기 위한 실행 계획이다.

## 1. 제품·상표 원칙

- 서비스 명칭은 `융 유형 렌즈(Jungian Type Lens)`로 사용한다.
- MBTI®와 The Myers & Briggs Foundation의 등록상표·공식 검사와 무관하다는 고지를 랜딩과 결과에 항상 표시한다.
- 공식 MBTI Form M 문항, 채점표, 유료 자료, OEJTS의 비상업 라이선스 콘텐츠를 복제하지 않는다.
- 16개 코드는 결과의 본체가 아니라 네 개 연속 점수를 기억하기 위한 요약이다.
- 축의 중간 경계에서는 문자를 억지로 결정하지 않고 `?`를 표시한다.

## 2. 방법론 결정

기존 IPIP-50 문항과 채점 결과를 그대로 사용한다. 새 문항·새 인코딩·새 서버 저장·새 규준을 만들지 않는다.

| 축 | 기존 요인 | 음수 극 | 양수 극 | 문헌 대응 참고값 |
|---|---|---:|---:|---:|
| EI | Extraversion | I | E | McCrae & Costa(1989) 자체 보고 남·여 평균 약 .715 |
| SN | Intellect / Openness | S | N | 자체 보고 남·여 평균 약 .705 |
| TF | Agreeableness | T | F | 자체 보고 남·여 평균 약 .450 |
| JP | Conscientiousness | J | P | 자체 보고 남·여 평균 약 −.475 |

참고값은 사용자의 상관계수나 새로운 규준이 아니다. 논문의 성별별 NEO-PI 자체 보고 상관을 압축한 문헌 대응값이며, 화면에서 이 한계를 함께 설명한다. 기존 Big Five의 정서 안정성은 네 축에 억지로 합성하지 않는다.

## 3. M-1 — 순수 엔진

구현 파일: `src/engine/psychometrics/jungian.ts`

- `JungianAxis = EI | SN | TF | JP`와 `AxisScore`, `JungianLensResult`를 정의한다.
- `computeJungianLenses(scores)`는 `FactorScore.norm.zScore`를 선형 재표현한다.
- 연속값은 `-100..+100`으로 제한하고 음수는 I/S/T/J, 양수는 E/N/F/P로 읽는다.
- JP는 양수 P 방향을 화면에 두므로 성실성 z를 반전한다.
- `|z| < 0.25`이면 경계값으로 보고 `pole: null`, 코드의 해당 자리를 `?`로 만든다.
- 기존 요인의 SEM과 규준 표준편차를 선형 전파해 95% 참고 구간을 계산한다.
- 결과·축·배열을 깊게 동결하고 시계·난수·브라우저 상태에 의존하지 않는다.
- 설문 진행 중에는 `previewJungianAxes`로 미완료 답변의 잠정 위치만 표시하고 최종 유형을 만들지 않는다.

설명 계약:

- `src/engine/psychometrics/jungianExplanations.ts`에 네 축의 양극 8개와 16개 코드 해설을 둔다.
- 모든 문장은 계산 근거 참조(`evidenceRefs`)를 갖는다.
- 해설은 성격의 운명·진로·우열을 단정하지 않고 관찰 질문과 측정 한계를 포함한다.
- 인용문헌은 McCrae & Costa(1989), Pittenger(1993), Stein & Swan(2019), Goldberg(1992), IPIP 자료를 사용한다.

## 4. M-2 — 뷰 모델·라우트·교차 탐색

- `src/lib/jungianModel.ts`에서 `buildJungianView(responses)`를 만든다.
- `/psychometrics/types`는 “같은 IPIP-50, 다른 렌즈”를 설명하고, 브라우저 이력이 있으면 저장된 결과로 바로 이동할 수 있게 한다.
- `/psychometrics/types/result?r=...`는 기존 50자리 응답 코드를 사용하며 `noindex`로 설정한다.
- Big Five 결과에는 같은 `r`을 사용하는 “융 유형 렌즈로 보기” 링크를 둔다.
- `SurveyForm`은 `?to=types`일 때 새 결과 라우트로 이동한다. 두 번째 설문 폼은 만들지 않는다.
- 재검사 비교·localStorage 이력·공유 링크의 기존 계약을 그대로 사용한다.

## 5. 홈 허브·시각 자산·모션

- `MANDALA_FEATURES`에 과학적 계층의 여섯 번째 노드 `jungian`을 추가한다.
- 링크는 `/psychometrics/types`, 행성 노드는 Venus, 자산이 없을 때 기존 fallback 화면이 동작한다.
- `mbti-image-prompts.md`에 축 8장과 유형 16장, 총 24장의 3:2 이미지 생성 프롬프트를 제공한다.
- 이미지는 잉크 워시·계측 기록 스타일을 유지하고 양극의 우열·신비적 결정론·공식 MBTI 로고를 넣지 않는다.
- `ei-e.png`, `sn-s.png`, `tf-t.png`, `jp-j.png`, `intj.png`처럼 엔진 키와 일치하는 파일명을 사용하며 최종 화면은 WebP를 우선한다.
- `jungian-marker-converge`, `jungian-ci-expand`, `jungian-glyph-reveal`, 경계값 pulse/sway 모션을 CSS로 추가한다.
- `prefers-reduced-motion`과 인쇄/PDF에서는 모션·3D를 해제한다. 스크롤 타임라인으로 본문 글자 불투명도를 숨기지 않는다.
- 설문 상단에는 네 축의 잠정 위치를 transform 기반으로 표시한다.

## 6. M-3 — 국제화·법적 고지

- `messages/ko.json`, `messages/en.json`에 `jungian` 네임스페이스를 추가하고 키 parity를 유지한다.
- 랜딩·결과 모두 과학적 계층 뱃지와 기존 과학적 한계 고지를 표시한다.
- 필수 고지문:

  > MBTI는 The Myers & Briggs Foundation의 등록상표이며, 본 서비스는 이와 무관하고 공식 MBTI® 검사가 아닙니다. 이 결과는 퍼블릭 도메인 IPIP-50 응답을 학술 문헌의 상관 구조에 따라 융 유형 4축으로 재해석한 것입니다.

- 영문 화면에도 같은 의미의 상표·비제휴·재해석 고지를 표시한다.
- 공식 검사 결과나 임상·의료 판단으로 오해할 수 있는 표현을 사용하지 않는다.

## 7. M-4 — 문서·검증·완료 기준

- 방법론 페이지에 IPIP-50 재표현, 경계값, 상관 근거와 한계를 추가한다.
- 용어집에 융 유형 4축과 경계값 `?`를 추가한다.
- 참고문헌 페이지에 융 유형 관련 문헌 그룹을 별도로 표시한다.
- 엔진 테스트: 방향·단조성·경계값·CI 전파·16개 코드·동결·결정론·해설 완결성을 검증한다.
- E2E: 한국어/영어 설문 제출, 4축 결과, Big Five↔융 렌즈 링크, 동일 `r` 재현, 경계 URL의 `?`, noindex를 검증한다.
- 생성된 24개 WebP 자산의 파일 응답·형식·연결 상태를 E2E로 확인하고, 향후 자산 누락 시에도 fallback이 깨지지 않는지 함께 유지한다.
- 최종 실행 순서: `pnpm lint`, `pnpm typecheck`, `pnpm test:cov`, `pnpm build`, `pnpm test:e2e`.

## 8. 시각 자산 반영 완료 및 유지 규칙

축 이미지 8장과 유형 이미지 16장, 총 24장의 WebP 자산을 생성하고 `public/psychometrics/types` 및 `public/psychometrics/types/axes`에 반영했다. 모든 자산은 1536×1024 해상도와 WebP 형식을 검사했으며, E2E에서 실제 정적 응답과 화면 연결을 확인한다. 향후 자산을 교체하거나 추가할 때도 기존 파일을 임의로 삭제·덮어쓰지 않고 파일 수, 이름, 확장자, 해상도, 손상 여부를 먼저 일괄 검사한다. 코드의 fallback 경로는 신규 환경이나 손상 자산에 대비해 계속 유지한다.
