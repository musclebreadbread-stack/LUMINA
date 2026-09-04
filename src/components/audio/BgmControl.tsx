"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BGM_PLAYLIST } from "@/lib/bgm";
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
  const enabled = useSyncExternalStore(
    subscribeBgmPreference,
    getBgmPreferenceSnapshot,
    getBgmPreferenceServerSnapshot,
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackIndexRef = useRef(0);
  const isActiveRef = useRef(false);
  const playRequestRef = useRef(0);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);

  const playTrackAt = useCallback((index: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const trackIndex = index % BGM_PLAYLIST.length;
    const track = BGM_PLAYLIST[trackIndex];
    if (!track) return;

    trackIndexRef.current = trackIndex;
    isActiveRef.current = true;
    audio.pause();
    audio.currentTime = 0;
    audio.src = track.src;
    audio.load();
    audio.loop = false;
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
    isActiveRef.current = false;
    setPlaybackBlocked(false);
  }, []);

  // Chains the playlist: each track advances to the next on completion and wraps
  // back to the first once the last one ends, so the two tracks loop indefinitely.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => playTrackAt(trackIndexRef.current + 1);
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [playTrackAt]);

  useEffect(() => {
    if (enabled) {
      // The toggle handler starts playback in the user-gesture call stack. This
      // guard prevents the following state effect from issuing a duplicate play()
      // for the same enable action while still handling the persisted opt-in.
      if (!isActiveRef.current) playTrackAt(trackIndexRef.current);
    } else if (isActiveRef.current) {
      stopTrack();
    }
  }, [enabled, playTrackAt, stopTrack]);

  useEffect(() => () => stopTrack(), [stopTrack]);

  function handleToggle(): void {
    if (enabled && playbackBlocked) {
      // A blocked play() can be retried directly from this user gesture.
      playTrackAt(trackIndexRef.current);
      return;
    }

    const nextEnabled = !enabled;
    setBgmPreference(nextEnabled);
    if (nextEnabled) {
      playTrackAt(trackIndexRef.current);
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
    <div className="bgm-control no-print fixed right-4 top-4 z-[80] sm:right-6 sm:top-5">
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
