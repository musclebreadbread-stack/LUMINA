# LUMINA MBTI 64유형 확장 — 신규 축 이미지 프롬프트 (AT/VW)

> 상태: 미생성. `mbti-image-prompts.md`의 기존 축 이미지 8장(EI/SN/TF/JP)과 같은 스타일로
> 4장을 추가해야 64유형 확장의 결과 페이지·랜딩·공유 카드가 완성됩니다.

## 공통 지시 (기존 문서와 동일)

가로 3:2, 화면용 1536×1024 이상. 따뜻한 아이보리 한지 위에 검은 먹이 번지는 현대적 잉크 워시, 얇은 기술 도면 선, 은은한 종이 결, 전문 심리측정 리포트의 절제된 편집 디자인을 유지한다. 과도한 보라색·금색·별자리 문양·수정구·운명 예언·공식 MBTI 로고·상표 문구·읽을 수 있는 텍스트·워터마크는 넣지 않는다. 양극은 크기·밝기·위치에서 동등한 시각적 가치를 갖게 한다.

## 신규 축 이미지 4장

파일명은 `public/psychometrics/types/axes/` 아래에 `at-a.webp`, `at-t.webp`, `vw-v.webp`, `vw-w.webp`로 저장한다(webp 변환은 `pnpm images:optimize`가 처리하므로 원본은 png/jpg로 생성해도 무방).

1. `at-a.webp` — A balanced ink-wash scene for the A(ssertive) pole: a single figure standing steady at a drafting table during a small storm of scattered papers, calm posture, unshaken hand, no arrogance or celebration — quiet self-assurance under pressure, equal visual weight to a more reactive scene.
2. `at-t.webp` — A balanced ink-wash scene for the T(urbulent) pole: a figure checking and re-checking a detailed instrument or ledger by lamplight, attentive self-monitoring, visible care rather than distress, no panic or tears — equal visual weight to the calm scene.
3. `vw-v.webp` — A balanced ink-wash scene for the V (volatility-leaning) pole: a sudden gust scattering loose papers off a table while a figure reacts in the moment, visible but brief agitation, outward release of tension, no anger or violence — equal visual weight to the withdrawal scene.
4. `vw-w.webp` — A balanced ink-wash scene for the W (withdrawal-leaning) pole: a figure quietly stepping back to a window alone, arms loosely folded, inward processing of unease, no despair or isolation imagery — equal visual weight to the volatility scene.

## 통합 방법

1. 위 프롬프트로 4장을 생성한다(Google Antigravity/Gemini 등, 기존 8장과 동일 도구 권장 — 화풍 일관성).
2. `public/psychometrics/types/axes/` 아래 파일명 그대로 저장한다.
3. `pnpm images:optimize` 실행 → webp 변환.
4. `e2e/jungian.spec.ts`의 `GENERATED_ARTWORK` 목록이 이미 이 4개 경로를 기대하도록 갱신되어 있으므로, 파일이 채워지면 별도 코드 수정 없이 테스트가 통과한다.

## 기존 문서와의 관계

`mbti-image-prompts.md`는 4축(EI/SN/TF/JP) 8장 + 16유형 요약 이미지가 이미 생성 완료된 상태를 기록한다. 64유형 확장에서 유형 요약 이미지는 **새로 만들지 않는다** — 기존 16장을 그대로 재사용한다(코드 앞 4글자 기준). 이 문서는 오직 신규 축 2개(AT, VW)의 극 이미지 4장만 다룬다.
