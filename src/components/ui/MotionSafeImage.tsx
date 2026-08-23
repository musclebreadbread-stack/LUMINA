"use client";

import Image from "next/image";
import { useState } from "react";

interface Props {
  readonly src: string;
  readonly alt: string;
  readonly sizes: string;
  readonly className?: string;
  readonly priority?: boolean;
  readonly fallbackLabel?: string;
}

/** 이미지 오류·저동작 환경에서도 비어 보이지 않는 fill 이미지 래퍼. */
export function MotionSafeImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
  fallbackLabel,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="motion-safe-image-fallback absolute inset-0 flex items-center justify-center p-5 text-center"
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
      >
        <span className="font-hanja text-4xl text-hobun/70" aria-hidden={!alt}>
          {fallbackLabel ?? "LUMINA"}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
