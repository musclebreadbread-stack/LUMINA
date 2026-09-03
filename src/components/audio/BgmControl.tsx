"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BGM_TRACKS, bgmAreaForPath } from "@/lib/bgm";
import {
  getBgmPreferenceServerSnapshot,
  getBgmPreferenceSnapshot,
  setBgmPreference,
  subscribeBgmPreference,
} from "@/lib/bgmPreference";

const BGM_VOLUME = 0.18;

function releaseAudio(audio: HTMLAudioElement): void {
  audio.pause();
  audio.currentTime = 0;
  audio.removeAttribute("src");
  audio.load();
}

/** Small client island: browser audio and localStorage never enter the server bundle. */
export function BgmControl() {
  const t = useTranslations("bgm");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const area = bgmAreaForPath(pathname, searchParams.toString());
  const track = BGM_TRACKS[area];
  const enabled = useSyncExternalStore(
    subscribeBgmPreference,
    getBgmPreferenceSnapshot,
    getBgmPreferenceServerSnapshot,
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentSrcRef = useRef<string | null>(null);
  const playRequestRef = useRef(0);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);

  const startTrack = useCallback((src: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentSrcRef.current !== src) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = src;
      audio.load();
      currentSrcRef.current = src;
    }

    audio.loop = true;
    audio.volume = BGM_VOLUME;
    const requestId = ++playRequestRef.current;
    void audio
      .play()
      .then(() => {
        if (playRequestRef.current === requestId) setPlaybackBlocked(false);
      })
      .catch(() => {
        if (playRequestRef.current === requestId) setPlaybackBlocked(true);
      });
  }, []);

  const stopTrack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    playRequestRef.current += 1;
    releaseAudio(audio);
    currentSrcRef.current = null;
    setPlaybackBlocked(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      // The toggle handler starts the first track in the user-gesture call
      // stack. This guard prevents the following state effect from issuing a
      // duplicate play() while still handling route changes and persisted opt-in.
      if (currentSrcRef.current !== track.src) startTrack(track.src);
    } else if (currentSrcRef.current !== null) {
      stopTrack();
    }
  }, [enabled, startTrack, stopTrack, track.src]);

  useEffect(() => () => stopTrack(), [stopTrack]);

  function handleToggle(): void {
    if (enabled && playbackBlocked) {
      // A blocked play() can be retried directly from this user gesture.
      startTrack(track.src);
      return;
    }

    const nextEnabled = !enabled;
    setBgmPreference(nextEnabled);
    if (nextEnabled) {
      startTrack(track.src);
    } else {
      stopTrack();
    }
  }

  const buttonLabel = enabled
    ? playbackBlocked
      ? t("retry")
      : t("turnOff")
    : t("turnOn");

  return (
    <div className="bgm-control no-print fixed right-4 top-4 z-[80] sm:right-6 sm:top-5" data-bgm-area={area}>
      <button
        type="button"
        className="theme-control inline-flex min-h-11 items-center gap-2 border border-ink-700 bg-ink-950/85 px-3 py-2 font-mono text-[11px] tracking-[0.12em] text-hobun-dim shadow-lg shadow-black/20 backdrop-blur-md transition-colors hover:text-hobun"
        aria-label={buttonLabel}
        aria-pressed={enabled}
        data-testid="bgm-toggle"
        title={buttonLabel}
        onClick={handleToggle}
      >
        <span aria-hidden="true" className="text-sm leading-none text-signal">
          {enabled ? "♫" : "♩"}
        </span>
        <span>{t("label")}</span>
        <span className="text-[10px] text-hobun-faint">{enabled ? t("on") : t("off")}</span>
      </button>
      <audio ref={audioRef} aria-hidden="true" className="sr-only" preload="none" />
    </div>
  );
}
