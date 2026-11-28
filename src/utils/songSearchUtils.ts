import { Song } from '../types';

/**
 * Supprime accents et diacritiques tout en conservant chiffres, ponctuation et symboles (#, /, etc.).
 */
export function normalizeAccentFree(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');
}

export function includesIgnoreAccents(haystack: string | undefined | null, needle: string): boolean {
  const q = normalizeAccentFree(needle).trim();
  if (!q) return true;
  return normalizeAccentFree(haystack).includes(q);
}

export function includesAllTokensIgnoreAccents(haystack: string | undefined | null, query: string): boolean {
  const tokens = normalizeAccentFree(query).trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const target = normalizeAccentFree(haystack);
  return tokens.every(token => target.includes(token));
}

/**
 * Normalise une chaîne de caractères pour la recherche :
 * - Minuscules
 * - Suppression des accents et diacritiques (NFD)
 * - Ligatures (œ -> oe, æ -> ae)
 * - Suppression de la ponctuation
 */
export function normalizeSearchString(str: string): string {
  if (!str) return '';
  return normalizeAccentFree(str)
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrait les paroles pures d'un texte ChordPro en retirant les directives {...} et accords [...]
 */
export function extractCleanLyrics(chordPro: string): string {
  if (!chordPro) return '';
  const withoutHashComments = chordPro.replace(/^\s*#.*$/gm, ' ');
  const withoutDirectives = withoutHashComments.replace(/\{[^}]*\}/g, ' ');
  const withoutChords = withoutDirectives.replace(/\[\*[^\]]*\]/g, ' ').replace(/\[[^\]]*\]/g, '');
  return normalizeSearchString(withoutChords);
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes courtes
 */
export function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;
  const l1 = s1.length;
  const l2 = s2.length;

  const d: number[] = new Array(l2 + 1);
  for (let i = 0; i <= l2; i++) d[i] = i;

  for (let i = 1; i <= l1; i++) {
    let prev = i - 1;
    d[0] = i;
    for (let j = 1; j <= l2; j++) {
      const temp = d[j];
      if (s1[i - 1] === s2[j - 1]) {
        d[j] = prev;
      } else {
        d[j] = Math.min(prev + 1, d[j] + 1, d[j - 1] + 1);
      }
      prev = temp;
    }
  }
  return d[l2];
}

/**
 * Tolérance aux fautes de frappe basée sur la longueur du mot
 */
function isFuzzyWordMatch(qWord: string, targetWord: string): boolean {
  if (qWord === targetWord) return true;
  if (targetWord.startsWith(qWord) || qWord.startsWith(targetWord)) return true;
  if (targetWord.includes(qWord)) return true;

  const lenDiff = Math.abs(qWord.length - targetWord.length);
  if (lenDiff > 2) return false;

  const qLen = qWord.length;
  if (qLen <= 3) {
    return false; // Pas d'erreur admise sur les mots très courts
  }

  const dist = levenshteinDistance(qWord, targetWord);
  if (qLen <= 6) {
    return dist <= 1; // 1 faute tolérée
  }
  return dist <= 2; // 2 fautes tolérées pour mots >= 7 lettres
}

/**
 * Calcule un score de pertinence (> 0 si trouvé, 0 si aucun match)
 */
export function getSongSearchScore(song: Song, rawQuery: string): number {
  const normQuery = normalizeSearchString(rawQuery);
  if (!normQuery) return 0;

  const queryWords = normQuery.split(' ').filter(Boolean);
  if (queryWords.length === 0) return 0;

  const normTitle = normalizeSearchString(song.title);
  const normArtist = normalizeSearchString(song.artist || '');
  const normAlbum = normalizeSearchString(song.album || '');
  const cleanLyrics = extractCleanLyrics(song.contentChordPro || '');
  const normTags = (song.tags || []).map(t => normalizeSearchString(t)).join(' ');
  const normLang = normalizeSearchString(song.language || '');
  const normCcli = (song.ccli || '').toLowerCase().trim();
  const normCopyright = normalizeSearchString(song.copyright || '');

  // Version compacte sans espaces pour gérer les contractions ("jaime" vs "j aime")
  const compactQuery = normQuery.replace(/\s+/g, '');
  const compactTitle = normTitle.replace(/\s+/g, '');
  const compactLyrics = cleanLyrics.replace(/\s+/g, '');

  let score = 0;

  // 1. MATCH EXACT & SOUS-CHAÎNES SUR LE TITRE
  if (normTitle === normQuery || compactTitle === compactQuery) {
    score += 10000;
  } else if (normTitle.startsWith(normQuery) || compactTitle.startsWith(compactQuery)) {
    score += 7000;
  } else if (normTitle.includes(normQuery) || compactTitle.includes(compactQuery)) {
    score += 5000;
  }

  // 2. MATCH EXACT SUR L'ARTISTE
  if (normArtist) {
    if (normArtist === normQuery) {
      score += 4000;
    } else if (normArtist.includes(normQuery)) {
      score += 2500;
    }
  }

  // 2b. MATCH SUR L'ALBUM
  if (normAlbum) {
    if (normAlbum === normQuery) {
      score += 2200;
    } else if (normAlbum.includes(normQuery)) {
      score += 1500;
    }
  }

  // 3. MATCH EXACT SUR LES PAROLES
  if (cleanLyrics.includes(normQuery) || (compactQuery.length >= 4 && compactLyrics.includes(compactQuery))) {
    score += 2000;
  }

  // 4. MATCH SUR TAGS / METADONNÉES
  if (normTags.includes(normQuery)) {
    score += 1500;
  }
  if (normLang.includes(normQuery) || normCcli.includes(normQuery) || normCopyright.includes(normQuery)) {
    score += 800;
  }

  // 5. FAUTES DE FRAPPE DIRECTEMENT SUR LE TITRE (Distance de Levenshtein globale)
  if (score < 5000) {
    const titleDist = levenshteinDistance(compactQuery, compactTitle);
    const maxDist = compactQuery.length <= 5 ? 1 : 2;
    if (titleDist <= maxDist) {
      score += Math.max(0, 4500 - titleDist * 800);
    }
  }

  // 6. ANALYSE PAR MOTS-CLÉS (titre et paroles) AVEC TOLÉRANCE AUX FAUTES
  const titleWords = normTitle.split(' ').filter(Boolean);
  let matchedTitleWords = 0;
  for (const qWord of queryWords) {
    if (titleWords.some(tWord => isFuzzyWordMatch(qWord, tWord))) {
      matchedTitleWords++;
    }
  }
  if (matchedTitleWords > 0) {
    score += (matchedTitleWords / queryWords.length) * 3500;
  }

  // Si pas encore de match fort sur le titre, chercher les mots dans les paroles
  if (score < 2000) {
    const lyricWords = cleanLyrics.split(' ').filter(w => w.length > 2);
    let matchedLyricWords = 0;
    for (const qWord of queryWords) {
      if (cleanLyrics.includes(qWord)) {
        matchedLyricWords++;
      } else if (qWord.length >= 4) {
        // Recherche floue parmi les mots des paroles de longueur similaire
        const foundFuzzy = lyricWords.some(lWord => {
          if (Math.abs(lWord.length - qWord.length) > 2) return false;
          return isFuzzyWordMatch(qWord, lWord);
        });
        if (foundFuzzy) {
          matchedLyricWords++;
        }
      }
    }
    if (matchedLyricWords > 0) {
      score += (matchedLyricWords / queryWords.length) * 1800;
    }
  }

  return score;
}
