export type UserRole = 'admin' | 'leader' | 'member';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export type NotationSystem = 'standard' | 'latin';

export type VocalArrangementType = 'Unisson' | 'Lead' | '2e voix' | '3e voix';

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

export type Library = Group;

export interface Song {
  id: string;
  groupId: string;
  title: string;
  artist: string;
  key: string;
  tempo: number;
  timeSignature?: string;
  duration?: string; // ex: 4:30, 03:45, 5 min
  durationMode?: 'auto' | 'custom';
  contentChordPro: string;
  content?: string;
  folderId?: string | null;
  capo?: number;
  tags?: string[];
  language?: string;
  linkedSongIds?: string[];
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface SetlistSongOverride {
  key?: string;
  tempo?: number;
  capo?: number;
  transposeOffset?: number;
  duration?: string;
  notes?: string;
  sectionRepeats?: Record<number, number>;
}

export interface Setlist {
  id: string;
  groupId: string;
  name: string;
  date: string;
  songIds: string[];
  songOverrides?: Record<string, SetlistSongOverride>;
  notes?: string;
  targetDuration?: number;
  createdAt?: any;
}

export type SetlistEventType = 'rehearsal' | 'concert' | 'service' | 'other';

export interface SetlistHistorySongSnapshot {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  tempo?: number;
}

export interface SetlistHistoryRecord {
  id: string;
  groupId: string;
  setlistId: string;
  setlistName: string;
  eventType: SetlistEventType;
  date: string;
  playedAt?: any;
  durationMinutes?: number;
  location?: string;
  notes?: string;
  songIds: string[];
  songsSnapshot?: SetlistHistorySongSnapshot[];
  playedByUid?: string;
  playedByName?: string;
  createdAt?: any;
}

export interface StageSettings {
  fontSize: number; // in px or rem scale
  showChords: boolean;
  transposeOffset: number; // -11 to +11
  notation: NotationSystem; // 'standard' (A, B, C) or 'latin' (Do, Ré, Mi)
  autoScrollSpeed: number; // 1 to 10
  isAutoScrolling: boolean;
  columns: 1 | 2 | 3 | 4 | 5 | 'auto';
  theme: 'dark' | 'oled' | 'sepia' | 'light' | 'system';
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
  sectionSpacing?: number; // e.g. 8px (0-48px)
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

export interface SectionBorders {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
}

export interface SongMetadataVisibility {
  artist: boolean;
  language: boolean;
  duration: boolean;
  tags: boolean;
  controlsBar: boolean;
  notes: boolean;
  actions: boolean;
  vocalArrangement: boolean;
  sectionHeaders?: boolean;
}

export type PreviewMetadataVisibility = SongMetadataVisibility;

export interface DisplaySettings {
  typography: SongTypographySettings;
  sectionColors: SectionColors;
  sectionBorders?: SectionBorders;
  chordColor?: string;
  metadataVisibility?: SongMetadataVisibility;
}

export interface SongCardMetadataSettings {
  showKey: boolean;
  showTempo: boolean;
  showDuration: boolean;
  showCategories: boolean;
}

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title?: string;
  message: string;
  type?: NotificationType;
  duration?: number;
}
