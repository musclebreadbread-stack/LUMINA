import { getLocale } from "next-intl/server";
import { ELEMENT_STYLE } from "@/lib/elements";
import type { CharacterDef } from "@engine/characters";
import type { FiveElement } from "@engine/saju";

/**
 * 오행 정령 — 전각(篆刻) 인장 속에 앉힌 캐릭터.
 *
 * 귀여운 마스코트를 따로 그려 붙이면 탁본·상감이라는 화면의 결과 어긋난다.
 * 그래서 도장 안에 새긴 도상으로 그렸다 — 몸통은 다섯 오행이 공통으로 쓰고,
 * 머리 위 형상과 표정만 오행·세력에 따라 달라진다. 외부 에셋이 없으므로
 * 폰트처럼 색만 바꿔 어디에나 놓을 수 있고 PDF에서도 깨지지 않는다.
 */

/** 다섯 정령이 공통으로 쓰는 몸통. 얼굴이 들어갈 자리를 확보한 형태다. */
const BODY =
  "M60 30 C78 30 90 43 90 61 C90 81 77 96 60 96 C43 96 30 81 30 61 C30 43 42 30 60 30 Z";

/** 머리 위 형상 — 오행을 구분하는 유일한 실루엣이다. */
const CROWN: Readonly<Record<FiveElement, string>> = Object.freeze({
  // 木 — 좌우로 뻗은 두 잎
  wood: "M60 32 L60 14 M60 20 C52 20 46 15 44 9 C52 8 58 12 60 18 M60 20 C68 20 74 15 76 9 C68 8 62 12 60 18",
  // 火 — 세 갈래 불꽃
  fire: "M60 31 C57 24 52 20 50 12 C56 15 59 18 60 21 C61 15 64 10 68 6 C68 14 72 18 72 24 C72 27 71 29 70 31",
  // 土 — 너른 갓
  earth: "M36 26 L84 26 M60 26 L60 32 M44 20 L76 20",
  // 金 — 종의 고리
  metal: "M60 30 L60 24 M60 24 C54 24 50 20 50 15 C50 10 54 6 60 6 C66 6 70 10 70 15 C70 20 66 24 60 24 Z",
  // 水 — 맺힌 물방울
  water: "M60 30 C60 24 54 20 54 14 C54 9 57 5 60 5 C63 5 66 9 66 14 C66 20 60 24 60 30 Z",
});

/** 몸통 안쪽에 얕게 새기는 결. 오행마다 다르다. */
const GRAIN: Readonly<Record<FiveElement, string>> = Object.freeze({
  wood: "M60 82 L60 92 M52 86 L60 90 M68 86 L60 90",
  fire: "M52 86 C56 82 56 90 60 86 C64 82 64 90 68 86",
  earth: "M46 84 L74 84 M50 90 L70 90",
  metal: "M46 88 L74 88 M52 82 L68 82",
  water: "M46 82 C51 78 55 86 60 82 C65 78 69 86 74 82 M46 90 C51 86 55 94 60 90 C65 86 69 94 74 90",
});

interface Props {
  readonly character: CharacterDef;
  readonly size?: number;
  /** 등장 연출을 켤지. 도감처럼 여럿을 늘어놓을 때는 끈다. */
  readonly animate?: boolean;
  readonly className?: string;
}

export async function ElementSpirit({ character, size = 132, animate = false, className }: Props) {
  const locale = await getLocale();
  const style = ELEMENT_STYLE[character.element];
  const color = style.cssVar;
  const { strength } = character;
  const name = locale === "en" ? character.nameEn : character.name;
  const tagline = locale === "en" ? character.taglineEn : character.tagline;

  // 세력은 우열이 아니라 기운이 놓인 방식이다. 표정도 그렇게 갈린다.
  const eyeR = strength === "strong" ? 4.6 : strength === "balanced" ? 3.6 : 3;
  const ticks = strength === "strong" ? 8 : strength === "balanced" ? 5 : 3;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`${name}(${character.hanja}) — ${tagline}`}
    >
      {/* 인장 테두리 */}
      <circle
        className={animate ? "spirit-seal" : undefined}
        cx="60"
        cy="60"
        r="56"
        fill="none"
        stroke={color}
        strokeOpacity="0.4"
        strokeWidth="1.5"
        pathLength={1}
        strokeDasharray="1"
      />
      <circle cx="60" cy="60" r="51" fill="none" stroke={color} strokeOpacity="0.14" strokeWidth="1" />

      {/* 기운의 눈금 — 세력이 강할수록 촘촘하다 */}
      {Array.from({ length: ticks }, (_, i) => {
        const angle = ((i / ticks) * 360 - 90) * (Math.PI / 180);
        const inner = 51;
        const outer = 56;
        return (
          <line
            key={i}
            x1={60 + inner * Math.cos(angle)}
            y1={60 + inner * Math.sin(angle)}
            x2={60 + outer * Math.cos(angle)}
            y2={60 + outer * Math.sin(angle)}
            stroke={color}
            strokeOpacity="0.35"
            strokeWidth="1"
          />
        );
      })}

      <g className={animate ? "spirit-body" : undefined}>
        {/* 머리 위 형상 */}
        <path
          d={CROWN[character.element]}
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 몸통 */}
        <path d={BODY} fill={color} fillOpacity="0.16" stroke={color} strokeWidth="2" />

        {/* 몸통에 새긴 결 */}
        <path
          d={GRAIN[character.element]}
          fill="none"
          stroke={color}
          strokeOpacity="0.5"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* 표정 */}
        {strength === "weak" ? (
          <>
            <path
              d="M43 60 C46 56 52 56 55 60"
              fill="none"
              stroke={color}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M65 60 C68 56 74 56 77 60"
              fill="none"
              stroke={color}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <circle cx="49" cy="59" r={eyeR} fill={color} />
            <circle cx="71" cy="59" r={eyeR} fill={color} />
          </>
        )}

        {strength === "strong" ? (
          <path
            d="M52 71 C56 77 64 77 68 71"
            fill="none"
            stroke={color}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        ) : strength === "balanced" ? (
          <path d="M54 72 L66 72" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        ) : (
          <circle cx="60" cy="72" r="2.6" fill={color} />
        )}
      </g>
    </svg>
  );
}
