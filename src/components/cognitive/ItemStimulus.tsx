import type { CognitiveOption, Item } from "@engine/cognitive/items";
import type {
  CognitiveStimulus,
  ItemPresentation,
  PresentationOption,
} from "@engine/cognitive-standardized/types";
import type { Locale } from "@/i18n/locale";
import { MatrixCellFigure, MatrixStimulus } from "./MatrixStimulus";
import { RotationStimulus } from "./RotationStimulus";
import { MatrixBoard } from "./figures/MatrixBoard";
import { OptionFigure } from "./figures/OptionFigure";
import { SpatialSolid } from "./figures/SpatialSolid";

/**
 * 문항 변형에 맞는 자극/보기를 골라 그린다. 어떤 형식인지 아는 곳을 여기 한 군데로 모아
 * 설문 폼과 결과 복기 화면이 같은 그림을 쓰게 한다.
 *
 * 그림에 붙는 대체 텍스트는 이 컴포넌트가 짓지 않고 호출자가 넘긴다 —
 * 문구는 messages/*.json에 있어야 하고, 무엇보다 **정답을 말하지 않도록** 한 곳에서 관리해야 한다.
 *
 * "use client"를 붙이지 않은 것은 의도다(shapes.tsx 주석 참고).
 */

interface ItemStimulusProps {
  readonly item: Item;
  readonly locale: Locale;
  /** 도형 자극일 때 SVG에 붙일 문장. 문항이 무엇을 요구하는지만 말한다. */
  readonly figureLabel: string;
  /** SVG 내부 id 네임스페이스. 한 화면에 여러 문항이 있어도 겹치지 않아야 한다. */
  readonly idPrefix: string;
  readonly maxWidth?: number;
}

export function ItemStimulus({ item, locale, figureLabel, idPrefix, maxWidth }: ItemStimulusProps) {
  if (item.domain === "matrixReasoning") {
    return (
      <MatrixStimulus
        figure={item.stimulus}
        label={figureLabel}
        idPrefix={`${idPrefix}-stem`}
        maxWidth={maxWidth}
        className="text-hobun"
      />
    );
  }

  if (item.domain === "threeDimensionalRotation") {
    return (
      <RotationStimulus
        figure={item.stimulus}
        label={figureLabel}
        maxWidth={maxWidth}
        className="text-hobun"
      />
    );
  }

  // 수열 문항의 자극은 두 로케일에서 같은 기호열이지만, 분기를 따로 두지 않고 데이터를 그대로 믿는다.
  const text = locale === "en" ? item.stimulus.textEn : item.stimulus.textKo;
  const isSeries = item.domain === "letterNumberSeries";

  return (
    <p
      className={
        isSeries
          ? "tabular font-mono text-xl leading-relaxed tracking-[0.18em] text-hobun"
          : "text-base leading-relaxed text-hobun"
      }
    >
      {text}
    </p>
  );
}

interface OptionContentProps {
  readonly option: CognitiveOption;
  readonly locale: Locale;
  /** 도형 보기일 때 SVG에 붙일 문장. "보기 3번 도형"처럼 자리만 알린다. */
  readonly figureLabel: string;
  readonly idPrefix: string;
  readonly maxWidth?: number;
  readonly className?: string;
}

export function OptionContent({ option, locale, figureLabel, idPrefix, maxWidth, className }: OptionContentProps) {
  if (option.kind === "matrixCell") {
    return (
      <MatrixCellFigure
        content={option.cell}
        label={figureLabel}
        idPrefix={idPrefix}
        maxWidth={maxWidth}
        className={className}
      />
    );
  }

  if (option.kind === "polycube") {
    return <RotationStimulus figure={option.figure} label={figureLabel} maxWidth={maxWidth} className={className} />;
  }

  return <span>{locale === "en" ? option.labelEn : option.labelKo}</span>;
}

interface StandardizedStimulusProps {
  readonly stimulus: CognitiveStimulus;
  readonly locale: Locale;
  readonly label: string;
  readonly idPrefix: string;
  readonly maxWidth?: number;
  readonly className?: string;
}

/** 표준화 실행에서 쓰는 공개 자극 DTO 전용 렌더러. 정답·IRT 모수는 받지 않는다. */
export function StandardizedStimulus({ stimulus, locale, label, idPrefix, maxWidth, className }: StandardizedStimulusProps) {
  if (stimulus.kind === "text") {
    return <p className={className}>{locale === "en" ? stimulus.textEn : stimulus.textKo}</p>;
  }
  if (stimulus.kind === "matrix") {
    return <MatrixBoard figure={stimulus} label={label} idPrefix={idPrefix} maxWidth={maxWidth} className={className} />;
  }
  return <SpatialSolid cubes={stimulus.cubes} label={label} idPrefix={idPrefix} maxWidth={maxWidth} className={className} />;
}

interface StandardizedOptionContentProps {
  readonly option: PresentationOption;
  readonly locale: Locale;
  readonly figureLabel: string;
  readonly idPrefix: string;
  readonly maxWidth?: number;
  readonly className?: string;
}

export function StandardizedOptionContent({ option, locale, figureLabel, idPrefix, maxWidth, className }: StandardizedOptionContentProps) {
  if (option.figure !== null) {
    return <OptionFigure figure={option.figure} label={figureLabel} idPrefix={idPrefix} maxWidth={maxWidth} className={className} />;
  }
  return <span>{locale === "en" ? option.labelEn : option.labelKo}</span>;
}

/** ItemPresentation DTO를 받는 얇은 어댑터로, 서버/클라이언트 경계를 확인하기 쉽다. */
export function StandardizedItemStimulus({
  item,
  locale,
  label,
  idPrefix,
  maxWidth,
}: {
  readonly item: ItemPresentation;
  readonly locale: Locale;
  readonly label: string;
  readonly idPrefix: string;
  readonly maxWidth?: number;
}) {
  return <StandardizedStimulus stimulus={item.stimulus} locale={locale} label={label} idPrefix={idPrefix} maxWidth={maxWidth} />;
}
