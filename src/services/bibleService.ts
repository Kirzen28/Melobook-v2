import { BiblePassageData, BibleVerseItem } from '../types';
import { BIBLE_BOOKS, BibleBookInfo, OFFLINE_KEY_VERSES } from '../data/bibleBooksData';

export interface BibleTranslationInfo {
  id: string;
  name: string;
  shortName: string;
  language: 'Français' | 'English' | 'Español';
  category: 'Domaine Public' | 'Licence / API';
  isOfflineReady: boolean;
  year?: string;
  isDefault?: boolean;
  apiCode: string;
}

export const BIBLE_TRANSLATIONS: BibleTranslationInfo[] = [
  // Français (Domaine Public & Licence)
  {
    id: 'FRLSG',
    name: 'Louis Segond 1910',
    shortName: 'LSG',
    language: 'Français',
    category: 'Domaine Public',
    isOfflineReady: true,
    year: '1910',
    isDefault: true,
    apiCode: 'FRLSG'
  },
  {
    id: 'FRDBY',
    name: 'Bible de Darby',
    shortName: 'Darby',
    language: 'Français',
    category: 'Domaine Public',
    isOfflineReady: true,
    year: '1890',
    apiCode: 'FRDBY'
  },
  {
    id: 'FROST',
    name: 'Jean-Frédéric Ostervald',
    shortName: 'Ostervald',
    language: 'Français',
    category: 'Domaine Public',
    isOfflineReady: true,
    year: '1744/1996',
    apiCode: 'OST'
  },
  {
    id: 'NBS',
    name: 'Nouvelle Bible Segond',
    shortName: 'NBS',
    language: 'Français',
    category: 'Licence / API',
    isOfflineReady: false,
    year: '2002',
    apiCode: 'NBS'
  },
  {
    id: 'FRPDV17',
    name: 'Parole de Vie',
    shortName: 'PDV',
    language: 'Français',
    category: 'Licence / API',
    isOfflineReady: false,
    year: '2017',
    apiCode: 'FRPDV17'
  },

  // Anglais (Domaine Public)
  {
    id: 'KJV',
    name: 'King James Version',
    shortName: 'KJV',
    language: 'English',
    category: 'Domaine Public',
    isOfflineReady: true,
    year: '1611',
    apiCode: 'KJV'
  },

  // Espagnol (Domaine Public & Licence)
  {
    id: 'RV1960',
    name: 'Reina-Valera 1960',
    shortName: 'RVR1960',
    language: 'Español',
    category: 'Domaine Public',
    isOfflineReady: true,
    year: '1960',
    apiCode: 'RV1960'
  },
  {
    id: 'NVI',
    name: 'Nueva Versión Internacional',
    shortName: 'NVI',
    language: 'Español',
    category: 'Licence / API',
    isOfflineReady: false,
    year: '1999',
    apiCode: 'NVI'
  },
  {
    id: 'LBLA',
    name: 'Biblia de las Américas / Latinoamericana',
    shortName: 'BLA',
    language: 'Español',
    category: 'Domaine Public',
    isOfflineReady: true,
    year: '1986',
    apiCode: 'LBLA'
  },
  {
    id: 'NTV',
    name: 'Nueva Traducción Viviente',
    shortName: 'NTV',
    language: 'Español',
    category: 'Licence / API',
    isOfflineReady: false,
    year: '2010',
    apiCode: 'NTV'
  }
];

export const DEFAULT_TRANSLATION = 'FRLSG';

// Cache mémoire haute vitesse pour réponse < 5ms
const memoryChapterCache = new Map<string, BibleVerseItem[]>();

function getCacheKey(translation: string, bookId: number, chapter: number): string {
  return `${translation}_${bookId}_${chapter}`;
}

/**
 * Récupère tous les versets d'un chapitre donné
 */
export async function getChapterVerses(
  bookId: number,
  chapter: number,
  translation: string = DEFAULT_TRANSLATION
): Promise<BibleVerseItem[]> {
  const cacheKey = getCacheKey(translation, bookId, chapter);

  // 1. Vérification du cache mémoire immédiat
  if (memoryChapterCache.has(cacheKey)) {
    return memoryChapterCache.get(cacheKey)!;
  }

  // 2. Vérification du cache localStorage
  try {
    const rawLocal = localStorage.getItem(`bible_ch_${cacheKey}`);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal) as BibleVerseItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryChapterCache.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch {}

  const transObj = BIBLE_TRANSLATIONS.find(t => t.id === translation || t.apiCode === translation);
  const apiCode = transObj?.apiCode || translation;

  // 3. Appel réseau (serveur proxy local d'abord, puis API externe)
  let fetchedVerses: BibleVerseItem[] = [];

  try {
    // Essai via le proxy serveur local Express
    const localRes = await fetch(`/api/bible/chapter?translation=${encodeURIComponent(apiCode)}&bookId=${bookId}&chapter=${chapter}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (localRes.ok) {
      const data = await localRes.json();
      if (Array.isArray(data.verses) && data.verses.length > 0) {
        fetchedVerses = data.verses;
      }
    }
  } catch {}

  if (fetchedVerses.length === 0) {
    try {
      // Fallback direct vers bolls.life
      const bollsRes = await fetch(`https://bolls.life/get-chapter/${encodeURIComponent(apiCode)}/${bookId}/${chapter}/`);
      if (bollsRes.ok) {
        const rawList = await bollsRes.json();
        if (Array.isArray(rawList)) {
          fetchedVerses = rawList.map((item: any) => ({
            verseNumber: item.verse,
            text: (item.text || '').replace(/<[^>]+>/g, '').trim()
          }));
        }
      }
    } catch {}
  }

  // 4. Fallback de sécurité hors-ligne si réseau inaccessible
  if (fetchedVerses.length === 0) {
    const offlineMatches = OFFLINE_KEY_VERSES.filter(v => v.bookId === bookId && v.chapter === chapter);
    if (offlineMatches.length > 0) {
      fetchedVerses = offlineMatches.map(v => ({
        verseNumber: v.verse,
        text: v.text
      }));
    }
  }

  // Sauvegarde dans les caches
  if (fetchedVerses.length > 0) {
    memoryChapterCache.set(cacheKey, fetchedVerses);
    try {
      localStorage.setItem(`bible_ch_${cacheKey}`, JSON.stringify(fetchedVerses));
    } catch {}
  }

  return fetchedVerses;
}

/**
 * Récupère un passage ou verset précis et formate les données prêtes pour la projection
 */
export async function getPassageData(
  book: BibleBookInfo,
  chapter: number,
  verseStart?: number,
  verseEnd?: number,
  translation: string = DEFAULT_TRANSLATION
): Promise<BiblePassageData> {
  const allVerses = await getChapterVerses(book.id, chapter, translation);
  const transObj = BIBLE_TRANSLATIONS.find(t => t.id === translation) || BIBLE_TRANSLATIONS[0];

  let selectedVerses: BibleVerseItem[] = [];

  if (verseStart !== undefined) {
    const end = verseEnd !== undefined ? Math.max(verseStart, verseEnd) : verseStart;
    selectedVerses = allVerses.filter(v => v.verseNumber >= verseStart && v.verseNumber <= end);
    // Si verset non présent dans les données récupérées mais présent dans le fallback
    if (selectedVerses.length === 0) {
      const off = OFFLINE_KEY_VERSES.filter(
        v => v.bookId === book.id && v.chapter === chapter && v.verse >= verseStart && v.verse <= end
      );
      if (off.length > 0) {
        selectedVerses = off.map(o => ({ verseNumber: o.verse, text: o.text }));
      }
    }
  } else {
    // Si aucun verset spécifié, prendre les premiers versets ou tout le chapitre
    selectedVerses = allVerses;
  }

  // Si toujours vide (ex: chapitre pas encore chargé)
  if (selectedVerses.length === 0) {
    selectedVerses = [{
      verseNumber: verseStart || 1,
      text: `${book.name} chapitre ${chapter}${verseStart ? `, verset ${verseStart}` : ''}`
    }];
  }

  // Construction de la référence textuelle canonique
  let refText = `${book.name} ${chapter}`;
  if (verseStart !== undefined) {
    if (verseEnd !== undefined && verseEnd > verseStart) {
      refText = `${book.name} ${chapter}:${verseStart}-${verseEnd}`;
    } else {
      refText = `${book.name} ${chapter}:${verseStart}`;
    }
  }

  const combinedText = selectedVerses.map(v => `${v.verseNumber}. ${v.text}`).join('\n\n');

  return {
    bookId: book.id,
    bookName: book.name,
    chapter,
    verseStart: verseStart || (selectedVerses[0]?.verseNumber ?? 1),
    verseEnd: verseEnd || (selectedVerses[selectedVerses.length - 1]?.verseNumber ?? verseStart ?? 1),
    version: transObj.shortName,
    referenceText: refText,
    text: combinedText,
    verses: selectedVerses
  };
}

/**
 * Recherche rapide par mot-clé dans la Bible
 */
export async function searchBibleKeywords(
  query: string,
  translation: string = DEFAULT_TRANSLATION
): Promise<{
  book: BibleBookInfo;
  chapter: number;
  verse: number;
  text: string;
  referenceText: string;
}[]> {
  const q = query.trim();
  if (!q || q.length < 3) return [];

  const results: {
    book: BibleBookInfo;
    chapter: number;
    verse: number;
    text: string;
    referenceText: string;
  }[] = [];

  // 1. Recherche dans les versets offline d'abord
  const qLower = q.toLowerCase();
  for (const item of OFFLINE_KEY_VERSES) {
    if (item.text.toLowerCase().includes(qLower)) {
      const bk = BIBLE_BOOKS.find(b => b.id === item.bookId);
      if (bk) {
        results.push({
          book: bk,
          chapter: item.chapter,
          verse: item.verse,
          text: item.text,
          referenceText: `${bk.name} ${item.chapter}:${item.verse}`
        });
      }
    }
  }

  // 2. Recherche en ligne
  try {
    const transObj = BIBLE_TRANSLATIONS.find(t => t.id === translation || t.apiCode === translation);
    const apiCode = transObj?.apiCode || translation;
    const res = await fetch(`https://bolls.life/search/${encodeURIComponent(apiCode)}/?search=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data.slice(0, 15)) {
          const bk = BIBLE_BOOKS.find(b => b.id === item.book);
          if (bk && !results.some(r => r.book.id === bk.id && r.chapter === item.chapter && r.verse === item.verse)) {
            const cleanText = (item.text || '').replace(/<[^>]+>/g, '').trim();
            results.push({
              book: bk,
              chapter: item.chapter,
              verse: item.verse,
              text: cleanText,
              referenceText: `${bk.name} ${item.chapter}:${item.verse}`
            });
          }
        }
      }
    }
  } catch {}

  return results.slice(0, 20);
}
