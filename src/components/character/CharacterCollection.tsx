"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import {
  getCharacterCollectionServerSnapshot,
  getCharacterCollectionSnapshot,
  subscribeCharacterCollection,
} from "@/lib/characterCollection";

interface CharacterCard {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly artworkSrc: string;
  readonly children: ReactNode;
}

interface Props {
  readonly cards: readonly CharacterCard[];
  readonly progressLabel: string;
  readonly lockedLabel: string;
  readonly unlockedLabel: string;
  readonly lockedBody: string;
}

/** 서버에서 그린 정령을 유지하면서 브라우저 해금 상태만 작은 Client Island로 입힌다. */
export function CharacterCollection({ cards, progressLabel, lockedLabel, unlockedLabel, lockedBody }: Props) {
  const unlocked = useSyncExternalStore(
    subscribeCharacterCollection,
    getCharacterCollectionSnapshot,
    getCharacterCollectionServerSnapshot,
  );
  const unlockedSet = new Set(unlocked);

  return (
    <div className="space-y-6">
      <p className="font-mono text-[13px] text-hobun-faint">
        {progressLabel.replace("{unlocked}", String(unlocked.length)).replace("{total}", String(cards.length))}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const isUnlocked = unlockedSet.has(card.id);
          return (
            <article
              key={card.id}
              data-testid="character-card"
              data-unlocked={isUnlocked ? "true" : "false"}
              className={`relative overflow-hidden border p-5 transition-[border-color,transform,opacity] duration-300 hover:-translate-y-1 ${
                isUnlocked ? "border-ink-600 bg-ink-850/75" : "border-ink-800 bg-ink-950/65 opacity-70"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="character-atlas-thumb relative h-[92px] w-[92px] shrink-0">
                  {isUnlocked ? (
                    <>
                      <Image
                        src={card.artworkSrc}
                        alt=""
                        fill
                        sizes="92px"
                        quality={75}
                        className="character-atlas-image object-cover"
                        aria-hidden="true"
                      />
                      <div className="character-atlas-seal absolute inset-0" aria-hidden="true">
                        {card.children}
                      </div>
                    </>
                  ) : (
                    <div className="grayscale">{card.children}</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] tracking-[0.14em] text-hobun-faint">
                    {isUnlocked ? unlockedLabel : lockedLabel}
                  </p>
                  <h2 className="mt-2 text-lg font-medium text-hobun">{isUnlocked ? card.name : "•••"}</h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-hobun-dim">
                    {isUnlocked ? card.tagline : lockedBody}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
