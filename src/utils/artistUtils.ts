export const DEFAULT_ARTIST_SUGGESTIONS = [
  'Bethel Music',
  'CityAlight',
  'Chris Tomlin',
  'Collectif Ciel',
  'Dan Luiten',
  'Darlene Zschech',
  'Elevation Worship',
  'Exo',
  'Glorious',
  'Hillsong En Français',
  'Hillsong United',
  'Hillsong Worship',
  'Impact',
  'Kari Jobe',
  'Lauren Daigle',
  'Matt Redman',
  'Paul Baloche',
  'Phil Wickham',
  'Sovereign Grace Music'
];

/**
 * Parses an artist/author string into a clean array of individual artists.
 * Handles separators like commas (,) and semicolons (;).
 */
export const parseArtistsString = (raw: string | undefined | null): string[] => {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(/[,;]+/)
    .map(a => a.trim())
    .filter(Boolean);
};

/**
 * Formats an array of artist names into a clean comma-separated string.
 */
export const formatArtistsArray = (artists: string[]): string => {
  if (!Array.isArray(artists)) return '';
  return artists
    .map(a => (a || '').trim())
    .filter(Boolean)
    .join(', ');
};

/**
 * Retrieves custom artists created by the user from localStorage.
 */
export const getCustomArtists = (): string[] => {
  try {
    const saved = localStorage.getItem('melobook_custom_artists');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

/**
 * Persists custom artists created by the user to localStorage.
 */
export const saveCustomArtists = (artists: string[]): void => {
  try {
    localStorage.setItem('melobook_custom_artists', JSON.stringify(artists));
  } catch (e) {
    console.error('Error saving custom artists:', e);
  }
};
