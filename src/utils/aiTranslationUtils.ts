import { Song } from '../types';
import { parseChordPro, detectSectionTypeFromTitle } from './chordUtils';
import { buildPresentationSlides } from './presentationUtils';

export interface AiTranslationBlock {
  sectionTitle: string;
  originalLines: string[];
  translatedLines: string[];
  sameSectionAsPrevious?: boolean;
}

export interface AiSongTranslation {
  sourceSongId: string;
  targetLanguage: string;
  translatedTitle: string;
  blocks: AiTranslationBlock[];
  linkedSongId?: string;
  updatedAt: number;
}

const STORAGE_KEY = 'melobook_ai_translations_v1';

/**
 * Extrait les blocs de paroles (strophes) d'un chant en miroir exact de buildPresentationSlides
 * pour garantir l'alignement 1-à-1 des diapositives et lignes en projection bilingue.
 */
export function extractSongBlocksForTranslation(song: Song): AiTranslationBlock[] {
  const chordPro = song.contentChordPro || song.content || '';
  const parsed = parseChordPro(chordPro);
  const blocks: AiTranslationBlock[] = [];

  for (const section of parsed.sections) {
    const secTitle = (section.title || section.type || '').trim() || 'Paroles';
    const typeLower = (section.type || '').toLowerCase();

    if (
      ['solo', 'intro', 'outro', 'interlude', 'instrumental'].includes(typeLower) &&
      (!secTitle || /intro|solo|instru/i.test(secTitle))
    ) {
      const hasAnyLyrics = section.lines.some((l) =>
        l.items.some((it) => it.lyrics && it.lyrics.trim().length > 0)
      );
      if (!hasAnyLyrics) continue;
    }

    const stanzas: string[][] = [];
    let currentStanza: string[] = [];

    for (const l of section.lines) {
      if (l.type === 'empty') {
        if (currentStanza.length > 0) {
          stanzas.push(currentStanza);
          currentStanza = [];
        }
        continue;
      }

      const text = l.items.map((it) => it.lyrics || '').join('').trim();
      if (text) {
        currentStanza.push(text);
      }
    }
    if (currentStanza.length > 0) {
      stanzas.push(currentStanza);
    }

    stanzas.forEach((stanzaLines, sIdx) => {
      blocks.push({
        sectionTitle: secTitle,
        originalLines: stanzaLines,
        translatedLines: stanzaLines.map(() => ''),
        sameSectionAsPrevious: sIdx > 0
      });
    });
  }

  if (blocks.length === 0) {
    const fallbackLines = chordPro
      .split('\n')
      .map((l) => l.replace(/\[[^\]]*\]/g, '').replace(/\{[^}]*\}/g, '').trim())
      .filter(Boolean);

    if (fallbackLines.length > 0) {
      blocks.push({
        sectionTitle: 'Paroles',
        originalLines: fallbackLines,
        translatedLines: fallbackLines.map(() => '')
      });
    }
  }

  return blocks;
}

/**
 * Construit les blocs d'édition à partir d'un chant principal et d'un chant traduit déjà lié.
 */
export function extractBlocksFromPairedSongs(
  primarySong: Song,
  secondarySong: Song
): AiTranslationBlock[] {
  const primaryBlocks = extractSongBlocksForTranslation(primarySong);
  const secondaryBlocks = extractSongBlocksForTranslation(secondarySong);

  return primaryBlocks.map((pBlock, idx) => {
    const sBlock = secondaryBlocks[idx];
    const translatedLines = pBlock.originalLines.map(
      (_, lIdx) => sBlock?.originalLines[lIdx] ?? ''
    );
    return {
      ...pBlock,
      sectionTitle: sBlock?.sectionTitle || pBlock.sectionTitle,
      translatedLines
    };
  });
}

/**
 * Reconstruit un texte ChordPro propre à partir des blocs traduits
 * pour que buildPresentationSlides & buildBilingualPresentationSlides alignent chaque slide.
 */
export function buildChordProFromTranslation(
  translatedTitle: string,
  blocks: AiTranslationBlock[]
): string {
  const lines: string[] = [];
  if (translatedTitle.trim()) {
    lines.push(`{title: ${translatedTitle.trim()}}`);
  }

  const tagMap: Record<string, string> = {
    verse: 'verse',
    chorus: 'chorus',
    bridge: 'bridge',
    pre_chorus: 'pre_chorus',
    intro: 'intro',
    outro: 'outro',
    solo: 'solo',
    interlude: 'interlude',
    instrumental: 'instrumental',
    tag: 'tag',
    finale: 'finale',
  };

  let openSectionTag: string | null = null;

  blocks.forEach((block, idx) => {
    const cleanSec = (block.sectionTitle || 'Paroles').trim();
    if (idx === 0 || !block.sameSectionAsPrevious) {
      if (openSectionTag) {
        lines.push(`{end_of_${openSectionTag}}`);
        openSectionTag = null;
      }
      if (lines.length > 0) lines.push('');
      const detected = detectSectionTypeFromTitle(cleanSec);
      const secTag = (detected.isKnown && tagMap[detected.type]) ? tagMap[detected.type] : 'verse';
      const escapedLabel = cleanSec.replace(/"/g, '\\"');
      lines.push(`{start_of_${secTag}: label="${escapedLabel}"}`);
      openSectionTag = secTag;
    } else {
      lines.push('');
    }

    const effectiveLines = block.translatedLines.some((l) => l.trim().length > 0)
      ? block.translatedLines
      : block.originalLines;

    effectiveLines.forEach((l) => {
      lines.push(l);
    });
  });

  if (openSectionTag) {
    lines.push(`{end_of_${openSectionTag}}`);
  }

  return lines.join('\n');
}

/**
 * Construit un objet Song virtuel utilisable directement par la projection bilingue.
 */
export function toVirtualTranslatedSong(
  sourceSong: Song,
  translation: AiSongTranslation
): Song {
  return {
    ...sourceSong,
    id: `ai_${sourceSong.id}`,
    title: translation.translatedTitle.trim() || `${sourceSong.title} (${translation.targetLanguage})`,
    language: translation.targetLanguage,
    contentChordPro: buildChordProFromTranslation(
      translation.translatedTitle,
      translation.blocks
    )
  };
}

export function getSavedAiTranslations(): Record<string, AiSongTranslation> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveAiTranslationToStorage(
  translation: AiSongTranslation
): Record<string, AiSongTranslation> {
  const current = getSavedAiTranslations();
  const next = {
    ...current,
    [translation.sourceSongId]: translation
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function deleteAiTranslationFromStorage(
  sourceSongId: string
): Record<string, AiSongTranslation> {
  const current = getSavedAiTranslations();
  const next = { ...current };
  delete next[sourceSongId];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

/**
 * Auto-vérification de l'alignement slide par slide entre original et traduction reconstruite.
 */
export function testAiTranslationAlignment(): boolean {
  const sampleSong: Song = {
    id: 'test-1',
    groupId: 'g-1',
    title: 'Amazing Grace',
    artist: 'Newton',
    key: 'G',
    tempo: 72,
    language: 'Anglais',
    contentChordPro:
      '{title: Amazing Grace}\n{c: Verse 1}\n[G]Amazing [G7]grace how [C]sweet the [G]sound\nThat [G]saved a wretch like [D]me\n\n[G]I once was [G7]lost but [C]now am [G]found\nWas [Em]blind but [D]now I [G]see'
  };

  const blocks = extractSongBlocksForTranslation(sampleSong);
  if (blocks.length !== 2) return false;
  blocks[0].translatedLines = ['Grâce infinie, quel doux son', 'Qui sauva un misérable comme moi'];
  blocks[1].translatedLines = ['Jadis perdu, je suis retrouvé', 'Aveugle hier, je vois aujourd’hui'];

  const translatedChordPro = buildChordProFromTranslation('Grâce infinie', blocks);
  const origSlides = buildPresentationSlides(sampleSong.contentChordPro, sampleSong.title, 3);
  const transSlides = buildPresentationSlides(translatedChordPro, 'Grâce infinie', 3);

  return (
    origSlides.length === transSlides.length &&
    origSlides[0].lines.length === transSlides[0].lines.length &&
    transSlides[0].lines[0] === 'Grâce infinie, quel doux son'
  );
}
