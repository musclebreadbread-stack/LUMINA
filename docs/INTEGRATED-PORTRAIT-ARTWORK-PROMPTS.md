# 통합 자기초상 이미지 프롬프트

통합 자기초상의 이미지는 기존 사주 정령 카드의 세로형 한지·먹선·절제된 광물 안료 스타일을 공유한다. 각 완료 분석 렌즈에 하나의 상징 이미지를 연결하고, 최신 완료 렌즈를 큰 대표 이미지로 보여 주며, 현재 초상에 포함된 모든 렌즈 이미지는 하단 레일에 함께 보여 준다. 이미지 자체는 점수의 높고 낮음이나 진단을 시각화하지 않는다.

공통 제약: `vertical 2:3 collectible plate`, aged mulberry-paper parchment, smoky East Asian ink-wash clouds, restrained antique double-line frame, visible hanji fibers, graphite black/deep sepia/ash gray, muted mineral accents, no lettering, no Korean or Chinese characters, no numerals, no logos, no watermark, no signature, no UI, no collage, no human anatomy, no anime, no glossy 3D, no neon, no horror or violence, do not emulate any living artist. Important details remain readable in a 92px square crop.

## 생성 프롬프트

- `psychometrics.webp`: one original non-human guardian called the Compass of Five Currents; five subtle ink ribbons orbit a calm stone seed, suggesting several observable traits without implying a score or diagnosis; muted teal and faded ochre accents; quiet observatory glow.
- `jungian.webp`: one original non-human Threshold Keeper; two calm mirrored stone masks joined by a narrow open doorway; suggests preferences and boundaries without implying a fixed type; muted indigo and faded ochre accents; quiet threshold glow.
- `darktriad.webp`: one original non-human Three-Faceted Shadow Mirror; a dark obsidian seed with three quiet reflective facets and a thin ring; sober and reflective, never ominous or villainous; muted plum and restrained copper accents.
- `attachment.webp`: one original non-human Woven Harbor; interlocking reed-and-clay forms shelter a small warm ember inside a nest-like arch; exploratory approach-and-distance metaphor, not a fixed label; muted moss and soft terracotta accents.
- `eq.webp`: one original non-human Resonant Basin; a porcelain-and-stone bowl holds concentric water ripples and a small reflected moon; suggests noticing and responding to feelings without a clinical claim; muted blue-green and pale silver accents.
- `saju.webp`: one original non-human Five-Element Mountain Garden; stone, branch, flame, mist, and water gather around a quiet seed; cultural reflection only, never a scientific score; restrained jade, vermilion, and pale ochre accents.
- `astro.webp`: one original non-human Quiet Orrery; three graceful orbital rings surround a luminous seed and crescent glow; symbolic sky narrative without prediction; muted indigo, pale silver, and faint gold accents.
- `numerology.webp`: one original non-human Counting Spiral; seven unmarked river stones form a calm spiral around a seed of light; no digits or readable marks and no fate claim; muted teal and soft amber accents.

생성된 최종 자산은 `public/integrated-portrait/`의 동일한 768×1152 WebP 파일이며, `src/lib/integratedPortrait/artwork.ts`의 manifest가 누락·오타 없이 연결한다.
