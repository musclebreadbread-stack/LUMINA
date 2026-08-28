import type { DeviceCapability } from "@engine/cognitive-standardized/types";
import { evaluateEligibility } from "@/lib/cognitiveEligibility";

interface DeviceCheckProps {
  readonly capability: DeviceCapability;
  readonly locale?: "ko" | "en";
}

const reasonCopy = {
  ko: {
    ready: "현재 장치 조건이 파일럿 평가에 적합합니다.",
    unsupported_input_device: "처리 속도 영역은 키보드와 포인터가 있는 큰 화면에서만 기록합니다.",
    insufficient_viewport: "창을 넓힌 뒤 다시 확인해 주세요.",
    unsupported_locale: "지원 언어 설정을 확인해 주세요.",
  },
  en: {
    ready: "This device meets the pilot conditions.",
    unsupported_input_device: "Processing speed is recorded only with a keyboard, pointer and larger screen.",
    insufficient_viewport: "Increase the viewport size and check again.",
    unsupported_locale: "Check that a supported language is selected.",
  },
} as const;

/** 브라우저 전역을 읽지 않고 서버가 전달한 장치 능력만 보여 주는 안내 컴포넌트. */
export function DeviceCheck({ capability, locale = "ko" }: DeviceCheckProps) {
  const result = evaluateEligibility(capability);
  const copy = reasonCopy[locale];
  const message = result.reason === null ? copy.ready : copy[result.reason];
  return (
    <p role="status" className="border-l border-hobun pl-3 text-sm leading-relaxed text-hobun-dim">
      {message}
    </p>
  );
}
