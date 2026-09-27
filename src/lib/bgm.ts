export interface BgmTrack {
  readonly id: string;
  readonly src: string;
}

/** One supplied soundtrack is shared across every exploration area. */
export const BGM_PLAYLIST: readonly BgmTrack[] = Object.freeze([
  { id: "digital-observatory", src: "/audio/bgm/digital-observatory.mp3" },
]);
