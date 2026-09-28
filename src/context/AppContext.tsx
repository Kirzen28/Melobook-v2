import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  UserProfile, 
  Group, 
  Song, 
  Setlist, 
  SetlistSongOverride,
  SetlistHistoryRecord,
  SetlistEventType,
  StageSettings, 
  DisplaySettings, 
  SongTypographySettings, 
  SectionColors, 
  SectionBorders,
  SongCardMetadataSettings,
  UserRole,
  SyncStatus,
  NotificationType,
  AppNotification
} from '../types';
import { DEFAULT_DISPLAY_SETTINGS } from '../utils/displayDefaults';
import { 
  auth, 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  limit,
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  signOut,
  serverTimestamp
} from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { SAMPLE_SONGS, SAMPLE_SETLISTS, SAMPLE_SETLIST_HISTORY } from '../data/sampleSongs';
import { getSongDuration } from '../utils/chordUtils';
import { detectSongLanguage } from '../utils/languageUtils';
import { 
  registerServiceWorker, 
  cacheSongInWorker, 
  cacheSetlistInWorker, 
  cacheAllDataInWorker,
  getAllCachedSongs,
  getAllCachedSetlists,
  clearAllLocalCaches,
  getOfflineStorageStats 
} from '../utils/pwaCache';
import { deleteSongFromIndexedDB, deleteSetlistFromIndexedDB } from '../utils/indexedDB';

const DEFAULT_GROUP: Group = {
  id: 'default-group',
  name: 'Bibliothèque Principale',
  ownerId: 'demo-admin-uid',
  members: ['demo-admin-uid'],
  inviteCode: 'LOUAN7',
  description: 'Bibliothèque de louange et chants partagés.'
};

const DEFAULT_STAGE_SETTINGS: StageSettings = {
  fontSize: 18,
  showChords: true,
  transposeOffset: 0,
  notation: 'standard',
  autoScrollSpeed: 3,
  isAutoScrolling: false,
  columns: 1,
  theme: 'dark',
  capo: 0,
  showMetronome: false,
  soundMetronome: false
};

interface AppContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  groups: Group[];
  currentGroup: Group | null;
  // Aliases Bibliothèque
  libraries: Group[];
  currentLibrary: Group | null;
  songs: Song[];
  setlists: Setlist[];
  activeTab: 'repertoire' | 'setlists' | 'stage' | 'groups' | 'editor' | 'settings' | 'tuner';
  setActiveTab: (tab: 'repertoire' | 'setlists' | 'stage' | 'groups' | 'editor' | 'settings' | 'tuner') => void;
  selectedSong: Song | null;
  setSelectedSong: (song: Song | null) => void;
  selectedSetlist: Setlist | null;
  setSelectedSetlist: (setlist: Setlist | null) => void;
  activeSetlistIndex: number;
  setActiveSetlistIndex: (index: number) => void;
  stageSettings: StageSettings;
  updateStageSettings: (settings: Partial<StageSettings>) => void;
  displaySettings: DisplaySettings;
  updateDisplaySettings: (settings: { 
    typography?: Partial<SongTypographySettings>; 
    sectionColors?: Partial<SectionColors>;
    sectionBorders?: Partial<SectionBorders>;
    chordColor?: string;
  }, silent?: boolean) => void;
  resetDisplaySettings: () => void;
  songCardMetadata: SongCardMetadataSettings;
  updateSongCardMetadata: (settings: Partial<SongCardMetadataSettings>) => void;
  isOffline: boolean;
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  syncNow: () => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isPianoOpen: boolean;
  setIsPianoOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isMetronomeOpen: boolean;
  setIsMetronomeOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isTunerOpen: boolean;
  setIsTunerOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isInstallable: boolean;
  promptInstall: () => void;
  
  // Offline & IndexedDB Storage
  offlineStats: {
    songCount: number;
    setlistCount: number;
    lastCachedAt: string | null;
    usageBytes: number;
    quotaBytes: number;
    isSupported: boolean;
  };
  refreshOfflineStats: () => Promise<void>;
  cacheAllSongsOffline: () => Promise<void>;
  clearOfflineStorage: () => Promise<void>;
  
  // Snackbar Notifications
  notifications: AppNotification[];
  showNotification: (
    messageOrOptions: string | { title?: string; message: string; type?: NotificationType; duration?: number },
    type?: NotificationType,
    duration?: number
  ) => void;
  dismissNotification: (id: string) => void;
  
  // Actions
  createSong: (songData: Omit<Song, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  importSong: (songData: Omit<Song, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSong: (id: string, songData: Partial<Song>) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  linkSongs: (songId1: string, songId2: string) => Promise<void>;
  unlinkSongs: (songId1: string, songId2: string) => Promise<void>;
  createLanguageVersion: (sourceSongId: string, targetLanguage: string, customTitle?: string) => Promise<string>;
  autoDetectSongLanguages: (songIds?: string[]) => Promise<number>;
  
  createSetlist: (setlistData: Omit<Setlist, 'id' | 'groupId' | 'createdAt'>) => Promise<string>;
  updateSetlist: (id: string, setlistData: Partial<Setlist>) => Promise<void>;
  deleteSetlist: (id: string) => Promise<void>;
  updateSetlistSongOverride: (setlistId: string, songId: string, override: Partial<SetlistSongOverride>) => Promise<void>;
  removeSetlistSongOverride: (setlistId: string, songId: string) => Promise<void>;
  
  // Setlist History
  setlistHistory: SetlistHistoryRecord[];
  recordSetlistHistory: (recordData: Omit<SetlistHistoryRecord, 'id' | 'groupId' | 'createdAt'>) => Promise<string>;
  updateSetlistHistory: (id: string, recordData: Partial<SetlistHistoryRecord>) => Promise<void>;
  deleteSetlistHistory: (id: string) => Promise<void>;
  
  createGroup: (name: string, description?: string) => Promise<string>;
  updateGroup: (groupId: string, data: Partial<Pick<Group, 'name' | 'description' | 'inviteCode'>>) => Promise<boolean>;
  deleteGroup: (groupId: string, options?: { deleteAssociatedData?: boolean }) => Promise<boolean>;
  joinGroup: (inviteCode: string) => Promise<boolean>;
  switchGroup: (groupId: string) => void;
  // Aliases Bibliothèque
  createLibrary: (name: string, description?: string) => Promise<string>;
  updateLibrary: (libraryId: string, data: Partial<Pick<Group, 'name' | 'description' | 'inviteCode'>>) => Promise<boolean>;
  deleteLibrary: (libraryId: string, options?: { deleteAssociatedData?: boolean }) => Promise<boolean>;
  joinLibrary: (inviteCode: string) => Promise<boolean>;
  switchLibrary: (libraryId: string) => void;
  
  // Permissions & Rôles
  isAdmin: boolean;
  isLeader: boolean;
  canManageSongs: boolean;
  canManageGroups: boolean;
  canAccessSettings: boolean;
  
  allUsers: UserProfile[];
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  setAdminByEmail: (targetEmail: string, role?: UserRole) => Promise<void>;
  
  loginDemoUser: (role?: UserRole) => void;
  loginLocalUser: (customEmail: string, customName?: string, role?: UserRole) => void;
  handleSignOut: () => Promise<void>;
  seedDemoDataToFirestore: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation & Selection
  const [activeTab, setActiveTab] = useState<'repertoire' | 'setlists' | 'stage' | 'groups' | 'editor' | 'settings' | 'tuner'>('repertoire');
  const [selectedSong, setSelectedSong] = useState<Song | null>(SAMPLE_SONGS[0]);
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [activeSetlistIndex, setActiveSetlistIndex] = useState<number>(0);
  
  // Auth state - par défaut, aucun compte n'est connecté
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('songbook_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ne pas restaurer l'ancien faux compte de démo
        if (parsed?.uid && parsed.uid !== 'demo-admin-uid' && !parsed.uid.startsWith('demo-')) {
          return parsed;
        } else {
          localStorage.removeItem('songbook_user');
        }
      } catch (e) {}
    }
    return null;
  });
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPianoOpen, setIsPianoOpen] = useState(false);
  const [isMetronomeOpen, setIsMetronomeOpen] = useState(false);
  const [isTunerOpen, setIsTunerOpen] = useState(false);

  // Snackbar notifications state & handlers (bottom-right notifications)
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNotification = useCallback((
    messageOrOptions?: string | { title?: string; message?: string; type?: NotificationType; duration?: number },
    type: NotificationType = 'success',
    duration: number = 2200
  ) => {
    const isString = typeof messageOrOptions === 'string';
    const resolvedType = isString ? type : (messageOrOptions?.type || type);
    const resolvedTitle = isString
      ? messageOrOptions
      : (messageOrOptions?.title || (resolvedType === 'success' ? 'Enregistré' : 'Info'));
    const resolvedMessage = isString ? '' : (messageOrOptions?.message || '');
    const resolvedDuration = isString ? duration : (messageOrOptions?.duration || duration);

    const newNotif: AppNotification = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: resolvedTitle,
      message: resolvedMessage,
      type: resolvedType,
      duration: resolvedDuration
    };

    setNotifications(prev => {
      const existingIdx = prev.findIndex(n => n.title === resolvedTitle);
      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx] = newNotif;
        return copy;
      }
      return [...prev.slice(-1), newNotif];
    });
  }, []);

  // Helper to read deleted item IDs so sample items are not restored if explicitly deleted by user
  const getDeletedSongIds = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('songbook_deleted_song_ids');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  const getDeletedSetlistIds = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('songbook_deleted_setlist_ids');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  const getDeletedHistoryIds = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('songbook_deleted_history_ids');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  // Groups & Data
  const [groups, setGroups] = useState<Group[]>([DEFAULT_GROUP]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedId = localStorage.getItem('songbook_current_group_id');
        if (savedId && savedId !== 'default-group') {
          return { ...DEFAULT_GROUP, id: savedId, name: 'Chargement de la bibliothèque...' };
        }
      } catch (e) {}
    }
    return DEFAULT_GROUP;
  });
  const [songs, setSongs] = useState<Song[]>(() => {
    const deletedIds = getDeletedSongIds();
    const saved = localStorage.getItem('songbook_cached_songs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const loaded = parsed.map((s: Song) => {
            const resolvedDuration = s.duration || getSongDuration(s) || SAMPLE_SONGS.find(sm => sm.id === s.id || sm.title.toLowerCase() === s.title?.toLowerCase())?.duration;
            const resolvedLanguage = (s.language && s.language.trim())
              ? s.language
              : detectSongLanguage(s.title, s.contentChordPro || s.content);
            const base = resolvedDuration ? { ...s, duration: resolvedDuration } : s;
            return { ...base, language: resolvedLanguage };
          });
          const missingSamples = SAMPLE_SONGS.filter(sm => !deletedIds.has(sm.id) && !loaded.some((ls: Song) => ls.id === sm.id)).map(sm => ({
            ...sm,
            language: (sm.language && sm.language.trim()) ? sm.language : detectSongLanguage(sm.title, sm.contentChordPro || sm.content)
          }));
          return [...loaded, ...missingSamples];
        }
      } catch (e) {}
    }
    return SAMPLE_SONGS.filter(sm => !deletedIds.has(sm.id)).map(sm => ({
      ...sm,
      language: (sm.language && sm.language.trim()) ? sm.language : detectSongLanguage(sm.title, sm.contentChordPro || sm.content)
    }));
  });
  const [setlists, setSetlists] = useState<Setlist[]>(() => {
    const deletedSetlistIds = getDeletedSetlistIds();
    const saved = localStorage.getItem('songbook_cached_setlists');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const missingSamples = SAMPLE_SETLISTS.filter(st => !deletedSetlistIds.has(st.id) && !parsed.some((ps: Setlist) => ps.id === st.id));
          return [...parsed, ...missingSamples];
        }
      } catch (e) {}
    }
    return SAMPLE_SETLISTS.filter(st => !deletedSetlistIds.has(st.id));
  });

  const [setlistHistory, setSetlistHistory] = useState<SetlistHistoryRecord[]>(() => {
    const deletedHistoryIds = getDeletedHistoryIds();
    const saved = localStorage.getItem('songbook_cached_setlist_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const missingSamples = SAMPLE_SETLIST_HISTORY.filter(sh => !deletedHistoryIds.has(sh.id) && !parsed.some((ph: SetlistHistoryRecord) => ph.id === sh.id));
          return [...parsed, ...missingSamples];
        }
      } catch (e) {}
    }
    return SAMPLE_SETLIST_HISTORY.filter(sh => !deletedHistoryIds.has(sh.id));
  });

  // Stage view custom settings
  const [stageSettings, setStageSettings] = useState<StageSettings>(() => {
    const saved = localStorage.getItem('songbook_stage_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STAGE_SETTINGS,
          ...parsed
        };
      } catch (e) {}
    }
    return DEFAULT_STAGE_SETTINGS;
  });

  // Display Typography, Section Colors & Section Borders (synced with localStorage)
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() => {
    const saved = localStorage.getItem('songbook_display_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          typography: { ...DEFAULT_DISPLAY_SETTINGS.typography, ...(parsed.typography || {}) },
          sectionColors: { ...DEFAULT_DISPLAY_SETTINGS.sectionColors, ...(parsed.sectionColors || {}) },
          sectionBorders: { ...DEFAULT_DISPLAY_SETTINGS.sectionBorders, ...(parsed.sectionBorders || {}) },
          chordColor: parsed.chordColor || DEFAULT_DISPLAY_SETTINGS.chordColor || '#60a5fa',
        };
      } catch (e) {}
    }
    return DEFAULT_DISPLAY_SETTINGS;
  });

  const updateDisplaySettings = useCallback((newSettings: { 
    typography?: Partial<SongTypographySettings>; 
    sectionColors?: Partial<SectionColors>;
    sectionBorders?: Partial<SectionBorders>;
    chordColor?: string;
  }, silent = false) => {
    setDisplaySettings(prev => {
      const updated: DisplaySettings = {
        typography: {
          ...prev.typography,
          ...(newSettings.typography || {})
        },
        sectionColors: {
          ...prev.sectionColors,
          ...(newSettings.sectionColors || {})
        },
        sectionBorders: {
          ...(prev.sectionBorders || DEFAULT_DISPLAY_SETTINGS.sectionBorders!),
          ...(newSettings.sectionBorders || {})
        },
        chordColor: newSettings.chordColor !== undefined ? newSettings.chordColor : (prev.chordColor || DEFAULT_DISPLAY_SETTINGS.chordColor || '#60a5fa')
      };
      localStorage.setItem('songbook_display_settings', JSON.stringify(updated));
      return updated;
    });
    if (!silent) {
      showNotification('Enregistré');
    }
  }, [showNotification]);

  const DEFAULT_SONG_CARD_METADATA: SongCardMetadataSettings = {
    showKey: false,
    showTempo: false,
    showDuration: false,
    showCategories: false,
  };

  const [songCardMetadata, setSongCardMetadata] = useState<SongCardMetadataSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SONG_CARD_METADATA;
    const saved = localStorage.getItem('songbook_song_card_metadata');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          showKey: parsed.showKey === true,
          showTempo: parsed.showTempo === true,
          showDuration: parsed.showDuration === true,
          showCategories: parsed.showCategories === true,
        };
      } catch (e) {}
    }
    return DEFAULT_SONG_CARD_METADATA;
  });

  const updateSongCardMetadata = useCallback((newSettings: Partial<SongCardMetadataSettings>) => {
    setSongCardMetadata(prev => {
      const updated: SongCardMetadataSettings = {
        ...prev,
        ...newSettings
      };
      localStorage.setItem('songbook_song_card_metadata', JSON.stringify(updated));
      return updated;
    });
    showNotification('Enregistré');
  }, [showNotification]);

  const resetDisplaySettings = useCallback(() => {
    setDisplaySettings(DEFAULT_DISPLAY_SETTINGS);
    localStorage.setItem('songbook_display_settings', JSON.stringify(DEFAULT_DISPLAY_SETTINGS));
    setSongCardMetadata(DEFAULT_SONG_CARD_METADATA);
    localStorage.setItem('songbook_song_card_metadata', JSON.stringify(DEFAULT_SONG_CARD_METADATA));
    showNotification({ title: 'Réinitialisé', type: 'info' });
  }, [showNotification]);

  // Network & PWA status
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(typeof window !== 'undefined' && !navigator.onLine ? 'offline' : 'synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Offline stats state (IndexedDB & Service Worker)
  const [offlineStats, setOfflineStats] = useState<{
    songCount: number;
    setlistCount: number;
    lastCachedAt: string | null;
    usageBytes: number;
    quotaBytes: number;
    isSupported: boolean;
  }>({
    songCount: 0,
    setlistCount: 0,
    lastCachedAt: null,
    usageBytes: 0,
    quotaBytes: 0,
    isSupported: typeof window !== 'undefined' && 'indexedDB' in window
  });

  const refreshOfflineStats = useCallback(async () => {
    try {
      const stats = await getOfflineStorageStats();
      setOfflineStats(stats);
    } catch (e) {
      console.warn('Erreur lecture stats offline:', e);
    }
  }, []);

  const cacheAllSongsOffline = useCallback(async () => {
    try {
      await cacheAllDataInWorker(songs, setlists);
      await refreshOfflineStats();
      showNotification({
        title: 'Cache hors-ligne complet',
        message: `${songs.length} chants et ${setlists.length} setlists stockés en local (IndexedDB & Service Worker).`,
        type: 'success',
        duration: 3200
      });
    } catch (e) {
      showNotification({
        title: 'Erreur stockage local',
        message: 'Impossible de finaliser la mise en cache.',
        type: 'error'
      });
    }
  }, [songs, setlists, refreshOfflineStats, showNotification]);

  const clearOfflineStorage = useCallback(async () => {
    try {
      await clearAllLocalCaches();
      await refreshOfflineStats();
      showNotification({
        title: 'Stockage local réinitialisé',
        message: 'Le cache hors-ligne IndexedDB a été vidé avec succès.',
        type: 'info'
      });
    } catch (e) {
      showNotification({
        title: 'Erreur',
        message: 'Impossible de vider le cache.',
        type: 'error'
      });
    }
  }, [refreshOfflineStats, showNotification]);

  // Hydratation initiale depuis IndexedDB pour disponibilité instantanée hors-ligne
  useEffect(() => {
    let isMounted = true;
    const hydrateFromIndexedDB = async () => {
      try {
        const targetGroup = currentGroup?.id || 'default-group';
        const [cachedSongs, cachedSetlists] = await Promise.all([
          getAllCachedSongs(targetGroup),
          getAllCachedSetlists(targetGroup)
        ]);

        if (!isMounted) return;

        const deletedSongIds = getDeletedSongIds();
        const deletedSetlistIds = getDeletedSetlistIds();

        if (cachedSongs && cachedSongs.length > 0) {
          setSongs(prev => {
            const songMap = new Map<string, Song>();
            cachedSongs.forEach(s => {
              if (!deletedSongIds.has(s.id)) songMap.set(s.id, s);
            });
            prev.forEach(s => {
              if (!deletedSongIds.has(s.id)) songMap.set(s.id, s);
            });
            return Array.from(songMap.values());
          });
        }

        if (cachedSetlists && cachedSetlists.length > 0) {
          setSetlists(prev => {
            const stMap = new Map<string, Setlist>();
            cachedSetlists.forEach(st => {
              if (!deletedSetlistIds.has(st.id)) stMap.set(st.id, st);
            });
            prev.forEach(st => {
              if (!deletedSetlistIds.has(st.id)) stMap.set(st.id, st);
            });
            return Array.from(stMap.values());
          });
        }

        await refreshOfflineStats();
      } catch (err) {
        console.warn('Hydratation IndexedDB:', err);
      }
    };

    hydrateFromIndexedDB();
    return () => {
      isMounted = false;
    };
  }, [currentGroup?.id, refreshOfflineStats]);

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setSyncStatus('offline');
      return;
    }
    setSyncStatus('syncing');
    try {
      await new Promise(resolve => setTimeout(resolve, 750));
      // Re-sauvegarder dans IndexedDB après sync
      await cacheAllDataInWorker(songs, setlists);
      await refreshOfflineStats();
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
    } catch (e) {
      setSyncStatus('error');
    }
  }, [songs, setlists, refreshOfflineStats]);

  // PWA Install and Online Listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      setTimeout(() => {
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      }, 1000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Register Service Worker pour acces complet hors-ligne
    registerServiceWorker();
    refreshOfflineStats();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [refreshOfflineStats]);

  // Mise en cache du chant consulte
  useEffect(() => {
    if (selectedSong) {
      cacheSongInWorker(selectedSong).then(() => {
        refreshOfflineStats();
      });
    }
  }, [selectedSong, refreshOfflineStats]);

  // Mise en cache de la setlist consultee et de ses partitions
  useEffect(() => {
    if (selectedSetlist) {
      const setlistSongs = selectedSetlist.songIds
        .map(id => songs.find(s => s.id === id))
        .filter((s): s is Song => Boolean(s));
      cacheSetlistInWorker(selectedSetlist, setlistSongs).then(() => {
        refreshOfflineStats();
      });
    }
  }, [selectedSetlist, songs, refreshOfflineStats]);

  // Sauvegarde globale de l ensemble du repertoire dans IndexedDB et le cache SW
  useEffect(() => {
    if (songs.length > 0 || setlists.length > 0) {
      cacheAllDataInWorker(songs, setlists).then(() => {
        refreshOfflineStats();
      });
    }
  }, [songs, setlists, refreshOfflineStats]);

  // Deep linking for song shared via QR Code or direct link
  useEffect(() => {
    if (typeof window === 'undefined' || songs.length === 0) return;

    try {
      const params = new URLSearchParams(window.location.search);
      let targetSongId = params.get('songId') || params.get('song');

      if (!targetSongId && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        targetSongId = hashParams.get('songId') || hashParams.get('song');
      }

      if (targetSongId) {
        const found = songs.find(s => s.id === targetSongId);
        if (found) {
          setSelectedSong(found);
          setActiveTab('stage');
        }
      }
    } catch (e) {
      console.error('Erreur lecture lien direct chant :', e);
    }
  }, [songs]);

  // Deep linking for group shared via URL or QR Code (?group=... or ?code=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      let targetGroupId = params.get('library') || params.get('libraryId') || params.get('group') || params.get('groupId');
      let targetCode = params.get('code') || params.get('invite');

      if ((!targetGroupId || !targetCode) && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        if (!targetGroupId) targetGroupId = hashParams.get('library') || hashParams.get('libraryId') || hashParams.get('group') || hashParams.get('groupId');
        if (!targetCode) targetCode = hashParams.get('code') || hashParams.get('invite');
      }

      if (targetGroupId) {
        const found = groups.find(g => g.id === targetGroupId);
        if (found && currentGroup?.id !== found.id) {
          setCurrentGroup(found);
          localStorage.setItem('songbook_current_group_id', found.id);
        }
      } else if (targetCode) {
        const foundByCode = groups.find(g => g.inviteCode?.toUpperCase() === targetCode?.toUpperCase());
        if (foundByCode && currentGroup?.id !== foundByCode.id) {
          setCurrentGroup(foundByCode);
          localStorage.setItem('songbook_current_group_id', foundByCode.id);
        }
      }
    } catch (e) {
      console.warn('Erreur lecture lien groupe :', e);
    }
  }, [groups, currentGroup?.id]);

  const promptInstall = useCallback(() => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          setIsInstallable(false);
        }
        setDeferredInstallPrompt(null);
      });
    }
  }, [deferredInstallPrompt]);

  // Stage settings save
  const updateStageSettings = useCallback((newSettings: Partial<StageSettings>) => {
    setStageSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('songbook_stage_settings', JSON.stringify(updated));
      return updated;
    });
    showNotification('Enregistré');
  }, [showNotification]);

  // Sync theme mode (dark, light, system) with document root
  useEffect(() => {
    const applyTheme = () => {
      const currentTheme = stageSettings.theme || 'dark';
      let isLight = false;

      if (currentTheme === 'light') {
        isLight = true;
      } else if (currentTheme === 'system') {
        isLight = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      }

      if (isLight) {
        document.documentElement.classList.add('light-theme');
        document.documentElement.classList.remove('dark-theme');
      } else {
        document.documentElement.classList.remove('light-theme');
        document.documentElement.classList.add('dark-theme');
      }
    };

    applyTheme();

    if (stageSettings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [stageSettings.theme]);

  // Save cache to localStorage for true offline support
  useEffect(() => {
    localStorage.setItem('songbook_cached_songs', JSON.stringify(songs));
  }, [songs]);

  useEffect(() => {
    localStorage.setItem('songbook_cached_setlists', JSON.stringify(setlists));
  }, [setlists]);

  useEffect(() => {
    localStorage.setItem('songbook_cached_setlist_history', JSON.stringify(setlistHistory));
  }, [setlistHistory]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('songbook_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('songbook_user');
    }
  }, [currentUser]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Fetch or create user doc in Firestore
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setCurrentUser(data);
          } else {
            const email = (user.email || '').toLowerCase().trim();
            let role: UserRole = 'member';
            
            // Propriétaire ou administrateur préconfiguré
            if (email === 'kriveravelasquez@rivera-marketing.com') {
              role = 'admin';
            } else {
              try {
                // Vérifier si l'adresse est pré-autorisée comme administrateur
                const adminEmailDoc = await getDoc(doc(db, 'admin_emails', email));
                if (adminEmailDoc.exists()) {
                  role = 'admin';
                } else {
                  // Si aucun utilisateur n'existe encore dans la base, le 1er inscrit devient admin
                  const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
                  if (usersSnap.empty) {
                    role = 'admin';
                  }
                }
              } catch (e) {
                console.warn('Admin check note:', e);
              }
            }

            const newUser: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Musicien',
              currentGroupId: 'default-group',
              role
            };
            await setDoc(userRef, newUser);
            setCurrentUser(newUser);
          }
        } catch (e) {
          console.warn('Firestore user fetch note:', e);
        }
      } else {
        // Aucun compte connecté via Firebase
        setCurrentUser(prev => {
          if (prev?.uid && (prev.uid.startsWith('user-') || prev.uid.startsWith('demo-'))) {
            return prev;
          }
          return null;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Synchronisation en temps réel de tous les utilisateurs pour l'administration des rôles
  useEffect(() => {
    try {
      const qAllUsers = query(collection(db, 'users'));
      const unsubUsers = onSnapshot(qAllUsers, (snap) => {
        const uList: UserProfile[] = [];
        const seenUids = new Set<string>();
        snap.forEach(d => {
          const data = d.data() as Partial<UserProfile>;
          const resolvedUid = data.uid || d.id;
          if (resolvedUid && !seenUids.has(resolvedUid)) {
            seenUids.add(resolvedUid);
            uList.push({ ...data, uid: resolvedUid } as UserProfile);
          }
        });
        setAllUsers(uList);
      }, (err) => {
        console.warn('Users snapshot note:', err);
      });
      return () => unsubUsers();
    } catch (e) {
      console.warn('Users sync init error:', e);
    }
  }, []);

  // Sync Data with Firestore based on currentGroup
  useEffect(() => {
    const targetGroupId = currentGroup?.id || 'default-group';

    // 1. Sync Songs
    const qSongs = query(collection(db, 'songs'), where('groupId', '==', targetGroupId));
    const unsubSongs = onSnapshot(qSongs, (snapshot) => {
      const deletedIds = getDeletedSongIds();
      const loadedSongs: Song[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          const raw = { id: d.id, ...d.data() } as Song;
          const resolvedDuration = raw.duration || getSongDuration(raw) || SAMPLE_SONGS.find(sm => sm.id === raw.id || sm.title.toLowerCase() === raw.title?.toLowerCase())?.duration;
          const resolvedLanguage = (raw.language && raw.language.trim())
            ? raw.language
            : detectSongLanguage(raw.title, raw.contentChordPro || raw.content);
          const withDuration = resolvedDuration ? { ...raw, duration: resolvedDuration } : raw;
          loadedSongs.push({ ...withDuration, language: resolvedLanguage });
        });
      }

      setSongs(prev => {
        const songMap = new Map<string, Song>();

        // 1. Preserve only existing songs that belong to this targetGroupId
        prev.forEach(s => {
          const sGroup = s.groupId || 'default-group';
          if (sGroup === targetGroupId && !deletedIds.has(s.id)) {
            songMap.set(s.id, s);
          }
        });

        // 2. Add or update songs loaded from Firestore for this targetGroupId
        loadedSongs.forEach(s => {
          if (!deletedIds.has(s.id)) {
            songMap.set(s.id, s);
          }
        });

        // 3. For default group only, make sure sample songs remain present
        if (targetGroupId === 'default-group') {
          SAMPLE_SONGS.forEach(s => {
            if (!deletedIds.has(s.id) && !songMap.has(s.id)) {
              songMap.set(s.id, s);
            }
          });
        }

        const merged = Array.from(songMap.values());
        return merged;
      });
    }, (error) => {
      if (error?.code !== 'unavailable') {
        console.warn('Firestore songs snapshot notice:', error.message);
      }
    });

    // 2. Sync Setlists
    const qSetlists = query(collection(db, 'setlists'), where('groupId', '==', targetGroupId));
    const unsubSetlists = onSnapshot(qSetlists, (snapshot) => {
      const deletedSetlistIds = getDeletedSetlistIds();
      const loadedSetlists: Setlist[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          loadedSetlists.push({ id: d.id, ...d.data() } as Setlist);
        });
      }

      setSetlists(prev => {
        const setlistMap = new Map<string, Setlist>();

        // 1. Preserve only setlists belonging to this targetGroupId
        prev.forEach(st => {
          const stGroup = st.groupId || 'default-group';
          if (stGroup === targetGroupId && !deletedSetlistIds.has(st.id)) {
            setlistMap.set(st.id, st);
          }
        });

        // 2. Add or update setlists from Firestore
        loadedSetlists.forEach(st => {
          if (!deletedSetlistIds.has(st.id)) {
            setlistMap.set(st.id, st);
          }
        });

        // 3. For default group only, ensure sample setlists remain present
        if (targetGroupId === 'default-group') {
          SAMPLE_SETLISTS.forEach(st => {
            if (!deletedSetlistIds.has(st.id) && !setlistMap.has(st.id)) {
              setlistMap.set(st.id, st);
            }
          });
        }

        return Array.from(setlistMap.values());
      });
    }, (error) => {
      if (error?.code !== 'unavailable') {
        console.warn('Firestore setlists snapshot notice:', error.message);
      }
    });

    // 3. Sync Setlist History
    const qHistory = query(collection(db, 'setlist_history'), where('groupId', '==', targetGroupId));
    const unsubHistory = onSnapshot(qHistory, (snapshot) => {
      const deletedHistoryIds = getDeletedHistoryIds();
      const loadedHistory: SetlistHistoryRecord[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          loadedHistory.push({ id: d.id, ...d.data() } as SetlistHistoryRecord);
        });
      }

      setSetlistHistory(prev => {
        const historyMap = new Map<string, SetlistHistoryRecord>();

        prev.forEach(h => {
          const hGroup = h.groupId || 'default-group';
          if (hGroup === targetGroupId && !deletedHistoryIds.has(h.id)) {
            historyMap.set(h.id, h);
          }
        });

        loadedHistory.forEach(h => {
          if (!deletedHistoryIds.has(h.id)) {
            historyMap.set(h.id, h);
          }
        });

        if (targetGroupId === 'default-group') {
          SAMPLE_SETLIST_HISTORY.forEach(sh => {
            if (!deletedHistoryIds.has(sh.id) && !historyMap.has(sh.id)) {
              historyMap.set(sh.id, sh);
            }
          });
        }

        return Array.from(historyMap.values()).sort((a, b) => b.date.localeCompare(a.date));
      });
    }, (error) => {
      if (error?.code !== 'unavailable') {
        console.warn('Firestore setlist history snapshot notice:', error.message);
      }
    });

    // 4. Sync Groups:
    // If admin or unauthenticated visitor: sync ALL groups from Firestore so any user can consult available groups
    // If standard member logged in: sync groups where members array-contains currentUser.uid
    const qGroups = (currentUser?.role === 'admin' || !currentUser?.uid)
      ? query(collection(db, 'groups'))
      : query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));

    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      const loadedGroups: Group[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          loadedGroups.push({ id: d.id, ...d.data() } as Group);
        });
      }
      const seenGroupIds = new Set<string>();
      const mergedGroups: Group[] = [];
      for (const g of [DEFAULT_GROUP, ...loadedGroups]) {
        const gid = g.id || 'default-group';
        if (!seenGroupIds.has(gid)) {
          seenGroupIds.add(gid);
          mergedGroups.push(g);
        }
      }
      setGroups(mergedGroups);

      // Reconnect currentGroup if it was loaded from localStorage or URL
      setCurrentGroup(prev => {
        const targetId = prev?.id || localStorage.getItem('songbook_current_group_id') || 'default-group';
        const match = mergedGroups.find(g => g.id === targetId);
        return match || prev || DEFAULT_GROUP;
      });
    }, (err) => {
      if (err?.code !== 'unavailable') {
        console.warn('Groups sync error:', err.message);
      }
    });

    return () => {
      unsubSongs();
      unsubSetlists();
      unsubHistory();
      unsubGroups();
    };
  }, [currentGroup?.id, currentUser?.uid, currentUser?.role]);

  // Seed sample songs to Firestore for current group
  const seedDemoDataToFirestore = useCallback(async () => {
    const groupId = currentGroup?.id || 'default-group';
    try {
      // 1. Songs
      for (const song of SAMPLE_SONGS) {
        const songRef = doc(db, 'songs', song.id);
        await setDoc(songRef, { ...song, groupId, createdAt: serverTimestamp() });
      }
      // 2. Setlists
      for (const setlist of SAMPLE_SETLISTS) {
        const setlistRef = doc(db, 'setlists', setlist.id);
        await setDoc(setlistRef, { ...setlist, groupId, createdAt: serverTimestamp() });
      }
      // 3. Setlist History
      for (const record of SAMPLE_SETLIST_HISTORY) {
        const historyRef = doc(db, 'setlist_history', record.id);
        await setDoc(historyRef, { ...record, groupId, createdAt: serverTimestamp() });
      }
      // Update local state directly
      setSongs(SAMPLE_SONGS.map(s => ({ ...s, groupId })));
      setSetlists(SAMPLE_SETLISTS.map(st => ({ ...st, groupId })));
      setSetlistHistory(SAMPLE_SETLIST_HISTORY.map(h => ({ ...h, groupId })));
    } catch (e) {
      console.error('Error seeding demo data:', e);
    }
  }, [currentGroup?.id]);

  // Song Actions
  const createSong = useCallback(async (songData: Omit<Song, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>) => {
    const groupId = currentGroup?.id || 'default-group';
    const newId = 'song_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const resolvedLanguage = (songData.language && songData.language.trim())
      ? songData.language
      : detectSongLanguage(songData.title, songData.contentChordPro || songData.content);

    const newSong: Song = {
      ...songData,
      language: resolvedLanguage,
      id: newId,
      groupId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Optimistic local update: explicitly add to existing library without replacing
    setSongs(prev => {
      const filtered = prev.filter(s => s.id !== newId);
      return [newSong, ...filtered];
    });
    setSelectedSong(newSong);

    showNotification('Enregistré');

    // Save to Firestore
    try {
      const docRef = doc(db, 'songs', newId);
      await setDoc(docRef, { ...newSong, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (e) {
      console.warn('Saved song locally (Firestore offline/error):', e);
    }

    return newId;
  }, [currentGroup?.id, showNotification]);

  // Dedicated importSong action that explicitly appends imported songs to the existing library
  const importSong = useCallback(async (songData: Omit<Song, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>) => {
    return await createSong(songData);
  }, [createSong]);

  const updateSong = useCallback(async (id: string, songData: Partial<Song>) => {
    const resolvedData: Partial<Song> = { ...songData };
    if (songData.language !== undefined && (!songData.language || !songData.language.trim())) {
      const existing = songs.find(s => s.id === id);
      const titleToUse = songData.title || existing?.title;
      const contentToUse = songData.contentChordPro || songData.content || existing?.contentChordPro || existing?.content;
      resolvedData.language = detectSongLanguage(titleToUse, contentToUse);
    }

    // Optimistic local update
    setSongs(prev => prev.map(s => s.id === id ? { ...s, ...resolvedData, updatedAt: new Date().toISOString() } : s));
    if (selectedSong?.id === id) {
      setSelectedSong(prev => prev ? { ...prev, ...resolvedData } : null);
    }

    showNotification('Enregistré');

    try {
      const docRef = doc(db, 'songs', id);
      await updateDoc(docRef, { ...resolvedData, updatedAt: serverTimestamp() });
    } catch (e) {
      console.warn('Updated song locally:', e);
    }
  }, [selectedSong?.id, showNotification]);

  // Bulk / individual automatic language detection and assignment
  const autoDetectSongLanguages = useCallback(async (songIds?: string[]): Promise<number> => {
    const targetSongs = songIds && songIds.length > 0
      ? songs.filter(s => songIds.includes(s.id))
      : songs;

    const updates: { id: string; language: string }[] = [];
    for (const s of targetSongs) {
      const detected = detectSongLanguage(s.title, s.contentChordPro || s.content);
      if (detected && detected !== s.language) {
        updates.push({ id: s.id, language: detected });
      }
    }

    if (updates.length === 0) return 0;

    // Optimistic local update
    setSongs(prev => prev.map(s => {
      const found = updates.find(u => u.id === s.id);
      return found ? { ...s, language: found.language, updatedAt: new Date().toISOString() } : s;
    }));

    if (selectedSong) {
      const found = updates.find(u => u.id === selectedSong.id);
      if (found) {
        setSelectedSong(prev => prev ? { ...prev, language: found.language } : null);
      }
    }

    showNotification('Enregistré');

    // Persist to Firestore
    for (const u of updates) {
      try {
        const docRef = doc(db, 'songs', u.id);
        await updateDoc(docRef, { language: u.language, updatedAt: serverTimestamp() });
      } catch (e) {
        console.warn('Updated song language locally (Firestore offline/error):', e);
      }
    }

    return updates.length;
  }, [songs, selectedSong, showNotification]);

  const deleteSong = useCallback(async (id: string) => {
    try {
      const currentDeleted = new Set<string>(JSON.parse(localStorage.getItem('songbook_deleted_song_ids') || '[]'));
      currentDeleted.add(id);
      localStorage.setItem('songbook_deleted_song_ids', JSON.stringify(Array.from(currentDeleted)));
    } catch (e) {}

    setSongs(prev => prev.filter(s => s.id !== id));
    if (selectedSong?.id === id) {
      setSelectedSong(songs.find(s => s.id !== id) || null);
    }
    // Also remove from any setlists
    setSetlists(prev => prev.map(st => ({
      ...st,
      songIds: st.songIds.filter(sId => sId !== id)
    })));

    showNotification({ title: 'Supprimé', type: 'info' });

    // Supprimer d'IndexedDB pour garder le cache hors-ligne synchronisé
    deleteSongFromIndexedDB(id).catch(e => console.warn('Suppression chant IndexedDB note:', e));

    try {
      await deleteDoc(doc(db, 'songs', id));
    } catch (e) {
      console.warn('Deleted song locally:', e);
    }
  }, [selectedSong?.id, songs, showNotification]);

  const linkSongs = useCallback(async (songId1: string, songId2: string) => {
    if (!songId1 || !songId2 || songId1 === songId2) return;

    setSongs(prev => {
      const song1 = prev.find(s => s.id === songId1);
      const song2 = prev.find(s => s.id === songId2);
      if (!song1 || !song2) return prev;

      const group1 = new Set<string>([songId1, ...(song1.linkedSongIds || [])]);
      const group2 = new Set<string>([songId2, ...(song2.linkedSongIds || [])]);
      const allMerged = Array.from(new Set([...group1, ...group2]));

      return prev.map(s => {
        if (allMerged.includes(s.id)) {
          return {
            ...s,
            linkedSongIds: allMerged.filter(id => id !== s.id)
          };
        }
        return s;
      });
    });

    setSelectedSong(prev => {
      if (!prev) return null;
      if (prev.id === songId1 || prev.id === songId2) {
        const otherId = prev.id === songId1 ? songId2 : songId1;
        const currentLinks = prev.linkedSongIds || [];
        if (!currentLinks.includes(otherId)) {
          return { ...prev, linkedSongIds: [...currentLinks, otherId] };
        }
      }
      return prev;
    });

    try {
      const song1 = songs.find(s => s.id === songId1);
      const song2 = songs.find(s => s.id === songId2);
      if (song1 && song2) {
        const group1 = new Set<string>([songId1, ...(song1.linkedSongIds || [])]);
        const group2 = new Set<string>([songId2, ...(song2.linkedSongIds || [])]);
        const allMerged = Array.from(new Set([...group1, ...group2]));

        for (const sId of allMerged) {
          const linksForSong = allMerged.filter(id => id !== sId);
          await setDoc(doc(db, 'songs', sId), { linkedSongIds: linksForSong, updatedAt: serverTimestamp() }, { merge: true });
        }
      }
    } catch (e) {
      console.warn('Updated links locally:', e);
    }

    showNotification('Enregistré');
  }, [songs, showNotification]);

  const unlinkSongs = useCallback(async (songId1: string, songId2: string) => {
    if (!songId1 || !songId2 || songId1 === songId2) return;

    setSongs(prev => {
      const song1 = prev.find(s => s.id === songId1);
      const peersOf1 = new Set<string>([songId1, ...(song1?.linkedSongIds || [])]);

      return prev.map(s => {
        if (peersOf1.has(s.id)) {
          const newLinks = (s.linkedSongIds || []).filter(id => id !== songId2);
          return { ...s, linkedSongIds: newLinks };
        }
        if (s.id === songId2) {
          const newLinks = (s.linkedSongIds || []).filter(id => !peersOf1.has(id));
          return { ...s, linkedSongIds: newLinks };
        }
        return s;
      });
    });

    setSelectedSong(prev => {
      if (!prev) return null;
      if (prev.id === songId1) {
        return {
          ...prev,
          linkedSongIds: (prev.linkedSongIds || []).filter(id => id !== songId2)
        };
      }
      if (prev.id === songId2) {
        return {
          ...prev,
          linkedSongIds: (prev.linkedSongIds || []).filter(id => id !== songId1)
        };
      }
      return prev;
    });

    try {
      const song1 = songs.find(s => s.id === songId1);
      const peersOf1 = new Set<string>([songId1, ...(song1?.linkedSongIds || [])]);

      if (song1) {
        const newLinks1 = (song1.linkedSongIds || []).filter(id => id !== songId2);
        await setDoc(doc(db, 'songs', songId1), { linkedSongIds: newLinks1, updatedAt: serverTimestamp() }, { merge: true });
      }

      const song2 = songs.find(s => s.id === songId2);
      if (song2) {
        const newLinks2 = (song2.linkedSongIds || []).filter(id => !peersOf1.has(id));
        await setDoc(doc(db, 'songs', songId2), { linkedSongIds: newLinks2, updatedAt: serverTimestamp() }, { merge: true });
      }

      for (const peerId of peersOf1) {
        if (peerId !== songId1 && peerId !== songId2) {
          const peer = songs.find(s => s.id === peerId);
          if (peer && (peer.linkedSongIds || []).includes(songId2)) {
            const peerLinks = (peer.linkedSongIds || []).filter(id => id !== songId2);
            await setDoc(doc(db, 'songs', peerId), { linkedSongIds: peerLinks, updatedAt: serverTimestamp() }, { merge: true });
          }
        }
      }
    } catch (e) {
      console.warn('Unlinked songs locally:', e);
    }

    showNotification({ title: 'Dissocié', type: 'info' });
  }, [songs, showNotification]);

  const createLanguageVersion = useCallback(async (sourceSongId: string, targetLanguage: string, customTitle?: string) => {
    const sourceSong = songs.find(s => s.id === sourceSongId);
    if (!sourceSong) throw new Error('Source song not found');

    const newTitle = customTitle?.trim() || `${sourceSong.title} - ${targetLanguage}`;
    const newSongData: Omit<Song, 'id' | 'groupId' | 'createdAt' | 'updatedAt'> = {
      title: newTitle,
      artist: sourceSong.artist,
      key: sourceSong.key,
      tempo: sourceSong.tempo,
      timeSignature: sourceSong.timeSignature,
      duration: sourceSong.duration,
      durationMode: sourceSong.durationMode,
      capo: sourceSong.capo,
      tags: sourceSong.tags ? [...sourceSong.tags] : [],
      language: targetLanguage,
      linkedSongIds: [sourceSongId, ...(sourceSong.linkedSongIds || []).filter(id => id !== sourceSongId)],
      notes: sourceSong.notes ? `Version ${targetLanguage}. ${sourceSong.notes}` : `Version ${targetLanguage}`,
      contentChordPro: sourceSong.contentChordPro
    };

    const newId = await createSong(newSongData);
    
    // Bidirectionally link with source song and all already linked versions
    await linkSongs(sourceSongId, newId);
    if (sourceSong.linkedSongIds && sourceSong.linkedSongIds.length > 0) {
      for (const linkedId of sourceSong.linkedSongIds) {
        await linkSongs(linkedId, newId);
      }
    }

    showNotification('Enregistré');

    return newId;
  }, [songs, createSong, linkSongs, showNotification]);

  // Setlist Actions
  const createSetlist = useCallback(async (setlistData: Omit<Setlist, 'id' | 'groupId' | 'createdAt'>) => {
    const groupId = currentGroup?.id || 'default-group';
    const newId = 'setlist_' + Date.now();
    const newSetlist: Setlist = {
      ...setlistData,
      id: newId,
      groupId,
      createdAt: new Date().toISOString()
    };

    setSetlists(prev => [newSetlist, ...prev]);
    setSelectedSetlist(newSetlist);

    showNotification('Enregistré');

    try {
      await setDoc(doc(db, 'setlists', newId), { ...newSetlist, createdAt: serverTimestamp() });
    } catch (e) {
      console.warn('Saved setlist locally:', e);
    }

    return newId;
  }, [currentGroup?.id, showNotification]);

  const updateSetlist = useCallback(async (id: string, setlistData: Partial<Setlist>) => {
    setSetlists(prev => prev.map(st => st.id === id ? { ...st, ...setlistData } : st));
    if (selectedSetlist?.id === id) {
      setSelectedSetlist(prev => prev ? { ...prev, ...setlistData } : null);
    }

    showNotification('Enregistré');

    try {
      const docRef = doc(db, 'setlists', id);
      await updateDoc(docRef, setlistData);
    } catch (e) {
      console.warn('Updated setlist locally:', e);
    }
  }, [selectedSetlist?.id, showNotification]);

  const deleteSetlist = useCallback(async (id: string) => {
    try {
      const currentDeleted = new Set<string>(JSON.parse(localStorage.getItem('songbook_deleted_setlist_ids') || '[]'));
      currentDeleted.add(id);
      localStorage.setItem('songbook_deleted_setlist_ids', JSON.stringify(Array.from(currentDeleted)));
    } catch (e) {}

    setSetlists(prev => prev.filter(st => st.id !== id));
    if (selectedSetlist?.id === id) {
      setSelectedSetlist(null);
    }

    showNotification({ title: 'Supprimé', type: 'info' });

    // Supprimer d'IndexedDB pour garder le cache hors-ligne cohérent
    deleteSetlistFromIndexedDB(id).catch(e => console.warn('Suppression setlist IndexedDB note:', e));

    try {
      await deleteDoc(doc(db, 'setlists', id));
    } catch (e) {
      console.warn('Deleted setlist locally:', e);
    }
  }, [selectedSetlist?.id, showNotification]);

  const updateSetlistSongOverride = useCallback(async (setlistId: string, songId: string, override: Partial<SetlistSongOverride>) => {
    let updatedOverrides: Record<string, SetlistSongOverride> = {};

    setSetlists(prev => prev.map(st => {
      if (st.id !== setlistId) return st;
      const currentOverrides = st.songOverrides || {};
      const songOverride = { ...(currentOverrides[songId] || {}), ...override };
      const newOverrides = { ...currentOverrides, [songId]: songOverride };
      updatedOverrides = newOverrides;
      return { ...st, songOverrides: newOverrides };
    }));

    if (selectedSetlist?.id === setlistId) {
      setSelectedSetlist(prev => {
        if (!prev) return null;
        const currentOverrides = prev.songOverrides || {};
        const songOverride = { ...(currentOverrides[songId] || {}), ...override };
        return {
          ...prev,
          songOverrides: { ...currentOverrides, [songId]: songOverride }
        };
      });
    }

    showNotification('Enregistré');

    try {
      const docRef = doc(db, 'setlists', setlistId);
      await updateDoc(docRef, { songOverrides: updatedOverrides });
    } catch (e) {
      console.warn('Updated setlist song override locally:', e);
    }
  }, [selectedSetlist?.id, showNotification]);

  const removeSetlistSongOverride = useCallback(async (setlistId: string, songId: string) => {
    let updatedOverrides: Record<string, SetlistSongOverride> = {};

    setSetlists(prev => prev.map(st => {
      if (st.id !== setlistId) return st;
      const currentOverrides = { ...(st.songOverrides || {}) };
      delete currentOverrides[songId];
      updatedOverrides = currentOverrides;
      return { ...st, songOverrides: currentOverrides };
    }));

    if (selectedSetlist?.id === setlistId) {
      setSelectedSetlist(prev => {
        if (!prev) return null;
        const currentOverrides = { ...(prev.songOverrides || {}) };
        delete currentOverrides[songId];
        return { ...prev, songOverrides: currentOverrides };
      });
    }

    showNotification({ title: 'Réinitialisé', type: 'info' });

    try {
      const docRef = doc(db, 'setlists', setlistId);
      await updateDoc(docRef, { songOverrides: updatedOverrides });
    } catch (e) {
      console.warn('Removed setlist song override locally:', e);
    }
  }, [selectedSetlist?.id, showNotification]);

  // Setlist History Actions
  const recordSetlistHistory = useCallback(async (recordData: Omit<SetlistHistoryRecord, 'id' | 'groupId' | 'createdAt'>) => {
    const groupId = currentGroup?.id || 'default-group';
    const newId = 'history_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newRecord: SetlistHistoryRecord = {
      ...recordData,
      id: newId,
      groupId,
      createdAt: new Date().toISOString()
    };

    setSetlistHistory(prev => [newRecord, ...prev]);

    try {
      await setDoc(doc(db, 'setlist_history', newId), { ...newRecord, createdAt: serverTimestamp() });
    } catch (e) {
      console.warn('Saved setlist history locally:', e);
    }

    return newId;
  }, [currentGroup?.id]);

  const updateSetlistHistory = useCallback(async (id: string, recordData: Partial<SetlistHistoryRecord>) => {
    setSetlistHistory(prev => prev.map(item => item.id === id ? { ...item, ...recordData } : item));

    try {
      const docRef = doc(db, 'setlist_history', id);
      await updateDoc(docRef, recordData);
    } catch (e) {
      console.warn('Updated setlist history locally:', e);
    }
  }, []);

  const deleteSetlistHistory = useCallback(async (id: string) => {
    try {
      const currentDeleted = new Set<string>(JSON.parse(localStorage.getItem('songbook_deleted_history_ids') || '[]'));
      currentDeleted.add(id);
      localStorage.setItem('songbook_deleted_history_ids', JSON.stringify(Array.from(currentDeleted)));
    } catch (e) {}

    setSetlistHistory(prev => prev.filter(item => item.id !== id));

    try {
      await deleteDoc(doc(db, 'setlist_history', id));
    } catch (e) {
      console.warn('Deleted setlist history locally:', e);
    }
  }, []);

  // Group / Library Actions
  const createGroup = useCallback(async (name: string, description = '') => {
    if (currentUser?.role !== 'admin') {
      showNotification("Seul l'Administrateur peut créer des bibliothèques", 'error');
      return '';
    }

    const newId = 'group_' + Date.now();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const uid = currentUser?.uid || 'user';
    const newGroup: Group = {
      id: newId,
      name,
      description,
      ownerId: uid,
      members: [uid],
      inviteCode,
      createdAt: new Date().toISOString()
    };

    setGroups(prev => [...prev, newGroup]);
    setCurrentGroup(newGroup);

    try {
      await setDoc(doc(db, 'groups', newId), { ...newGroup, createdAt: serverTimestamp() });
    } catch (e) {
      console.warn('Saved group locally:', e);
    }

    return newId;
  }, [currentUser?.uid, currentUser?.role, showNotification]);

  const updateGroup = useCallback(async (groupId: string, data: Partial<Pick<Group, 'name' | 'description' | 'inviteCode'>>): Promise<boolean> => {
    if (currentUser?.role !== 'admin') {
      showNotification("Seul l'Administrateur peut modifier cette bibliothèque", 'error');
      return false;
    }

    try {
      const docRef = doc(db, 'groups', groupId);
      await updateDoc(docRef, data);
    } catch (e) {
      console.warn('Updated group locally:', e);
    }

    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...data } : g));
    if (currentGroup?.id === groupId) {
      setCurrentGroup(prev => prev ? { ...prev, ...data } : prev);
    }
    showNotification('Informations de la bibliothèque mises à jour avec succès');
    return true;
  }, [currentUser?.role, groups, currentGroup?.id, showNotification]);

  const deleteGroup = useCallback(async (
    groupId: string,
    options?: { deleteAssociatedData?: boolean }
  ): Promise<boolean> => {
    if (groupId === DEFAULT_GROUP.id) {
      showNotification('La bibliothèque principale ne peut pas être supprimée', 'warning');
      return false;
    }

    if (currentUser?.role !== 'admin') {
      showNotification("Seul l'Administrateur peut supprimer cette bibliothèque", 'error');
      return false;
    }

    const targetGroup = groups.find(g => g.id === groupId);
    const targetName = targetGroup?.name || 'cette bibliothèque';

    const shouldDeleteData = options?.deleteAssociatedData !== false;

    try {
      // 1. Delete group document from Firestore
      await deleteDoc(doc(db, 'groups', groupId));

      // 2. Delete associated documents if requested
      if (shouldDeleteData) {
        try {
          const songsQ = query(collection(db, 'songs'), where('groupId', '==', groupId));
          const songsSnap = await getDocs(songsQ);
          const deletePromises: Promise<any>[] = [];
          songsSnap.forEach(d => {
            deletePromises.push(deleteDoc(d.ref));
          });

          const setlistsQ = query(collection(db, 'setlists'), where('groupId', '==', groupId));
          const setlistsSnap = await getDocs(setlistsQ);
          setlistsSnap.forEach(d => {
            deletePromises.push(deleteDoc(d.ref));
          });

          const historyQ = query(collection(db, 'setlist_history'), where('groupId', '==', groupId));
          const historySnap = await getDocs(historyQ);
          historySnap.forEach(d => {
            deletePromises.push(deleteDoc(d.ref));
          });

          await Promise.all(deletePromises);
        } catch (cleanupErr) {
          console.warn('Associated data cleanup note:', cleanupErr);
        }
      }
    } catch (e) {
      console.warn('Deleted group locally:', e);
    }

    // 3. Update local states
    setGroups(prev => prev.filter(g => g.id !== groupId));

    if (currentGroup?.id === groupId) {
      setCurrentGroup(DEFAULT_GROUP);
      if (typeof window !== 'undefined') {
        localStorage.setItem('songbook_current_group_id', DEFAULT_GROUP.id);
      }
    }

    if (shouldDeleteData) {
      setSongs(prev => prev.filter(s => (s.groupId || 'default-group') !== groupId));
      setSetlists(prev => prev.filter(st => (st.groupId || 'default-group') !== groupId));
      setSetlistHistory(prev => prev.filter(h => (h.groupId || 'default-group') !== groupId));
    }

    showNotification({
      title: 'Bibliothèque supprimée',
      message: `La bibliothèque « ${targetName} » a été supprimée avec succès.`,
      type: 'success'
    });
    return true;
  }, [currentUser, groups, currentGroup?.id, showNotification]);

  const joinGroup = useCallback(async (inviteCode: string): Promise<boolean> => {
    const code = inviteCode.trim().toUpperCase();
    try {
      // Find group with this code
      const q = query(collection(db, 'groups'), where('inviteCode', '==', code));
      const snap = await (async () => {
        try {
          return await (await import('firebase/firestore')).getDocs(q);
        } catch (err) {
          return null;
        }
      })();

      if (snap && !snap.empty) {
        const groupDoc = snap.docs[0];
        const groupData = { id: groupDoc.id, ...groupDoc.data() } as Group;
        
        // If user is authenticated, add them to the group members in Firestore
        if (currentUser?.uid) {
          const uid = currentUser.uid;
          if (!groupData.members.includes(uid)) {
            const updatedMembers = [...groupData.members, uid];
            try {
              await updateDoc(doc(db, 'groups', groupData.id), { members: updatedMembers });
              groupData.members = updatedMembers;
            } catch (err) {
              console.warn('Group member update note:', err);
            }
          }
        }

        setGroups(prev => {
          if (prev.find(g => g.id === groupData.id)) return prev;
          return [...prev, groupData];
        });
        setCurrentGroup(groupData);
        localStorage.setItem('songbook_current_group_id', groupData.id);
        showNotification({
          title: `Bibliothèque « ${groupData.name} » active`,
          message: currentUser ? 'Bibliothèque rejointe avec succès.' : 'Consultation en mode invité.',
          type: 'success'
        });
        return true;
      }
    } catch (e) {
      console.warn('Online group join failed, checking local demo codes:', e);
    }

    // Demo code fallback
    if (code === 'LOUAN7' || code === 'WORSHIP') {
      setCurrentGroup(DEFAULT_GROUP);
      localStorage.setItem('songbook_current_group_id', DEFAULT_GROUP.id);
      showNotification({
        title: `Bibliothèque « ${DEFAULT_GROUP.name} » active`,
        message: 'Consultation active.',
        type: 'success'
      });
      return true;
    }

    return false;
  }, [currentUser?.uid, showNotification]);

  const switchGroup = useCallback((groupId: string) => {
    const g = groups.find(item => item.id === groupId);
    if (g) {
      setCurrentGroup(g);
      localStorage.setItem('songbook_current_group_id', groupId);
      if (currentUser) {
        setCurrentUser(prev => prev ? { ...prev, currentGroupId: groupId } : null);
      }
      showNotification({
        title: `Bibliothèque : ${g.name}`,
        message: currentUser ? 'Bibliothèque active changée.' : 'Consultation en mode invité.',
        type: 'info'
      });
    }
  }, [groups, currentUser, showNotification]);

  const loginDemoUser = useCallback((role: UserRole = 'member') => {
    // Demo accounts can only be member or leader, never unauthenticated admin
    const effectiveRole: UserRole = role === 'admin' ? 'member' : role;
    let name = 'Camille - Musicien';
    let email = 'musicien@songbook.pro';
    if (effectiveRole === 'leader') {
      name = 'Thomas - Responsable de Louange';
      email = 'responsable@songbook.pro';
    }

    const demoUser: UserProfile = {
      uid: 'demo-' + effectiveRole + '-' + Date.now().toString(36),
      email,
      displayName: name,
      currentGroupId: 'default-group',
      role: effectiveRole
    };
    setCurrentUser(demoUser);
    setIsAuthModalOpen(false);
  }, []);

  const loginLocalUser = useCallback((customEmail: string, customName?: string, role: UserRole = 'member') => {
    const trimmedEmail = customEmail.trim() || 'musicien@songbook.pro';
    const isMasterAdmin = trimmedEmail.toLowerCase() === 'kriveravelasquez@rivera-marketing.com';
    const effectiveRole: UserRole = isMasterAdmin ? 'admin' : (role === 'admin' ? 'member' : role);
    const localUser: UserProfile = {
      uid: 'user-' + Date.now().toString(36),
      email: trimmedEmail,
      displayName: customName?.trim() || trimmedEmail.split('@')[0] || 'Musicien',
      currentGroupId: 'default-group',
      role: effectiveRole
    };
    setCurrentUser(localUser);
    setIsAuthModalOpen(false);
  }, []);

  const updateUserRole = useCallback(async (userId: string, newRole: UserRole) => {
    if (currentUser?.role !== 'admin') {
      showNotification("Seul l'Administrateur peut modifier les rôles d'accès", 'error');
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      
      setAllUsers(prev => prev.map(u => u.uid === userId ? { ...u, role: newRole } : u));
      if (currentUser && currentUser.uid === userId) {
        const updated = { ...currentUser, role: newRole };
        setCurrentUser(updated);
        localStorage.setItem('songbook_user', JSON.stringify(updated));
      }
      const roleLabel = newRole === 'admin' ? 'Administrateur' : newRole === 'leader' ? 'Responsable' : 'Membre';
      showNotification(`Rôle mis à jour : ${roleLabel}`);
    } catch (err) {
      console.error('Error updating user role:', err);
      showNotification('Erreur lors de la mise à jour du rôle', 'error');
    }
  }, [currentUser, showNotification]);

  const setAdminByEmail = useCallback(async (targetEmail: string, role: UserRole = 'admin') => {
    if (currentUser?.role !== 'admin') {
      showNotification("Seul l'Administrateur peut attribuer des rôles", 'error');
      return;
    }

    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    const roleLabel = role === 'admin' ? 'Administrateur' : role === 'leader' ? 'Responsable' : 'Membre';

    try {
      // 1. Enregistrer dans admin_emails pour les futures connexions
      await setDoc(doc(db, 'admin_emails', cleanEmail), {
        email: cleanEmail,
        role,
        createdAt: serverTimestamp()
      });

      // 2. Si un compte existe déjà avec cette adresse, le mettre immédiatement à jour
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          await updateDoc(docSnap.ref, { role });
        }
        setAllUsers(prev => prev.map(u => u.email?.toLowerCase() === cleanEmail ? { ...u, role } : u));
        if (currentUser && currentUser.email?.toLowerCase() === cleanEmail) {
          const updated = { ...currentUser, role };
          setCurrentUser(updated);
          localStorage.setItem('songbook_user', JSON.stringify(updated));
        }
        showNotification(`L'utilisateur ${cleanEmail} est désormais ${roleLabel}`);
      } else {
        showNotification(`${cleanEmail} sera automatiquement ${roleLabel} dès sa première connexion`);
      }
    } catch (err) {
      console.error('Error setting role email:', err);
      showNotification("Erreur lors de l'attribution du rôle", 'error');
    }
  }, [currentUser, showNotification]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    setCurrentUser(null);
    setFirebaseUser(null);
    localStorage.removeItem('songbook_user');
    showNotification('Vous êtes déconnecté', 'info');
  }, [showNotification]);

  const isAdmin = currentUser?.role === 'admin';
  const isLeader = currentUser?.role === 'leader';
  const canManageSongs = isAdmin || isLeader;
  const canManageGroups = isAdmin;
  const canAccessSettings = isAdmin;

  return (
    <AppContext.Provider value={{
      currentUser,
      firebaseUser,
      isAdmin,
      isLeader,
      canManageSongs,
      canManageGroups,
      canAccessSettings,
      allUsers,
      updateUserRole,
      setAdminByEmail,
      groups,
      currentGroup,
      songs,
      setlists,
      activeTab,
      setActiveTab,
      selectedSong,
      setSelectedSong,
      selectedSetlist,
      setSelectedSetlist,
      activeSetlistIndex,
      setActiveSetlistIndex,
      stageSettings,
      updateStageSettings,
      displaySettings,
      updateDisplaySettings,
      resetDisplaySettings,
      songCardMetadata,
      updateSongCardMetadata,
      isOffline: !isOnline,
      isOnline,
      syncStatus,
      lastSyncedAt,
      syncNow,
      isAuthModalOpen,
      setIsAuthModalOpen,
      isPianoOpen,
      setIsPianoOpen,
      isMetronomeOpen,
      setIsMetronomeOpen,
      isTunerOpen,
      setIsTunerOpen,
      isInstallable,
      promptInstall,
      offlineStats,
      refreshOfflineStats,
      cacheAllSongsOffline,
      clearOfflineStorage,
      notifications,
      showNotification,
      dismissNotification,
      createSong,
      importSong,
      updateSong,
      deleteSong,
      linkSongs,
      unlinkSongs,
      createLanguageVersion,
      autoDetectSongLanguages,
      createSetlist,
      updateSetlist,
      deleteSetlist,
      updateSetlistSongOverride,
      removeSetlistSongOverride,
      setlistHistory,
      recordSetlistHistory,
      updateSetlistHistory,
      deleteSetlistHistory,
      createGroup,
      updateGroup,
      deleteGroup,
      joinGroup,
      switchGroup,
      // Aliases Bibliothèque
      libraries: groups,
      currentLibrary: currentGroup,
      createLibrary: createGroup,
      updateLibrary: updateGroup,
      deleteLibrary: deleteGroup,
      joinLibrary: joinGroup,
      switchLibrary: switchGroup,
      loginDemoUser,
      loginLocalUser,
      handleSignOut,
      seedDemoDataToFirestore
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
