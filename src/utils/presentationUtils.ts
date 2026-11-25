import { parseChordPro, ParsedSongData, stripParentheses } from './chordUtils';
import { BiblePassageData } from '../types';
import { decodeHtmlEntities } from './htmlEntities';
import { alignChordProStructures } from '../services/songAlignmentService';

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
export type MediaSourceType = 'youtube' | 'url' | 'local';

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
  baseFontSize?: number;
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
export const BASE_FONT_SIZE_KEY = 'melobook_presentation_base_font_size';
export const DEFAULT_BASE_FONT_SIZE_PX = 44;
export const MIN_BASE_FONT_SIZE_PX = 28;
export const MAX_BASE_FONT_SIZE_PX = 84;
export const MIN_RESPONSIVE_FONT_PX = 20;
export const BACKGROUND_IMAGE_KEY = 'melobook_presentation_bg_image';
export const BACKGROUND_OVERLAY_KEY = 'melobook_presentation_bg_overlay';
export const AUTO_LAYOUT_KEY = 'melobook_presentation_auto_layout';
const MAX_LINES_PER_SLIDE = 4; // Découpage automatique adapté pour lisibilité projection

export function getSavedAutoLayout(): boolean {
  try {
    const raw = localStorage.getItem(AUTO_LAYOUT_KEY);
    if (raw === 'false') return false;
    if (raw === 'true') return true;
  } catch {}
  return true;
}

export function saveAutoLayout(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_LAYOUT_KEY, enabled ? 'true' : 'false');
  } catch {}
}

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

export function getSavedBaseFontSize(): number {
  try {
    const raw = localStorage.getItem(BASE_FONT_SIZE_KEY);
    if (raw) {
      const val = parseFloat(raw);
      if (!isNaN(val) && val >= MIN_BASE_FONT_SIZE_PX && val <= MAX_BASE_FONT_SIZE_PX) {
        return Math.round(val);
      }
    }
  } catch {}
  return DEFAULT_BASE_FONT_SIZE_PX;
}

export function saveBaseFontSize(sizePx: number): void {
  try {
    const clamped = Math.max(MIN_BASE_FONT_SIZE_PX, Math.min(MAX_BASE_FONT_SIZE_PX, Math.round(sizePx)));
    localStorage.setItem(BASE_FONT_SIZE_KEY, clamped.toString());
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

interface LayoutBudget {
  effectiveMaxLines: number;
  charBudget: number;
}

function computeSongLayoutBudget(allLines: string[], baseMaxLines: number): LayoutBudget {
  const nonEmpty = allLines.filter(l => l.length > 0);
  if (nonEmpty.length === 0) {
    return { effectiveMaxLines: baseMaxLines, charBudget: 180 };
  }
  const totalChars = nonEmpty.reduce((acc, l) => acc + l.length, 0);
  const avgLineLen = totalChars / nonEmpty.length;

  // Adapte le budget de lignes et de caractères selon la longueur globale du chant
  if (avgLineLen > 52 || totalChars > 950) {
    return {
      effectiveMaxLines: Math.max(2, Math.min(baseMaxLines, 2)),
      charBudget: 145
    };
  }
  if (avgLineLen > 38 || totalChars > 550) {
    return {
      effectiveMaxLines: Math.max(2, Math.min(baseMaxLines, 3)),
      charBudget: 175
    };
  }
  return {
    effectiveMaxLines: Math.max(1, baseMaxLines),
    charBudget: 210
  };
}

/**
 * Découpe un bloc de lignes en k slides équilibrées (évite les orphelins de 1 ligne et les écarts de longueur)
 */
function partitionLinesBalanced(lines: string[], budget: LayoutBudget): string[][] {
  if (lines.length === 0) return [];
  const totalChars = lines.reduce((sum, l) => sum + l.length, 0);
  const minByLines = Math.ceil(lines.length / budget.effectiveMaxLines);
  const minByChars = Math.ceil(totalChars / budget.charBudget);
  let k = Math.max(1, minByLines, minByChars);
  k = Math.min(k, lines.length);

  if (k === 1) return [lines];

  // Répartition équilibrée en caractères tout en respectant des tailles de groupes homogènes
  const findBestSplit = (partCount: number): string[][] => {
    const n = lines.length;
    const prefixChars = new Array<number>(n + 1).fill(0);
    for (let i = 0; i < n; i++) {
      prefixChars[i + 1] = prefixChars[i] + lines[i].length;
    }
    const targetChars = prefixChars[n] / partCount;
    const minLinesPerPart = Math.max(1, Math.floor(n / partCount) - 1);
    const maxLinesPerPart = Math.min(budget.effectiveMaxLines, Math.ceil(n / partCount) + 1);

    // DP coût = max(écart quadratique chars) + pénalité si déséquilibre de lignes > 1
    const dp: number[][] = Array.from({ length: partCount + 1 }, () => new Array(n + 1).fill(Infinity));
    const prevIdx: number[][] = Array.from({ length: partCount + 1 }, () => new Array(n + 1).fill(-1));
    dp[0][0] = 0;

    for (let p = 1; p <= partCount; p++) {
      for (let i = p; i <= n; i++) {
        for (let j = p - 1; j < i; j++) {
          const len = i - j;
          if (len > budget.effectiveMaxLines && partCount < n) continue;
          if (len < minLinesPerPart || len > maxLinesPerPart) continue;
          if (dp[p - 1][j] === Infinity) continue;

          const chunkChars = prefixChars[i] - prefixChars[j];
          const charDiff = chunkChars - targetChars;
          const idealLen = n / partCount;
          const linePenalty = Math.abs(len - idealLen) * 180;
          const cost = dp[p - 1][j] + charDiff * charDiff + linePenalty;
          if (cost < dp[p][i]) {
            dp[p][i] = cost;
            prevIdx[p][i] = j;
          }
        }
      }
    }

    // Fallback répartition arithmétique homogène si aucune contrainte stricte satisfaite
    if (dp[partCount][n] === Infinity) {
      const base = Math.floor(n / partCount);
      const rem = n % partCount;
      const chunks: string[][] = [];
      let cursor = 0;
      for (let p = 0; p < partCount; p++) {
        const take = base + (p < rem ? 1 : 0);
        chunks.push(lines.slice(cursor, cursor + take));
        cursor += take;
      }
      return chunks;
    }

    const bounds: number[] = [];
    let cur = n;
    for (let p = partCount; p >= 1; p--) {
      const start = prevIdx[p][cur];
      bounds.unshift(start);
      cur = start;
    }
    const chunks: string[][] = [];
    for (let p = 0; p < partCount; p++) {
      const start = bounds[p];
      const end = p + 1 < partCount ? bounds[p + 1] : n;
      chunks.push(lines.slice(start, end));
    }
    return chunks;
  };

  let result = findBestSplit(k);
  // Si un bloc dépasse nettement le budget et a plus d'une ligne, augmente k d'un cran si possible
  while (
    k < lines.length &&
    result.some(chunk => chunk.length > 1 && chunk.reduce((s, l) => s + l.length, 0) > budget.charBudget * 1.25)
  ) {
    k++;
    result = findBestSplit(k);
  }
  return result;
}

function extractSongSectionsForProjection(parsed: ParsedSongData): { secTitle: string; stanzas: string[][] }[] {
  const sectionsOut: { secTitle: string; stanzas: string[][] }[] = [];

  for (const section of parsed.sections) {
    const secTitle = (section.title || section.type || '').trim();
    const typeLower = (section.type || '').toLowerCase();

    if (section.blockKind === 'grid' || section.blockKind === 'tab' || typeLower === 'grid' || typeLower === 'tab') {
      continue;
    }

    // Ignorer les sections purement instrumentales sans paroles
    if (['solo', 'intro', 'outro', 'interlude', 'instrumental'].includes(typeLower) && (!secTitle || /intro|solo|instru/i.test(secTitle))) {
      const hasAnyLyrics = section.lines.some(l =>
        l.type === 'lyrics' && l.items.some(it => it.lyrics && it.lyrics.trim().length > 0)
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

      if (l.type === 'comment' || l.type === 'comment_italic' || l.type === 'comment_box' || l.type === 'grid_row' || l.type === 'tab_row') {
        continue;
      }

      const text = l.items.map(it => it.lyrics || '').join('').trim();
      if (text) {
        currentStanza.push(text);
      }
    }
    if (currentStanza.length > 0) {
      stanzas.push(currentStanza);
    }

    if (stanzas.length === 0) continue;
    sectionsOut.push({ secTitle, stanzas });
  }

  return sectionsOut;
}

/**
 * Construit la liste des slides pour la projection à partir du ChordPro
 * avec découpage par section (standard ou équilibré automatiquement selon la longueur du texte)
 */
export function buildPresentationSlides(
  chordProText: string,
  explicitTitle?: string,
  maxLines: number = MAX_LINES_PER_SLIDE,
  options?: { autoLayout?: boolean }
): PresentationSlide[] {
  const parsed: ParsedSongData = parseChordPro(chordProText || '');
  const rawTitle = explicitTitle || parsed.title || 'Sans titre';
  const songTitle = stripParentheses(rawTitle);
  const useAutoLayout = Boolean(options?.autoLayout);

  const sections = extractSongSectionsForProjection(parsed);
  const allLyricLines = sections.flatMap(sec => sec.stanzas.flatMap(st => st));
  const budget = useAutoLayout
    ? computeSongLayoutBudget(allLyricLines, maxLines)
    : { effectiveMaxLines: maxLines, charBudget: Infinity };

  const rawSlides: { sectionTitle: string; lines: string[] }[] = [];

  for (const section of sections) {
    const chunks: string[][] = [];

    for (const stanza of section.stanzas) {
      if (useAutoLayout) {
        chunks.push(...partitionLinesBalanced(stanza, budget));
      } else {
        for (let i = 0; i < stanza.length; i += maxLines) {
          chunks.push(stanza.slice(i, i + maxLines));
        }
      }
    }

    // Créer les slides pour cette section
    chunks.forEach((chunkLines, chunkIdx) => {
      let subTitle = section.secTitle || 'Paroles';
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
    const fallbackLines = (chordProText || '')
      .split('\n')
      .filter(l => !l.trim().startsWith('#'))
      .map(l => l.replace(/\[[^\]]*\]/g, '').replace(/\{[^}]*\}/g, '').trim())
      .filter(Boolean);

    if (fallbackLines.length > 0) {
      if (useAutoLayout) {
        const fbBudget = computeSongLayoutBudget(fallbackLines, maxLines);
        for (const chunk of partitionLinesBalanced(fallbackLines, fbBudget)) {
          rawSlides.push({ sectionTitle: 'Paroles', lines: chunk });
        }
      } else {
        rawSlides.push({
          sectionTitle: 'Paroles',
          lines: fallbackLines.slice(0, maxLines)
        });
      }
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
  maxLines: number = format === 'stacked' ? 3 : 4,
  options?: { autoLayout?: boolean }
): PresentationSlide[] {
  const useAutoLayout = Boolean(options?.autoLayout);
  const { alignedSecondaryChordPro } = alignChordProStructures(
    primaryChordPro,
    secondaryChordPro,
    primaryTitle,
    secondaryTitle
  );
  const effectiveSecondaryChordPro = alignedSecondaryChordPro || secondaryChordPro;

  // Si mise en page auto et structures identiques, synchroniser les coupes sur la langue la plus longue
  if (useAutoLayout) {
    const pParsed = parseChordPro(primaryChordPro || '');
    const sParsed = parseChordPro(effectiveSecondaryChordPro || '');
    const pSections = extractSongSectionsForProjection(pParsed);
    const sSections = extractSongSectionsForProjection(sParsed);

    const sameStructure =
      pSections.length > 0 &&
      pSections.length === sSections.length &&
      pSections.every((ps, i) =>
        ps.stanzas.length === sSections[i].stanzas.length &&
        ps.stanzas.every((st, j) => st.length === sSections[i].stanzas[j].length)
      );

    if (sameStructure) {
      const combinedMaxLines = pSections.flatMap((ps, i) =>
        ps.stanzas.flatMap((st, j) =>
          st.map((line, lIdx) => {
            const sLine = sSections[i].stanzas[j][lIdx] || '';
            return line.length >= sLine.length ? line : sLine;
          })
        )
      );
      const sharedBudget = computeSongLayoutBudget(combinedMaxLines, maxLines);
      const rawPaired: { sectionTitle: string; lines: string[]; secondaryLines: string[] }[] = [];

      pSections.forEach((ps, sIdx) => {
        const secChunksP: string[][] = [];
        const secChunksS: string[][] = [];

        ps.stanzas.forEach((pStanza, stIdx) => {
          const sStanza = sSections[sIdx].stanzas[stIdx];
          const maxStanza = pStanza.map((l, k) => (l.length >= sStanza[k].length ? l : sStanza[k]));
          const splitMax = partitionLinesBalanced(maxStanza, sharedBudget);

          let cursor = 0;
          for (const part of splitMax) {
            secChunksP.push(pStanza.slice(cursor, cursor + part.length));
            secChunksS.push(sStanza.slice(cursor, cursor + part.length));
            cursor += part.length;
          }
        });

        secChunksP.forEach((chunkP, cIdx) => {
          let subTitle = ps.secTitle || 'Paroles';
          if (secChunksP.length > 1) {
            subTitle = `${subTitle} (${cIdx + 1}/${secChunksP.length})`;
          }
          rawPaired.push({
            sectionTitle: subTitle,
            lines: chunkP,
            secondaryLines: secChunksS[cIdx] || []
          });
        });
      });

      if (rawPaired.length > 0) {
        const totalSlides = rawPaired.length;
        return rawPaired.map((item, i) => ({
          id: `bilingual_slide_${i}`,
          songTitle: stripParentheses(primaryTitle),
          sectionTitle: item.sectionTitle,
          lines: item.lines,
          slideIndex: i,
          totalSlides,
          itemType: 'song',
          isBilingual: true,
          bilingualFormat: format,
          primaryLanguage: primaryLang,
          secondaryLines: item.secondaryLines,
          secondarySongTitle: stripParentheses(secondaryTitle),
          secondaryLanguage: secondaryLang
        }));
      }
    }
  }

  const pSlides = buildPresentationSlides(primaryChordPro, primaryTitle, maxLines, { autoLayout: useAutoLayout });
  const sSlides = buildPresentationSlides(effectiveSecondaryChordPro, secondaryTitle, maxLines, { autoLayout: useAutoLayout });

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
 * Nettoie le texte des versets bibliques (élimine les balises et numéros Strong ex: <S>1234</S>,
 * les numéros de concordance accolés aux mots ex: Then3767 -> Then, et les notes de bas de page)
 */
export function cleanBibleVerseText(raw: string): string {
  if (!raw) return '';
  return decodeHtmlEntities(raw, 2)
    .replace(/<[sS][^>]*>[\s\S]*?<\/[sS]>/gi, '')
    .replace(/<[fF][^>]*>[\s\S]*?<\/[fF]>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/(\p{L}+)\d{1,5}\b/gu, '$1')
    .replace(/\[\d{1,5}\]|\(\d{1,5}\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:?!])/g, '$1')
    .trim();
}

/**
 * Découpe un verset très long en blocs équilibrés sans saut de ligne forcé à l'intérieur
 */
function splitScriptureBalanced(text: string, chunkCount: number): string[] {
  const clean = cleanBibleVerseText(text);
  if (!clean) return [];
  if (chunkCount <= 1) return [clean];

  const words = clean.split(/\s+/);
  const targetLen = Math.ceil(clean.length / chunkCount);
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + ' ' + word).length <= targetLen || chunks.length >= chunkCount - 1) {
      current += ' ' + word;
    } else {
      chunks.push(current);
      current = word;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Génère une taille de police CSS fixe et configurable (avec plancher responsive minimal),
 * indépendante de l'espace du conteneur et de la longueur du texte.
 */
export function getPresentationFontSizeCss(
  baseFontSizePx: number = DEFAULT_BASE_FONT_SIZE_PX,
  fontScale: number = 1,
  variantRatio: number = 1,
  minResponsivePx: number = MIN_RESPONSIVE_FONT_PX
): string {
  const safeBase = Math.max(
    MIN_BASE_FONT_SIZE_PX,
    Math.min(MAX_BASE_FONT_SIZE_PX, Number.isFinite(baseFontSizePx) ? baseFontSizePx : DEFAULT_BASE_FONT_SIZE_PX)
  );
  const safeScale = Math.max(0.5, Math.min(2.5, Number.isFinite(fontScale) ? fontScale : 1));
  const safeRatio = Math.max(0.5, Math.min(1.5, Number.isFinite(variantRatio) ? variantRatio : 1));

  const targetMaxPx = Math.round(safeBase * safeRatio);
  const floorPx = Math.max(14, Math.min(targetMaxPx, Math.round(minResponsivePx * safeRatio)));
  const vwFactor = +(3.0 * safeRatio * (safeBase / DEFAULT_BASE_FONT_SIZE_PX)).toFixed(2);

  return `calc(clamp(${floorPx}px, ${vwFactor}vw, ${targetMaxPx}px) * ${safeScale})`;
}

/**
 * Construit la liste des slides de projection pour un passage ou verset biblique
 */
export function buildBiblePresentationSlides(
  passage: BiblePassageData,
  maxCharsPerSlide: number = 340
): PresentationSlide[] {
  const rawSlides: {
    sectionTitle: string;
    lines: string[];
    verseRef: string;
  }[] = [];

  const versionTag = passage.version ? ` (${passage.version})` : '';
  const safeMaxChars = maxCharsPerSlide > 20 ? maxCharsPerSlide : 340;

  if (passage.verses && passage.verses.length > 0) {
    for (const v of passage.verses) {
      const clean = cleanBibleVerseText(v.text);
      if (!clean) continue;

      const verseRef = `${passage.bookName} ${passage.chapter}:${v.verseNumber}${versionTag}`;
      const chunkCount = Math.max(1, Math.ceil(clean.length / safeMaxChars));
      const chunks = splitScriptureBalanced(clean, chunkCount);

      chunks.forEach((chunk, cIdx) => {
        let secTitle = `Verset ${v.verseNumber}`;
        if (chunks.length > 1) {
          secTitle = `Verset ${v.verseNumber} (${cIdx + 1}/${chunks.length})`;
        }
        rawSlides.push({
          sectionTitle: secTitle,
          lines: [chunk],
          verseRef
        });
      });
    }
  }

  // Fallback si verses est vide mais que passage.text existe
  if (rawSlides.length === 0 && passage.text) {
    const clean = cleanBibleVerseText(passage.text);
    const chunkCount = Math.max(1, Math.ceil(clean.length / safeMaxChars));
    const chunks = splitScriptureBalanced(clean, chunkCount);
    chunks.forEach((chunk, cIdx) => {
      rawSlides.push({
        sectionTitle: chunks.length > 1 ? `Passage (${cIdx + 1}/${chunks.length})` : 'Passage',
        lines: [chunk],
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
  maxCharsPerSlide: number = 240
): PresentationSlide[] {
  const slides: PresentationSlide[] = [];
  const pVerses = primaryPassage.verses || [];
  const sVerses = secondaryPassage.verses || [];
  const pVersionTag = primaryPassage.version || 'LSG';
  const sVersionTag = secondaryPassage.version || 'KJV';
  const compoundRef = `${primaryPassage.referenceText} (${pVersionTag} • ${sVersionTag})`;
  const safeMaxChars = maxCharsPerSlide > 20 ? maxCharsPerSlide : 240;

  if (pVerses.length > 0) {
    pVerses.forEach((pv, idx) => {
      const sv = sVerses.find(v => v.verseNumber === pv.verseNumber) || sVerses[idx];
      const cleanP = cleanBibleVerseText(pv.text);
      const cleanS = cleanBibleVerseText(sv?.text || '');
      const longestLen = Math.max(cleanP.length, cleanS.length);
      const chunkCount = Math.max(1, Math.ceil(longestLen / safeMaxChars));
      const pChunks = splitScriptureBalanced(cleanP, chunkCount);
      const sChunks = cleanS ? splitScriptureBalanced(cleanS, chunkCount) : [];

      for (let c = 0; c < chunkCount; c++) {
        const pText = pChunks[c] || '';
        const sText = sChunks[c] || '';
        if (!pText && !sText) continue;

        let secTitle = `Verset ${pv.verseNumber}`;
        if (chunkCount > 1) {
          secTitle = `Verset ${pv.verseNumber} (${c + 1}/${chunkCount})`;
        }

        slides.push({
          id: `bible_bi_${pv.verseNumber}_${c}`,
          songTitle: primaryPassage.referenceText,
          sectionTitle: secTitle,
          lines: pText ? [pText] : (cleanP ? [cleanP] : []),
          slideIndex: slides.length,
          totalSlides: 0,
          itemType: 'bible',
          bibleReference: `${primaryPassage.bookName} ${primaryPassage.chapter}:${pv.verseNumber} (${pVersionTag} • ${sVersionTag})`,
          version: `${pVersionTag} • ${sVersionTag}`,
          isBilingual: true,
          bilingualFormat: format,
          primaryLanguage: pVersionTag,
          secondaryLanguage: sVersionTag,
          secondarySongTitle: secondaryPassage.referenceText,
          secondaryLines: sText ? [sText] : (sv && cleanS ? [cleanS] : [])
        });
      }
    });
  }

  // Fallback si aucun slide
  if (slides.length === 0) {
    slides.push({
      id: 'bible_bi_fallback',
      songTitle: primaryPassage.referenceText,
      sectionTitle: 'Verset',
      lines: [cleanBibleVerseText(primaryPassage.text || primaryPassage.referenceText)],
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
      secondaryLines: [cleanBibleVerseText(secondaryPassage.text || secondaryPassage.referenceText)]
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
    if (typeof state.baseFontSize === 'number') {
      saveBaseFontSize(state.baseFontSize);
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

/**
 * Auto-vérification de la mise en page automatique équilibrée
 */
export function testAutoLayoutSlides(): void {
  const fiveLines = `
{c: Couplet 1}
Ligne un assez courte
Ligne deux assez courte
Ligne trois assez courte
Ligne quatre assez courte
Ligne cinq assez courte
`;
  const balanced5 = buildPresentationSlides(fiveLines, 'Test 5', 4, { autoLayout: true });
  if (balanced5.length !== 2 || balanced5[0].lines.length !== 3 || balanced5[1].lines.length !== 2) {
    throw new Error(`Expected balanced [3, 2] split for 5 lines, got ${JSON.stringify(balanced5.map(s => s.lines.length))}`);
  }

  const denseFourLines = `
{c: Couplet long}
Car Dieu a tant aimé le monde qu'il a donné son unique Fils
Afin que quiconque croit en lui ne périsse jamais mais vive
Son amour infini demeure à jamais gravé dans nos coeurs
Nous élevons nos voix ensemble pour célébrer sa grâce pure
`;
  const balancedDense = buildPresentationSlides(denseFourLines, 'Test Dense', 4, { autoLayout: true });
  if (balancedDense.length !== 2 || balancedDense[0].lines.length !== 2 || balancedDense[1].lines.length !== 2) {
    throw new Error(`Expected balanced [2, 2] split for dense lines, got ${JSON.stringify(balancedDense.map(s => s.lines.length))}`);
  }
}
