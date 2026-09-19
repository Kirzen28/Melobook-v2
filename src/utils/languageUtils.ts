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
 * Cleans song text by stripping ChordPro directives, inline chords [Am], comments, and punctuation.
 */
export function cleanSongLyrics(text: string = ''): string {
  if (!text) return '';
  return text
    // Remove ChordPro bracketed chords: [Am], [C#m7/E], etc.
    .replace(/\[[^\]]*\]/g, ' ')
    // Remove ChordPro directives: {title: ...}, {c: ...}, {soc}, {eoc}, etc.
    .replace(/\{[^}]*\}/g, ' ')
    // Remove common special chars but keep accents and language characters
    .replace(/[,.;:!?"'’«»()\-–—_*/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Dictionaries of language markers (words and character triggers)
const LANGUAGE_PROFILES: {
  name: string;
  code: string;
  charRegex?: RegExp;
  words: string[];
  exclusiveWords?: string[];
}[] = [
  {
    name: 'Hébreu',
    code: 'HE',
    charRegex: /[\u0590-\u05FF]/,
    words: [
      'adonai', 'elohim', 'yeshua', 'kadosh', 'baruch', 'shalom', 'hoshiana',
      'halleluyah', 'ruach', 'melech', 'tzion', 'israel', 'hashem', 'yahweh'
    ],
    exclusiveWords: ['adonai', 'kadosh', 'baruch', 'hoshiana', 'tzion', 'ruach']
  },
  {
    name: 'Français',
    code: 'FR',
    charRegex: /[éèêëàâçùûîïœæ]/i,
    words: [
      'le', 'la', 'les', 'un', 'une', 'des', 'du', 'dans', 'pour', 'avec',
      'sur', 'par', 'nous', 'vous', 'ils', 'elles', 'mon', 'ton', 'son',
      'notre', 'votre', 'leur', 'seigneur', 'dieu', 'jésus', 'grâce', 'amour',
      'gloire', 'saint', 'coeur', 'céleste', 'roi', 'père', 'louange', 'croix',
      'chantez', 'voici', 'viens', 'ciel', 'terre', 'vie', 'foi', 'tout',
      'tous', 'toute', 'toutes', 'mais', 'plus', 'aussi', 'car', 'sauveur',
      'béni', 'bénisse', 'adorer', 'majesté', 'merveilleux', 'fidèle', 'jamais'
    ],
    exclusiveWords: [
      'seigneur', 'grâce', 'céleste', 'louange', 'voici', 'viens', 'dans',
      'avec', 'notre', 'votre', 'leur', 'chantez', 'béni', 'sauveur'
    ]
  },
  {
    name: 'Anglais',
    code: 'EN',
    words: [
      'the', 'and', 'you', 'your', 'my', 'our', 'their', 'his', 'her', 'we',
      'they', 'he', 'she', 'it', 'me', 'us', 'in', 'on', 'at', 'to', 'for',
      'with', 'from', 'by', 'of', 'lord', 'god', 'jesus', 'christ', 'grace',
      'love', 'glory', 'holy', 'heart', 'heaven', 'king', 'father', 'praise',
      'cross', 'sing', 'behold', 'come', 'earth', 'life', 'faith', 'all',
      'every', 'worthy', 'light', 'shine', 'name', 'mercy', 'savior', 'forever',
      'reign', 'blessed', 'worship', 'power', 'praising', 'hallelujah'
    ],
    exclusiveWords: [
      'the', 'you', 'your', 'with', 'lord', 'holy', 'heaven', 'praise',
      'worthy', 'forever', 'savior', 'worship'
    ]
  },
  {
    name: 'Espagnol',
    code: 'ES',
    charRegex: /[ñ¿¡áéíóú]/i,
    words: [
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'del', 'en',
      'para', 'por', 'con', 'sin', 'sobre', 'nosotros', 'vosotros', 'ellos',
      'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'nuestro', 'nuestra', 'señor',
      'dios', 'jesús', 'cristo', 'gracia', 'amor', 'gloria', 'santo', 'santa',
      'corazón', 'cielo', 'rey', 'padre', 'alabanza', 'cruz', 'canta', 'ven',
      'tierra', 'vida', 'fe', 'todo', 'todos', 'toda', 'todas', 'pero', 'más',
      'hoy', 'siempre', 'digno', 'nombre', 'aleluya', 'salvador', 'bendito'
    ],
    exclusiveWords: [
      'señor', 'corazón', 'alabanza', 'nosotros', 'nuestro', 'nuestra', 'canta',
      'siempre', 'salvador', 'digno'
    ]
  },
  {
    name: 'Créole',
    code: 'HT',
    words: [
      'mwen', 'ou', 'li', 'nou', 'yo', 'sa', 'yon', 'nan', 'pou', 'ak',
      'avek', 'pa', 'se', 'te', 'ap', 'va', 'pral', 'senyè', 'bondye',
      'jezi', 'gras', 'lanmou', 'glwa', 'sen', 'kè', 'syèl', 'wa', 'papa',
      'louwanj', 'lakwa', 'chante', 'vini', 'latè', 'lavi', 'lafwa', 'tout',
      'men', 'toujou', 'sovè', 'adore', 'alelouya', 'konnen', 'fidel'
    ],
    exclusiveWords: [
      'mwen', 'senyè', 'bondye', 'lanmou', 'glwa', 'louwanj', 'lakwa',
      'syèl', 'toujou', 'avek'
    ]
  },
  {
    name: 'Portugais',
    code: 'PT',
    charRegex: /[ãõçáéíóúâêô]/i,
    words: [
      'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'do', 'da', 'dos',
      'das', 'no', 'na', 'nos', 'nas', 'em', 'para', 'por', 'com', 'sem',
      'sobre', 'nós', 'eles', 'você', 'meu', 'minha', 'teu', 'tua', 'seu',
      'sua', 'nosso', 'nossa', 'senhor', 'deus', 'jesus', 'cristo', 'graça',
      'amor', 'glória', 'santo', 'santa', 'coração', 'céu', 'rei', 'pai',
      'louvor', 'cruz', 'cantar', 'vem', 'terra', 'vida', 'fé', 'tudo',
      'todos', 'toda', 'todas', 'mas', 'mais', 'hoje', 'sempre', 'digno',
      'nome', 'não', 'está', 'aleluia', 'salvador', 'bendito'
    ],
    exclusiveWords: [
      'louvor', 'coração', 'você', 'minha', 'não', 'nosso', 'nossa',
      'tudo', 'sempre'
    ]
  },
  {
    name: 'Allemand',
    code: 'DE',
    charRegex: /[äöüß]/i,
    words: [
      'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einem',
      'einen', 'einer', 'eines', 'und', 'in', 'von', 'zu', 'mit', 'auf',
      'für', 'wir', 'ihr', 'sie', 'ich', 'du', 'er', 'mein', 'dein',
      'sein', 'unser', 'herr', 'gott', 'jesus', 'christus', 'gnade',
      'liebe', 'ehre', 'heilig', 'herz', 'himmel', 'könig', 'vater',
      'lob', 'kreuz', 'singen', 'komm', 'erde', 'leben', 'glaube',
      'alle', 'aber', 'immer', 'halleluja', 'amen'
    ],
    exclusiveWords: [
      'herr', 'gnade', 'heilig', 'himmel', 'könig', 'unser', 'nicht'
    ]
  },
  {
    name: 'Italien',
    code: 'IT',
    words: [
      'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'del',
      'dello', 'della', 'dei', 'degli', 'delle', 'nel', 'nello', 'nella',
      'nei', 'negli', 'nelle', 'per', 'con', 'su', 'noi', 'voi', 'loro',
      'mio', 'tuo', 'suo', 'nostro', 'signore', 'dio', 'gesù', 'cristo',
      'grazia', 'amore', 'gloria', 'santo', 'santa', 'cuore', 'cielo',
      're', 'padre', 'lode', 'croce', 'cantare', 'vieni', 'terra',
      'vita', 'fede', 'tutto', 'tutti', 'tutta', 'tutte', 'ma', 'sempre',
      'degno', 'nome', 'luce'
    ],
    exclusiveWords: [
      'signore', 'cuore', 'nostro', 'degno', 'cantare', 'vieni'
    ]
  }
];

/**
 * Automatically detects the language of a song based on its title and/or lyrics/content.
 * Returns the matching language name (e.g. 'Français', 'Anglais', 'Espagnol', etc.)
 */
export function detectSongLanguage(title?: string, content?: string): string {
  const result = detectSongLanguageWithConfidence(title, content);
  return result.language;
}

/**
 * Returns detailed detection outcome including score and confidence.
 */
export function detectSongLanguageWithConfidence(
  title?: string,
  content?: string
): { language: string; confidence: number; detectedFrom: 'title' | 'content' | 'both' | 'default' } {
  const cleanTitle = cleanSongLyrics(title || '').toLowerCase();
  const cleanContent = cleanSongLyrics(content || '').toLowerCase();

  // Fast check: Hebrew alphabet characters
  if (/[\u0590-\u05FF]/.test(cleanTitle) || /[\u0590-\u05FF]/.test(cleanContent)) {
    return { language: 'Hébreu', confidence: 0.99, detectedFrom: cleanTitle && cleanContent ? 'both' : 'title' };
  }

  // If both empty, fallback to Français
  if (!cleanTitle && !cleanContent) {
    return { language: 'Français', confidence: 0, detectedFrom: 'default' };
  }

  const titleWords = cleanTitle ? cleanTitle.split(/\s+/).filter(w => w.length >= 2) : [];
  const contentWords = cleanContent ? cleanContent.split(/\s+/).filter(w => w.length >= 2) : [];
  const allWords = [...titleWords, ...contentWords];

  if (allWords.length === 0) {
    return { language: 'Français', confidence: 0, detectedFrom: 'default' };
  }

  // Word frequency map
  const wordCounts = new Map<string, number>();
  for (const w of allWords) {
    wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
  }

  const scores: { [key: string]: { total: number; titleHits: number; contentHits: number } } = {};

  LANGUAGE_PROFILES.forEach(profile => {
    let score = 0;
    let titleHits = 0;
    let contentHits = 0;

    const wordSet = new Set(profile.words);
    const exclusiveSet = new Set(profile.exclusiveWords || []);

    // Check title hits (higher weight because titles are very descriptive)
    for (const tw of titleWords) {
      if (exclusiveSet.has(tw)) {
        score += 8;
        titleHits += 2;
      } else if (wordSet.has(tw)) {
        score += 4;
        titleHits += 1;
      }
    }

    // Check content hits
    for (const [cw, count] of wordCounts.entries()) {
      if (exclusiveSet.has(cw)) {
        score += count * 4;
        contentHits += count;
      } else if (wordSet.has(cw)) {
        score += count * 2;
        contentHits += count;
      }
    }

    // Check specific diacritics / characters
    if (profile.charRegex) {
      const titleMatches = (cleanTitle.match(profile.charRegex) || []).length;
      const contentMatches = (cleanContent.match(profile.charRegex) || []).length;
      score += titleMatches * 3 + Math.min(contentMatches * 2, 20);
    }

    scores[profile.name] = { total: score, titleHits, contentHits };
  });

  // Find highest scoring profile
  let bestLang = 'Français';
  let bestScore = -1;
  let secondScore = -1;

  for (const [langName, data] of Object.entries(scores)) {
    if (data.total > bestScore) {
      secondScore = bestScore;
      bestScore = data.total;
      bestLang = langName;
    } else if (data.total > secondScore) {
      secondScore = data.total;
    }
  }

  // If score is 0 or very ambiguous, default to Français
  if (bestScore <= 2) {
    return { language: 'Français', confidence: 0.3, detectedFrom: 'default' };
  }

  const confidence = Math.min(1, Math.round(((bestScore - Math.max(0, secondScore)) / Math.max(bestScore, 1) + 0.4) * 100) / 100);
  const bestData = scores[bestLang];
  const detectedFrom = (bestData.titleHits > 0 && bestData.contentHits > 0)
    ? 'both'
    : (bestData.titleHits > 0 ? 'title' : 'content');

  return { language: bestLang, confidence, detectedFrom };
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
