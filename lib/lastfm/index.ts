/**
 * Last.fm client — split by concern:
 *   types.ts  — shared shapes
 *   auth.ts   — mobile session
 *   search.ts — track/album lookup + cover URLs
 *   scrobble.ts — write path
 */

export type {
  LastFmTrack,
  LastFmTrackInfo,
  LastFmAlbumInfo,
} from "./types";

export {
  searchLastFmTrack,
  searchLastFmAlbum,
  getLastFmAlbumCoverUrl,
} from "./search";

export { scrobbleTrack, scrobbleTracks, scrobbleAlbum } from "./scrobble";
