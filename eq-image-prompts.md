# LUMINA EQ(정서지능) — SSEIT 4요인 이미지 생성 프롬프트 (5장)

> 이 문서는 프롬프트 작성까지가 개발 산출물입니다. 이미지 자체는 이 세션 안에서 생성하지 않습니다 —
> 아래 프롬프트를 외부 이미지 생성 도구에 직접 입력해 사람이 생성하고, 완료되면 알려주시면 코드가
> 그 파일을 가리키도록 이어서 작업합니다.

## 사용법
1. 아래 각 항목의 **프롬프트를 그대로 복사**해서 이미지 생성 도구에 붙여넣어 이미지를 생성합니다.
2. 생성된 이미지를 **파일명 그대로** `public/psychometrics/eq/` 폴더에 저장합니다. (폴더는 이미 만들어 두었습니다.)
3. **가로(3:2 비율)** 이미지로 생성해 주세요 — 이 삽화는 랜딩 히어로(4:3)·결과 요인 막대(16:9)·결과 커버(3:2) 등
   여러 가로형 프레임에 얹히므로, 빅파이브 요인 삽화(`psychometrics-image-prompts.md`)와 같은 3:2 기준으로 맞춥니다.
4. 5장을 전부 저장하시면 알려주세요 — 그 결과물로 `src/lib/psychometricsAssets.ts`의 `EQ_OVERVIEW_IMAGE`·
   `eqImagePath()`가 지금 빌려 쓰고 있는 빅파이브 자리표시자 대신 이 5장을 가리키도록 이어서 작업하겠습니다.

## 왜 이 5장인가
`src/engine/eq/items.ts`가 채택한 요인 구조는 Ciarrochi, Chan & Bajgar(2001)의 SSEIT 4요인 해다.
`EqFactor` 유니언(items.ts:25-29)은 정확히 네 값만 갖는다 — `perceptionOfEmotion`(정서 지각),
`managingOwnEmotions`(자기 정서 관리), `managingOthersEmotions`(타인 정서 관리),
`utilisationOfEmotion`(정서 활용). `FACTORS` 배열(items.ts:94-99)도 이 순서를 그대로 따른다.

다만 파일 머리말(items.ts:9-12)이 명시하듯 "원저자들은 단일 총점을 전제로 척도를 개발했다. 따라서
**총점이 1차 지표**이고 4개 하위요인은 보조 지표다." 이 총점 개념이 화면에도 그대로 나타난다 —
결과 화면(`TotalScoreCard.tsx`)이 4요인 막대와 별개로 전체 총점 카드를 따로 그린다. 그래서 이 덱은
요인 하나당 삽화 하나(4장)에 더해, 총점 개념을 대표하는 개요(overview) 삽화 1장을 얹어 총 5장이다 —
다크 트라이어드·애착이 각자 `overview.png` + 요인/사분면별 삽화로 구성된 것과 정확히 같은 셈법이다
(`src/lib/psychometricsAssets.ts`의 `DARK_TRIAD_OVERVIEW_IMAGE`, `ATTACHMENT_OVERVIEW_IMAGE`를 보면 같은 패턴이 이미 있다).

## 왜 다른 4개 기능과 화풍이 조금 다른가 (과학 계층 규칙을 그대로 물려받음)
EQ는 자기보고 척도라는 점에서 빅파이브·다크 트라이어드·애착과 같은 "과학 계층"(`tier: "scientific"`,
`analysisCatalog.ts`)에 속한다. `psychometrics-image-prompts.md`가 이미 이 계층의 규칙을 정해 두었다 —
"낮음/높음이 아니라 무엇에 가까운가로 읽히게 하는 것이 목적"이며, 그래서 타로·사주·운세의 진한 보석톤
대신 **거의 무채색에 옅은 색조 하나만 왼쪽→오른쪽으로 그러데이션**되고, **한 장에 우열 없는 두 경향을
동시에** 담으며, 신비로운 후광·별자리·점술 상징을 넣지 않는다는 규칙이다.

EQ의 4요인은 빅파이브처럼 "내향 대 외향" 같은 대칭적인 두 이름을 갖진 않지만, 척도 자체는 여전히
낮은 능력에서 높은 능력으로 이어지는 하나의 스펙트럼이다(문항이 정서를 못 읽는 사람과 잘 읽는 사람을
같은 5점 척도 위에 둔다). 그래서 이 5장도 **똑같은 규칙을 그대로 적용한다** — 왼쪽 = 그 능력이
서툰 상태, 오른쪽 = 능숙한 상태, 가운데서 자연스럽게 섞이는 한 장면. 우열이 아니라 능숙함의 정도
차이로 그린다(빅파이브처럼 "이것이 저것보다 낫다"는 판정이 아니다). 개요(overview) 삽화만은 네
요인을 한 사람 안에서 통합해 보여주는 단일 장면이되, 같은 무채색+옅은 그러데이션 팔레트를 쓴다.

## 스타일 원칙 (모든 프롬프트에 이미 포함되어 있음)
- 손으로 그린 먹빛 수묵화 붓질(빅파이브 요인 삽화와 같은 브러시워크 계열)이지만, 팔레트와 무드는 절제됨
- 좌우가 자연스럽게 섞이는 한 장면 구성(디프티크가 아니라 한 화면 안의 점진적 변화)
- 거의 무채색 — 먹빛 검정, 따뜻한 회색 중간톤, 아이보리 종이 — 에 아주 옅은 색조 하나만 얹음
- 신비로운 후광·별자리·점술 상징을 넣지 않음(빅파이브 규칙과 동일)
- **이미지 안에 글자·숫자·워터마크는 절대 넣지 않음**

파일명은 `src/engine/eq/items.ts`의 `EqFactor` 유니언 값을 그대로 쓰고, 총점 개요는 다크
트라이어드·애착과 같은 관례를 따라 `overview`로 쓴다.

---

### overview — 정서지능 총점 (Total EQ)
파일명: `overview.png`
```
Hand-painted ink-wash diptych-style illustration for an emotional-intelligence overview, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. A single continuous scene showing low and high emotional attunement as points on the same continuum, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, a figure stands apart at the edge of a crowded market square, expression closed, the surrounding gestures and voices rendered as a blur of indistinct ink marks. On the right, the same market square, the figure now moving fluidly among others — catching a passing glance, offering a steady word, adjusting their own posture in response — every figure's mood legible and answered. One continuous market square spans both halves, blurred confusion resolving into fluent connection from left to right.
```

### perceptionOfEmotion — 정서 지각 (Perception of Emotion)
파일명: `perceptionOfEmotion.png`
```
Hand-painted ink-wash diptych-style illustration for an emotional-intelligence subscale spectrum, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. A single continuous scene showing low and high skill at the same task as points on one continuum, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, a figure looks directly at another's face, but the features stay soft and indistinct, as if seen through fogged glass. On the right, the same face resolves into sharp, legible detail — the faint crease at the eye, the set of the mouth — read at a glance. One continuous pair of faces spans both halves, fog clearing into clarity from left to right.
```

### managingOwnEmotions — 자기 정서 관리 (Managing Own Emotions)
파일명: `managingOwnEmotions.png`
```
Hand-painted ink-wash diptych-style illustration for an emotional-intelligence subscale spectrum, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. A single continuous scene showing low and high skill at the same task as points on one continuum, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, a figure is caught in a sudden squall on a narrow wooden bridge, robes whipping, off balance. On the right, the same figure stands steady on the same bridge under a calmed sky, one hand resting lightly on the rail, weather passing without unseating them. One continuous bridge spans both halves, the storm dissolving into steady composure from left to right.
```

### managingOthersEmotions — 타인 정서 관리 (Managing Others' Emotions)
파일명: `managingOthersEmotions.png`
```
Hand-painted ink-wash diptych-style illustration for an emotional-intelligence subscale spectrum, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. A single continuous scene showing low and high skill at the same task as points on one continuum, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, a figure stands beside someone slumped in quiet distress, hands awkward and unsure where to rest. On the right, the same pair — the standing figure now offering a steady shoulder and a calm word, the seated figure's posture visibly easing. One continuous room spans both halves, awkwardness resolving into skilled comfort from left to right.
```

### utilisationOfEmotion — 정서 활용 (Utilisation of Emotion)
파일명: `utilisationOfEmotion.png`
```
Hand-painted ink-wash diptych-style illustration for an emotional-intelligence subscale spectrum, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. A single continuous scene showing low and high skill at the same task as points on one continuum, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, a figure sits motionless at a desk scattered with blank pages, head in hands, a single storm-cloud motif hovering above. On the right, the same desk, the cloud now dissolving into a loose flock of ideas — sketched birds, half-formed diagrams — the figure's hand moving freely across a page. One continuous desk spans both halves, a stuck mood resolving into generative motion from left to right.
```
