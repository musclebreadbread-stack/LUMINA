# LUMINA 사주 — 십이지(十二支) 이미지 생성 프롬프트 (12장)

## 사용법
1. 아래 각 항목의 **프롬프트를 그대로 복사**해서 GPT(이미지 생성)에 붙여넣어 이미지를 생성합니다.
2. 생성된 이미지를 **파일명 그대로** `public/saju/zodiac/` 폴더에 저장합니다. (폴더는 이미 만들어 두었습니다.)
3. 세로(2:3 비율) 이미지로 생성해 주세요. 배경/프레임까지 포함해서 한 장 전체가 보이도록 요청하면 됩니다.
4. 12장을 전부 저장하시면 알려주세요 — 그 결과물로 사주 원국표(PillarGrid)의 각 기둥 옆에 해당 띠 삽화를 표시하도록 이어서 작업하겠습니다.

## 왜 십이지인가
사주 엔진이 다루는 개념 중 실제로 사용자 화면(원국표)에 **개별 라벨로 노출**되는 것은 십이지(十二支) 열두 띠뿐입니다 — 오행은 5개뿐이라 다른 모든 항목을 색칠하는 팔레트 기준 그 자체이고, 십신은 화면에 10개가 아니라 5개 그룹으로만 뭉쳐서 보입니다. 십이지 12장은 타로 수트 하나 분량과 비슷한 규모이고, 12지신은 동아시아 수묵화 전통에서 이미 독자적 소재(십이지신도)라 화풍 확장에도 가장 자연스럽습니다.

## 스타일 원칙 (모든 프롬프트에 이미 포함되어 있음)
- 손으로 그린 먹빛 수묵화(ink-wash) 느낌 — 타로 카드(`tarot-image-prompts.md`)와 같은 화풍 계열
- **색은 이 앱이 이미 쓰고 있는 오행 5색(蘊 실제 hex 기반)을 그대로 재사용** — 새로 지어낸 색이 아닙니다:
  - 목(木, `#5ba383` 뇌록) → 담담한 비취/이끼빛 초록
  - 화(火, `#d95b41` 장단) → 그을린 주홍빛 붉은색
  - 토(土, `#dfa83e` 황토) → 따뜻한 황토빛 금색
  - 금(金, `#b9bfc4` 백동) → 은은한 은백색
  - 수(水, `#5580d4` 감청) → 짙은 감청 남색
- 오래된 한지 질감 배경, 은은한 목판화 테두리
- 귀엽거나 만화적이지 않고, 신령스럽고 위엄 있는 "수호 동물" 느낌
- **이미지 안에 글자·숫자·워터마크는 절대 넣지 않음** (앱에서 텍스트를 따로 얹습니다)

파일명은 `src/engine/saju/constants.ts`의 `BRANCHES[].index` (0~11)를 그대로 씁니다.

---

### 00 — 자(子) 쥐띠 (Rat) · 수(水)
파일명: `00.png`
```
Hand-painted ink-wash illustration in the tradition of Korean/East Asian zodiac guardian animal paintings (십이지신도), portrait orientation (aspect ratio 2:3). Aged mulberry-paper (hanji) background with visible fiber texture. Muted antique jewel-tone palette dominated by deep cornflower indigo blue with hints of ink-black and pale silver, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Dignified, mythic, contemplative mood — a guardian spirit rather than a cute mascot. Centered single composition of the animal alone in its landscape, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A rat perched alert on a moonlit granary rooftop, whiskers catching silver light, a single grain of rice held in its paws, a full moon behind it, dark still water reflecting the moonlight far below.
```

### 01 — 축(丑) 소띠 (Ox) · 토(土)
파일명: `01.png`
```
Hand-painted ink-wash illustration in the tradition of Korean/East Asian zodiac guardian animal paintings (십이지신도), portrait orientation (aspect ratio 2:3). Aged mulberry-paper (hanji) background with visible fiber texture. Muted antique jewel-tone palette dominated by warm ochre amber gold with hints of umber and aged parchment cream, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Dignified, mythic, contemplative mood — a guardian spirit rather than a cute mascot. Centered single composition of the animal alone in its landscape, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A powerful ox standing patient in a misty rice paddy at dawn, a plough yoke resting across its shoulders, steady breath visible in the cold air, terraced fields receding into fog.
```

### 02 — 인(寅) 호랑이띠 (Tiger) · 목(木)
파일명: `02.png`
```
Hand-painted ink-wash illustration in the tradition of Korean/East Asian zodiac guardian animal paintings (십이지신도), portrait orientation (aspect ratio 2:3). Aged mulberry-paper (hanji) background with visible fiber texture. Muted antique jewel-tone palette dominated by soft celadon jade green with hints of moss and aged ivory, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Dignified, mythic, contemplative mood — a guardian spirit rather than a cute mascot. Centered single composition of the animal alone in its landscape, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A tiger prowling through a bamboo forest, muscles coiled beneath striped fur, one paw raised mid-step, shafts of morning light cutting through tall bamboo stalks.
```

### 03 — 묘(卯) 토끼띠 (Rabbit) · 목(木)
파일명: `03.png`
```
Hand-painted ink-wash illustration in the tradition of Korean/East Asian zodiac guardian animal paintings (십이지신도), portrait orientation (aspect ratio 2:3). Aged mulberry-paper (hanji) background with visible fiber texture. Muted antique jewel-tone palette dominated by soft celadon jade green with hints of moss and aged ivory, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Dignified, mythic, contemplative mood — a guardian spirit rather than a cute mascot. Centered single composition of the animal alone in its landscape, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A rabbit sitting upright beneath a blossoming plum tree, ears alert, petals drifting down around it, a hazy crescent moon fading into a pale dawn sky.
```

### 04 — 진(辰) 용띠 (Dragon) · 토(土)
파일명: `04.png`
```
Hand-painted ink-wash illustration in the tradition of Korean/East Asian zodiac guardian animal paintings (십이지신도), portrait orientation (aspect ratio 2:3). Aged mulberry-paper (hanji) background with visible fiber texture. Muted antique jewel-tone palette dominated by warm ochre amber gold with hints of umber and aged parchment cream, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Dignified, mythic, contemplative mood — a guardian spirit rather than a cute mascot. Centered single composition of the animal alone in its landscape, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A long sinuous dragon coiling through storm clouds above a mountain peak, claws gripping a small glowing pearl, rain streaming from its mane, lightning flickering in the distance.
```

### 05 — 사(巳) 뱀띠 (Snake) · 화(火)
파일명: `05.png`
```
Hand-painted ink-wash illustration in the tradition of Korean/East Asian zodiac guardian animal paintings (십이지신도), portrait orientation (aspect ratio 2:3). Aged mulberry-paper (hanji) background with visible fiber texture. Muted antique jewel-tone palette dominated by burnt vermilion orange-red with hints of ember gold, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Dignified, mythic, contemplative mood — a guardian spirit rather than a cute mascot. Centered single composition of the animal alone in its landscape, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A snake coiled elegantly around a gnarled pine branch, scales catching warm ember-colored light, tongue flicking toward a low setting sun.
```

### 06 — 오(午) 말띠 (Horse) · 화(火)
파일명: `06.png`
```
Hand-painted ink-wash illustration in the tradition of Korean/East Asian zodiac guardian animal paintings (십이지신도), portrait orientation (aspect ratio 2:3). Aged mulberry-paper (hanji) background with visible fiber texture. Muted antique jewel-tone palette dominated by burnt vermilion orange-red with hints of ember gold, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Dignified, mythic, contemplative mood — a guardian spirit rather than a cute mascot. Centered single composition of the animal alone in its landscape, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A horse galloping across an open plain at full stride, mane and tail streaming like flame, dust rising behind its hooves, a wide sky glowing at high noon.
```

### 07 — 미(未) 양띠 (Goat) · 토(土)
파일명: `07.png`
```
Hand-painted ink-wash illustration in the tradition of Korean/East Asian zodiac guardian animal paintings (십이지신도), portrait orientation (aspect ratio 2:3). Aged mulberry-paper (hanji) background with visible fiber texture. Muted antique jewel-tone palette dominated by warm ochre amber gold with hints of umber and aged parchment cream, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Dignified, mythic, contemplative mood — a guardian spirit rather than a cute mascot. Centered single composition of the animal alone in its landscape, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A goat standing on a rocky outcrop overlooking a mountain valley, curved horns catching the light, tufts of wild grass around its hooves, drifting clouds below the peak.
```

### 08 — 신(申) 원숭이띠 (Monkey) · 금(金)
파일명: `08.png`
```
Hand-painted ink-wash illustration in the tradition of Korean/East Asian zodiac guardian animal paintings (십이지신도), portrait orientation (aspect ratio 2:3). Aged mulberry-paper (hanji) background with visible fiber texture. Muted antique jewel-tone palette dominated by pale silvery grey-white with hints of brushed bronze, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Dignified, mythic, contemplative mood — a guardian spirit rather than a cute mascot. Centered single composition of the animal alone in its landscape, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A monkey perched on a gnarled pine bough, one hand reaching toward a distant moon reflected in a still pool below, playful yet watchful, mist threading through the branches.
```

### 09 — 유(酉) 닭띠 (Rooster) · 금(金)
파일명: `09.png`
```
Hand-painted ink-wash illustration in the tradition of Korean/East Asian zodiac guardian animal paintings (십이지신도), portrait orientation (aspect ratio 2:3). Aged mulberry-paper (hanji) background with visible fiber texture. Muted antique jewel-tone palette dominated by pale silvery grey-white with hints of brushed bronze, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Dignified, mythic, contemplative mood — a guardian spirit rather than a cute mascot. Centered single composition of the animal alone in its landscape, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A rooster standing tall atop a low garden wall at first light, wings half spread, crowing toward a rising sun breaking through morning mist.
```

### 10 — 술(戌) 개띠 (Dog) · 토(土)
파일명: `10.png`
```
Hand-painted ink-wash illustration in the tradition of Korean/East Asian zodiac guardian animal paintings (십이지신도), portrait orientation (aspect ratio 2:3). Aged mulberry-paper (hanji) background with visible fiber texture. Muted antique jewel-tone palette dominated by warm ochre amber gold with hints of umber and aged parchment cream, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Dignified, mythic, contemplative mood — a guardian spirit rather than a cute mascot. Centered single composition of the animal alone in its landscape, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A dog sitting loyally at a gate at dusk, ears pricked toward the path home, a lantern glowing faintly beside it, autumn leaves scattered at its paws.
```

### 11 — 해(亥) 돼지띠 (Pig) · 수(水)
파일명: `11.png`
```
Hand-painted ink-wash illustration in the tradition of Korean/East Asian zodiac guardian animal paintings (십이지신도), portrait orientation (aspect ratio 2:3). Aged mulberry-paper (hanji) background with visible fiber texture. Muted antique jewel-tone palette dominated by deep cornflower indigo blue with hints of ink-black and pale silver, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Dignified, mythic, contemplative mood — a guardian spirit rather than a cute mascot. Centered single composition of the animal alone in its landscape, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A pig resting contentedly beneath an old persimmon tree, ripe fruit fallen around it, a deep blue night settling in, the first stars beginning to appear.
```
