"use client";

import { useEffect } from "react";
import { unlockCharacter } from "@/lib/characterCollection";

/** 사주 결과를 확인한 순간 해당 정령을 브라우저 도감에 기록한다. */
export function CollectionTracker({ characterId }: { readonly characterId: string }) {
  useEffect(() => {
    unlockCharacter(characterId);
  }, [characterId]);

  return null;
}
