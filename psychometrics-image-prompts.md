# LUMINA 성향검사 — 빅파이브 5요인 이미지 생성 프롬프트 (5장)

## 사용법
1. 아래 각 항목의 **프롬프트를 그대로 복사**해서 GPT(이미지 생성)에 붙여넣어 이미지를 생성합니다.
2. 생성된 이미지를 **파일명 그대로** `public/psychometrics/factors/` 폴더에 저장합니다. (폴더는 이미 만들어 두었습니다.)
3. **가로(3:2 비율)** 이미지로 생성해 주세요 — 타로·사주·운세는 세로 카드지만, 이 삽화는 결과 화면의 가로 막대(FactorBar) 위에 얹히는 용도라 가로가 맞습니다.
4. 5장을 전부 저장하시면 알려주세요 — 그 결과물로 결과 화면(FactorBar)의 각 요인 막대 위에 해당 삽화를 표시하도록 이어서 작업하겠습니다.

## 왜 이 5장이고, 왜 다른 4개 기능과 화풍이 조금 다른가
이 검사는 IPIP-50 기반 빅파이브 검사로, MBTI 같은 이산적 "유형" 판정이 코드 어디에도 없습니다 — 요인마다 0~100 연속 점수만 냅니다. 그래서 유형 하나당 삽화가 아니라, **외향성·우호성·성실성·정서 안정성·개방성 다섯 특성 축 자체를 상징하는 삽화** 5장이 이 기능의 실제 데이터 구조와 맞습니다.

더 중요한 점: 이 기능의 결과 컴포넌트(`FactorBar.tsx`)에는 "사주·점성술의 원형·기울기 연출을 쓰지 않는다"는 주석이 이미 명시되어 있고, `meta.ts`도 "낮음/높음이 아니라 무엇에 가까운가로 읽히게 하는 것이 목적"이라고 밝힙니다. 즉 이 기능은 의도적으로 신비주의·점술 느낌을 피하고 있습니다. 그래서 이 5장만은:
- **타로·사주·운세의 진한 보석톤 팔레트를 쓰지 않습니다.** 거의 무채색에, 아주 옅은 색조 하나만 왼쪽→오른쪽으로 그러데이션됩니다.
- **한 장에 우열 없는 두 경향을 동시에** 담습니다(왼쪽=낮은 쪽 경향, 오른쪽=높은 쪽 경향, 가운데서 자연스럽게 섞임) — 결과 막대가 "이것 아니면 저것"이 아니라 "어느 쪽에 더 가까운가"를 보여주는 것과 그대로 대응합니다.
- 신비로운 후광·별자리·점술 상징을 넣지 않습니다.

## 스타일 원칙 (모든 프롬프트에 이미 포함되어 있음)
- 손으로 그린 먹빛 수묵화 붓질(같은 브러시워크 계열)이지만, 팔레트와 무드는 절제됨
- 좌우가 자연스럽게 섞이는 한 장면 구성(디프티크가 아니라 한 화면 안의 점진적 변화)
- **이미지 안에 글자·숫자·워터마크는 절대 넣지 않음**

파일명은 `src/engine/psychometrics/meta.ts`의 `FACTOR_META` 키를 그대로 씁니다.

---

### extraversion — 외향성 (Extraversion)
파일명: `extraversion.png`
```
Hand-painted ink-wash diptych-style illustration for a personality-trait spectrum, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. A single continuous scene showing two tendencies as equally valid, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, a lone figure sits quietly by a window at dusk, absorbed in private thought beside a single candle. On the right, the same soft light spills from an open doorway where several silhouetted figures gather and talk animatedly around a low table. The two halves share one continuous room and blend at a shared threshold in the center.
```

### agreeableness — 우호성 (Agreeableness)
파일명: `agreeableness.png`
```
Hand-painted ink-wash diptych-style illustration for a personality-trait spectrum, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. A single continuous scene showing two tendencies as equally valid, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, a figure stands firm with arms crossed on a rocky point, gaze direct and unflinching. On the right, a figure kneels to offer a bowl of water to another, head slightly bowed in a gentle gesture. Both figures share one continuous riverbank that blends into a single shoreline.
```

### conscientiousness — 성실성 (Conscientiousness)
파일명: `conscientiousness.png`
```
Hand-painted ink-wash diptych-style illustration for a personality-trait spectrum, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. A single continuous scene showing two tendencies as equally valid, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, loose ink-wash brush splashes and a scatter of wind-blown papers drift freely across a desk, spontaneous and unplanned. On the right, the same papers resolve into a neatly stacked, precisely ruled ledger beside a taut plumb line and square-rule. One continuous desk surface connects both halves.
```

### emotionalStability — 정서 안정성 (Emotional Stability)
파일명: `emotionalStability.png`
```
Hand-painted ink-wash diptych-style illustration for a personality-trait spectrum, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. A single continuous scene showing two tendencies as equally valid, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, tall reeds bend sharply in a gusting storm over rippling, agitated water. On the right, the same reeds stand calm under clearing skies above a still, mirror-flat pond. One continuous pond spans both halves, the storm dissolving into calm from left to right.
```

### intellect — 개방성 (Openness)
파일명: `intellect.png`
```
Hand-painted ink-wash diptych-style illustration for a personality-trait spectrum, landscape orientation (aspect ratio 3:2). Aged parchment paper background with visible fiber texture, continuous across the whole frame — not split by a hard line. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of color: a cool pale grey-blue tint on the left side of the composition blending gradually into a warm pale ochre tint on the right side, meeting seamlessly at the center. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no fortune-telling or astrological imagery, no glowing auras, no zodiac or mystic symbols. A single continuous scene showing two tendencies as equally valid, neither side framed as better than the other. Thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: On the left, a single well-worn tea bowl sits rendered in careful, precise detail on a bare table. On the right, the same bowl dissolves into abstract swirling ink clouds where half-imagined new forms emerge — a bird, a distant mountain, a wave. One continuous table surface spans both halves, reality blurring gradually into imagination toward the right.
```
