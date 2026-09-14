export interface LastFmTrack {
  artist: string;
  track: string;
  album?: string;
  timestamp?: number;
}

export interface LastFmTrackInfo {
  name: string;
  artist: string;
  album?: string;
  mbid?: string;
}

export interface LastFmAlbumInfo {
  name: string;
  artist: string;
  tracks?: Array<{
    name: string;
    artist: string;
    duration?: string | number;
  }>;
}
