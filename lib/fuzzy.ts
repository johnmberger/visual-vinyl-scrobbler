/**
 * Fuzzy string matching helpers for album/artist name comparison.
 */

export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^the\s+/i, "")
    .replace(/\([^)]*\)/g, " ") // strip parentheticals: (Remastered), (Deluxe), etc.
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b(remaster(ed)?|deluxe|expanded|anniversary|edition|reissue|bonus|tracks?)\b/gi, " ")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(name: string): string[] {
  return normalizeName(name)
    .split(/[\s-]+/)
    .filter(Boolean)
    .sort();
}

/** Dice coefficient over character bigrams */
function bigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const bigrams = (s: string): Map<string, number> => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      map.set(bg, (map.get(bg) || 0) + 1);
    }
    return map;
  };

  const aMap = bigrams(a);
  const bMap = bigrams(b);
  if (aMap.size === 0 || bMap.size === 0) {
    return a === b ? 1 : 0;
  }

  let intersection = 0;
  for (const [bg, count] of aMap) {
    const other = bMap.get(bg) || 0;
    intersection += Math.min(count, other);
  }

  const aTotal = [...aMap.values()].reduce((s, n) => s + n, 0);
  const bTotal = [...bMap.values()].reduce((s, n) => s + n, 0);
  return (2 * intersection) / (aTotal + bTotal);
}

/** Token-set similarity: overlap of sorted unique tokens + bigram fallback */
export function stringSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = Math.min(na.length, nb.length);
    const longer = Math.max(na.length, nb.length);
    return 0.85 + 0.15 * (shorter / longer);
  }

  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.length === 0 || tb.length === 0) return bigramSimilarity(na, nb);

  const setA = new Set(ta);
  const setB = new Set(tb);
  let overlap = 0;
  for (const t of setA) {
    if (setB.has(t)) overlap++;
  }
  const tokenScore = (2 * overlap) / (setA.size + setB.size);
  const sortedA = ta.join(" ");
  const sortedB = tb.join(" ");
  const bigramScore = bigramSimilarity(sortedA, sortedB);

  return Math.max(tokenScore, bigramScore);
}

export interface FuzzyAlbumMatch<T> {
  item: T;
  score: number;
  artistScore: number;
  albumScore: number;
}

/**
 * Rank items by combined artist+album fuzzy score.
 * Requires both sides to clear a minimum threshold.
 */
export function rankFuzzyMatches<T>(
  items: T[],
  artist: string,
  album: string,
  getArtist: (item: T) => string,
  getAlbum: (item: T) => string,
  options?: { minScore?: number; limit?: number }
): FuzzyAlbumMatch<T>[] {
  const minScore = options?.minScore ?? 0.55;
  const limit = options?.limit ?? 10;

  const ranked: FuzzyAlbumMatch<T>[] = [];

  for (const item of items) {
    const artistScore = stringSimilarity(artist, getArtist(item));
    const albumScore = stringSimilarity(album, getAlbum(item));
    // Album title usually more distinctive; weight slightly higher
    const score = artistScore * 0.45 + albumScore * 0.55;
    if (score >= minScore && artistScore >= 0.4 && albumScore >= 0.4) {
      ranked.push({ item, score, artistScore, albumScore });
    }
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}
