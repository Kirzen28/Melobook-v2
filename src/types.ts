export type UserRole = 'admin' | 'member';

export type NotationSystem = 'standard' | 'latin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  currentGroupId: string | null;
  role: UserRole;
  createdAt?: any;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  members: string[]; // array of UIDs
  inviteCode: string;
  description?: string;
  createdAt?: any;
}

export interface Folder {
  id: string;
  groupId: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt?: any;
}

export interface Song {
  id: string;
  groupId: string;
  title: string;
  artist: string;
  key: string;
  tempo: number;
  timeSignature?: string;
  contentChordPro: string;
  folderId: string | null;
  capo?: number;
  tags?: string[];
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Setlist {
  id: string;
  groupId: string;
  name: string;
  date: string;
  songIds: string[];
  notes?: string;
  targetDuration?: number; // in minutes
  createdAt?: any;
}

export interface StageSettings {
  fontSize: number; // in px or rem scale
  showChords: boolean;
  transposeOffset: number; // -11 to +11
  notation: NotationSystem; // 'standard' (A, B, C) or 'latin' (Do, Ré, Mi)
  autoScrollSpeed: number; // 1 to 10
  isAutoScrolling: boolean;
  columns: 1 | 2;
  theme: 'dark' | 'oled' | 'sepia' | 'light';
  capo: number; // 0 to 7
  showMetronome: boolean;
  soundMetronome: boolean;
}

export interface SongTypographySettings {
  titleSize: number; // e.g. 26px (16-48px)
  metadataSize: number; // e.g. 13px (10-22px)
  lyricsSize: number; // e.g. 18px (12-38px)
  headerSize: number; // e.g. 12px (10-28px)
  chordSize: number; // e.g. 16px (11-32px)
  lineSpacing: number; // e.g. 1.4 (1.0-2.4)
}

export interface SectionColors {
  verse: string; // Couplet
  chorus: string; // Refrain
  bridge: string; // Pont
  intro: string; // Intro
  outro: string; // Outro / Fin
  preChorus: string; // Pré-refrain
  instrumental: string; // Instrumental / Solo
  tag: string; // Tag / Coda
  general: string; // Général / Autre
}

export interface DisplaySettings {
  typography: SongTypographySettings;
  sectionColors: SectionColors;
}
