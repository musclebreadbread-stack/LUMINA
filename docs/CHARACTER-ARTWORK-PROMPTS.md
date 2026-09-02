# LUMINA 캐릭터 도감 원화 생성 기록

작성일: 2026-09-02

도감의 15개 캐릭터는 기존 `public/saju/zodiac` 및 `public/horoscope/zodiac` 원화의 세로형 한지·먹 번짐·장식 프레임 문법을 참고해 생성했다. 참고 자산은 화풍 복제가 아닌 질감·명암·프레이밍 참고로만 사용한다. 이미지 안에는 이름·한자·로고·워터마크를 넣지 않고, 다국어 텍스트는 UI에서 렌더링한다.

## 공통 프롬프트

```text
Use case: stylized-concept. Asset type: LUMINA character atlas portrait, project-bound website asset. One original non-human elemental spirit, full body and central silhouette, 2:3 vertical collectible plate, important details contained within the central square crop. Premium East Asian historical ink-rubbing and ink-wash fantasy on aged mulberry-paper parchment; graphite-black, deep sepia, smoky ink clouds, restrained mineral pigment, subtle worn gold, fine double-line antique frame and faint circular seal halo. Highly detailed painterly texture, visible hanji fibers, dry brush, atmospheric depth, dark edges and readable subject at a 92px thumbnail. No lettering inside the artwork. Create a completely original character and do not emulate any living artist.
```

공통 negative prompt:

```text
text, Korean or Chinese characters, logo, watermark, signature, UI, collage, multiple characters, human portrait, anime, kawaii, plastic toy, glossy 3D render, neon cyberpunk, modern clothing, horror, violence, broken or pitiable character, oversaturated colours, cropped subject, distorted frame
```

## 캐릭터별 문장

공통 프롬프트 뒤에 아래 문장을 붙여 생성했다.

| ID | 이름 | 개별 프롬프트 |
| --- | --- | --- |
| `wood-strong` | 큰그루 / Big Trunk | `A guardian grown from an ancient zelkova trunk, broad roots anchoring a stone terrace, twin-leaf crown reaching upward. Self-propelling energy radiates outward in fine root lines; upright and expansive, never aggressive. Moss-green #5BA383 accents.` |
| `wood-balanced` | 새순 / New Shoot | `A young jade-green sprout spirit rising from a quiet stone, two fresh leaves forming its crown. Centred circular rhythm of leaves and dew, measured growth, serene and complete. Moss-green #5BA383 accents.` |
| `wood-weak` | 덩굴 / Vine | `A graceful vine spirit weaving around a weathered stone trellis, leaf tendrils responding to surrounding branches. Surroundings-attuned and collaborative, equally luminous and dignified. Moss-green #5BA383 accents.` |
| `fire-strong` | 화톳불 / Bonfire | `A dignified bonfire spirit in a low antique bronze brazier, three flame crests and outward sparks contained by ink smoke. Warmth spreading far in an upward radiating composition. Cinnabar #D95B41 accents.` |
| `fire-balanced` | 등불 / Lamp | `An antique Korean bronze oil-lamp spirit with a single protected steady flame, circular halo and quiet soot clouds. Perfectly centred, calm continuous glow rather than dramatic fire. Cinnabar #D95B41 accents.` |
| `fire-weak` | 잉걸 / Ember | `A living ember spirit with a bright charcoal core nestled in soft ash, small enduring flame traces and protective smoke. Surroundings-attuned, persistent and warm, never extinguished or damaged. Cinnabar #D95B41 accents.` |
| `earth-strong` | 너른들 / Broad Field | `A broad earthen field guardian formed from layered terraces and fertile soil, horizon-wide shoulders, seed and root motifs. Receptive abundance expanding calmly across the composition. Ochre #DFA83E accents.` |
| `earth-balanced` | 두둑 / Furrow | `A sturdy clay furrow keeper with orderly horizontal ridges, a narrow watercourse and root paths held in balance. Symmetrical, contained and evenly circulating. Ochre #DFA83E accents.` |
| `earth-weak` | 고운흙 / Fine Soil | `A soft fine-loam spirit shaped by gentle wind and sheltering stones, tiny seed motifs held safely in its surface. Surroundings-attuned, refined, adaptable and fully dignified. Ochre #DFA83E accents.` |
| `metal-strong` | 쇠북 / Bronze Bell | `An ancient bronze bell spirit with a circular crown ring, subtle concentric sound waves and engraved patina. A single strike resonating outward for a long time. Cool silver #B9BFC4 with restrained antique-gold accents.` |
| `metal-balanced` | 자물쇠 / Lock | `An ornate antique padlock spirit with a rounded keyhole glyph and precise hinge details. Centred composition of opening and closing arcs, poised rather than restrictive. Cool silver #B9BFC4 accents.` |
| `metal-weak` | 금박 / Gold Leaf | `A delicate gold-leaf spirit made from thin floating foil petals over dark parchment. Surroundings-attuned, light enough to settle beautifully across nearby forms. Cool silver #B9BFC4 with quiet worn-gold accents.` |
| `water-strong` | 큰물 / Great River | `A broad river spirit flowing through ink-painted ravines, a powerful serpentine current without dragon scales or horns. Self-directed water carving a luminous path outward. Indigo #5580D4 accents.` |
| `water-balanced` | 샘 / Spring | `A clear spring spirit emerging from a round stone basin, layered circular ripples and a still reflective centre. Centred, replenishing and evenly circulating. Indigo #5580D4 accents.` |
| `water-weak` | 이슬 / Dew | `A luminous dew-drop spirit resting on a reed before dawn, faint moonlit mist and delicate concentric reflections. Surroundings-attuned, quiet, whole and gently present. Indigo #5580D4 accents.` |

## 산출물 규격

- 생성 원본: 1024×1536 PNG, 생성 도구 기본 저장소에 원본 보존
- 웹 자산: `public/characters/{id}.webp`, 640×960, WebP quality 75
- 현재 15개 파일 총 용량: 약 1.24MB, 개별 최대 약 106KB
- 카드의 1:1 표현은 중앙 크롭으로 처리하고, 결과 카드에서는 2:3 비율을 유지한다.
- 생성물은 15장 모두 시각 확인했으며, 프레임 왜곡·문자 삽입·워터마크가 확인된 변형은 채택하지 않았다.
