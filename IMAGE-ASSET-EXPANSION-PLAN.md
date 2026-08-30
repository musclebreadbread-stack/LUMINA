# LUMINA 이미지 자산 확장 개발 계획

> 작성일: 2026-08-30
> 상태: 계획 수립 완료 — 이 문서는 자산을 생성하거나 기존 파일을 교체하지 않습니다.
> 범위: 웹 플랫폼의 랜딩·결과·공유 화면에서 이미지가 비어 있거나 다른 검사의 임시 이미지를 쓰는 부분을 전수 보완합니다.

## 1. 결론

현재 플랫폼에는 사주, 타로, 수비학, 빅파이브, 융 유형, 다크 트라이어드, 애착유형, 궁합의 결과용 이미지 세트가 이미 있습니다. 새로 생성해야 하는 이미지는 19개 원본 PNG이며, 최적화 후 WebP·AVIF 파생본을 함께 만듭니다.

- P0: EQ 5장, 인지평가 5장, 홈 허브 정체성 이미지 6장, 점성술 결과 대표 이미지 1장 — 17장
- P1: 사주 입력 화면 대표 이미지 1장, 오늘의 운세 입력 화면 대표 이미지 1장 — 2장
- 재사용: 중국식 운세는 기존 사주 띠 12장을, 개인 맞춤 오늘의 운세는 기존 별자리·띠 24장을 사용합니다.
- 생성 제외: 문항 풀이 화면, 인지 파일럿 결과, 개인화 통합 리포트, 캐릭터 아틀라스, 방법론·약관 페이지입니다. 이 영역은 정답 단서·과학적 오해·개인화 데이터 전송을 피하거나 이미 코드 기반 시각화가 더 적합합니다.

이미지의 역할은 점수의 좋고 나쁨을 암시하는 장식이 아니라, 검사 주제와 결과의 맥락을 빠르게 잡아 주는 비언어적 안내입니다.

## 2. 현재 감사 결과와 처리 원칙

| 화면·기능 | 현재 상태 | 계획상 처리 |
| --- | --- | --- |
| 홈 만다라와 FeatureHub | 사주·타로·수비학·빅파이브·융·운세는 자체 이미지가 있으나 다크 트라이어드·애착·EQ·인지평가는 빅파이브 이미지를 임시 사용합니다. 점성술은 물병자리, 궁합은 결과용 overview를 허브에 재사용합니다. | 검사별 정사각형 만다라 4장, 점성술 허브 1장, 궁합 허브 1장을 추가합니다. |
| EQ 입력·결과·공유 | 빅파이브 감정 안정성 등 임시 이미지 5장을 사용합니다. | EQ 전용 overview와 4개 하위요인 이미지로 전면 교체합니다. |
| 인지평가 입력·안내·공유 | 빅파이브 지성 등 임시 이미지 5장을 사용합니다. | 인지평가 전용 overview와 4개 과제군 이미지를 추가합니다. 실제 문항이나 정답은 묘사하지 않습니다. |
| 다크 트라이어드·애착 결과 | 결과별 전용 인물·장면 이미지가 이미 있습니다. | 결과 이미지는 유지하고, 홈 만다라용 작은 대표 이미지 1장씩만 추가합니다. |
| 궁합 | landing과 tone별 결과 이미지 5장이 이미 있습니다. | 기존 결과 자산은 유지하고, 홈 허브에서만 쓰는 neutral hub 이미지 1장을 추가합니다. |
| 점성술 | 실제 차트는 코드 기반 ChartWheel이며, 입력/결과 대표 시각은 없습니다. | 차트를 대체하지 않는 overview 1장과 홈용 hub 1장을 추가합니다. |
| 사주 입력 | 결과에는 띠별 이미지가 있으나 출생정보 입력 화면에는 대표 이미지가 없습니다. | 입력 맥락만 설명하는 overview 1장을 P1으로 추가합니다. |
| 오늘의 운세 | 입력 화면은 사자자리 이미지를 고정 사용하고, 중국식 결과는 대표 이미지가 비어 있습니다. | 고정 사자자리 이미지는 generic overview로 교체하고, 중국식 결과는 기존 사주 띠 이미지를 재사용합니다. |
| 타로·수비학·사주 결과·빅파이브·융 유형 | 결과별 혹은 항목별 이미지 세트가 이미 충분합니다. | 새 생성 없이 현재 자산과 모션을 유지합니다. |
| 캐릭터 아틀라스·통합 리포트 | ElementSpirit 및 integrated-character가 입력값을 기반으로 코드에서 생성됩니다. | 정적 생성 이미지를 넣지 않습니다. 개인 데이터가 이미지 생성 요청으로 전달되지 않으며, 결과의 개인화도 보존됩니다. |
| 인지 문항·파일럿 결과 | 문항의 공정성 및 파일럿의 연구적 중립성이 중요합니다. | 정답을 암시하는 이미지, 점수 축하 이미지, 과장된 brain/IQ 이미지를 넣지 않습니다. |
| 방법론·참고문헌·정책 | 정보 밀도가 높은 문서형 화면입니다. | 생성 래스터 대신 필요 시 코드 기반 도식만 별도 과제로 검토합니다. |

## 3. 생성 자산 명세

### P0 — 검사 이해와 결과 맥락에 직접 필요한 17장

| ID | 원본 경로 | 비율 | 사용 위치 | 연결 코드 | 프롬프트 키 |
| --- | --- | --- | --- | --- | --- |
| EQ-01 | public/psychometrics/eq/overview.png | 3:2 | EQ landing, EQ 결과 cover, 공유 카드 | psychometricsAssets.ts | EQ-OVERVIEW |
| EQ-02 | public/psychometrics/eq/perceptionOfEmotion.png | 3:2 | EQ 요인 카드·결과 | psychometricsAssets.ts | EQ-PERCEPTION |
| EQ-03 | public/psychometrics/eq/managingOwnEmotions.png | 3:2 | EQ 요인 카드·결과 | psychometricsAssets.ts | EQ-OWN |
| EQ-04 | public/psychometrics/eq/managingOthersEmotions.png | 3:2 | EQ 요인 카드·결과 | psychometricsAssets.ts | EQ-OTHERS |
| EQ-05 | public/psychometrics/eq/utilisationOfEmotion.png | 3:2 | EQ 요인 카드·결과 | psychometricsAssets.ts | EQ-USE |
| COG-01 | public/psychometrics/cognitive/overview.png | 3:2 | 인지평가 landing, 안내, 공유 카드 | psychometricsAssets.ts | COG-OVERVIEW |
| COG-02 | public/psychometrics/cognitive/letterNumberSeries.png | 3:2 | 인지 과제군 설명·결과 | psychometricsAssets.ts | COG-SERIES |
| COG-03 | public/psychometrics/cognitive/matrixReasoning.png | 3:2 | 인지 과제군 설명·결과 | psychometricsAssets.ts | COG-MATRIX |
| COG-04 | public/psychometrics/cognitive/verbalReasoning.png | 3:2 | 인지 과제군 설명·결과 | psychometricsAssets.ts | COG-VERBAL |
| COG-05 | public/psychometrics/cognitive/threeDimensionalRotation.png | 3:2 | 인지 과제군 설명·결과 | psychometricsAssets.ts | COG-ROTATION |
| HUB-01 | public/psychometrics/darktriad/mandala.png | 1:1 | 홈 만다라·FeatureHub | mandalaModel.ts | HUB-DARKTRIAD |
| HUB-02 | public/psychometrics/attachment/mandala.png | 1:1 | 홈 만다라·FeatureHub | mandalaModel.ts | HUB-ATTACHMENT |
| HUB-03 | public/psychometrics/eq/mandala.png | 1:1 | 홈 만다라·FeatureHub | mandalaModel.ts | HUB-EQ |
| HUB-04 | public/psychometrics/cognitive/mandala.png | 1:1 | 홈 만다라·FeatureHub | mandalaModel.ts | HUB-COGNITIVE |
| HUB-05 | public/astro/hub.png | 4:3 | 홈 FeatureHub | FeatureHub.tsx | HUB-ASTRO |
| HUB-06 | public/compatibility/hub.png | 4:3 | 홈 FeatureHub | FeatureHub.tsx | HUB-COMPATIBILITY |
| ASTRO-01 | public/astro/overview.png | 4:3 | 점성술 landing, 결과 cover, 공유 카드 | astroAssets.ts, astro routes | ASTRO-OVERVIEW |

### P1 — 입력 경험의 균형을 맞추는 2장

| ID | 원본 경로 | 비율 | 사용 위치 | 연결 코드 | 프롬프트 키 |
| --- | --- | --- | --- | --- | --- |
| SAJU-01 | public/saju/overview.png | 4:3 | 사주 출생정보 입력 화면 | saju page 및 sajuAssets.ts | SAJU-OVERVIEW |
| HORO-01 | public/horoscope/overview.png | 4:3 | 오늘의 운세 landing | horoscope page 및 horoscopeAssets.ts | HOROSCOPE-OVERVIEW |

### 생성하지 않고 재사용할 자산

| 대상 | 재사용 경로 | 적용 방식 |
| --- | --- | --- |
| 중국식 운세 결과 | public/saju/zodiac/{rat…pig}.webp | horoscopeModel.ts에서 imageSrc를 null 대신 해당 띠 자산으로 매핑합니다. |
| 개인화 오늘의 운세 | public/horoscope/zodiac/{sign}.webp 또는 public/saju/zodiac/{animal}.webp | r/[data]/today 결과의 signKey·system에 맞춰 기존 이미지를 넣습니다. |
| EQ·인지 공유 카드 | 위 EQ-01, COG-01의 OG용 PNG 파생본 | 새 원본을 별도 생성하지 않고 prepare-og-images.mjs로 PNG를 준비합니다. |
| 다크 트라이어드·애착 OG 카드 | 기존 public/psychometrics/darktriad 및 attachment 원본 | 전용 OG 렌더러를 만들 때 기존 자산만 재사용합니다. |

## 4. 이미지 생성 프롬프트

생성기는 한 번의 호출에 한 이미지씩만 만듭니다. 각 자산은 아래의 공통 프롬프트와 표의 개별 지시를 이어 붙여 실행합니다. 텍스트가 들어간 이미지는 번역·접근성·공유 카드에서 재사용하기 어렵고 생성 품질도 불안정하므로 모든 프롬프트에서 문자·숫자·로고·워터마크를 금지합니다.

### 4.1 공통 프롬프트 A — EQ 과학적 탐색 이미지

~~~text
Use case: EQ self-exploration assessment illustration for the LUMINA web platform.
Asset type: calm editorial illustration for a landing page, result cover, and educational factor card.
Primary request: [append the asset-specific instruction below].
Scene/backdrop: quiet warm ivory paper, subtle graphite grain, generous negative space for Korean interface copy.
Style/medium: original hand-painted ink wash and soft editorial watercolor; observational and humane, not mystical and not clinical.
Composition/framing: horizontal 3:2 composition; meaningful subject slightly off center; preserve safe empty margins on all sides.
Lighting/mood: soft morning-window light, contemplative, steady, nonjudgmental.
Color palette: charcoal ink, warm gray, parchment ivory, muted deep teal accent only when it supports the subject.
Constraints: portray abilities as contexts for reflection, never as moral rank, diagnosis, or fixed identity. Use visual metaphor only.
Text (verbatim): none.
Avoid: letters, numbers, test questions, charts, score gauges, labels, logos, watermark, halo, aura, fortune-telling, medical imagery, before-versus-after hierarchy, triumphant trophy imagery, copyrighted characters, photoreal celebrity likeness.
~~~

### 4.2 공통 프롬프트 B — 인지평가 과학적 탐색 이미지

~~~text
Use case: cognitive self-exploration assessment illustration for the LUMINA web platform.
Asset type: restrained editorial illustration for a landing page, task-family guide, result cover, and share card.
Primary request: [append the asset-specific instruction below].
Scene/backdrop: warm ivory research notebook paper with subtle ink texture and deep empty margins for Korean copy.
Style/medium: original hand-painted ink wash, wooden objects, paper texture, and calm museum-study lighting; scientific and exploratory, never magical.
Composition/framing: horizontal 3:2 composition; subject slightly off center; no cropped essential detail.
Lighting/mood: clear, curious, quietly focused.
Color palette: charcoal, graphite, ivory, muted slate blue; a tiny amber highlight is allowed.
Constraints: depict only high-level cognitive metaphors. Do not reproduce a test item, a recognizable question format, a solution, an answer sequence, or score meaning.
Text (verbatim): none.
Avoid: letters, digits, equations, matrices with a missing answer, IQ labels, brain scans, neural-network graphics, speedometer, rankings, trophies, puzzle solution reveal, logo, watermark, tarot, zodiac, aura, copyrighted character.
~~~

### 4.3 공통 프롬프트 C — 홈 허브의 작은 정체성 이미지

~~~text
Use case: square navigation image for LUMINA self-exploration hub.
Asset type: compact conceptual ink illustration that remains legible in a small card.
Primary request: [append the asset-specific instruction below].
Scene/backdrop: warm rice-paper texture with a deep ink vignette and clean edges.
Style/medium: original Korean-inspired ink wash and subtle paper-cut collage, dignified rather than cute or generic.
Composition/framing: square 1:1; one central symbol, strong silhouette, no fine details that vanish below 160px.
Lighting/mood: quiet discovery, restrained intrigue.
Color palette: charcoal, parchment ivory, muted wine red or indigo accent only when relevant.
Text (verbatim): none.
Avoid: text, numbers, logo, watermark, score or rank imagery, medical or diagnostic symbolism, horror, glamorized manipulation, explicit romance stereotype, tarot card framing, copied brand style.
~~~

### 4.4 공통 프롬프트 D — 문화적 해석 화면의 대표 이미지

~~~text
Use case: cultural interpretation illustration for the LUMINA web platform.
Asset type: original ink-and-paper editorial scene for a Korean interface hero or result cover.
Primary request: [append the asset-specific instruction below].
Scene/backdrop: antique warm paper, fine ink fibers, spacious upper-left and lower-right copy-safe areas.
Style/medium: original Korean-inspired ink wash, restrained woodblock texture, brushed mineral pigment; elegant and contemporary, not a replica of any artist.
Composition/framing: horizontal 4:3 composition, readable silhouette at mobile crop.
Lighting/mood: intimate, reflective, quietly wondrous.
Color palette: charcoal ink, ivory, muted indigo, old gold; add restrained five-element tones only for the Saju asset.
Text (verbatim): none.
Avoid: Korean or Latin writing, numbers, real birth data, logo, watermark, claims of certainty, fear-inducing omen, generic neon galaxy, copyrighted character, exact traditional painting reproduction.
~~~

### 4.5 자산별 개별 지시

| 프롬프트 키 | 함께 넣을 개별 지시 |
| --- | --- |
| EQ-OVERVIEW | Primary request: four equally weighted translucent ink ripples meeting at a clear observing lens, with a seated figure quietly noticing the changing currents; communicate noticing, regulating, relating, and using emotion without showing one state as superior. |
| EQ-PERCEPTION | Primary request: two everyday figures at respectful distance notice faint ripples in a shared cup of water and a subtle change of light; convey attentive emotional perception without facial-expression labels. |
| EQ-OWN | Primary request: one figure walks beside a small rain cloud while carefully placing steady stones across a shallow stream; calm and storm coexist, showing self-management as a practice rather than control over emotion. |
| EQ-OTHERS | Primary request: two figures sit beside a dim lantern with space between them; one offers a folded blanket while both watch the same gentle rain, showing supportive attunement and boundaries. |
| EQ-USE | Primary request: four small paper sails catch changing winds and move a quiet boat toward open water; portray emotion as information and energy that can be used thoughtfully, not as productivity or victory. |
| COG-OVERVIEW | Primary request: a study table holds four families of abstract objects—rhythm marks, geometric tiles, connected blank paper fragments, and rotating wooden forms—arranged as an open invitation to notice patterns, with no puzzle answer. |
| COG-SERIES | Primary request: a calm path of abstract dots, wooden pegs, and subtle arcs shifts in rhythm across paper; communicate holding and updating a pattern without any letters, digits, ordered answer, or task item. |
| COG-MATRIX | Primary request: a field of varied geometric tiles forms a balanced visual rhythm, with every tile complete and no missing cell; suggest abstract relational reasoning without showing a matrix puzzle or solution. |
| COG-VERBAL | Primary request: blank paper fragments, thread, and small ordinary objects are gently connected across a study table; convey building relationships among meanings without written words or language symbols. |
| COG-ROTATION | Primary request: three matte wooden solids turn slowly around an invisible center while their shadows remain coherent; suggest spatial transformation without matching targets, options, or a correct orientation. |
| HUB-DARKTRIAD | Primary request: a composed antique theater mask, a small chess knight, and a dim mirror form one balanced still life; communicate reflection on interpersonal strategy without villain, glamour, threat, or score. |
| HUB-ATTACHMENT | Primary request: two small lantern boats travel on calm water, linked by a fine resilient thread that has both closeness and room to move; communicate relationship patterns without couple stereotypes. |
| HUB-EQ | Primary request: four soft ink ripples meet around a small clear lens, with equal visual weight and a memorable central silhouette; communicate emotional awareness without ranking it. |
| HUB-COGNITIVE | Primary request: four tactile wooden shapes—an arc, tile, folded blank paper, and rotating block—form one stable circular arrangement; communicate curiosity about patterns with no answer or test clue. |
| HUB-ASTRO | Primary request: a brass astrolabe rests beneath a quiet observatory opening, with a few neutral stars and orbital lines in the distance; this is cultural symbolism only, not a natal-chart reading. Do not map astrological four elements to Saju five-element colors. |
| HUB-COMPATIBILITY | Primary request: two distinct ink paths cross a shared bridge and continue side by side beneath one moon; communicate two profiles being compared without showing romance, gender, or a compatibility score. |
| ASTRO-OVERVIEW | Primary request: an antique armillary sphere and a simple code-like circular instrument sit beneath a measured night sky, with the sense of observing a birth moment rather than predicting fate. Do not include a readable chart or any four-element-to-five-element mapping. |
| SAJU-OVERVIEW | Primary request: five restrained mineral-ink currents—wood, fire, earth, metal, and water as abstract natural textures—move around blank wooden tablets and a compass-like center; imply cultural interpretation without real pillars, characters, or deterministic omen. |
| HOROSCOPE-OVERVIEW | Primary request: twelve equally subtle constellation points form a wide circle around a soft rising sun and a blank daily almanac page; keep every sign equally represented and do not privilege Leo or show readable symbols. |

### 4.6 생성·선정 규칙

1. 각 프롬프트는 독립적으로 실행하고, 한 결과를 다른 자산의 무단 변형으로 쓰지 않습니다.
2. 사람을 포함할 때는 연령·성별·인종을 특정하지 않고, 관계 이미지는 한 가지 연애 관계를 보편 규범처럼 보이지 않게 합니다.
3. 최종 선택 전 모바일 160px 카드 크기와 3:2 또는 4:3 crop에서 중심 상징이 남는지 검토합니다.
4. 원본의 텍스트·기호·정답 단서·불길한 예언·점수·순위·의학적 진단처럼 읽힐 요소는 폐기합니다.
5. 생성 원본은 새 경로에만 추가하고, 현재 public/compatibility, public/psychometrics/darktriad, public/psychometrics/attachment의 기존 결과 이미지를 덮어쓰지 않습니다.

## 5. 구현 설계

### 5.1 자산 처리

1. 선택한 PNG 원본을 3절의 정확한 경로에 저장합니다.
2. scripts/optimize-images.mjs에 EQ, 인지, astro, saju, horoscope 신규 디렉터리를 추가합니다. 기존 compatibility와 psychometrics 디렉터리 설정은 유지합니다.
3. 사용자에게 표시하는 이미지는 assetPath가 가리키는 WebP를 기본으로 쓰고, AVIF는 브라우저 협상용 파생본으로 둡니다.
4. OG 렌더러가 사용할 PNG는 scripts/prepare-og-images.mjs에서 public/og/eq 및 public/og/cognitive로 별도 준비합니다. Satori가 원본 WebP 대신 안정적인 PNG를 읽도록 합니다.
5. 새 1:1 만다라 원본은 512px 이상, 3:2·4:3 원본은 긴 변 1,280px 이상으로 생성한 뒤 optimizer가 실제 표시 크기에 맞게 축소합니다.

### 5.2 코드 변경 단위

| 파일 | 변경 내용 | 서버/클라이언트 경계 |
| --- | --- | --- |
| src/lib/psychometricsAssets.ts | EQ와 인지의 EQ_PLACEHOLDER_ART, COGNITIVE_PLACEHOLDER_ART, overview 상수를 새 전용 경로로 교체합니다. | 순수 서버·클라이언트 공용 상수만 둡니다. |
| src/lib/mandalaModel.ts | 다크 트라이어드·애착·EQ·인지의 imageSrc를 각 mandala.png로 교체합니다. | 순수 모델; 브라우저 API를 넣지 않습니다. |
| src/components/home/FeatureHub.tsx | 점성술 허브 이미지를 물병자리에서 astro/hub로, 궁합 허브 이미지를 compatibility/hub로 바꿉니다. | 현재 Client Component 경계를 유지하며 문자열 경로만 받습니다. |
| src/lib/astroAssets.ts (신규) | ASTRO_OVERVIEW_IMAGE, ASTRO_HUB_IMAGE의 단일 진실 공급원을 만듭니다. | 순수 공용 상수입니다. |
| src/app/astro/page.tsx, src/app/r/[data]/astro/page.tsx | overview를 landing과 ResultCover에 넣되 ChartWheel은 그대로 코드 기반으로 유지합니다. | 페이지는 Server Component, MotionSafeImage/ResultCover의 기존 작은 Client 경계를 재사용합니다. |
| src/lib/sajuAssets.ts 또는 기존 asset helper | SAJU_OVERVIEW_IMAGE를 명시적으로 제공합니다. | 순수 공용 상수입니다. |
| src/app/saju/page.tsx | 출생정보 입력 맥락의 설명 이미지 한 장을 추가합니다. | 페이지의 서버 렌더링과 기존 입력 Client Component 분리를 유지합니다. |
| src/lib/horoscopeAssets.ts (신규) | HOROSCOPE_OVERVIEW_IMAGE를 제공합니다. | 순수 공용 상수입니다. |
| src/app/horoscope/page.tsx | 하드코드된 leo 이미지를 generic overview로 교체합니다. | 기존 MotionSafeImage 경계를 유지합니다. |
| src/lib/horoscopeModel.ts | 중국식 운세의 imageSrc를 기존 saju/zodiac 경로로 제공합니다. | 순수 모델; 생성 이미지나 개인 데이터를 호출하지 않습니다. |
| src/app/r/[data]/today/page.tsx | system과 signKey에 따라 기존 별자리·띠 이미지를 ResultCover 또는 같은 안전한 이미지 컴포넌트에 전달합니다. | 서버에서 경로를 결정하고 클라이언트에는 직렬화 가능한 문자열만 전달합니다. |
| src/lib/og/cards/eq.tsx, src/lib/og/cards/cognitive.tsx | 새 overview PNG를 카드 좌측 이미지로 배치합니다. 점수 텍스트의 의미를 이미지로 중복하지 않습니다. | 서버 OG 렌더 전용입니다. |
| src/lib/og/cards/fallback.tsx | 다크 트라이어드·애착 전용 OG 렌더 단계에서 기존 이미지 재사용 분기를 추가합니다. | 서버 OG 렌더 전용입니다. |
| scripts/prepare-og-images.mjs | EQ·인지·다크 트라이어드·애착의 PNG 파생 그룹을 추가합니다. | 빌드 시 Node 스크립트이며 브라우저 번들에 포함하지 않습니다. |
| messages/ko.json, messages/en.json | 모든 새 이미지의 alt 텍스트와 결과별 비주얼 설명 키를 추가합니다. | 문자열 리소스만 추가합니다. |
| e2e 및 lib 테스트 | 자산 경로, alt, fallback, 공유 OG와 모바일 overflow를 검증합니다. | 테스트 전용입니다. |

### 5.3 공유·OG 적용 원칙

- EQ와 인지 결과의 StoryCardButton 및 s/[kind]/[code]는 기존 imagePath/overview map을 쓰므로, 매핑 교체만으로 웹 공유 화면에는 새 이미지가 전파됩니다.
- 이미지형 OG는 별도 PNG 파생본을 사용합니다. score, percentile, 검사 결과를 그림 속 도형·색의 크기로 암시하지 않고, 텍스트와 이미지를 분리합니다.
- 다크 트라이어드·애착은 새 원본을 만들지 않고 기존 결과 이미지로 OG parity만 보완합니다.
- 공개 공유 링크에 개인 식별정보나 생년월일을 이미지 안에 합성하지 않습니다.

## 6. 모션과 접근성 설계

### 모션

| 위치 | 효과 | 안전 장치 |
| --- | --- | --- |
| landing hero | 기존 reveal로 opacity와 짧은 y 이동만 적용, 이미지 자체는 한 번만 부드럽게 나타납니다. | 초기 SSR 내용은 즉시 보이며, reduced motion에서는 정적 최종 상태입니다. |
| 요인/결과 카드 | hover 시 1~2% scale, 그림자·윤곽 변화, 180ms 이내입니다. | 키보드 focus에도 같은 피드백을 제공하고, motion 없는 경우 outline만 남깁니다. |
| 홈 만다라 | hover/focus에서 이미지가 약하게 떠오르고 inkField가 배경에서만 움직입니다. | 카드 라벨과 목적을 이미지에 의존하지 않으며, reduced motion에서 이동·pulse를 제거합니다. |
| 결과 대표 이미지 | 결과 본문보다 먼저 주목을 빼앗지 않는 slow shimmer 또는 static grain만 허용합니다. | 점수·그래프·문항·차트에는 반복 모션을 넣지 않습니다. |

### 접근성·성능

- 모든 이미지에는 기능과 맥락을 설명하는 현지화 alt를 둡니다. 장식용 InkField는 빈 alt 또는 aria-hidden으로 처리하고, 검사 이름·결과 점수는 alt에 중복하지 않습니다.
- MotionSafeImage의 오류 fallback을 그대로 사용하고, 이미지 오류가 나도 제목·설명·결과의 의미가 사라지지 않게 합니다.
- LCP 후보인 각 landing의 대표 1장만 priority를 사용합니다. 카탈로그·요인 카드·만다라 이미지는 lazy loading합니다.
- WebP/AVIF를 기본 제공하고, OG 경로에서만 최적화된 PNG를 읽습니다.
- 색만으로 EQ 수준·인지 결과·궁합 tone을 구별하지 않습니다. text label, icon, description을 함께 표시합니다.
- reduced motion, 320px 폭, 키보드 focus, 200%와 400% 확대에서 clip·가로 스크롤·hover 전용 정보가 없는지 확인합니다.

## 7. 실행 순서

### 단계 0 — 기준선과 승인

1. 현재 이미지 인벤토리와 Lighthouse/Playwright 기준 스크린샷을 기록합니다.
2. 새 파일 경로가 존재하지 않는지 확인하고, 기존 dirty worktree 자산은 건드리지 않습니다.
3. 이 계획의 P0 17장에 대한 시각 톤 sample을 2장만 먼저 생성하여 가족 유사성, 작은 화면 가독성, 과학적 중립성을 검토합니다.
4. sample 승인이 나면 나머지를 한 이미지씩 생성합니다. 이 단계에서 외부 업로드·배포·DB 변경은 하지 않습니다.

### 단계 1 — P0 원본 생성과 자산 최적화

1. EQ 5장과 인지 5장을 먼저 생성·선별합니다.
2. 홈 허브 6장과 점성술 overview 1장을 생성·선별합니다.
3. 정확한 public 경로에 PNG를 추가하고 images:optimize를 실행합니다.
4. 각 WebP를 데스크톱, 모바일 crop, contrast, fallback에서 육안 검수합니다.

### 단계 2 — 화면 매핑과 결과·공유 연결

1. placeholder map을 새 자산 map으로 교체합니다.
2. 홈 만다라 및 FeatureHub를 새 identity asset으로 연결합니다.
3. astro/saju/horoscope 입력·결과 화면에 대표 이미지를 연결합니다.
4. 중국식·개인화 오늘의 운세는 새 생성 대신 기존 띠·별자리 자산을 연결합니다.
5. EQ·인지 OG 카드와 공유 페이지에 새 overview 파생본을 적용합니다.

### 단계 3 — P1 입력 화면 보완

1. SAJU-01, HORO-01을 생성·검수합니다.
2. 사주와 오늘의 운세 landing의 fixed/empty 대표 이미지를 교체합니다.
3. 신규 이미지가 입력 폼의 읽기 흐름과 date input의 접근성을 방해하지 않는지 확인합니다.

### 단계 4 — 검증과 배포 전 게이트

1. 이미지 경로·alt·fallback·sharing을 자동화 테스트합니다.
2. typecheck, lint, unit test, 순차 E2E, production build를 모두 통과시킵니다.
3. preview 배포는 별도 승인 후에만 수행합니다. 프로덕션 배포, DB migration, 파일 삭제는 이 계획 범위에 포함하지 않습니다.

## 8. 검증 체크리스트와 명령

구현 시 실제 package.json 스크립트를 기준으로 아래를 실행합니다.

~~~text
pnpm images:optimize
pnpm og:images
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e -- --workers=1
pnpm build
~~~

추가 검증 항목:

- EQ와 인지 asset map에서 public/psychometrics/factors의 임시 경로가 더 이상 쓰이지 않는지 정적 검사합니다.
- 홈 허브의 astro가 aquarius 고정 이미지가 아니고 compatibility가 결과 overview를 재사용하지 않는지 확인합니다.
- 모든 새 WebP, AVIF, OG PNG의 존재와 200 응답을 확인합니다.
- 이미지 로드 실패를 강제해도 제목, 검사 설명, 결과 본문, CTA가 정상 렌더되는지 확인합니다.
- EQ·인지 결과, 다크 트라이어드·애착 결과, 궁합 결과, astro 결과, 중국식 운세 결과, 개인화 오늘의 운세를 각각 브라우저에서 확인합니다.
- 모바일 375px과 320px, 데스크톱 1440px, reduced motion, 키보드 탐색, 400% 확대에서 이미지가 콘텐츠를 가리거나 overflow를 만들지 않는지 확인합니다.
- OG는 텍스트가 잘리고, 이미지가 비어 있고, 점수가 그림 의미로 왜곡되는 경우가 없는지 스냅샷으로 확인합니다.
- 현재 병렬 E2E의 잠재적 불안정성은 순차 실행 결과를 최종 판단 근거로 사용합니다.

## 9. 완료 기준

다음 조건을 모두 만족하면 이미지 확장 개발을 완료로 판단합니다.

1. 19개 새 원본과 WebP·AVIF 파생본이 정확한 경로에 있고, 기존 자산을 덮어쓴 파일이 없습니다.
2. EQ·인지의 임시 빅파이브 이미지는 모든 landing, 결과, 공유 화면에서 제거됩니다.
3. 홈의 다크 트라이어드·애착·EQ·인지·점성술·궁합 카드가 각 기능에 맞는 자체 이미지를 씁니다.
4. 점성술, 사주, 오늘의 운세 입력·결과의 비어 있거나 고정된 대표 이미지 공백이 해결됩니다.
5. 인지 문항과 파일럿 결과의 공정성·연구 중립성, 통합 리포트의 개인화·프라이버시가 보존됩니다.
6. reduced motion, 이미지 fallback, alt, 성능 최적화, OG 카드, 테스트·빌드 게이트를 통과합니다.

## 10. 계획 범위 밖의 결정

- 생성된 이미지를 Supabase Storage 또는 외부 CDN에 업로드하지 않습니다. 현재 public 정적 자산 방식이 배포·캐시·RLS 관점에서 충분하며, 사용자 데이터도 전송하지 않습니다.
- 이미지 생성 도구에 실제 생년월일, 답변, 점수, 공유 토큰을 전달하지 않습니다.
- 결과 이미지가 과학적 검사 결과의 진단·예측·의학적 효력을 암시하지 않도록 카피와 alt를 별도 검수합니다.
- video, GIF, 자동 재생 3D는 추가하지 않습니다. 이미지가 많은 화면에서도 LCP와 멀미 위험을 관리하기 위해 CSS 기반의 절제된 모션만 사용합니다.
