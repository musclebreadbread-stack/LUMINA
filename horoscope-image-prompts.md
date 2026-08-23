# LUMINA 운세 — 서양 별자리 12궁 이미지 생성 프롬프트 (12장)

## 사용법
1. 아래 각 항목의 **프롬프트를 그대로 복사**해서 GPT(이미지 생성)에 붙여넣어 이미지를 생성합니다.
2. 생성된 이미지를 **파일명 그대로** `public/horoscope/zodiac/` 폴더에 저장합니다. (폴더는 이미 만들어 두었습니다.)
3. 세로(2:3 비율) 이미지로 생성해 주세요.
4. 12장을 전부 저장하시면 알려주세요 — 그 결과물로 별자리 선택 화면(SignPicker)과 오늘의 운세 결과 화면에 해당 삽화를 표시하도록 이어서 작업하겠습니다.

## 왜 서양 별자리인가 (띠가 아니라)
운세 기능은 별자리 탭과 띠 탭 둘 다 12개 고정 선택지를 갖고 있어 둘 다 후보였지만, 별자리 쪽만 실제 계산 엔진(`astro/constants.ts`)과 연결되어 있고(띠는 어디에도 연결되지 않은 독립 배열), UI 기본 탭도 별자리입니다. 무엇보다 **띠(십이지)는 이미 사주 이미지 세트로 따로 만들고 있으므로**, 운세 쪽에서 같은 십이지를 또 만들면 두 기능의 삽화가 겹치거나 어긋날 위험이 있습니다. 그래서 운세는 서양 별자리 12궁으로 갑니다.

## 왜 타로 수트 팔레트를 그대로 재사용하는가
서양 점성술의 4원소(불·흙·공기·물)는 이미 이 앱의 타로 마이너 아르카나 4수트와 정확히 같은 개념입니다(완드=불, 펜타클=흙, 소드=공기, 컵=물 — 코드 주석에도 명시되어 있습니다). 그래서 이번 별자리 12장은 **타로에서 이미 쓴 수트별 팔레트 문구를 그대로 재사용**합니다 — 새 팔레트를 지어내지 않고, 나란히 놓았을 때 타로와 운세가 "같은 원소 가족"처럼 자연스럽게 이어지도록 하기 위해서입니다.

## 스타일 원칙 (모든 프롬프트에 이미 포함되어 있음)
- 손으로 그린 먹빛 수묵화 느낌 — 타로 카드와 같은 화풍 계열
- 배경에 아주 옅은 별점과 가느다란 별자리 선을 은은하게 새겨 넣습니다 — 이 12장만의 시그니처 요소로, 타로와는 구분되면서도 같은 붓질 가족임을 보여줍니다
- 원소별 팔레트는 타로 수트를 그대로 재사용: 불(양자리·사자자리·궁수자리)=완드 팔레트, 흙(황소자리·처녀자리·염소자리)=펜타클 팔레트, 공기(쌍둥이자리·천칭자리·물병자리)=소드 팔레트, 물(게자리·전갈자리·물고기자리)=컵 팔레트
- 사람이 아니라 별자리를 상징하는 짐승·상징물 자체를 신령스럽게 그립니다(귀엽지 않게, 위엄 있게)
- **이미지 안에 글자·숫자·워터마크는 절대 넣지 않음** (앱에서 텍스트를 따로 얹습니다)

파일명은 `src/engine/astro/constants.ts`의 `SIGNS[].index` (0~11)를 그대로 씁니다.

---

### 00 — 양자리 (Aries) · 불
파일명: `00.png`
```
Hand-painted ink-wash illustration of a zodiac constellation guardian, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture, a faint scatter of tiny star-points and thin constellation-lines woven subtly into the negative space behind the subject. Muted antique jewel-tone palette, warm firelit oranges and reds for this element, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Mythic, celestial, contemplative mood — East Asian ink painting technique applied to Western zodiac iconography. Centered single composition of the zodiac creature alone, dignified rather than cartoonish, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A powerful ram standing on a wind-scoured ridge at the break of spring, head lowered and horns catching the first light, faint constellation-lines connecting star-points across the dark sky behind it.
```

### 01 — 황소자리 (Taurus) · 흙
파일명: `01.png`
```
Hand-painted ink-wash illustration of a zodiac constellation guardian, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture, a faint scatter of tiny star-points and thin constellation-lines woven subtly into the negative space behind the subject. Muted antique jewel-tone palette, earthy greens and aged gold for this element, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Mythic, celestial, contemplative mood — East Asian ink painting technique applied to Western zodiac iconography. Centered single composition of the zodiac creature alone, dignified rather than cartoonish, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A great bull standing planted in a flowering meadow, breath visible in the cool morning air, faint star-lines tracing along its horns against a pale dawn sky.
```

### 02 — 쌍둥이자리 (Gemini) · 공기
파일명: `02.png`
```
Hand-painted ink-wash illustration of a zodiac constellation guardian, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture, a faint scatter of tiny star-points and thin constellation-lines woven subtly into the negative space behind the subject. Muted antique jewel-tone palette, cool pale greys and blues for this element, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with sharp highlights and deep ink-black shadows. Mythic, celestial, contemplative mood — East Asian ink painting technique applied to Western zodiac iconography. Centered single composition of the zodiac emblem, dignified rather than cartoonish, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: Two mirrored robed figures standing back to back atop a windswept hill, hands almost touching, faint twin constellation-lines linking two bright stars above their joined shoulders.
```

### 03 — 게자리 (Cancer) · 물
파일명: `03.png`
```
Hand-painted ink-wash illustration of a zodiac constellation guardian, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture, a faint scatter of tiny star-points and thin constellation-lines woven subtly into the negative space behind the subject. Muted antique jewel-tone palette, soft blues and gentle gold for this element, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Mythic, celestial, contemplative mood — East Asian ink painting technique applied to Western zodiac iconography. Centered single composition of the zodiac creature alone, dignified rather than cartoonish, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A great crab emerging from moonlit tide pools, claws raised protectively over a cluster of small shells, faint star-lines curving overhead like a shell against the night sky.
```

### 04 — 사자자리 (Leo) · 불
파일명: `04.png`
```
Hand-painted ink-wash illustration of a zodiac constellation guardian, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture, a faint scatter of tiny star-points and thin constellation-lines woven subtly into the negative space behind the subject. Muted antique jewel-tone palette, warm firelit oranges and reds for this element, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Mythic, celestial, contemplative mood — East Asian ink painting technique applied to Western zodiac iconography. Centered single composition of the zodiac creature alone, dignified rather than cartoonish, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A maned lion standing atop a sunlit outcrop, chest lifted, mane catching warm light like flame, faint constellation-lines forming a crown-like arc above its head.
```

### 05 — 처녀자리 (Virgo) · 흙
파일명: `05.png`
```
Hand-painted ink-wash illustration of a zodiac constellation guardian, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture, a faint scatter of tiny star-points and thin constellation-lines woven subtly into the negative space behind the subject. Muted antique jewel-tone palette, earthy greens and aged gold for this element, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Mythic, celestial, contemplative mood — East Asian ink painting technique applied to Western zodiac iconography. Centered single composition of the zodiac figure, dignified rather than cartoonish, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A robed maiden standing in a ripe wheat field at dusk, a single sheaf of wheat cradled in her arms, faint star-lines threading through the grain around her.
```

### 06 — 천칭자리 (Libra) · 공기
파일명: `06.png`
```
Hand-painted ink-wash illustration of a zodiac constellation guardian, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture, a faint scatter of tiny star-points and thin constellation-lines woven subtly into the negative space behind the subject. Muted antique jewel-tone palette, cool pale greys and blues for this element, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with sharp highlights and deep ink-black shadows. Mythic, celestial, contemplative mood — East Asian ink painting technique applied to Western zodiac iconography. Centered single composition of the zodiac emblem, dignified rather than cartoonish, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A pair of balanced scales suspended in open air above a quiet courtyard, faint constellation-lines tracing the scale's beam and chains against a clear evening sky.
```

### 07 — 전갈자리 (Scorpio) · 물
파일명: `07.png`
```
Hand-painted ink-wash illustration of a zodiac constellation guardian, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture, a faint scatter of tiny star-points and thin constellation-lines woven subtly into the negative space behind the subject. Muted antique jewel-tone palette, soft blues and gentle gold for this element, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Mythic, celestial, contemplative mood — East Asian ink painting technique applied to Western zodiac iconography. Centered single composition of the zodiac creature alone, dignified rather than cartoonish, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A scorpion poised low among dark reeds at the water's edge, tail curved and still, faint star-lines outlining its raised stinger against deep night water.
```

### 08 — 궁수자리 (Sagittarius) · 불
파일명: `08.png`
```
Hand-painted ink-wash illustration of a zodiac constellation guardian, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture, a faint scatter of tiny star-points and thin constellation-lines woven subtly into the negative space behind the subject. Muted antique jewel-tone palette, warm firelit oranges and reds for this element, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Mythic, celestial, contemplative mood — East Asian ink painting technique applied to Western zodiac iconography. Centered single composition of the zodiac figure, dignified rather than cartoonish, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A centaur archer drawing a bow toward a distant horizon, cloak streaming behind, faint constellation-lines connecting the arrow's path to a bright star ahead.
```

### 09 — 염소자리 (Capricorn) · 흙
파일명: `09.png`
```
Hand-painted ink-wash illustration of a zodiac constellation guardian, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture, a faint scatter of tiny star-points and thin constellation-lines woven subtly into the negative space behind the subject. Muted antique jewel-tone palette, earthy greens and aged gold for this element, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Mythic, celestial, contemplative mood — East Asian ink painting technique applied to Western zodiac iconography. Centered single composition of the zodiac creature alone, dignified rather than cartoonish, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A sea-goat — goat forequarters, fish tail — perched at the boundary where a mountain slope meets the sea, faint star-lines climbing from the waterline up toward the distant peak.
```

### 10 — 물병자리 (Aquarius) · 공기
파일명: `10.png`
```
Hand-painted ink-wash illustration of a zodiac constellation guardian, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture, a faint scatter of tiny star-points and thin constellation-lines woven subtly into the negative space behind the subject. Muted antique jewel-tone palette, cool pale greys and blues for this element, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with sharp highlights and deep ink-black shadows. Mythic, celestial, contemplative mood — East Asian ink painting technique applied to Western zodiac iconography. Centered single composition of the zodiac figure, dignified rather than cartoonish, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A robed figure pouring an endless stream of water from a tilted urn into the open night air, faint constellation-lines rippling outward through the falling water like currents.
```

### 11 — 물고기자리 (Pisces) · 물
파일명: `11.png`
```
Hand-painted ink-wash illustration of a zodiac constellation guardian, portrait orientation (aspect ratio 2:3). Aged parchment paper background with visible fiber texture, a faint scatter of tiny star-points and thin constellation-lines woven subtly into the negative space behind the subject. Muted antique jewel-tone palette, soft blues and gentle gold for this element, colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Mythic, celestial, contemplative mood — East Asian ink painting technique applied to Western zodiac iconography. Centered single composition of the zodiac creatures, dignified rather than cartoonish, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: Two fish bound by a faint cord, swimming in opposite directions through a circular tide, faint star-lines connecting their tails in an unbroken loop.
```
