import { parseChordPro, ParsedSongData, stripParentheses } from './chordUtils';

export interface PresentationSlide {
  id: string;
  songTitle: string;
  sectionTitle: string;
  lines: string[];
  slideIndex: number;
  totalSlides: number;
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
  updatedAt: number;
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
