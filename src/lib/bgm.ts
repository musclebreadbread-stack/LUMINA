export interface BgmTrack {
  readonly id: string;
  readonly src: string;
}

/**
 * The whole site shares one playlist: tracks play back-to-back in this order and
 * loop from the top once the last one ends. See BgmControl for the playback logic.
 */
export const BGM_PLAYLIST: readonly BgmTrack[] = Object.freeze([
  { id: "track-1", src: "/audio/bgm/track-1.mp3" },
  { id: "track-2", src: "/audio/bgm/track-2.mp3" },
]);
