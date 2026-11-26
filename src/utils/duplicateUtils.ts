import { Song } from '../types';
import { formatArtistsArray, parseArtistsString } from './artistUtils';

export type NameMatchMode = 'exact_norm' | 'similar';

export interface NameVariant {
  name: string;
  songCount: number;
  isCustom: boolean;
  isDefault: boolean;
}

export interface NameDuplicateGroup {
  id: string;
  matchKey: string;
  variants: NameVariant[];
  recommendedKeepName: string;
}

export const normalizeDuplicateText = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  const curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
};

const areSimilarNormalizedKeys = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  // Avoid merging numbered variants like "jem 1" and "jem 2"
  if (/\d$/.test(a) || /\d$/.test(b)) return false;

  // Singular / plural match (e.g. "louange" vs "louanges")
  if (a.length >= 4 && b.length >= 4) {
    if (a + 's' === b || b + 's' === a) return true;
  }

  // Single-character typo for longer names
  if (a.length >= 6 && b.length >= 6 && Math.abs(a.length - b.length) <= 1) {
    return levenshteinDistance(a, b) <= 1;
  }

  return false;
};

const capitalizationScore = (name: string): number => {
  const hasLower = /[a-zà-ÿ]/.test(name);
  const hasUpper = /[A-ZÀ-Ÿ]/.test(name);
  if (hasUpper && hasLower) return 2; // Mixed / Title Case preferred
  if (hasLower) return 1;
  return 0;
};

const sortVariantsForRecommendation = (variants: NameVariant[]): NameVariant[] => {
  return [...variants].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    if (b.songCount !== a.songCount) return b.songCount - a.songCount;
    const capDiff = capitalizationScore(b.name) - capitalizationScore(a.name);
    if (capDiff !== 0) return capDiff;
    if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  });
};

export function findNameDuplicateGroups(
  variantsMap: Map<string, NameVariant>,
  mode: NameMatchMode,
  idPrefix: string
): NameDuplicateGroup[] {
  const entries = Array.from(variantsMap.values()).filter(v => normalizeDuplicateText(v.name).length > 0);
  if (entries.length < 2) return [];

  // First group by exact normalized key
  const byNorm = new Map<string, NameVariant[]>();
  for (const v of entries) {
    const norm = normalizeDuplicateText(v.name);
    const list = byNorm.get(norm) || [];
    list.push(v);
    byNorm.set(norm, list);
  }

  let clusters: { key: string; variants: NameVariant[] }[] = [];
  if (mode === 'exact_norm') {
    byNorm.forEach((variants, key) => {
      if (variants.length >= 2) {
        clusters.push({ key, variants });
      }
    });
  } else {
    const normKeys = Array.from(byNorm.keys());
    const parent = normKeys.map((_, idx) => idx);
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const union = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    };

    for (let i = 0; i < normKeys.length; i++) {
      for (let j = i + 1; j < normKeys.length; j++) {
        if (areSimilarNormalizedKeys(normKeys[i], normKeys[j])) {
          union(i, j);
        }
      }
    }

    const groupedByRoot = new Map<number, { key: string; variants: NameVariant[] }>();
    normKeys.forEach((normKey, idx) => {
      const root = find(idx);
      const existing = groupedByRoot.get(root);
      const bucket = byNorm.get(normKey) || [];
      if (existing) {
        existing.variants.push(...bucket);
      } else {
        groupedByRoot.set(root, { key: normKey, variants: [...bucket] });
      }
    });

    groupedByRoot.forEach((cluster) => {
      if (cluster.variants.length >= 2) {
        clusters.push(cluster);
      }
    });
  }

  clusters.sort((a, b) => {
    const totalA = a.variants.reduce((acc, v) => acc + v.songCount, 0);
    const totalB = b.variants.reduce((acc, v) => acc + v.songCount, 0);
    if (totalB !== totalA) return totalB - totalA;
    return a.key.localeCompare(b.key, 'fr');
  });

  return clusters.map((cluster, idx) => {
    const sorted = sortVariantsForRecommendation(cluster.variants);
    return {
      id: `${idPrefix}_${idx + 1}`,
      matchKey: cluster.key,
      variants: sorted,
      recommendedKeepName: sorted[0].name
    };
  });
}

export function collectArtistVariants(
  songs: Song[],
  customArtists: string[],
  defaultArtists: string[]
): Map<string, NameVariant> {
  const map = new Map<string, NameVariant>();
  const ensure = (rawName: string): NameVariant | null => {
    const name = rawName.trim();
    if (!name) return null;
    let item = map.get(name);
    if (!item) {
      item = { name, songCount: 0, isCustom: false, isDefault: false };
      map.set(name, item);
    }
    return item;
  };

  defaultArtists.forEach(a => {
    const item = ensure(a);
    if (item) item.isDefault = true;
  });
  customArtists.forEach(a => {
    const item = ensure(a);
    if (item) item.isCustom = true;
  });
  songs.forEach(song => {
    const uniqueInSong = new Set(parseArtistsString(song.artist));
    uniqueInSong.forEach(a => {
      const item = ensure(a);
      if (item) item.songCount += 1;
    });
  });

  return map;
}

export function collectCategoryVariants(
  songs: Song[],
  customCategories: string[],
  defaultCategories: string[],
  hiddenCategories: string[] = []
): Map<string, NameVariant> {
  const hiddenSet = new Set(hiddenCategories);
  const map = new Map<string, NameVariant>();
  const ensure = (rawName: string): NameVariant | null => {
    const name = rawName.trim();
    if (!name) return null;
    let item = map.get(name);
    if (!item) {
      item = { name, songCount: 0, isCustom: false, isDefault: false };
      map.set(name, item);
    }
    return item;
  };

  defaultCategories.forEach(c => {
    if (hiddenSet.has(c)) return;
    const item = ensure(c);
    if (item) item.isDefault = true;
  });
  customCategories.forEach(c => {
    const item = ensure(c);
    if (item) item.isCustom = true;
  });
  songs.forEach(song => {
    const uniqueInSong = new Set((song.tags || []).map(t => (t || '').trim()).filter(Boolean));
    uniqueInSong.forEach(c => {
      const item = ensure(c);
      if (item) item.songCount += 1;
    });
  });

  return map;
}

export function buildArtistMergeUpdates(
  songs: Song[],
  replacementMap: Record<string, string>
): Array<{ id: string; artist: string }> {
  const updates: Array<{ id: string; artist: string }> = [];

  for (const song of songs) {
    const parsed = parseArtistsString(song.artist);
    if (parsed.length === 0) continue;

    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const rawArtist of parsed) {
      const nextName = (replacementMap[rawArtist] ?? rawArtist).trim();
      if (nextName && !seen.has(nextName)) {
        seen.add(nextName);
        deduped.push(nextName);
      }
    }

    const nextArtistString = formatArtistsArray(deduped);
    if (nextArtistString !== (song.artist || '')) {
      updates.push({ id: song.id, artist: nextArtistString });
    }
  }

  return updates;
}

export function buildCategoryMergeUpdates(
  songs: Song[],
  replacementMap: Record<string, string>
): Array<{ id: string; tags: string[] }> {
  const updates: Array<{ id: string; tags: string[] }> = [];

  for (const song of songs) {
    const originalTags = song.tags || [];
    if (originalTags.length === 0) continue;

    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const rawTag of originalTags) {
      const trimmed = (rawTag || '').trim();
      if (!trimmed) continue;
      const nextTag = (replacementMap[trimmed] ?? trimmed).trim();
      if (nextTag && !seen.has(nextTag)) {
        seen.add(nextTag);
        deduped.push(nextTag);
      }
    }

    const changed =
      deduped.length !== originalTags.length ||
      deduped.some((t, i) => t !== originalTags[i]);

    if (changed) {
      updates.push({ id: song.id, tags: deduped });
    }
  }

  return updates;
}

export function cleanCustomNameList(
  customList: string[],
  replacementMap: Record<string, string>
): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const raw of customList) {
    const trimmed = (raw || '').trim();
    if (!trimmed) continue;
    const mapped = (replacementMap[trimmed] ?? trimmed).trim();
    if (mapped && !seen.has(mapped)) {
      seen.add(mapped);
      deduped.push(mapped);
    }
  }

  return deduped;
}
