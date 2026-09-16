import { Song } from '../types';

export interface VoiceCommandResult {
  type: 'search' | 'open' | 'clear' | 'stop' | 'unknown';
  query: string;
  songMatch?: Song;
  feedback: string;
}

/**
 * Normalise un texte (minuscules, sans accents, sans ponctuations parasites)
 */
export function normalizeVoiceText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
    .replace(/['’]/g, ' ')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remplace les chiffres prononcés en français par leurs nombres
 */
export function convertSpokenNumbers(text: string): string {
  return text
    .replace(/\bdix[\s-]mille\b/gi, '10000')
    .replace(/\bcinq[\s-]mille\b/gi, '5000')
    .replace(/\bdeux[\s-]mille\b/gi, '2000')
    .replace(/\bmille\b/gi, '1000')
    .replace(/\bcinq[\s-]cents\b/gi, '500')
    .replace(/\bdeux[\s-]cents\b/gi, '200')
    .replace(/\bcent\b/gi, '100')
    .replace(/\bcinquante\b/gi, '50')
    .replace(/\bquarante\b/gi, '40')
    .replace(/\btrente\b/gi, '30')
    .replace(/\bvingt\b/gi, '20')
    .replace(/\bdix\b/gi, '10')
    .replace(/\bneuf\b/gi, '9')
    .replace(/\bhuit\b/gi, '8')
    .replace(/\bsept\b/gi, '7')
    .replace(/\bsix\b/gi, '6')
    .replace(/\bcinq\b/gi, '5')
    .replace(/\bquatre\b/gi, '4')
    .replace(/\btrois\b/gi, '3')
    .replace(/\bdeux\b/gi, '2')
    .replace(/\bun\b/gi, '1')
    .replace(/\bzero\b/gi, '0');
}

/**
 * Calcule un score de similarité entre 0 et 1 (Dice / Jaccard + Token matching)
 */
export function calculateMatchScore(query: string, target: string): number {
  const normQuery = normalizeVoiceText(convertSpokenNumbers(query));
  const normTarget = normalizeVoiceText(convertSpokenNumbers(target));

  if (!normQuery || !normTarget) return 0;
  if (normQuery === normTarget) return 1.0;
  if (normTarget.includes(normQuery)) return 0.85;
  if (normQuery.includes(normTarget)) return 0.8;

  const queryWords = normQuery.split(/\s+/).filter(w => w.length > 2);
  const targetWords = normTarget.split(/\s+/).filter(w => w.length > 2);

  if (queryWords.length === 0 || targetWords.length === 0) {
    return 0;
  }

  let matchedWords = 0;
  for (const qWord of queryWords) {
    if (targetWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
      matchedWords++;
    }
  }

  return matchedWords / Math.max(queryWords.length, targetWords.length);
}

/**
 * Trouve le meilleur chant correspondant à la requête vocale
 */
export function findBestSongMatch(spokenText: string, songs: Song[]): { song: Song; score: number } | null {
  if (!spokenText.trim() || songs.length === 0) return null;

  const cleanText = convertSpokenNumbers(spokenText);
  let bestSong: Song | null = null;
  let bestScore = 0;

  for (const song of songs) {
    // Score sur le titre
    const titleScore = calculateMatchScore(cleanText, song.title);
    // Score sur l'artiste
    const artistScore = song.artist ? calculateMatchScore(cleanText, song.artist) * 0.7 : 0;
    
    const maxScore = Math.max(titleScore, artistScore);
    if (maxScore > bestScore) {
      bestScore = maxScore;
      bestSong = song;
    }
  }

  if (bestSong && bestScore >= 0.35) {
    return { song: bestSong, score: bestScore };
  }

  return null;
}

/**
 * Analyse la commande vocale de l'utilisateur
 */
export function parseVoiceCommand(rawTranscript: string, songs: Song[]): VoiceCommandResult {
  const transcript = rawTranscript.trim();
  const normalized = normalizeVoiceText(convertSpokenNumbers(transcript));

  if (!normalized) {
    return { type: 'unknown', query: '', feedback: '' };
  }

  // 1. Commandes de réinitialisation / effacer
  const clearPatterns = [
    'efface', 'effacer', 'efface la recherche', 'effacer la recherche', 
    'tout effacer', 'reinitialise', 'reinitialiser', 'vide', 'vider', 
    'reset', 'clear', 'annule', 'annuler'
  ];
  if (clearPatterns.some(p => normalized === p || normalized.startsWith(p + ' '))) {
    return {
      type: 'clear',
      query: '',
      feedback: 'Recherche effacée'
    };
  }

  // 2. Commandes d'arrêt
  const stopPatterns = ['arrete', 'arreter', 'stop', 'stop ecoute', 'quitte', 'fermer'];
  if (stopPatterns.some(p => normalized === p)) {
    return {
      type: 'stop',
      query: '',
      feedback: 'Écoute vocale arrêtée'
    };
  }

  // 4. Commandes d'ouverture directe : "ouvre [titre]", "joue [titre]", "lance [titre]", etc.
  const openPrefixes = [
    'ouvre le chant', 'ouvrir le chant', 'ouvre la chanson', 'ouvrir la chanson',
    'ouvre le', 'ouvre la', 'ouvre', 'ouvrir',
    'joue le chant', 'jouer le chant', 'joue la chanson', 'jouer la chanson',
    'joue', 'jouer',
    'lance le chant', 'lancer le chant', 'lance', 'lancer',
    'chante', 'chanter',
    'affiche le chant', 'afficher le chant', 'affiche', 'afficher'
  ];

  for (const prefix of openPrefixes) {
    if (normalized.startsWith(prefix + ' ')) {
      const queryPart = transcript.slice(prefix.length).trim();
      const bestMatch = findBestSongMatch(queryPart, songs);
      if (bestMatch && bestMatch.score >= 0.4) {
        return {
          type: 'open',
          query: bestMatch.song.title,
          songMatch: bestMatch.song,
          feedback: `Ouverture de « ${bestMatch.song.title} »`
        };
      }
      return {
        type: 'search',
        query: queryPart,
        feedback: `Recherche de « ${queryPart} »`
      };
    }
  }

  // 5. Commandes de recherche explicites : "cherche [terme]", "trouve [terme]", "recherche [terme]"
  const searchPrefixes = [
    'cherche le chant', 'chercher le chant', 'cherche la chanson',
    'cherche', 'chercher',
    'trouve le chant', 'trouver le chant', 'trouve', 'trouver',
    'recherche', 'rechercher'
  ];

  for (const prefix of searchPrefixes) {
    if (normalized.startsWith(prefix + ' ')) {
      const queryPart = transcript.slice(prefix.length).trim();
      return {
        type: 'search',
        query: queryPart,
        feedback: `Recherche de « ${queryPart} »`
      };
    }
  }

  // 6. Si le texte parlé correspond très fidèlement à un titre de chanson existant
  const directMatch = findBestSongMatch(transcript, songs);
  if (directMatch && directMatch.score >= 0.85) {
    return {
      type: 'open',
      query: directMatch.song.title,
      songMatch: directMatch.song,
      feedback: `Chant trouvé : « ${directMatch.song.title} »`
    };
  }

  // 7. Par défaut, rechercher directement les mots prononcés
  return {
    type: 'search',
    query: transcript,
    feedback: `Recherche : « ${transcript} »`
  };
}
