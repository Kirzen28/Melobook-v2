import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  UserProfile, 
  Group, 
  Folder, 
  Song, 
  Setlist, 
  StageSettings, 
  DisplaySettings,
  SongTypographySettings,
  SectionColors,
  UserRole 
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
import { SAMPLE_FOLDERS, SAMPLE_SONGS, SAMPLE_SETLISTS } from '../data/sampleSongs';

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
  soundMetronome: false
};

interface AppContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  groups: Group[];
  currentGroup: Group | null;
  songs: Song[];
  folders: Folder[];
  setlists: Setlist[];
  activeTab: 'repertoire' | 'setlists' | 'stage' | 'groups' | 'editor' | 'settings';
  setActiveTab: (tab: 'repertoire' | 'setlists' | 'stage' | 'groups' | 'editor' | 'settings') => void;
  selectedSong: Song | null;
  setSelectedSong: (song: Song | null) => void;
  selectedSetlist: Setlist | null;
  setSelectedSetlist: (setlist: Setlist | null) => void;
  activeSetlistIndex: number;
  setActiveSetlistIndex: (index: number) => void;
  stageSettings: StageSettings;
  updateStageSettings: (settings: Partial<StageSettings>) => void;
  displaySettings: DisplaySettings;
  updateDisplaySettings: (settings: { typography?: Partial<SongTypographySettings>; sectionColors?: Partial<SectionColors> }) => void;
  resetDisplaySettings: () => void;
  isOffline: boolean;
  isOnline: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isInstallable: boolean;
  promptInstall: () => void;
  
  // Actions
  createSong: (songData: Omit<Song, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSong: (id: string, songData: Partial<Song>) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  
  createFolder: (name: string, color?: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  
  createSetlist: (setlistData: Omit<Setlist, 'id' | 'groupId' | 'createdAt'>) => Promise<string>;
  updateSetlist: (id: string, setlistData: Partial<Setlist>) => Promise<void>;
  deleteSetlist: (id: string) => Promise<void>;
  
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
  const [activeTab, setActiveTab] = useState<'repertoire' | 'setlists' | 'stage' | 'groups' | 'editor' | 'settings'>('repertoire');
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
      displayName: 'Alexandre (Chef de Louange)',
      currentGroupId: 'default-group',
      role: 'admin'
    };
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Groups & Data
  const [groups, setGroups] = useState<Group[]>([DEFAULT_GROUP]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(DEFAULT_GROUP);
  const [songs, setSongs] = useState<Song[]>(() => {
    const saved = localStorage.getItem('songbook_cached_songs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return SAMPLE_SONGS;
  });
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem('songbook_cached_folders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return SAMPLE_FOLDERS;
  });
  const [setlists, setSetlists] = useState<Setlist[]>(() => {
    const saved = localStorage.getItem('songbook_cached_setlists');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return SAMPLE_SETLISTS;
  });

  // Stage view custom settings
  const [stageSettings, setStageSettings] = useState<StageSettings>(() => {
    const saved = localStorage.getItem('songbook_stage_settings');
    if (saved) {
      try { return { ...DEFAULT_STAGE_SETTINGS, ...JSON.parse(saved) }; } catch (e) {}
    }
    return DEFAULT_STAGE_SETTINGS;
  });

  // App-wide Typography and Section Color Display Settings
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() => {
    const saved = localStorage.getItem('songbook_display_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          typography: { ...DEFAULT_DISPLAY_SETTINGS.typography, ...(parsed.typography || {}) },
          sectionColors: { ...DEFAULT_DISPLAY_SETTINGS.sectionColors, ...(parsed.sectionColors || {}) },
        };
      } catch (e) {}
    }
    return DEFAULT_DISPLAY_SETTINGS;
  });

  const updateDisplaySettings = useCallback((newSettings: { typography?: Partial<SongTypographySettings>; sectionColors?: Partial<SectionColors> }) => {
    setDisplaySettings(prev => {
      const updated: DisplaySettings = {
        typography: {
          ...prev.typography,
          ...(newSettings.typography || {})
        },
        sectionColors: {
          ...prev.sectionColors,
          ...(newSettings.sectionColors || {})
        }
      };
      localStorage.setItem('songbook_display_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetDisplaySettings = useCallback(() => {
    setDisplaySettings(DEFAULT_DISPLAY_SETTINGS);
    localStorage.setItem('songbook_display_settings', JSON.stringify(DEFAULT_DISPLAY_SETTINGS));
  }, []);

  // Network & PWA status
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // PWA Install and Online Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('SW registration error:', err);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

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

  // Save cache to localStorage for true offline support
  useEffect(() => {
    localStorage.setItem('songbook_cached_songs', JSON.stringify(songs));
  }, [songs]);

  useEffect(() => {
    localStorage.setItem('songbook_cached_folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('songbook_cached_setlists', JSON.stringify(setlists));
  }, [setlists]);

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
      if (!snapshot.empty) {
        const loadedSongs: Song[] = [];
        snapshot.forEach((d) => {
          loadedSongs.push({ id: d.id, ...d.data() } as Song);
        });
        setSongs(loadedSongs);
        if (selectedSong && !loadedSongs.find(s => s.id === selectedSong.id)) {
          setSelectedSong(loadedSongs[0] || null);
        }
      } else {
        // If empty in Firestore for default group, use sample data
        if (targetGroupId === 'default-group' && songs.length === 0) {
          setSongs(SAMPLE_SONGS);
        }
      }
    }, (error) => {
      console.warn('Firestore songs snapshot notice:', error.message);
    });

    // 2. Sync Folders
    const qFolders = query(collection(db, 'folders'), where('groupId', '==', targetGroupId));
    const unsubFolders = onSnapshot(qFolders, (snapshot) => {
      if (!snapshot.empty) {
        const loadedFolders: Folder[] = [];
        snapshot.forEach((d) => {
          loadedFolders.push({ id: d.id, ...d.data() } as Folder);
        });
        setFolders(loadedFolders);
      } else if (targetGroupId === 'default-group' && folders.length === 0) {
        setFolders(SAMPLE_FOLDERS);
      }
    }, (error) => {
      console.warn('Firestore folders snapshot notice:', error.message);
    });

    // 3. Sync Setlists
    const qSetlists = query(collection(db, 'setlists'), where('groupId', '==', targetGroupId));
    const unsubSetlists = onSnapshot(qSetlists, (snapshot) => {
      if (!snapshot.empty) {
        const loadedSetlists: Setlist[] = [];
        snapshot.forEach((d) => {
          loadedSetlists.push({ id: d.id, ...d.data() } as Setlist);
        });
        setSetlists(loadedSetlists);
      } else if (targetGroupId === 'default-group' && setlists.length === 0) {
        setSetlists(SAMPLE_SETLISTS);
      }
    }, (error) => {
      console.warn('Firestore setlists snapshot notice:', error.message);
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
        unsubFolders();
        unsubSetlists();
        unsubGroups();
      };
    }

    return () => {
      unsubSongs();
      unsubFolders();
      unsubSetlists();
    };
  }, [currentGroup?.id, currentUser?.uid]);

  // Seed sample songs to Firestore for current group
  const seedDemoDataToFirestore = useCallback(async () => {
    const groupId = currentGroup?.id || 'default-group';
    try {
      // 1. Folders
      for (const folder of SAMPLE_FOLDERS) {
        const folderRef = doc(db, 'folders', folder.id);
        await setDoc(folderRef, { ...folder, groupId });
      }
      // 2. Songs
      for (const song of SAMPLE_SONGS) {
        const songRef = doc(db, 'songs', song.id);
        await setDoc(songRef, { ...song, groupId, createdAt: serverTimestamp() });
      }
      // 3. Setlists
      for (const setlist of SAMPLE_SETLISTS) {
        const setlistRef = doc(db, 'setlists', setlist.id);
        await setDoc(setlistRef, { ...setlist, groupId, createdAt: serverTimestamp() });
      }
      // Update local state directly
      setSongs(SAMPLE_SONGS.map(s => ({ ...s, groupId })));
      setFolders(SAMPLE_FOLDERS.map(f => ({ ...f, groupId })));
      setSetlists(SAMPLE_SETLISTS.map(st => ({ ...st, groupId })));
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

    // Optimistic local update
    setSongs(prev => [newSong, ...prev]);
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

  // Folder Actions
  const createFolder = useCallback(async (name: string, color = '#38bdf8') => {
    const groupId = currentGroup?.id || 'default-group';
    const newId = 'folder_' + Date.now();
    const newFolder: Folder = {
      id: newId,
      groupId,
      name,
      color,
      createdAt: new Date().toISOString()
    };

    setFolders(prev => [...prev, newFolder]);

    try {
      await setDoc(doc(db, 'folders', newId), { ...newFolder, createdAt: serverTimestamp() });
    } catch (e) {
      console.warn('Saved folder locally:', e);
    }
  }, [currentGroup?.id]);

  const deleteFolder = useCallback(async (id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    // Reset folderId on songs
    setSongs(prev => prev.map(s => s.folderId === id ? { ...s, folderId: null } : s));

    try {
      await deleteDoc(doc(db, 'folders', id));
    } catch (e) {
      console.warn('Deleted folder locally:', e);
    }
  }, []);

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
      await updateDoc(doc(db, 'setlists', id), setlistData);
    } catch (e) {
      console.warn('Updated setlist locally:', e);
    }
  }, [selectedSetlist?.id]);

  const deleteSetlist = useCallback(async (id: string) => {
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

  // Group Actions
  const createGroup = useCallback(async (name: string, description = '') => {
    const newId = 'group_' + Date.now();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newGroup: Group = {
      id: newId,
      name,
      ownerId: currentUser?.uid || 'user',
      members: [currentUser?.uid || 'user'],
      inviteCode,
      description,
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
      displayName: role === 'admin' ? 'Alexandre (Chef de Groupe)' : 'Camille (Guitariste)',
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
      folders,
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
      isOffline: !isOnline,
      isOnline,
      isAuthModalOpen,
      setIsAuthModalOpen,
      isInstallable,
      promptInstall,
      createSong,
      updateSong,
      deleteSong,
      createFolder,
      deleteFolder,
      createSetlist,
      updateSetlist,
      deleteSetlist,
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
