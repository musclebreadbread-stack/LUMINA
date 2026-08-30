# LUMINA 자리표시자 교체 — 만다라 노드 · 허브 카드 전용 이미지 생성 프롬프트 (4장)

> 이 문서는 프롬프트 작성까지가 개발 산출물입니다. 이미지 자체는 이 세션 안에서 생성하지 않습니다 —
> 아래 프롬프트를 외부 이미지 생성 도구에 직접 입력해 사람이 생성하고, 완료되면 알려주시면 코드가
> 그 파일을 가리키도록 이어서 작업합니다.

## 이 문서가 다루는 것
지금까지 만든 6개 문서(타로·사주·운세·수비학·성향검사·MBTI)는 전용 삽화가 아예 없던 기능을 채웠다.
이 문서는 다르다 — **이미 다른 기능의 진짜 이미지를 "빌려서" 쓰고 있는 자리표시자 4곳**을 정리한다.
아래 두 코드 파일을 직접 읽어 현재 상태를 확인했다:
- `src/lib/mandalaModel.ts` — 홈 만다라 궤도에 도는 노드 이미지(`imageSrc`)
- `src/components/home/FeatureHub.tsx`의 `OFF_MANDALA_IMAGES` — 만다라에 오르지 않는 두 분석(점성술·궁합)의 허브 카드 이미지

## 사용법
1. 아래 각 항목의 **프롬프트를 그대로 복사**해서 이미지 생성 도구에 붙여넣어 이미지를 생성합니다.
2. 생성된 이미지를 **파일명 그대로**, 항목마다 표시된 경로에 저장합니다.
3. 항목마다 표시된 **비율**로 생성해 주세요 — 만다라 노드용 2장은 정사각(1:1), 허브 카드용 2장은
   가로(4:3)입니다. 두 용도가 화면에서 놓이는 프레임 모양이 다르기 때문입니다.
4. 4장을 전부 저장하시면 알려주세요 — 그 결과물로 아래 "무엇을 대체하는가" 표에 적힌 정확한 코드
   위치를 갈아 끼우도록 이어서 작업하겠습니다.

## 무엇을 대체하는가 (그대로 갈아 끼울 수 있도록)

| 삽화 | 저장 경로 | 대체하는 코드 | 지금 빌려 쓰는 자리표시자 |
|---|---|---|---|
| 다크 트라이어드 만다라 노드 | `public/psychometrics/darktriad/mandala.png` | `src/lib/mandalaModel.ts`의 `key: "darktriad"` 항목, `imageSrc` 필드 | `assetPath("psychometrics/factors", "intellect")` — 빅파이브 개방성 요인 삽화 |
| 애착 만다라 노드 | `public/psychometrics/attachment/mandala.png` | `src/lib/mandalaModel.ts`의 `key: "attachment"` 항목, `imageSrc` 필드 | `assetPath("psychometrics/factors", "agreeableness")` — 빅파이브 우호성 요인 삽화 |
| 점성술 허브 카드 | `public/astro/hub.png` | `src/components/home/FeatureHub.tsx`의 `OFF_MANDALA_IMAGES.astro` | `assetPath("horoscope/zodiac", "aquarius")` — 운세 기능의 물병자리 삽화 |
| 궁합 허브 카드 | `public/compatibility/hub.png` | `src/components/home/FeatureHub.tsx`의 `OFF_MANDALA_IMAGES.compatibility` | `assetPath("compatibility", "overview")` — 궁합 자신의 랜딩/결과 커버 삽화 (아래 참고) |

## 왜 이 4장인가

### 다크 트라이어드·애착 만다라 노드 (2장)
`src/lib/mandalaModel.ts`의 `MANDALA_VISUALS` 배열을 열어 확인한 현재 값은 이렇다:
- `key: "darktriad"` (55행): `imageSrc: assetPath("psychometrics/factors", "intellect")` — 이 검사와 무관한
  빅파이브 개방성(intellect) 삽화를 빌려 쓴다.
- `key: "attachment"` (62행): `imageSrc: assetPath("psychometrics/factors", "agreeableness")` — 역시 무관한
  빅파이브 우호성 삽화를 빌려 쓴다.

두 분석 모두 이미 자기 몫의 진짜 삽화(`public/psychometrics/darktriad/{machiavellianism,narcissism,psychopathy,overview}.*`,
`public/psychometrics/attachment/{secure,anxious,avoidant,fearful,overview}.*`)를 갖고 있어, 다른 화면(결과
커버 등)에는 이미 자기 삽화가 걸린다. 다만 홈 만다라 노드(`.mandala-node-image`, `aspect-ratio: 1`)는
제목·설명 텍스트와 나란히 놓이는 아주 작은 정사각 썸네일이라, 기존 `overview.png`(가로 3:2, 넓은 도입부
장면 구도)를 그대로 억지로 잘라 넣기보다 **정사각 프레임에 맞춰 새로 구도를 잡은 전용 노드 삽화**를
커미션한다 — 사주의 용(`dragon`)·타로의 바보 카드(`00`)처럼, 만다라 노드는 그 분석을 대표하는 상징
하나를 중앙에 크게 담는 편이 작은 원형 궤도 안에서 더 잘 읽히기 때문이다.

### 점성술·궁합 허브 카드 (2장)
`src/components/home/FeatureHub.tsx`의 `OFF_MANDALA_IMAGES`(13-16행)를 확인한 현재 상태는 두 분석이 서로
다르다:
- **점성술(astro)**은 진짜 자리표시자 문제다 — `public/astro/` 폴더 자체가 아직 없고, 지금은 완전히 다른
  기능인 운세(horoscope)의 물병자리 삽화를 빌려 쓴다. 점성술은 출생 차트를 계산하는 기능이라 운세(오늘의
  하늘)와는 다루는 개념이 다르므로, 이 문서가 점성술 전용 허브 카드 삽화를 새로 커미션한다.
- **궁합(compatibility)**은 사실 이미 자기 자신의 진짜 삽화(`COMPATIBILITY_OVERVIEW_IMAGE = assetPath("compatibility", "overview")`,
  `src/lib/compatibilityAssets.ts`)를 쓰고 있다 — 다른 도메인에서 빌려온 게 아니다. 다만 이 이미지는 궁합
  랜딩·결과 커버에도 똑같이 쓰이므로, 허브를 둘러보다 궁합을 클릭해 들어가면 방금 본 이미지를 그대로 또
  보게 된다. 엄밀한 "자리표시자 부채"는 아니지만, Stage C1의 위험 노트가 지적한 지점을 정확히 해소하기
  위해 허브 카드 전용의 별도 구도를 하나 더 커미션한다 — 궁합의 핵심 개념(두 사람의 명식이 만난다)은
  같게 유지하되 구도만 바꿔, 허브에서도 랜딩에서도 신선하게 보이도록 한다.

## 스타일 원칙

### 다크 트라이어드·애착 만다라 노드 — 과학 계층 규칙을 그대로 물려받음
두 분석 모두 `tier: "scientific"`(`analysisCatalog.ts`)이다. `psychometrics-image-prompts.md`가 정한
과학 계층의 규칙 — 거의 무채색에 옅은 색조 하나만 얹고, 신비로운 후광·별자리·점술 상징을 넣지 않는다는
규칙 — 을 이 2장도 그대로 따른다. 다만 이 둘은 요인/사분면별 스펙트럼 삽화가 아니라 분석 전체를
대표하는 **단일 삽화**이므로(각자의 `overview.png`와 같은 성격), 좌우로 두 경향을 나누지 않고 한 장면
안에 정적으로 담는다.
- 손으로 그린 먹빛 수묵화 붓질, 거의 무채색(먹빛 검정·따뜻한 회색 중간톤·아이보리 종이)에 아주 옅은
  색조 하나만 은은하게
- 신비로운 후광·별자리·점술 상징 없음, 인물을 악당처럼 그리지 않음(과장된 악·선 이분법 없음) — 성격
  특성을 관찰하는 절제된 태도를 유지
- 정사각(1:1) 구도, 중앙에 상징 하나를 크게
- **이미지 안에 글자·숫자·워터마크는 절대 넣지 않음**

### 점성술·궁합 허브 카드 — 각자 이미 정해진 문화 계층 팔레트를 물려받음
둘 다 `tier: "cultural"`이므로 타로·사주·운세와 같은 낡은 보석톤 팔레트(짙은 남색·그을린 적갈색·고풍스러운
금빛 황토·녹청색·아이보리)를 쓴다. 점성술은 운세(`horoscope-image-prompts.md`)와 같은 서양 점성술
영역이므로 운세가 이미 쓰고 있는 "옅은 별점 + 가느다란 별자리 선" 시그니처를 그대로 물려받고, 궁합은
`referenceIds: ["compatibility", "saju"]`(`analysisCatalog.ts`)가 명시하듯 사주와 짝을 이루는 기능이므로
사주(`saju-image-prompts.md`)의 오행 팔레트 계열을 물려받는다.
- 손으로 그린 먹빛 수묵화 느낌, 오래된 한지/양피지 질감 배경, 은은한 목판화 테두리
- 가로(4:3) 구도 — 허브 카드가 놓이는 프레임(`FeaturePortal.tsx`의 `aspect-[4/3]`)과 맞춘다
- **이미지 안에 글자·숫자·워터마크는 절대 넣지 않음**

---

### 다크 트라이어드 만다라 노드
파일명: `mandala.png` (저장 경로: `public/psychometrics/darktriad/mandala.png`, 비율: 1:1)
```
Hand-painted ink-wash illustration representing a personality-science instrument as a single emblem, square format (aspect ratio 1:1). Aged parchment paper background with visible fiber texture. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of warm ochre tint. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no glowing auras, no zodiac or mystic symbols, no villain caricature. Centered single composition, thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: A plain wooden strategist's mask resting face-up on a low table beside a scattering of game counters and a small hand-mirror, ink-wash still life, contemplative rather than sinister — an instrument for observing the self-interested, calculating, and unfeeling edges of personality without moralizing about them.
```

### 애착 만다라 노드
파일명: `mandala.png` (저장 경로: `public/psychometrics/attachment/mandala.png`, 비율: 1:1)
```
Hand-painted ink-wash illustration representing a personality-science instrument as a single emblem, square format (aspect ratio 1:1). Aged parchment paper background with visible fiber texture. Restrained, mostly monochrome ink-wash palette — deep ink black, soft warm-grey mid-tones, warm ivory paper — with only the faintest whisper of cool grey-blue tint. Fine expressive brushwork, painterly texture, subtle grain, soft even lighting. Quiet, observational, psychologically grounded mood — NOT mystical, NOT divinatory, no glowing auras, no zodiac or mystic symbols, no romantic cliché. Centered single composition, thin plain hand-drawn border frame, restrained rather than ornate. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: Two small silhouetted figures standing at a quiet distance across a still courtyard, connected by a single fine thread that is taut in one stretch and gently slack in another — a single continuous bond rendered in varying tension, neither figure closer to the viewer than the other.
```

### 점성술 허브 카드
파일명: `hub.png` (저장 경로: `public/astro/hub.png`, 비율: 4:3)
```
Hand-painted ink-wash illustration of a natal-chart instrument, landscape orientation (aspect ratio 4:3). Aged parchment paper background with visible fiber texture, a faint scatter of tiny star-points and thin constellation-lines woven subtly into the negative space behind the subject. Muted antique jewel-tone palette — deep indigo blue, burnt terracotta red, aged gold ochre, verdigris green, warm ivory — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Mythic, celestial, contemplative mood — East Asian ink painting technique applied to Western astrological iconography. Centered single composition, dignified rather than cartoonish, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: An antique brass armillary sphere resting on a scholar's desk beneath a deep night sky, its rings holding a scholar's hand steady as it adjusts one ring, faint constellation-lines connecting star-points across the darkness behind it — representing a whole birth chart rather than any single zodiac sign.
```

### 궁합 허브 카드
파일명: `hub.png` (저장 경로: `public/compatibility/hub.png`, 비율: 4:3)
```
Hand-painted ink-wash illustration of a synastry / compatibility reading, landscape orientation (aspect ratio 4:3). Aged mulberry-paper (hanji) background with visible fiber texture. Muted antique jewel-tone palette drawing on the Five Elements (五行) family already used for this app's Saju illustrations — soft jade-moss green, scorched vermilion red, warm ochre gold, quiet silver-white, deep indigo blue — colors softened as if faded by centuries, never bright or saturated. Fine expressive brushwork, painterly texture, subtle grain, soft dramatic lighting with warm highlights and deep ink-black shadows. Dignified, contemplative mood, not romantic or saccharine. Centered single composition, thin ornate hand-drawn border frame like an antique woodblock print. No text, no numbers, no letters, no words, no watermark anywhere in the image.

Subject: Two red threads of fate drifting in from opposite corners of the frame, crossing and knotting together at the center above two small paper charts laid side by side on a low table, the knot rendered with care rather than sentimentality — two records meeting, not two silhouettes embracing.
```
