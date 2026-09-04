import { Song } from '../types';

export interface LanguageOption {
  code: string;
  name: string;
  flagEmoji?: string;
  badgeClass: string;
}

export const PRESET_LANGUAGES: LanguageOption[] = [
  { code: 'FR', name: 'Français', badgeClass: 'bg-blue-600/20 text-blue-300 border-blue-500/40' },
  { code: 'EN', name: 'Anglais', badgeClass: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40' },
  { code: 'ES', name: 'Espagnol', badgeClass: 'bg-amber-600/20 text-amber-300 border-amber-500/40' },
  { code: 'PT', name: 'Portugais', badgeClass: 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40' },
  { code: 'DE', name: 'Allemand', badgeClass: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40' },
  { code: 'IT', name: 'Italien', badgeClass: 'bg-rose-600/20 text-rose-300 border-rose-500/40' },
  { code: 'HE', name: 'Hébreu', badgeClass: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40' },
  { code: 'HT', name: 'Créole', badgeClass: 'bg-purple-600/20 text-purple-300 border-purple-500/40' },
  { code: 'OTHER', name: 'Autre', badgeClass: 'bg-gray-600/20 text-gray-300 border-gray-500/40' }
];

export function getLanguageMeta(langNameOrCode?: string): LanguageOption {
  if (!langNameOrCode || !langNameOrCode.trim()) {
    return {
      code: 'FR',
      name: 'Français',
      badgeClass: 'bg-blue-600/20 text-blue-300 border-blue-500/40'
    };
  }

  const normalized = langNameOrCode.trim().toLowerCase();
  const matched = PRESET_LANGUAGES.find(
    l => l.code.toLowerCase() === normalized || l.name.toLowerCase() === normalized
  );

  if (matched) return matched;

  return {
    code: langNameOrCode.slice(0, 3).toUpperCase(),
    name: langNameOrCode,
    badgeClass: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
  };
}

/**
 * Returns all songs that are linked as alternative language versions of a given song
 */
export function getLinkedSongVersions(song: Song, allSongs: Song[]): Song[] {
  if (!song || !allSongs || allSongs.length === 0) return [];

  const foundIds = new Set<string>();

  // 1. Direct links in current song
  (song.linkedSongIds || []).forEach(id => {
    if (id && id !== song.id) foundIds.add(id);
  });

  // 2. Reverse links from other songs that point to current song
  allSongs.forEach(other => {
    if (other.id !== song.id && other.linkedSongIds?.includes(song.id)) {
      foundIds.add(other.id);
    }
  });

  return allSongs.filter(s => foundIds.has(s.id) && s.id !== song.id);
}
