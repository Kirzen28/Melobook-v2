import React from 'react';
import { DisplaySettings, SectionColors, SectionBorders } from '../types';

export const DEFAULT_SECTION_BORDERS: SectionBorders = {
  left: true,
  right: false,
  top: false,
  bottom: false,
};

export const DEFAULT_CHORD_COLOR = '#60a5fa';

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  typography: {
    titleSize: 26,
    metadataSize: 12,
    headerSize: 12,
    lyricsSize: 18,
    chordSize: 16,
    lineSpacing: 1.4,
    sectionSpacing: 4,
  },
  sectionColors: {
    verse: '#94a3b8',        // Couplet
    chorus: '#3b82f6',       // Refrain
    bridge: '#a855f7',       // Pont
    intro: '#10b981',        // Intro
    outro: '#f43f5e',        // Outro / Fin
    preChorus: '#ec4899',    // Pré-Refrain
    instrumental: '#eab308', // Instrumental
    tag: '#06b6d4',          // Tag / Coda
    general: '#64748b'       // Général / Autre
  },
  sectionBorders: {
    left: true,
    right: false,
    top: false,
    bottom: false,
  },
  chordColor: DEFAULT_CHORD_COLOR
};

export const COLOR_PRESETS = [
  { name: 'Bleu Royal', value: '#3b82f6' },
  { name: 'Cyan Ciel', value: '#06b6d4' },
  { name: 'Émeraude', value: '#10b981' },
  { name: 'Ambre Doré', value: '#f59e0b' },
  { name: 'Orange Vif', value: '#f97316' },
  { name: 'Corail / Rouge', value: '#f43f5e' },
  { name: 'Rose Framboise', value: '#ec4899' },
  { name: 'Violet Pourpre', value: '#a855f7' },
  { name: 'Indigo Nuit', value: '#6366f1' },
  { name: 'Ardoise / Blanc', value: '#94a3b8' },
  { name: 'Blanc Pur', value: '#f8fafc' },
  { name: 'Gris Neutre', value: '#64748b' },
  { name: 'Vert Lime', value: '#84cc16' },
  { name: 'Teal Profond', value: '#14b8a6' },
  { name: 'Jaune Moutarde', value: '#ca8a04' },
  { name: 'Rouge Brique', value: '#b91c1c' },
];

export interface SectionTypeMeta {
  key: keyof SectionColors;
  label: string;
  description: string;
  defaultBadge: string;
}

export const SECTION_TYPES_LIST: SectionTypeMeta[] = [
  { key: 'verse', label: 'Couplet', description: 'Sections narratives et couplets numérotés', defaultBadge: 'Couplet 1' },
  { key: 'chorus', label: 'Refrain', description: 'Point culminant et thématique centrale du chant', defaultBadge: 'Refrain' },
  { key: 'bridge', label: 'Pont', description: 'Transition harmonique et élévation', defaultBadge: 'Pont' },
  { key: 'preChorus', label: 'Pré-Refrain', description: 'Montée en puissance avant le refrain', defaultBadge: 'Pré-Refrain' },
  { key: 'intro', label: 'Intro', description: 'Ouverture instrumentale ou vocale', defaultBadge: 'Intro' },
  { key: 'outro', label: 'Outro / Fin', description: 'Conclusion et sortie du chant', defaultBadge: 'Outro' },
  { key: 'instrumental', label: 'Instrumental / Solo', description: 'Passages purement musicaux ou solos', defaultBadge: 'Instrumental' },
  { key: 'tag', label: 'Tag / Coda', description: 'Répétition finale ou phrase courte', defaultBadge: 'Tag' },
  { key: 'general', label: 'Général / Autre', description: 'Sections libres sans étiquette spécifique', defaultBadge: 'Section' },
];

/**
 * Maps a chordpro section header string (e.g. "Chorus", "Couplet 2", "Bridge", "Pont") to a color
 */
export function getSectionColor(sectionType: string | undefined, colors: SectionColors): string {
  if (!sectionType) return colors.general || '#64748b';
  const norm = sectionType.toLowerCase().replace(/[-_\s]/g, '');

  if (norm.includes('prechorus') || norm.includes('prerefrain') || norm.includes('pre') || norm.includes('pré')) {
    return colors.preChorus || '#ec4899';
  }
  if (norm.includes('chorus') || norm.includes('refrain')) {
    return colors.chorus || '#3b82f6';
  }
  if (norm.includes('verse') || norm.includes('couplet')) return colors.verse || '#94a3b8';
  if (norm.includes('bridge') || norm.includes('pont')) return colors.bridge || '#a855f7';
  if (norm.includes('intro')) return colors.intro || '#10b981';
  if (norm.includes('outro') || norm.includes('fin') || norm.includes('ending') || norm.includes('finale')) return colors.outro || '#f43f5e';
  if (norm.includes('instru') || norm.includes('solo') || norm.includes('interlude')) return colors.instrumental || '#eab308';
  if (norm.includes('tag') || norm.includes('coda')) return colors.tag || '#06b6d4';

  return colors.general || '#64748b';
}

/**
 * Calculates CSS border and background properties for song sections based on active borders
 */
export function getSectionBorderStyles(secColor: string, borders?: SectionBorders): React.CSSProperties {
  const b = borders || DEFAULT_SECTION_BORDERS;
  const borderWidth = '3.5px';

  return {
    borderLeftWidth: b.left ? borderWidth : '0px',
    borderLeftStyle: b.left ? 'solid' : 'none',
    borderLeftColor: b.left ? secColor : 'transparent',

    borderRightWidth: b.right ? borderWidth : '0px',
    borderRightStyle: b.right ? 'solid' : 'none',
    borderRightColor: b.right ? secColor : 'transparent',

    borderTopWidth: b.top ? borderWidth : '0px',
    borderTopStyle: b.top ? 'solid' : 'none',
    borderTopColor: b.top ? secColor : 'transparent',

    borderBottomWidth: b.bottom ? borderWidth : '0px',
    borderBottomStyle: b.bottom ? 'solid' : 'none',
    borderBottomColor: b.bottom ? secColor : 'transparent',

    backgroundColor: `${secColor}0D`
  };
}

/**
 * Loads display settings from local storage or returns defaults
 */
export function loadSavedDisplaySettings(): DisplaySettings {
  try {
    const raw = localStorage.getItem('songbook_display_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        typography: { ...DEFAULT_DISPLAY_SETTINGS.typography, ...(parsed.typography || {}) },
        sectionColors: { ...DEFAULT_DISPLAY_SETTINGS.sectionColors, ...(parsed.sectionColors || {}) },
        sectionBorders: { ...DEFAULT_SECTION_BORDERS, ...(parsed.sectionBorders || {}) },
        chordColor: parsed.chordColor || DEFAULT_CHORD_COLOR
      };
    }
  } catch (e) {
    console.error('Failed to load display settings', e);
  }
  return DEFAULT_DISPLAY_SETTINGS;
}

/**
 * Saves display settings to local storage
 */
export function saveDisplaySettings(settings: DisplaySettings): void {
  try {
    localStorage.setItem('songbook_display_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save display settings', e);
  }
}
