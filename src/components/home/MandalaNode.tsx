"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode, CSSProperties } from "react";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import type { MandalaNodeModel } from "@/lib/mandalaModel";
import { useSajuReveal } from "./SajuRevealContext";

interface Props {
  readonly node: MandalaNodeModel;
  readonly title: string;
  readonly desc: string;
  readonly tierBadge: ReactNode;
  readonly cta: string;
}

type MandalaStyle = CSSProperties & Record<`--mandala-${string}`, string>;

export function MandalaNode({ node, title, desc, tierBadge, cta }: Props) {
  const { reveal } = useSajuReveal();
  const isSaju = node.key === "saju";
  const descriptionId = `mandala-${node.key}-description`;
  const style: MandalaStyle = {
    "--mandala-angle": `${node.displayLongitude}deg`,
    "--mandala-counter-angle": `${-node.displayLongitude}deg`,
    "--mandala-duration": `${node.visualDurationSeconds}s`,
    "--mandala-inset": `${node.orbitInset}%`,
  };

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!isSaju) return;
    event.preventDefault();
    reveal();
    requestAnimationFrame(() => {
      document.getElementById("birth-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div
      className={`mandala-orbit ${node.retrograde ? "mandala-orbit-retrograde" : ""}`}
      style={style}
      data-planet={node.planetKey}
      data-retrograde={node.retrograde ? "true" : "false"}
    >
      <div className="mandala-orbit-node">
        <Link
          href={node.href}
          onClick={handleClick}
          className="mandala-node-link group"
          aria-describedby={descriptionId}
        >
          <span className="mandala-node-image">
            <MotionSafeImage
              src={node.imageSrc}
              alt=""
              sizes="(min-width: 768px) 112px, 72px"
              priority={node.key === "saju"}
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              fallbackLabel={title}
            />
          </span>
          <span className="mandala-node-copy">
            <span className="mandala-node-planet" aria-hidden>
              {node.sign.symbol} {node.planetKey}
              {node.retrograde ? " · R" : ""}
            </span>
            <span className="mandala-node-title">{title}</span>
            <span className="mandala-node-tier">{tierBadge}</span>
            <span className="mandala-node-cta">{cta} ↗</span>
          </span>
          <span id={descriptionId} className="sr-only">
            {desc}
          </span>
        </Link>
      </div>
    </div>
  );
}
