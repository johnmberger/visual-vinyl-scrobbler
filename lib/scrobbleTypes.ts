/**
 * Shared scrobble UI types — used by Camera, Library, and confirmation modal.
 * Keep these in one place so juniors don't hunt across components.
 */

export type TracklistTrack = {
  position: string;
  title: string;
  duration?: string;
};

export type TracklistSide = {
  side: string;
  tracks: TracklistTrack[];
  label: string;
};

export type LastFmVerification = {
  verified: boolean;
  message?: string;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  hasTracklist?: boolean;
  trackCount?: number;
  isSingleTrack?: boolean;
};

export type PendingScrobble = {
  artist: string;
  album: string;
  albumTitle: string;
  image?: string;
  matchMethod?: string;
  confidence?: string;
  discogsRelease?: any;
};

export type ScrobbleSuccess = {
  artist: string;
  album: string;
  trackCount?: number;
};

export type RecognitionError = {
  type: "not_found" | "general" | "gemini";
  message: string;
  capturedImage?: string;
};
