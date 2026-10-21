import { parseChordPro, ParsedSongData, stripParentheses } from './chordUtils';
import { BiblePassageData } from '../types';

export interface PresentationSlide {
  id: string;
  songTitle: string;
  sectionTitle: string;
  lines: string[];
  slideIndex: number;
  totalSlides: number;
  itemType?: 'song' | 'bible';
  bibleReference?: string;
  version?: string;
  isBilingual?: boolean;
  bilingualFormat?: 'stacked' | 'columns';
  primaryLanguage?: string;
  secondaryLines?: string[];
  secondarySongTitle?: string;
  secondaryLanguage?: string;
}


export type CountdownThemeId = 'neon-cyan' | 'gold-amber' | 'pure-white' | 'emerald' | 'purple-royal' | 'ruby-sunset';

export interface CountdownTheme {
  id: CountdownThemeId;
  name: string;
  category: string;
  textColor: string;
  glowCss: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeIconColor: string;
  accentHex: string;
}

export const COUNTDOWN_THEMES: CountdownTheme[] = [
  {
    id: 'neon-cyan',
    name: 'Cyan Électrique',
    category: 'Moderne / Tech',
    textColor: 'text-cyan-100',
    glowCss: '0 0 25px rgba(6, 182, 212, 0.75), 0 0 65px rgba(14, 165, 233, 0.55), 0 4px 20px rgba(0, 0, 0, 0.95)',
    badgeBg: 'bg-cyan-500/20',
    badgeBorder: 'border-cyan-400/40',
    badgeText: 'text-cyan-200',
    badgeIconColor: 'text-cyan-400',
    accentHex: '#06b6d4'
  },
  {
    id: 'gold-amber',
    name: 'Or & Célébration',
    category: 'Chaleureux / Louange',
    textColor: 'text-amber-100',
    glowCss: '0 0 25px rgba(245, 158, 11, 0.75), 0 0 65px rgba(251, 191, 36, 0.55), 0 4px 20px rgba(0, 0, 0, 0.95)',
    badgeBg: 'bg-amber-500/20',
    badgeBorder: 'border-amber-400/40',
    badgeText: 'text-amber-200',
    badgeIconColor: 'text-amber-400',
    accentHex: '#f59e0b'
  },
  {
    id: 'pure-white',
    name: 'Blanc Épure & Halo',
    category: 'Minimaliste / Contraste',
    textColor: 'text-white',
    glowCss: '0 0 25px rgba(255, 255, 255, 0.65), 0 0 55px rgba(255, 255, 255, 0.35), 0 4px 25px rgba(0, 0, 0, 0.98)',
    badgeBg: 'bg-white/15',
    badgeBorder: 'border-white/30',
    badgeText: 'text-white',
    badgeIconColor: 'text-white',
    accentHex: '#ffffff'
  },
  {
    id: 'emerald',
    name: 'Émeraude Espérance',
    category: 'Sérénité / Nature',
    textColor: 'text-emerald-100',
    glowCss: '0 0 25px rgba(16, 185, 129, 0.75), 0 0 65px rgba(52, 211, 153, 0.55), 0 4px 20px rgba(0, 0, 0, 0.95)',
    badgeBg: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-400/40',
    badgeText: 'text-emerald-200',
    badgeIconColor: 'text-emerald-400',
    accentHex: '#10b981'
  },
  {
    id: 'purple-royal',
    name: 'Pourpre Majesté',
    category: 'Adoration / Solennel',
    textColor: 'text-purple-100',
    glowCss: '0 0 25px rgba(168, 85, 247, 0.75), 0 0 65px rgba(192, 132, 252, 0.55), 0 4px 20px rgba(0, 0, 0, 0.95)',
    badgeBg: 'bg-purple-500/20',
    badgeBorder: 'border-purple-400/40',
    badgeText: 'text-purple-200',
    badgeIconColor: 'text-purple-400',
    accentHex: '#a855f7'
  },
  {
    id: 'ruby-sunset',
    name: 'Rubis Crépuscule',
    category: 'Dynamique / Chaleur',
    textColor: 'text-rose-100',
    glowCss: '0 0 25px rgba(244, 63, 94, 0.75), 0 0 65px rgba(251, 113, 133, 0.55), 0 4px 20px rgba(0, 0, 0, 0.95)',
    badgeBg: 'bg-rose-500/20',
    badgeBorder: 'border-rose-400/40',
    badgeText: 'text-rose-200',
    badgeIconColor: 'text-rose-400',
    accentHex: '#f43f5e'
  }
];

export function getCountdownTheme(id?: string): CountdownTheme {
  return COUNTDOWN_THEMES.find(t => t.id === id) || COUNTDOWN_THEMES[0];
}

export interface CountdownState {
  isActive: boolean;
  targetTime: string; // e.g. "10:30"
  targetTimestamp: number; // epoch ms
  title: string; // e.g. "Le culte commence dans"
  themeId?: CountdownThemeId;
}

export type MediaType = 'video' | 'image' | 'audio';
export type MediaSourceType = 'youtube' | 'pixabay' | 'unsplash' | 'url' | 'local';

export interface MediaPresentationState {
  isActive: boolean;
  type: MediaType;
  source: MediaSourceType;
  url: string;
  title: string;
  thumbnail?: string;
  author?: string;
  isLoop?: boolean;
  isMuted?: boolean;
  aspectRatio?: '16/9' | '4/3' | 'contain' | 'cover';
}

export interface PresentationState {
  songTitle: string;
  sectionTitle: string;
  lines: string[];
  slideIndex: number;
  totalSlides: number;
  isBlackout: boolean;
  fontScale?: number;
  backgroundImage?: string;
  backgroundOverlay?: number;
  countdown?: CountdownState;
  media?: MediaPresentationState;
  itemType?: 'song' | 'bible' | 'media';
  bibleReference?: string;
  bibleVersion?: string;
  isBilingual?: boolean;
  bilingualFormat?: 'stacked' | 'columns';
  primaryLanguage?: string;
  secondarySongTitle?: string;
  secondaryLanguage?: string;
  secondaryLines?: string[];
  updatedAt: number;
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(?:youtu\.be\/|v\/|e\/|u\/\w+\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[1].length === 11) ? match[1] : null;
}

export function getYouTubeEmbedUrl(url: string, autoplay = true, loop = true, mute = false): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    controls: '1',
    rel: '0',
    modestbranding: '1',
    enablejsapi: '1'
  });
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', videoId);
  }
  if (mute) {
    params.set('mute', '1');
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}


export function getTargetTimestampFromTime(timeStr: string): number {
  if (!timeStr) return Date.now();
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return Date.now();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  // Si l'heure est passée de plus de 45 minutes, cible le jour suivant
  if (Date.now() - target.getTime() > 45 * 60 * 1000) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

export function formatRemainingTime(ms: number): { formatted: string; hasHours: boolean; isExpired: boolean; hours: number; minutes: number; seconds: number } {
  if (ms <= 0) {
    return { formatted: '00:00', hasHours: false, isExpired: true, hours: 0, minutes: 0, seconds: 0 };
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return { formatted: `${hh}:${mm}:${ss}`, hasHours: true, isExpired: false, hours, minutes, seconds };
  }
  return { formatted: `${mm}:${ss}`, hasHours: false, isExpired: false, hours, minutes, seconds };
}

const CHANNEL_NAME = 'melobook_presentation_channel';
const STORAGE_KEY = 'melobook_presentation_state';
export const FONT_SCALE_KEY = 'melobook_presentation_font_scale';
export const BACKGROUND_IMAGE_KEY = 'melobook_presentation_bg_image';
export const BACKGROUND_OVERLAY_KEY = 'melobook_presentation_bg_overlay';
const MAX_LINES_PER_SLIDE = 4; // Découpage automatique adapté pour lisibilité projection

export function getSavedFontScale(): number {
  try {
    const raw = localStorage.getItem(FONT_SCALE_KEY);
    if (raw) {
      const val = parseFloat(raw);
      if (!isNaN(val) && val >= 0.5 && val <= 2.5) return val;
    }
  } catch {}
  return 1.0;
}

export function saveFontScale(scale: number): void {
  try {
    localStorage.setItem(FONT_SCALE_KEY, scale.toString());
  } catch {}
}

export function getSavedBackgroundImage(): string {
  try {
    return localStorage.getItem(BACKGROUND_IMAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveBackgroundImage(url: string): void {
  try {
    localStorage.setItem(BACKGROUND_IMAGE_KEY, url);
  } catch {}
}

export function getSavedBackgroundOverlay(): number {
  try {
    const raw = localStorage.getItem(BACKGROUND_OVERLAY_KEY);
    if (raw) {
      const val = parseFloat(raw);
      if (!isNaN(val) && val >= 0.1 && val <= 0.95) return val;
    }
  } catch {}
  return 0.65; // Filtre sombre automatique par défaut à 65% pour une lisibilité optimale
}

export function saveBackgroundOverlay(overlay: number): void {
  try {
    localStorage.setItem(BACKGROUND_OVERLAY_KEY, overlay.toString());
  } catch {}
}

// Singleton BroadcastChannel maintenu ouvert pour éviter l'avortement de messages
let sharedChannel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!sharedChannel) {
    try {
      sharedChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      sharedChannel = null;
    }
  }
  return sharedChannel;
}

/**
 * Construit la liste des slides pour la projection à partir du ChordPro
 * avec découpage automatique par section et sous-groupes de lignes
 */
export function buildPresentationSlides(
  chordProText: string,
  explicitTitle?: string,
  maxLines: number = MAX_LINES_PER_SLIDE
): PresentationSlide[] {
  const parsed: ParsedSongData = parseChordPro(chordProText || '');
  const rawTitle = explicitTitle || parsed.title || 'Sans titre';
  const songTitle = stripParentheses(rawTitle);

  const rawSlides: { sectionTitle: string; lines: string[] }[] = [];

  for (const section of parsed.sections) {
    const secTitle = (section.title || section.type || '').trim();
    const typeLower = (section.type || '').toLowerCase();

    // Ignorer les sections purement instrumentales sans paroles
    if (['solo', 'intro', 'outro', 'interlude', 'instrumental'].includes(typeLower) && (!secTitle || /intro|solo|instru/i.test(secTitle))) {
      const hasAnyLyrics = section.lines.some(l => 
        l.items.some(it => it.lyrics && it.lyrics.trim().length > 0)
      );
      if (!hasAnyLyrics) continue;
    }

    // Extraire les lignes de paroles
    const sectionLyricLines: string[] = [];
    for (const l of section.lines) {
      if (l.type === 'empty') {
        if (sectionLyricLines.length > 0 && sectionLyricLines[sectionLyricLines.length - 1] !== '') {
          sectionLyricLines.push('');
        }
        continue;
      }

      const text = l.items.map(it => it.lyrics || '').join('').trim();
      if (text) {
        sectionLyricLines.push(text);
      }
    }

    // Si pas de paroles dans la section, passer
    if (sectionLyricLines.length === 0) continue;

    // Découpage automatique des lignes en blocs de maxLines max
    let currentChunk: string[] = [];
    const chunks: string[][] = [];

    for (const line of sectionLyricLines) {
      if (line === '') {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [];
        }
        continue;
      }

      currentChunk.push(line);
      if (currentChunk.length >= maxLines) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    // Créer les slides pour cette section
    chunks.forEach((chunkLines, chunkIdx) => {
      let subTitle = secTitle || 'Paroles';
      if (chunks.length > 1) {
        subTitle = `${subTitle} (${chunkIdx + 1}/${chunks.length})`;
      }
      rawSlides.push({
        sectionTitle: subTitle,
        lines: chunkLines
      });
    });
  }

  // Fallback si le chant n'a pas de paroles reconnues
  if (rawSlides.length === 0) {
    // Si chordProText contient des lignes de texte brut
    const fallbackLines = (chordProText || '')
      .split('\n')
      .map(l => l.replace(/\[[^\]]*\]/g, '').replace(/\{[^}]*\}/g, '').trim())
      .filter(Boolean);

    if (fallbackLines.length > 0) {
      rawSlides.push({
        sectionTitle: 'Paroles',
        lines: fallbackLines.slice(0, 4)
      });
    } else {
      rawSlides.push({
        sectionTitle: '',
        lines: [songTitle]
      });
    }
  }

  const totalSlides = rawSlides.length;
  return rawSlides.map((s, idx) => ({
    id: `slide_${idx}`,
    songTitle,
    sectionTitle: s.sectionTitle,
    lines: s.lines,
    slideIndex: idx,
    totalSlides
  }));
}

/**
 * Construit la liste des slides pour la projection bilingue (chant original + version traduite)
 */
export function buildBilingualPresentationSlides(
  primaryChordPro: string,
  secondaryChordPro: string,
  primaryTitle: string,
  secondaryTitle: string,
  primaryLang: string = 'Français',
  secondaryLang: string = 'Anglais',
  format: 'stacked' | 'columns' = 'stacked',
  maxLines: number = format === 'stacked' ? 3 : 4
): PresentationSlide[] {
  const pSlides = buildPresentationSlides(primaryChordPro, primaryTitle, maxLines);
  const sSlides = buildPresentationSlides(secondaryChordPro, secondaryTitle, maxLines);

  if (pSlides.length === 0 && sSlides.length === 0) return [];
  if (pSlides.length === 0) return sSlides;
  if (sSlides.length === 0) return pSlides;

  const totalSlides = Math.max(pSlides.length, sSlides.length);
  const result: PresentationSlide[] = [];

  for (let i = 0; i < totalSlides; i++) {
    const pSlide = pSlides[Math.min(i, pSlides.length - 1)];
    const sSlide = sSlides[Math.min(i, sSlides.length - 1)];

    result.push({
      id: `bilingual_slide_${i}`,
      songTitle: stripParentheses(primaryTitle),
      sectionTitle: pSlide?.sectionTitle || sSlide?.sectionTitle || '',
      lines: pSlide?.lines || [],
      slideIndex: i,
      totalSlides,
      itemType: 'song',
      isBilingual: true,
      bilingualFormat: format,
      primaryLanguage: primaryLang,
      secondaryLines: sSlide?.lines || [],
      secondarySongTitle: stripParentheses(secondaryTitle),
      secondaryLanguage: secondaryLang
    });
  }

  return result;
}

/**
 * Découpe un texte de verset en lignes bien proportionnées pour la projection
 */
function wrapScriptureLines(text: string, maxLineLength: number = 55): string[] {
  const clean = (text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();

  if (!clean) return [];

  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + ' ' + word).length <= maxLineLength) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

/**
 * Construit la liste des slides de projection pour un passage ou verset biblique
 */
export function buildBiblePresentationSlides(
  passage: BiblePassageData,
  maxLines: number = 3
): PresentationSlide[] {
  const rawSlides: {
    sectionTitle: string;
    lines: string[];
    verseRef: string;
  }[] = [];

  const versionTag = passage.version ? ` (${passage.version})` : '';

  if (passage.verses && passage.verses.length > 0) {
    for (const v of passage.verses) {
      const verseRef = `${passage.bookName} ${passage.chapter}:${v.verseNumber}${versionTag}`;
      const wrapped = wrapScriptureLines(v.text, 55);

      if (wrapped.length === 0) continue;

      // Découpage en blocs de maxLines max
      const chunks: string[][] = [];
      for (let i = 0; i < wrapped.length; i += maxLines) {
        chunks.push(wrapped.slice(i, i + maxLines));
      }

      chunks.forEach((chunk, cIdx) => {
        let secTitle = `Verset ${v.verseNumber}`;
        if (chunks.length > 1) {
          secTitle = `Verset ${v.verseNumber} (${cIdx + 1}/${chunks.length})`;
        }
        rawSlides.push({
          sectionTitle: secTitle,
          lines: chunk,
          verseRef
        });
      });
    }
  }

  // Fallback si verses est vide mais que passage.text existe
  if (rawSlides.length === 0 && passage.text) {
    const wrapped = wrapScriptureLines(passage.text, 55);
    const chunks: string[][] = [];
    for (let i = 0; i < wrapped.length; i += maxLines) {
      chunks.push(wrapped.slice(i, i + maxLines));
    }
    chunks.forEach((chunk, cIdx) => {
      rawSlides.push({
        sectionTitle: chunks.length > 1 ? `Passage (${cIdx + 1}/${chunks.length})` : 'Passage',
        lines: chunk,
        verseRef: `${passage.referenceText}${versionTag}`
      });
    });
  }

  // Fallback ultime
  if (rawSlides.length === 0) {
    rawSlides.push({
      sectionTitle: 'Verset',
      lines: [passage.referenceText || 'Passage biblique'],
      verseRef: `${passage.referenceText || 'Passage'}${versionTag}`
    });
  }

  const total = rawSlides.length;
  return rawSlides.map((s, idx) => ({
    id: `bible_slide_${idx}`,
    songTitle: passage.referenceText || `${passage.bookName} ${passage.chapter}`,
    sectionTitle: s.sectionTitle,
    lines: s.lines,
    slideIndex: idx,
    totalSlides: total,
    itemType: 'bible',
    bibleReference: s.verseRef,
    version: passage.version
  }));
}

/**
 * Construit la liste des slides pour la projection d'un passage biblique bilingue (2 versions)
 */
export function buildBilingualBiblePresentationSlides(
  primaryPassage: BiblePassageData,
  secondaryPassage: BiblePassageData,
  format: 'stacked' | 'columns' = 'stacked',
  maxLines: number = format === 'stacked' ? 2 : 4
): PresentationSlide[] {
  const slides: PresentationSlide[] = [];
  const pVerses = primaryPassage.verses || [];
  const sVerses = secondaryPassage.verses || [];
  const pVersionTag = primaryPassage.version || 'LSG';
  const sVersionTag = secondaryPassage.version || 'KJV';
  const compoundRef = `${primaryPassage.referenceText} (${pVersionTag} • ${sVersionTag})`;

  if (pVerses.length > 0) {
    pVerses.forEach((pv, idx) => {
      const sv = sVerses.find(v => v.verseNumber === pv.verseNumber) || sVerses[idx];
      const pWrapped = wrapScriptureLines(pv.text, format === 'columns' ? 36 : 52);
      const sWrapped = wrapScriptureLines(sv?.text || '', format === 'columns' ? 36 : 52);

      if (format === 'columns') {
        const chunkCount = Math.max(
          Math.ceil(pWrapped.length / maxLines),
          Math.ceil(sWrapped.length / maxLines),
          1
        );
        for (let c = 0; c < chunkCount; c++) {
          const pChunk = pWrapped.slice(c * maxLines, (c + 1) * maxLines);
          const sChunk = sWrapped.slice(c * maxLines, (c + 1) * maxLines);
          let secTitle = `Verset ${pv.verseNumber}`;
          if (chunkCount > 1) {
            secTitle = `Verset ${pv.verseNumber} (${c + 1}/${chunkCount})`;
          }
          slides.push({
            id: `bible_bi_${pv.verseNumber}_${c}`,
            songTitle: primaryPassage.referenceText,
            sectionTitle: secTitle,
            lines: pChunk.length > 0 ? pChunk : [pv.text],
            slideIndex: slides.length,
            totalSlides: 0,
            itemType: 'bible',
            bibleReference: `${primaryPassage.bookName} ${primaryPassage.chapter}:${pv.verseNumber} (${pVersionTag} • ${sVersionTag})`,
            version: `${pVersionTag} • ${sVersionTag}`,
            isBilingual: true,
            bilingualFormat: 'columns',
            primaryLanguage: pVersionTag,
            secondaryLanguage: sVersionTag,
            secondarySongTitle: secondaryPassage.referenceText,
            secondaryLines: sChunk.length > 0 ? sChunk : (sv ? [sv.text] : [])
          });
        }
      } else {
        // format === 'stacked' : sous-titres
        if (pv.text.length > 130 && pWrapped.length > 2) {
          const halfP = Math.ceil(pWrapped.length / 2);
          const halfS = Math.ceil(sWrapped.length / 2);

          slides.push({
            id: `bible_bi_${pv.verseNumber}_0`,
            songTitle: primaryPassage.referenceText,
            sectionTitle: `Verset ${pv.verseNumber} (1/2)`,
            lines: pWrapped.slice(0, halfP),
            slideIndex: slides.length,
            totalSlides: 0,
            itemType: 'bible',
            bibleReference: `${primaryPassage.bookName} ${primaryPassage.chapter}:${pv.verseNumber} (${pVersionTag} • ${sVersionTag})`,
            version: `${pVersionTag} • ${sVersionTag}`,
            isBilingual: true,
            bilingualFormat: 'stacked',
            primaryLanguage: pVersionTag,
            secondaryLanguage: sVersionTag,
            secondarySongTitle: secondaryPassage.referenceText,
            secondaryLines: sWrapped.slice(0, halfS)
          });
          slides.push({
            id: `bible_bi_${pv.verseNumber}_1`,
            songTitle: primaryPassage.referenceText,
            sectionTitle: `Verset ${pv.verseNumber} (2/2)`,
            lines: pWrapped.slice(halfP),
            slideIndex: slides.length,
            totalSlides: 0,
            itemType: 'bible',
            bibleReference: `${primaryPassage.bookName} ${primaryPassage.chapter}:${pv.verseNumber} (${pVersionTag} • ${sVersionTag})`,
            version: `${pVersionTag} • ${sVersionTag}`,
            isBilingual: true,
            bilingualFormat: 'stacked',
            primaryLanguage: pVersionTag,
            secondaryLanguage: sVersionTag,
            secondarySongTitle: secondaryPassage.referenceText,
            secondaryLines: sWrapped.slice(halfS)
          });
        } else {
          slides.push({
            id: `bible_bi_${pv.verseNumber}_0`,
            songTitle: primaryPassage.referenceText,
            sectionTitle: `Verset ${pv.verseNumber}`,
            lines: pWrapped,
            slideIndex: slides.length,
            totalSlides: 0,
            itemType: 'bible',
            bibleReference: `${primaryPassage.bookName} ${primaryPassage.chapter}:${pv.verseNumber} (${pVersionTag} • ${sVersionTag})`,
            version: `${pVersionTag} • ${sVersionTag}`,
            isBilingual: true,
            bilingualFormat: 'stacked',
            primaryLanguage: pVersionTag,
            secondaryLanguage: sVersionTag,
            secondarySongTitle: secondaryPassage.referenceText,
            secondaryLines: sWrapped
          });
        }
      }
    });
  }

  // Fallback si aucun slide
  if (slides.length === 0) {
    slides.push({
      id: 'bible_bi_fallback',
      songTitle: primaryPassage.referenceText,
      sectionTitle: 'Verset',
      lines: [primaryPassage.text || primaryPassage.referenceText],
      slideIndex: 0,
      totalSlides: 1,
      itemType: 'bible',
      bibleReference: compoundRef,
      version: `${pVersionTag} • ${sVersionTag}`,
      isBilingual: true,
      bilingualFormat: format,
      primaryLanguage: pVersionTag,
      secondaryLanguage: sVersionTag,
      secondarySongTitle: secondaryPassage.referenceText,
      secondaryLines: [secondaryPassage.text || secondaryPassage.referenceText]
    });
  }

  const total = slides.length;
  return slides.map((s, idx) => ({
    ...s,
    slideIndex: idx,
    totalSlides: total
  }));
}


/**
 * Envoie l'état au récepteur de projection (BroadcastChannel + localStorage + serveur HTTP)
 */
export function broadcastPresentationState(state: PresentationState): void {
  try {
    if (typeof state.fontScale === 'number') {
      saveFontScale(state.fontScale);
    }
    if (typeof state.backgroundImage === 'string') {
      saveBackgroundImage(state.backgroundImage);
    }
    if (typeof state.backgroundOverlay === 'number') {
      saveBackgroundOverlay(state.backgroundOverlay);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}

  try {
    const channel = getChannel();
    if (channel) {
      channel.postMessage({ type: 'UPDATE_STATE', state });
    }
  } catch {}

  // Envoi asynchrone au serveur pour contourner tout blocage navigateur/partitionnement
  pushPresentationStateToServer(state);
}

/**
 * Envoi au serveur Express
 */
export async function pushPresentationStateToServer(state: PresentationState): Promise<void> {
  try {
    await fetch('/api/presentation-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state })
    });
  } catch {}
}

/**
 * Récupération depuis le serveur Express
 */
export async function fetchPresentationStateFromServer(): Promise<PresentationState | null> {
  try {
    const res = await fetch('/api/presentation-state');
    if (!res.ok) return null;
    const data = await res.json();
    return data.state || null;
  } catch {
    return null;
  }
}

/**
 * Récupère le dernier état sauvegardé dans localStorage
 */
export function getSavedPresentationState(): PresentationState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PresentationState;
  } catch {
    return null;
  }
}

/**
 * S'abonne aux mises à jour de l'état de projection
 */
export function subscribeToPresentation(
  onStateChange: (state: PresentationState) => void
): () => void {
  const channel = getChannel();

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'UPDATE_STATE' && event.data.state) {
      onStateChange(event.data.state);
    }
  };

  if (channel) {
    channel.addEventListener('message', handleMessage);
  }

  // Écoute de l'événement storage en fallback immédiat multi-fenêtres
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const state = JSON.parse(event.newValue) as PresentationState;
        onStateChange(state);
      } catch {}
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    if (channel) {
      try {
        channel.removeEventListener('message', handleMessage);
      } catch {}
    }
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * Demande au contrôleur de renvoyer l'état actuel (si la pop-up vient de s'ouvrir)
 */
export function requestPresentationSync(): void {
  try {
    const channel = getChannel();
    if (channel) {
      channel.postMessage({ type: 'REQUEST_SYNC' });
    }
  } catch {}
}

/**
 * Écoute les requêtes de synchronisation émises par la fenêtre pop-up
 */
export function listenForSyncRequests(onRequestSync: () => void): () => void {
  const channel = getChannel();
  if (!channel) return () => {};

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'REQUEST_SYNC') {
      onRequestSync();
    }
  };

  channel.addEventListener('message', handleMessage);

  return () => {
    try {
      channel.removeEventListener('message', handleMessage);
    } catch {}
  };
}

/**
 * Auto-vérification des algorithmes de slides
 */
export function testPresentationSlides(): boolean {
  const sampleChordPro = `
{title: Grand Dieu, nous te bénissons}
{c: Couplet 1}
[C]Grand Dieu, nous [G]te bénissons,
[Am]Nous célébrons [Em]ton pouvoir !
[F]Devant toi [C]nous nous courbons,
[Dm]Pour exalter [G]ta grandeur !

{c: Refrain}
[F]Saint, saint, saint [G]est le Seigneur !
`;

  const slides = buildPresentationSlides(sampleChordPro, 'Grand Dieu', 4);
  return slides.length >= 2 && slides[0].lines.length <= 4 && !slides[0].lines[0].includes('[C]');
}
