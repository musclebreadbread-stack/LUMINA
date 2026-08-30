# LUMINA 인지능력 탐색 — ICAR 4형식 이미지 생성 프롬프트 (5장)

> 이 문서는 프롬프트 작성까지가 개발 산출물입니다. 이미지 자체는 이 세션 안에서 생성하지 않습니다 —
> 아래 프롬프트를 외부 이미지 생성 도구에 직접 입력해 사람이 생성하고, 완료되면 알려주시면 코드가
> 그 파일을 가리키도록 이어서 작업합니다.

## 사용법
1. 아래 각 항목의 **프롬프트를 그대로 복사**해서 이미지 생성 도구에 붙여넣어 이미지를 생성합니다.
2. 생성된 이미지를 **파일명 그대로** `public/psychometrics/cognitive/` 폴더에 저장합니다. (폴더는 이미 만들어 두었습니다.)
3. **가로(3:2 비율)** 이미지로 생성해 주세요 — 랜딩 히어로(4:3)·랜딩 갤러리(4:3)·결과 커버(3:2) 등
   여러 가로형 프레임에 얹히므로, 다른 과학 계층 삽화(EQ·빅파이브)와 같은 3:2 기준으로 맞춥니다.
4. 5장을 전부 저장하시면 알려주세요 — 그 결과물로 `src/lib/psychometricsAssets.ts`의
   `COGNITIVE_OVERVIEW_IMAGE`·`cognitiveImagePath()`가 지금 빌려 쓰고 있는 빅파이브 자리표시자 대신
   이 5장을 가리키도록 이어서 작업하겠습니다.

## 이 삽화는 랜딩·개요·결과 커버 전용이지, 문항 자극이 절대 아닙니다
`src/engine/cognitive/items.ts` 머리말(20-24행)이 명시하듯, "행렬·회전 문항의 자극은 그림 파일도 아니고
'삼각형이 세 개 있는 칸' 같은 산문 설명도 아니라 **구조화된 데이터**다. 규칙이 데이터 안에 들어 있으므로
렌더러는 그리기만 하면 되고, 번역할 문장이 없고, 이미지 자산도 필요 없다." 실제 문항 자극은
`MatrixStimulus.tsx`·`RotationStimulus.tsx`·`shapes.tsx`가 `MatrixCellContent`/`Voxel` 같은 구조화 데이터를
읽어 **그 자리에서 SVG로 그린다** — 정답을 미리 그려 둔 이미지 파일로 새면 검사 자체가 무력화된다.

그래서 이 문서가 커미션하는 5장은 **랜딩 페이지 히어로·도메인 갤러리·결과 화면 커버 아트로만** 쓰인다.
절대로 실제 문항(자극)에 쓰지 않는다. 이 원칙은 코드에도 이미 반영돼 있다 — `cognitiveImagePath()`는
`CognitiveDomain`(도메인 이름)을 받아 대표 삽화 하나를 돌려줄 뿐, 개별 문항 id는 받지 않는다.

## 왜 이 5장인가
`src/engine/cognitive/items.ts`의 `CognitiveDomain` 유니언(33-37행)은 ICAR(International Cognitive
Ability Resource)가 정리한 정확히 네 가지 문항 형식만 갖는다 — `letterNumberSeries`(문자·숫자 수열),
`matrixReasoning`(행렬 추론), `verbalReasoning`(언어 추론), `threeDimensionalRotation`(3차원 회전).
`DOMAINS` 배열(39-44행)도 이 순서를 그대로 따르고, `ITEMS_PER_DOMAIN = 4`·`ITEM_COUNT = 16`(46-47행)이
네 도메인에 문항이 고르게 배분되어 있음을 확정한다. 결과 화면(`DomainRadar.tsx`)이 도메인별 정답률을
레이더 차트로 보여주고 전체 정답률을 따로 요약하므로, 도메인 하나당 삽화 하나(4장)에 더해 이 검사
전체를 대표하는 개요(overview) 삽화 1장을 얹어 총 5장이다 — EQ·다크 트라이어드·애착과 같은 셈법이다.

## 왜 다른 4개 기능과 화풍이 조금 다른가 (과학 계층 규칙을 그대로 물려받음)
인지능력 탐색은 정답이 있는 수행 검사라 자기보고 척도(빅파이브·다크 트라이어드·애착·EQ)와도 성격이
다르지만("purpose: ability"로 목적 축에서도 따로 선다, `analysisCatalog.ts`), 증거 계층은 여전히
"과학 계층"(`tier: "scientific"`)이다. `psychometrics-image-prompts.md`가 정한 이 계층의 규칙 —
거의 무채색에 옅은 색조 하나만 그러데이션되고, 신비로운 후광·별자리·점술 상징을 넣지 않으며, 한 장에
우열 없는 두 경향을 동시에 담는다는 규칙 — 을 이 5장도 그대로 따른다.

네 도메인은 빅파이브의 "내향 대 외향"처럼 이름 붙은 두 극을 갖진 않지만, 각각은 여전히 "그 유형의
패턴을 못 읽는 상태"에서 "능숙하게 읽어내는 상태"로 이어지는 스펙트럼이다(정답/오답으로 채점되는
문항들이 결국 이 능숙함의 정도를 재는 것과 같다). 그래서 각 도메인 삽화도 왼쪽 = 서툰 상태,
오른쪽 = 능숙한 상태로 그린다 — 우열이 아니라 숙련도 차이로 읽히게 하기 위해서다. 개요(overview)
삽화만은 네 도메인을 한 사람 안에서 통합한 단일 장면이되, 같은 무채색+옅은 그러데이션 팔레트를 쓴다.

## 스타일 원칙 (모든 프롬프트에 이미 포함되어 있음)
- 손으로 그린 먹빛 수묵화 붓질(EQ·빅파이브 요인 삽화와 같은 브러시워크 계열)이지만, 팔레트와 무드는 절제됨
- 좌우가 자연스럽게 섞이는 한 장면 구성(디프티크가 아니라 한 화면 안의 점진적 변화)
- 거의 무채색 — 먹빛 검정, 따뜻한 회색 중간톤, 아이보리 종이 — 에 아주 옅은 색조 하나만 얹음
- 신비로운 후광·별자리·점술 상징을 넣지 않음
- 도형·수열·회전체가 등장하더라도 어디까지나 **분위기를 위한 장식**이며, 실제 채점 가능한 문항처럼
  정밀하지 않게(격자 칸 수·회전 각도를 검사 규칙처럼 정확히 맞추지 않게) 그린다 — 실제 문항과
  혼동되지 않도록 하기 위해서다
- **이미지 안에 글자·숫자·워터마크는 절대 넣지 않음**

파일명은 `src/engine/cognitive/items.ts`의 `CognitiveDomain` 유니언 값을 그대로 쓰고, 전체 개요는
EQ·다크 트라이어드·애착과 같은 관례를 따라 `overview`로 쓴다.

---

### overview — 인지능력 탐색 개요 (Cognitive Exploration Overview)
파일명: `overview.png`
```
Hand-painted ink-wash diptych-style illustration for a cognitive-ability overview, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. Any geometric shapes shown are loose and atmospheric, never precise enough to resemble an actual scored test item. A single continuous scene showing low and high fluency at pattern-reading as points on one continuum, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, a figure sits before a table scattered with overlapping, unlinked marks and half-formed shapes, stylus hovering, uncertain where to begin. On the right, the same table, the tangle now resolved into a single clean sequence of interlocking marks, the figure's hand tracing the pattern with sure, quick strokes. One continuous table spans both halves, confusion resolving into fluent pattern-reading from left to right.
```

### letterNumberSeries — 문자·숫자 수열 (Letter–Number Series)
파일명: `letterNumberSeries.png`
```
Hand-painted ink-wash diptych-style illustration for a cognitive-ability subscale, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. Any abstract marks shown are loose and atmospheric, never precise enough to resemble an actual scored test item, and never legible as real letters or digits. A single continuous scene showing low and high fluency at the same task as points on one continuum, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, a scatter of loose abstract ink-marks lies adrift on torn scraps of paper, out of order. On the right, the same marks fall into a single unbroken ascending line, evenly spaced, continuing cleanly off the edge of the page. One continuous table spans both halves, disorder resolving into a legible sequence from left to right.
```

### matrixReasoning — 행렬 추론 (Matrix Reasoning)
파일명: `matrixReasoning.png`
```
Hand-painted ink-wash diptych-style illustration for a cognitive-ability subscale, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. The grid shown is loose and painterly, never precise enough to resemble an actual scored test item — no exact 3x3 logic puzzle. A single continuous scene showing low and high fluency at the same task as points on one continuum, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, a faint grid of mismatched ink shapes sits with one open gap, the pattern unreadable, a figure squinting at it in confusion. On the right, the same grid now visibly rhythmic and orderly, the gap cleanly filled by a shape that completes it, the figure's expression settled and certain. One continuous grid spans both halves, an unreadable field resolving into visible order from left to right.
```

### verbalReasoning — 언어 추론 (Verbal Reasoning)
파일명: `verbalReasoning.png`
```
Hand-painted ink-wash diptych-style illustration for a cognitive-ability subscale, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. Any scraps of writing shown are rendered as abstract illegible ink marks, never as real readable words. A single continuous scene showing low and high fluency at the same task as points on one continuum, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, loose scraps of illegible ink-marked paper drift apart across a table, disconnected, with no visible thread between them. On the right, the same scraps arranged into a single unbroken line, each leading naturally into the next like stepping stones across a stream. One continuous table spans both halves, scattered fragments resolving into a followed thread from left to right.
```

### threeDimensionalRotation — 3차원 회전 (Three-Dimensional Rotation)
파일명: `threeDimensionalRotation.png`
```
Hand-painted ink-wash diptych-style illustration for a cognitive-ability subscale, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. The solid forms shown are simple and loosely rendered, never precise enough to resemble an actual scored test item. A single continuous scene showing low and high fluency at the same task as points on one continuum, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, a simple solid block form floats awkwardly beside its rotated twin, the two visibly mismatched, a figure squinting between them uncertain. On the right, the same two forms now visibly aligned mid-turn, one rotating cleanly into the other's exact silhouette, the figure's hand following the turn with confident ease. One continuous workbench spans both halves, mismatch resolving into confirmed alignment from left to right.
```
