import { DiscogsRelease } from "./discogs";

export type SortOption =
  | "artist-asc"
  | "artist-desc"
  | "title-asc"
  | "title-desc"
  | "year-desc"
  | "year-asc";

/**
 * Filters albums by search query
 */
export function filterAlbums(
  albums: DiscogsRelease[],
  searchQuery: string
): DiscogsRelease[] {
  if (!searchQuery) return albums;

  const query = searchQuery.toLowerCase();
  return albums.filter((album) => {
    if (!album.basic_information) return false;
    const artist =
      album.basic_information.artists[0]?.name?.toLowerCase() || "";
    const title = album.basic_information.title?.toLowerCase() || "";
    return artist.includes(query) || title.includes(query);
  });
}

/**
 * Sorts albums by the specified sort option
 */
export function sortAlbums(
  albums: DiscogsRelease[],
  sortBy: SortOption
): DiscogsRelease[] {
  return [...albums].sort((a, b) => {
    if (!a.basic_information || !b.basic_information) return 0;
    const artistA = a.basic_information.artists[0]?.name || "";
    const artistB = b.basic_information.artists[0]?.name || "";
    const titleA = a.basic_information.title || "";
    const titleB = b.basic_information.title || "";
    const yearA = a.basic_information.year || 0;
    const yearB = b.basic_information.year || 0;

    switch (sortBy) {
      case "artist-asc":
        return artistA.localeCompare(artistB);
      case "artist-desc":
        return artistB.localeCompare(artistA);
      case "title-asc":
        return titleA.localeCompare(titleB);
      case "title-desc":
        return titleB.localeCompare(titleA);
      case "year-desc":
        return yearB - yearA;
      case "year-asc":
        return yearA - yearB;
      default:
        return 0;
    }
  });
}

/**
 * Filters and sorts albums
 */
export function filterAndSortAlbums(
  albums: DiscogsRelease[],
  searchQuery: string,
  sortBy: SortOption
): DiscogsRelease[] {
  const filtered = filterAlbums(albums, searchQuery);
  return sortAlbums(filtered, sortBy);
}
