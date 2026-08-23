# LUMINA 수비학 — 숫자 이미지 생성 프롬프트 (12장: 1~9 + 마스터 넘버 11·22·33)

## 사용법
1. 아래 각 항목의 **프롬프트를 그대로 복사**해서 GPT(이미지 생성)에 붙여넣어 이미지를 생성합니다.
2. 생성된 이미지를 **파일명 그대로** `public/numerology/numbers/` 폴더에 저장합니다. (폴더는 이미 만들어 두었습니다.)
3. 세로(2:3 비율) 이미지로 생성해 주세요.
4. 12장을 전부 저장하시면 알려주세요 — 그 결과물로 생애수·운명수 결과 카드(NumberPlate)에 해당 숫자 삽화를 표시하도록 이어서 작업하겠습니다.

## 왜 이 12개인가
`reduce.ts`의 축약 로직은 값이 11·22·33이 되는 즉시 멈추고, 그 외의 두 자리 수는 한 자리가 될 때까지 계속 줄어듭니다. 즉 이 앱이 실제로 낼 수 있는 결과값은 정확히 **1~9, 11, 22, 33** 12종뿐입니다. 생애수(Life Path)와 운명수(Destiny)는 계산 방식만 다를 뿐 같은 조회 함수(`meaningOf`)로 같은 의미 카탈로그를 참조하므로, 숫자값 하나당 삽화 하나인 이 12장짜리 공용 덱 하나로 두 결과 화면을 모두 커버합니다.

## 스타일 원칙 (모든 프롬프트에 이미 포함되어 있음)
- 손으로 그린 먹빛 수묵화(ink-wash) 느낌 — 타로 카드와 같은 화풍 계열
- **타로 메이저 아르카나와 같은 중립 팔레트**(짙은 남색·그을린 적갈색·고풍스러운 금빛 황토·녹청색·아이보리)를 그대로 재사용 — 숫자는 오행이나 별자리 원소처럼 한 원소에 속하지 않는 "보편/구조적" 상징이라, 타로에서도 같은 성격의 메이저 아르카나가 썼던 팔레트를 그대로 물려받았습니다.
- **숫자를 글자·숫자 기호로 그리지 않습니다.** 대신 그 숫자만큼 반복되는 소재(학 한 마리, 제비 다섯 마리 등)로 수량을 은유합니다 — 옛 동아시아 그림이 열 가지 장생물(십장생)로 개념을 세듯, 개수 자체가 뜻을 나릅니다.
- **마스터 넘버(11·22·33) 세 장만 이중 테두리**(안쪽 선 + 바깥쪽 선, 사이 여백 넓게)로 그려서, 화면(NumberPlate)이 마스터 넘버를 점선 테두리+배지로 따로 구분해 보여주는 것과 시각적으로 짝을 맞춥니다. 나머지 9장은 단일 테두리입니다.
- 오래된 한지 질감 배경, 은은한 목판화 테두리
- **이미지 안에 글자·숫자·워터마크는 절대 넣지 않음** (앱에서 텍스트를 따로 얹습니다)

파일명은 숫자값 그대로 두 자리로 씁니다(01~09, 11, 22, 33).

---

### 01 — 하나 (One) · 리더십·독립
파일명: `01.png`
```
Hand-painted ink-wash illustration for a numerology reading card, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture. Muted antique jewel-tone palette: deep indigo blue, burnt terracotta red, aged gold ochre, verdigris green, warm ivory — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Quiet, contemplative mood conveyed only through the number of repeated elements in the scene — never render any numeral or digit anywhere in the image. Centered single composition, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A single solitary crane standing atop a wind-swept pine bluff overlooking a vast empty sea, wings half-raised, alone but unshaken, dawn light breaking on the horizon.
```

### 02 — 둘 (Two) · 협력·조화
파일명: `02.png`
```
Hand-painted ink-wash illustration for a numerology reading card, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture. Muted antique jewel-tone palette: deep indigo blue, burnt terracotta red, aged gold ochre, verdigris green, warm ivory — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Quiet, contemplative mood conveyed only through the number of repeated elements in the scene — never render any numeral or digit anywhere in the image. Centered single composition, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: Two cranes facing each other on a still lake at dusk, necks curved in a mirrored bow, their reflections meeting perfectly on the calm water.
```

### 03 — 셋 (Three) · 표현·창의
파일명: `03.png`
```
Hand-painted ink-wash illustration for a numerology reading card, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture. Muted antique jewel-tone palette: deep indigo blue, burnt terracotta red, aged gold ochre, verdigris green, warm ivory — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Quiet, contemplative mood conveyed only through the number of repeated elements in the scene — never render any numeral or digit anywhere in the image. Centered single composition, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: Three magpies bursting up from a blossoming branch in different directions, wings spread wide, petals scattering through the air, an open lively gesture.
```

### 04 — 넷 (Four) · 체계·근면
파일명: `04.png`
```
Hand-painted ink-wash illustration for a numerology reading card, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture. Muted antique jewel-tone palette: deep indigo blue, burnt terracotta red, aged gold ochre, verdigris green, warm ivory — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Quiet, contemplative mood conveyed only through the number of repeated elements in the scene — never render any numeral or digit anywhere in the image. Centered single composition, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: Four weathered stone pillars standing in a perfect square, moss-grown but unmoved, supporting a simple wooden roof beam, disciplined geometry against a plain sky.
```

### 05 — 다섯 (Five) · 자유·변화
파일명: `05.png`
```
Hand-painted ink-wash illustration for a numerology reading card, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture. Muted antique jewel-tone palette: deep indigo blue, burnt terracotta red, aged gold ochre, verdigris green, warm ivory — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Quiet, contemplative mood conveyed only through the number of repeated elements in the scene — never render any numeral or digit anywhere in the image. Centered single composition, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: Five swallows scattering in different directions across an open sky, wind-blown clouds streaking past, a sense of restless motion and open roads below.
```

### 06 — 여섯 (Six) · 책임·돌봄
파일명: `06.png`
```
Hand-painted ink-wash illustration for a numerology reading card, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture. Muted antique jewel-tone palette: deep indigo blue, burnt terracotta red, aged gold ochre, verdigris green, warm ivory — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Quiet, contemplative mood conveyed only through the number of repeated elements in the scene — never render any numeral or digit anywhere in the image. Centered single composition, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: Six paper lanterns hung along the eaves of a warm household courtyard at dusk, a hand gently adjusting one lantern's wick, soft domestic light spilling onto the stone path.
```

### 07 — 일곱 (Seven) · 탐구·성찰
파일명: `07.png`
```
Hand-painted ink-wash illustration for a numerology reading card, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture. Muted antique jewel-tone palette: deep indigo blue, burnt terracotta red, aged gold ochre, verdigris green, warm ivory — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Quiet, contemplative mood conveyed only through the number of repeated elements in the scene — never render any numeral or digit anywhere in the image. Centered single composition, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: Seven faint stars of the Big Dipper glimmering above a lone scholar seated beside an inkstone at an open window, gazing upward in quiet thought.
```

### 08 — 여덟 (Eight) · 성취·실행력
파일명: `08.png`
```
Hand-painted ink-wash illustration for a numerology reading card, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture. Muted antique jewel-tone palette: deep indigo blue, burnt terracotta red, aged gold ochre, verdigris green, warm ivory — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Quiet, contemplative mood conveyed only through the number of repeated elements in the scene — never render any numeral or digit anywhere in the image. Centered single composition, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: Eight bundled rice sheaves stacked in a neat harvest row under a heavy golden evening sky, a sickle resting across the topmost sheaf, the visible result of sustained effort.
```

### 09 — 아홉 (Nine) · 이상·포용
파일명: `09.png`
```
Hand-painted ink-wash illustration for a numerology reading card, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture. Muted antique jewel-tone palette: deep indigo blue, burnt terracotta red, aged gold ochre, verdigris green, warm ivory — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Quiet, contemplative mood conveyed only through the number of repeated elements in the scene — never render any numeral or digit anywhere in the image. Centered single composition, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: Nine cranes circling together in a wide gyre above misty mountain peaks, wingtips nearly touching, one great encompassing shape formed from many.
```

### 11 — 마스터 11 (Master Eleven) · 통찰·영감 — 마스터 넘버
파일명: `11.png`
```
Hand-painted ink-wash illustration for a numerology reading card, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture. Muted antique jewel-tone palette: deep indigo blue, burnt terracotta red, aged gold ochre, verdigris green, warm ivory — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Quiet, contemplative mood conveyed only through the number of repeated elements in the scene — never render any numeral or digit anywhere in the image. Centered single composition, a double hand-drawn border frame — an inner line and an outer line with a wider ceremonial margin between them, like an antique woodblock print given extra framing. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A single figure standing at the top of a high stone stairway at night, both hands raised toward two moons hanging side by side in a starlit sky — a rare, quiet double radiance.
```

### 22 — 마스터 22 (Master Twenty-Two) · 실현력·설계 — 마스터 넘버
파일명: `22.png`
```
Hand-painted ink-wash illustration for a numerology reading card, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture. Muted antique jewel-tone palette: deep indigo blue, burnt terracotta red, aged gold ochre, verdigris green, warm ivory — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Quiet, contemplative mood conveyed only through the number of repeated elements in the scene — never render any numeral or digit anywhere in the image. Centered single composition, a double hand-drawn border frame — an inner line and an outer line with a wider ceremonial margin between them, like an antique woodblock print given extra framing. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A master builder's steady hands guiding a taut plumb line down from a half-finished stone tower toward its foundation, the tower's upper half rendered as fine architectural ink-lines dissolving into the real stone below — vision meeting construction.
```

### 33 — 마스터 33 (Master Thirty-Three) · 헌신·가르침 — 마스터 넘버
파일명: `33.png`
```
Hand-painted ink-wash illustration for a numerology reading card, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture. Muted antique jewel-tone palette: deep indigo blue, burnt terracotta red, aged gold ochre, verdigris green, warm ivory — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Quiet, contemplative mood conveyed only through the number of repeated elements in the scene — never render any numeral or digit anywhere in the image. Centered single composition, a double hand-drawn border frame — an inner line and an outer line with a wider ceremonial margin between them, like an antique woodblock print given extra framing. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A serene teacher-like figure seated beneath a great banyan tree, its wide branches sheltering many small birds nesting together, boundless unhurried warmth.
```
