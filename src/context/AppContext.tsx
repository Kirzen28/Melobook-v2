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
  SyncStatus 
} from '../types';
import { DEFAULT_DISPLAY_SETTINGS } from '../utils/displayDefaults';
import { 
  auth, 
  db, 
  collection, 
  doc, 
  getDoc, 
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
import { 
  registerServiceWorker, 
  cacheSongInWorker, 
  cacheSetlistInWorker, 
  cacheAllDataInWorker 
} from '../utils/pwaCache';

const DEFAULT_GROUP: Group = {
  id: 'default-group',
  name: 'Groupe Louange Principal',
  ownerId: 'demo-admin-uid',
  members: ['demo-admin-uid'],
  inviteCode: 'LOUAN7',
  description: 'Équipe de louange du dimanche et événements spéciaux.'
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
  soundMetronome: false,
  showBatteryIndicator: true
};

interface AppContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  groups: Group[];
  currentGroup: Group | null;
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
  }) => void;
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
  isInstallable: boolean;
  promptInstall: () => void;
  
  // Actions
  createSong: (songData: Omit<Song, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  importSong: (songData: Omit<Song, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSong: (id: string, songData: Partial<Song>) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  linkSongs: (songId1: string, songId2: string) => Promise<void>;
  unlinkSongs: (songId1: string, songId2: string) => Promise<void>;
  createLanguageVersion: (sourceSongId: string, targetLanguage: string, customTitle?: string) => Promise<string>;
  
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
  joinGroup: (inviteCode: string) => Promise<boolean>;
  switchGroup: (groupId: string) => void;
  
  loginDemoUser: (role?: UserRole) => void;
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
  
  // Auth state
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('songbook_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Default Demo Admin user so app is immediately usable without requiring mandatory sign in first
    return {
      uid: 'demo-admin-uid',
      email: 'musicien@songbook.pro',
      displayName: 'Alexandre',
      currentGroupId: 'default-group',
      role: 'admin'
    };
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
  const [currentGroup, setCurrentGroup] = useState<Group | null>(DEFAULT_GROUP);
  const [songs, setSongs] = useState<Song[]>(() => {
    const deletedIds = getDeletedSongIds();
    const saved = localStorage.getItem('songbook_cached_songs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const loaded = parsed.map((s: Song) => {
            const resolvedDuration = s.duration || getSongDuration(s) || SAMPLE_SONGS.find(sm => sm.id === s.id || sm.title.toLowerCase() === s.title?.toLowerCase())?.duration;
            return resolvedDuration ? { ...s, duration: resolvedDuration } : s;
          });
          const missingSamples = SAMPLE_SONGS.filter(sm => !deletedIds.has(sm.id) && !loaded.some((ls: Song) => ls.id === sm.id));
          return [...loaded, ...missingSamples];
        }
      } catch (e) {}
    }
    return SAMPLE_SONGS.filter(sm => !deletedIds.has(sm.id));
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
          ...parsed,
          showBatteryIndicator: parsed.showBatteryIndicator !== undefined ? parsed.showBatteryIndicator : true
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
        };
      } catch (e) {}
    }
    return DEFAULT_DISPLAY_SETTINGS;
  });

  const updateDisplaySettings = useCallback((newSettings: { 
    typography?: Partial<SongTypographySettings>; 
    sectionColors?: Partial<SectionColors>;
    sectionBorders?: Partial<SectionBorders>;
  }) => {
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
        }
      };
      localStorage.setItem('songbook_display_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

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
  }, []);

  const resetDisplaySettings = useCallback(() => {
    setDisplaySettings(DEFAULT_DISPLAY_SETTINGS);
    localStorage.setItem('songbook_display_settings', JSON.stringify(DEFAULT_DISPLAY_SETTINGS));
    setSongCardMetadata(DEFAULT_SONG_CARD_METADATA);
    localStorage.setItem('songbook_song_card_metadata', JSON.stringify(DEFAULT_SONG_CARD_METADATA));
  }, []);

  // Network & PWA status
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(typeof window !== 'undefined' && !navigator.onLine ? 'offline' : 'synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

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
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
    } catch (e) {
      setSyncStatus('error');
    }
  }, []);

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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Mise en cache du chant consulte
  useEffect(() => {
    if (selectedSong) {
      cacheSongInWorker(selectedSong);
    }
  }, [selectedSong]);

  // Mise en cache de la setlist consultee et de ses partitions
  useEffect(() => {
    if (selectedSetlist) {
      const setlistSongs = selectedSetlist.songIds
        .map(id => songs.find(s => s.id === id))
        .filter((s): s is Song => Boolean(s));
      cacheSetlistInWorker(selectedSetlist, setlistSongs);
    }
  }, [selectedSetlist, songs]);

  // Sauvegarde globale de l ensemble du repertoire dans le cache du service worker
  useEffect(() => {
    if (songs.length > 0 || setlists.length > 0) {
      cacheAllDataInWorker(songs, setlists);
    }
  }, [songs, setlists]);

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
  }, []);

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
            const newUser: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Musicien',
              currentGroupId: 'default-group',
              role: 'admin'
            };
            await setDoc(userRef, newUser);
            setCurrentUser(newUser);
          }
        } catch (e) {
          console.warn('Firestore user fetch note:', e);
        }
      }
    });

    return () => unsubscribe();
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
          loadedSongs.push(resolvedDuration ? { ...raw, duration: resolvedDuration } : raw);
        });
      }

      setSongs(prev => {
        const songMap = new Map<string, Song>();

        // 1. Preserve all existing songs already in state
        prev.forEach(s => {
          if (!deletedIds.has(s.id)) {
            songMap.set(s.id, s);
          }
        });

        // 2. Add or update songs loaded from Firestore
        loadedSongs.forEach(s => {
          if (!deletedIds.has(s.id)) {
            songMap.set(s.id, s);
          }
        });

        // 3. For default group, make sure sample songs remain present
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
      console.warn('Firestore songs snapshot notice:', error.message);
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

        // 1. Preserve existing setlists in state
        prev.forEach(st => {
          if (!deletedSetlistIds.has(st.id)) {
            setlistMap.set(st.id, st);
          }
        });

        // 2. Add or update setlists from Firestore
        loadedSetlists.forEach(st => {
          if (!deletedSetlistIds.has(st.id)) {
            setlistMap.set(st.id, st);
          }
        });

        // 3. For default group, ensure sample setlists remain present
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
      console.warn('Firestore setlists snapshot notice:', error.message);
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
          if (!deletedHistoryIds.has(h.id)) {
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
      console.warn('Firestore setlist history snapshot notice:', error.message);
    });

    // 4. Sync Groups if user is logged in
    if (currentUser?.uid) {
      const qGroups = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
      const unsubGroups = onSnapshot(qGroups, (snapshot) => {
        if (!snapshot.empty) {
          const loadedGroups: Group[] = [];
          snapshot.forEach((d) => {
            loadedGroups.push({ id: d.id, ...d.data() } as Group);
          });
          setGroups(loadedGroups);
        }
      }, (err) => console.warn('Groups sync error:', err.message));

      return () => {
        unsubSongs();
        unsubSetlists();
        unsubHistory();
        unsubGroups();
      };
    }

    return () => {
      unsubSongs();
      unsubSetlists();
      unsubHistory();
    };
  }, [currentGroup?.id, currentUser?.uid]);

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
    const newSong: Song = {
      ...songData,
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

    // Save to Firestore
    try {
      const docRef = doc(db, 'songs', newId);
      await setDoc(docRef, { ...newSong, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (e) {
      console.warn('Saved song locally (Firestore offline/error):', e);
    }

    return newId;
  }, [currentGroup?.id]);

  // Dedicated importSong action that explicitly appends imported songs to the existing library
  const importSong = useCallback(async (songData: Omit<Song, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>) => {
    return await createSong(songData);
  }, [createSong]);

  const updateSong = useCallback(async (id: string, songData: Partial<Song>) => {
    // Optimistic local update
    setSongs(prev => prev.map(s => s.id === id ? { ...s, ...songData, updatedAt: new Date().toISOString() } : s));
    if (selectedSong?.id === id) {
      setSelectedSong(prev => prev ? { ...prev, ...songData } : null);
    }

    try {
      const docRef = doc(db, 'songs', id);
      await updateDoc(docRef, { ...songData, updatedAt: serverTimestamp() });
    } catch (e) {
      console.warn('Updated song locally:', e);
    }
  }, [selectedSong?.id]);

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

    try {
      await deleteDoc(doc(db, 'songs', id));
    } catch (e) {
      console.warn('Deleted song locally:', e);
    }
  }, [selectedSong?.id, songs]);

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
  }, [songs]);

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
  }, [songs]);

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

    return newId;
  }, [songs, createSong, linkSongs]);

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

    try {
      await setDoc(doc(db, 'setlists', newId), { ...newSetlist, createdAt: serverTimestamp() });
    } catch (e) {
      console.warn('Saved setlist locally:', e);
    }

    return newId;
  }, [currentGroup?.id]);

  const updateSetlist = useCallback(async (id: string, setlistData: Partial<Setlist>) => {
    setSetlists(prev => prev.map(st => st.id === id ? { ...st, ...setlistData } : st));
    if (selectedSetlist?.id === id) {
      setSelectedSetlist(prev => prev ? { ...prev, ...setlistData } : null);
    }

    try {
      const docRef = doc(db, 'setlists', id);
      await updateDoc(docRef, setlistData);
    } catch (e) {
      console.warn('Updated setlist locally:', e);
    }
  }, [selectedSetlist?.id]);

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

    try {
      await deleteDoc(doc(db, 'setlists', id));
    } catch (e) {
      console.warn('Deleted setlist locally:', e);
    }
  }, [selectedSetlist?.id]);

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

    try {
      const docRef = doc(db, 'setlists', setlistId);
      await updateDoc(docRef, { songOverrides: updatedOverrides });
    } catch (e) {
      console.warn('Updated setlist song override locally:', e);
    }
  }, [selectedSetlist?.id]);

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

    try {
      const docRef = doc(db, 'setlists', setlistId);
      await updateDoc(docRef, { songOverrides: updatedOverrides });
    } catch (e) {
      console.warn('Removed setlist song override locally:', e);
    }
  }, [selectedSetlist?.id]);

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

  // Group Actions
  const createGroup = useCallback(async (name: string, description = '') => {
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
  }, [currentUser?.uid]);

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
        const uid = currentUser?.uid || 'user';
        
        if (!groupData.members.includes(uid)) {
          const updatedMembers = [...groupData.members, uid];
          await updateDoc(doc(db, 'groups', groupData.id), { members: updatedMembers });
          groupData.members = updatedMembers;
        }

        setGroups(prev => {
          if (prev.find(g => g.id === groupData.id)) return prev;
          return [...prev, groupData];
        });
        setCurrentGroup(groupData);
        return true;
      }
    } catch (e) {
      console.warn('Online group join failed, checking local demo codes:', e);
    }

    // Demo code fallback
    if (code === 'LOUAN7' || code === 'WORSHIP') {
      setCurrentGroup(DEFAULT_GROUP);
      return true;
    }

    return false;
  }, [currentUser?.uid]);

  const switchGroup = useCallback((groupId: string) => {
    const g = groups.find(item => item.id === groupId);
    if (g) {
      setCurrentGroup(g);
      if (currentUser) {
        setCurrentUser(prev => prev ? { ...prev, currentGroupId: groupId } : null);
      }
    }
  }, [groups, currentUser]);

  const loginDemoUser = useCallback((role: UserRole = 'admin') => {
    const demoUser: UserProfile = {
      uid: 'demo-' + role + '-' + Date.now().toString(36),
      email: role === 'admin' ? 'admin@songbook.pro' : 'musicien@songbook.pro',
      displayName: role === 'admin' ? 'Alexandre - Chef de Groupe' : 'Camille - Guitariste',
      currentGroupId: 'default-group',
      role
    };
    setCurrentUser(demoUser);
    setIsAuthModalOpen(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    setCurrentUser(null);
    setFirebaseUser(null);
  }, []);

  return (
    <AppContext.Provider value={{
      currentUser,
      firebaseUser,
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
      isInstallable,
      promptInstall,
      createSong,
      importSong,
      updateSong,
      deleteSong,
      linkSongs,
      unlinkSongs,
      createLanguageVersion,
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
      joinGroup,
      switchGroup,
      loginDemoUser,
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
