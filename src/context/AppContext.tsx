import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  SongMetadataVisibility,
  UserRole,
  AccessPermission,
  SyncStatus,
  NotificationType,
  AppNotification,
  CustomPad,
  PlanningTeam,
  PlanningAvailability,
  PlanningAssignment,
  PlanningAvailabilityStatus,
  PlanningPole
} from '../types';
import {
  getTodayIsoDate,
  isValidIsoDate,
  makeAvailabilityDocId,
  sanitizePlanningSlots,
  sanitizePlanningTeamMembers
} from '../utils/planningUtils';
import {
  ALL_ACCESSES,
  accessesToLegacyRole,
  formatAccessSummary,
  isRegieOnlyAccesses,
  legacyRoleToAccesses,
  normalizeAccessList,
  resolveMemberAccesses
} from '../utils/accessUtils';
import { DEFAULT_DISPLAY_SETTINGS, DEFAULT_SONG_METADATA_VISIBILITY } from '../utils/displayDefaults';
import { 
  auth, 
  db, 
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL,
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
  serverTimestamp,
  arrayUnion,
  OperationType,
  handleFirestoreError
} from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getSongDuration, calculateSongAutoDuration, fetchYouTubeDuration, getYouTubeVideoId } from '../utils/chordUtils';
import { detectSongLanguage } from '../utils/languageUtils';
import { 
  registerServiceWorker, 
  checkForAppUpdate,
  refreshAppCachePreservingOfflineData,
  cacheSongInWorker, 
  cacheSetlistInWorker, 
  cacheAllDataInWorker,
  getAllCachedSongs,
  getAllCachedSetlists,
  clearAllLocalCaches,
  getOfflineStorageStats 
} from '../utils/pwaCache';
import { 
  deleteSongFromIndexedDB, 
  deleteSetlistFromIndexedDB,
  saveCustomPadToIndexedDB,
  getAllCustomPadsFromIndexedDB,
  deleteCustomPadFromIndexedDB
} from '../utils/indexedDB';
import { padAudio } from '../utils/padAudio';
import { parseSvgAvatar } from '../utils/avatarPresets';

const stripUndefined = <T extends Record<string, any>>(obj: T): T => {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      result[k] = v;
    }
  }
  return result as T;
};

const sanitizePersonalCapos = (raw: unknown): Record<string, number> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const fret = typeof v === 'number' ? Math.trunc(v) : Number(v);
    if (typeof k === 'string' && k.length > 0 && k.length <= 260 && Number.isFinite(fret) && fret >= 1 && fret <= 7) {
      result[k] = fret;
    }
  }
  return result;
};

const getPersonalCaposCacheKey = (uid?: string | null, guest = false, groupId?: string | null): string => {
  if (guest || !uid) {
    return `melobook_personal_capos_guest_${groupId || 'default'}`;
  }
  return `melobook_personal_capos_${uid}`;
};

const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const DEFAULT_GROUP: Group = {
  id: 'default-group',
  name: 'Bibliothèque Principale',
  ownerId: 'admin-kriveravelasquez',
  members: [],
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
  soundMetronome: false,
  reduceMotion: false
};

interface AppContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  authLoading: boolean;
  isGuest: boolean;
  enterGuestMode: (libraryCode: string, target?: { setlistId?: string; songId?: string }) => Promise<Group>;
  exitGuestMode: () => void;
  toggleLibraryGuestMode: (groupId: string, enabled: boolean) => Promise<boolean>;
  deepLinkSetlistId: string | null;
  clearDeepLinkSetlistId: () => void;
  needsLibraryOnboarding: boolean;
  setNeedsLibraryOnboarding: (needs: boolean) => void;
  setSignupInProgress: (inProgress: boolean) => void;
  completeSignupCreateLibrary: (libraryName: string, libraryDescription?: string, displayNameOverride?: string) => Promise<Group>;
  completeSignupJoinLibrary: (libraryIdentifier: string, displayNameOverride?: string) => Promise<Group>;
  groups: Group[];
  currentGroup: Group | null;
  // Aliases Bibliothèque
  libraries: Group[];
  currentLibrary: Group | null;
  songs: Song[];
  setlists: Setlist[];
  activeTab: 'repertoire' | 'setlists' | 'planning' | 'stage' | 'groups' | 'editor' | 'settings' | 'tuner' | 'presentation' | 'roadmap';
  setActiveTab: (tab: 'repertoire' | 'setlists' | 'planning' | 'stage' | 'groups' | 'editor' | 'settings' | 'tuner' | 'presentation' | 'roadmap') => void;
  editorSubTab: 'data' | 'chords';
  setEditorSubTab: (tab: 'data' | 'chords') => void;
  selectedSong: Song | null;
  setSelectedSong: (song: Song | null) => void;
  selectedSetlist: Setlist | null;
  setSelectedSetlist: (setlist: Setlist | null) => void;
  activeSetlistIndex: number;
  setActiveSetlistIndex: (index: number) => void;
  isLiveSetlistOpen: boolean;
  setIsLiveSetlistOpen: (open: boolean) => void;
  editorReturnTarget: 'stage' | 'setlistLive' | 'repertoire' | null;
  setEditorReturnTarget: (target: 'stage' | 'setlistLive' | 'repertoire' | null) => void;
  stageSettings: StageSettings;
  updateStageSettings: (settings: Partial<StageSettings>) => void;
  displaySettings: DisplaySettings;
  updateDisplaySettings: (settings: { 
    typography?: Partial<SongTypographySettings>; 
    sectionColors?: Partial<SectionColors>;
    sectionBorders?: Partial<SectionBorders>;
    chordColor?: string;
    metadataVisibility?: Partial<SongMetadataVisibility>;
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
  isUpdateAvailable: boolean;
  isUpdateDismissed: boolean;
  isApplyingUpdate: boolean;
  applyAppUpdate: () => Promise<void>;
  dismissUpdateBanner: () => void;
  
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
  assignMembersToGroup: (groupId: string, memberUids: string[]) => Promise<boolean>;
  removeMemberFromGroup: (groupId: string, memberUid: string) => Promise<boolean>;
  setGroupMembers: (groupId: string, memberUids: string[]) => Promise<boolean>;
  // Aliases Bibliothèque
  createLibrary: (name: string, description?: string) => Promise<string>;
  updateLibrary: (libraryId: string, data: Partial<Pick<Group, 'name' | 'description' | 'inviteCode'>>) => Promise<boolean>;
  deleteLibrary: (libraryId: string, options?: { deleteAssociatedData?: boolean }) => Promise<boolean>;
  joinLibrary: (inviteCode: string) => Promise<boolean>;
  switchLibrary: (libraryId: string) => void;
  assignMembersToLibrary: (libraryId: string, memberUids: string[]) => Promise<boolean>;
  removeMemberFromLibrary: (libraryId: string, memberUid: string) => Promise<boolean>;
  setLibraryMembers: (libraryId: string, memberUids: string[]) => Promise<boolean>;
  
  // Permissions & Accès cumulables
  effectiveAccesses: AccessPermission[];
  hasAccess: (access: AccessPermission) => boolean;
  isRegieOnly: boolean;
  isAdmin: boolean;
  isLeader: boolean;
  isEditor: boolean;
  isMember: boolean;
  isViewer: boolean;
  canAccessRepertoire: boolean;
  canAccessSetlistsView: boolean;
  canAccessStage: boolean;
  canAccessProjection: boolean;
  canAccessTools: boolean;
  canAccessGroupsView: boolean;
  canManageSongs: boolean;
  canManageSetlists: boolean;
  canAccessPlanning: boolean;
  canManagePlanning: boolean;
  canManageGroups: boolean;
  canAccessSettings: boolean;
  
  allUsers: UserProfile[];
  updateUserAccesses: (userId: string, newAccesses: AccessPermission[]) => Promise<void>;
  bulkUpdateUserAccesses: (userIds: string[], newAccesses: AccessPermission[]) => Promise<boolean>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  bulkUpdateUserRole: (userIds: string[], newRole: UserRole) => Promise<boolean>;
  bulkRemoveMembersFromGroup: (groupId: string, memberUids: string[]) => Promise<boolean>;
  bulkDeleteUserAccounts: (userIds: string[]) => Promise<boolean>;
  setAdminByEmail: (targetEmail: string, roleOrAccesses?: UserRole | AccessPermission[]) => Promise<void>;
  handleSignOut: () => Promise<void>;

  // SVG Avatar management (zero image storage)
  selectSvgAvatar: (avatarToken: string) => Promise<void>;
  removeProfileAvatar: () => Promise<void>;

  // Custom Pads management
  customPads: CustomPad[];
  createCustomPad: (padData: Omit<CustomPad, 'id' | 'groupId' | 'createdAt'>) => Promise<string>;
  deleteCustomPad: (id: string) => Promise<void>;
  uploadPadAudio: (file: File) => Promise<string>;

  // Per-account personal capo (defaults to 0)
  personalCapos: Record<string, number>;
  setPersonalCapo: (capoKey: string, fret: number) => Promise<void>;

  // Gestion de planning
  planningTeams: PlanningTeam[];
  planningAvailabilities: PlanningAvailability[];
  planningAssignments: PlanningAssignment[];
  selectedPlanningTargetId: string | null;
  setSelectedPlanningTargetId: (id: string | null) => void;
  openPlanningForSetlist: (setlistId: string) => void;
  createPlanningTeam: (data: Omit<PlanningTeam, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePlanningTeam: (id: string, data: Partial<Pick<PlanningTeam, 'name' | 'description' | 'color' | 'members'>>) => Promise<void>;
  deletePlanningTeam: (id: string) => Promise<void>;
  setPlanningAvailability: (data: {
    date: string;
    status: PlanningAvailabilityStatus;
    preferredPoles?: PlanningPole[];
    note?: string;
    targetUid?: string;
    targetDisplayName?: string;
  }) => Promise<void>;
  deletePlanningAvailability: (id: string) => Promise<void>;
  savePlanningAssignment: (data: Omit<PlanningAssignment, 'groupId' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<string>;
  deletePlanningAssignment: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation & Selection
  const [activeTab, setActiveTabState] = useState<'repertoire' | 'setlists' | 'planning' | 'stage' | 'groups' | 'editor' | 'settings' | 'tuner' | 'presentation' | 'roadmap'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('songbook_active_tab');
      if (saved && ['repertoire', 'setlists', 'planning', 'stage', 'groups', 'editor', 'settings', 'tuner', 'presentation', 'roadmap'].includes(saved)) {
        return saved as any;
      }
    }
    return 'repertoire';
  });

  // Auth & Guest state - par défaut le visiteur arrive sur la page de connexion
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [needsLibraryOnboarding, setNeedsLibraryOnboarding] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const signupInProgressRef = useRef<boolean>(false);
  const setSignupInProgress = useCallback((inProgress: boolean) => {
    signupInProgressRef.current = inProgress;
  }, []);

  const permissionsRef = useRef({
    isRegieOnly: false,
    canAccessRepertoire: true,
    canAccessSetlistsView: true,
    canAccessPlanning: true,
    canAccessStage: true,
    canAccessProjection: true,
    canAccessGroupsView: true,
    canManageSongs: false,
    canAccessSettings: true
  });

  const setActiveTab = useCallback((tab: 'repertoire' | 'setlists' | 'planning' | 'stage' | 'groups' | 'editor' | 'settings' | 'tuner' | 'presentation' | 'roadmap') => {
    const p = permissionsRef.current;
    let resolvedTab = tab;
    if (tab === 'roadmap') {
      resolvedTab = 'roadmap';
    } else if (isGuest) {
      if (tab === 'editor' || tab === 'groups' || tab === 'settings' || tab === 'planning') {
        resolvedTab = 'repertoire';
      }
    } else if (p.isRegieOnly) {
      resolvedTab = tab === 'planning' ? 'planning' : 'presentation';
    } else {
      const fallback = p.canAccessRepertoire ? 'repertoire' : p.canAccessSetlistsView ? 'setlists' : 'presentation';
      if (tab === 'repertoire' && !p.canAccessRepertoire) resolvedTab = fallback;
      else if (tab === 'setlists' && !p.canAccessSetlistsView) resolvedTab = fallback;
      else if (tab === 'planning' && !p.canAccessPlanning) resolvedTab = fallback;
      else if (tab === 'stage' && !p.canAccessStage) resolvedTab = fallback;
      else if (tab === 'editor' && !p.canManageSongs) resolvedTab = fallback;
      else if (tab === 'groups' && !p.canAccessGroupsView) resolvedTab = fallback;
      else if (tab === 'settings' && !p.canAccessSettings) resolvedTab = fallback;
      else if (tab === 'presentation' && !p.canAccessProjection) resolvedTab = fallback;
    }

    if (resolvedTab !== 'setlists' && resolvedTab !== 'editor') {
      setIsLiveSetlistOpen(false);
      setEditorReturnTarget(null);
    }
    setActiveTabState(resolvedTab);
    if (!isGuest && typeof window !== 'undefined') {
      localStorage.setItem('songbook_active_tab', resolvedTab);
    }
  }, [isGuest]);

  useEffect(() => {
    if (isGuest && (activeTab === 'editor' || activeTab === 'groups' || activeTab === 'settings' || activeTab === 'planning')) {
      setActiveTabState('repertoire');
    }
  }, [isGuest, activeTab]);

  const [editorSubTab, setEditorSubTab] = useState<'data' | 'chords'>('chords');
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isUpdateDismissed, setIsUpdateDismissed] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const applyAppUpdate = useCallback(async () => {
    setIsApplyingUpdate(true);
    await refreshAppCachePreservingOfflineData();
  }, []);
  const dismissUpdateBanner = useCallback(() => {
    setIsUpdateDismissed(true);
  }, []);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [deepLinkSetlistId, setDeepLinkSetlistId] = useState<string | null>(null);
  const clearDeepLinkSetlistId = useCallback(() => setDeepLinkSetlistId(null), []);
  const pendingDeepLinkRef = useRef<{ inviteCode?: string; setlistId?: string; songId?: string } | null>((() => {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const hashParams = window.location.hash ? new URLSearchParams(window.location.hash.replace(/^#/, '')) : null;
      const inviteCode = (
        params.get('inviteCode') ||
        params.get('joinCode') ||
        params.get('invite') ||
        params.get('code') ||
        hashParams?.get('inviteCode') ||
        hashParams?.get('joinCode') ||
        hashParams?.get('invite') ||
        hashParams?.get('code') ||
        ''
      ).trim().toUpperCase();
      const setlistId = (params.get('setlistId') || hashParams?.get('setlistId') || '').trim();
      const songId = (params.get('songId') || params.get('song') || hashParams?.get('songId') || hashParams?.get('song') || '').trim();
      if (!inviteCode && !setlistId && !songId) return null;
      return {
        ...(inviteCode ? { inviteCode } : {}),
        ...(setlistId ? { setlistId } : {}),
        ...(songId ? { songId } : {}),
      };
    } catch {
      return null;
    }
  })());
  const [activeSetlistIndex, setActiveSetlistIndex] = useState<number>(0);
  const [isLiveSetlistOpen, setIsLiveSetlistOpen] = useState<boolean>(false);
  const [editorReturnTarget, setEditorReturnTarget] = useState<'stage' | 'setlistLive' | 'repertoire' | null>(null);

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

  // Registre des bibliothèques de l'utilisateur connecté
  const [allGroups, setAllGroups] = useState<Group[]>([]);

  const [guestJoinedGroupIds, setGuestJoinedGroupIds] = useState<string[]>([]);

  const recordGuestJoinedGroup = useCallback((groupId: string) => {
    setGuestJoinedGroupIds(prev => (prev.includes(groupId) ? prev : [...prev, groupId]));
  }, []);

  // Règle d'isolation stricte : chaque bibliothèque est totalement privée aux utilisateurs qui en sont membres ou propriétaires.
  const isMemberOfLibrary = useCallback((group: Group, user: UserProfile | null): boolean => {
    if (!user || !user.uid) {
      return false;
    }
    const uid = user.uid;
    if (group.ownerId === uid) {
      return true;
    }
    if (Array.isArray(group.members) && group.members.includes(uid)) {
      return true;
    }
    return false;
  }, []);

  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);

  // Liste des bibliothèques visibles par l'utilisateur connecté (ou invité actif)
  const groups = useMemo(() => {
    if (isGuest) {
      return currentGroup && currentGroup.guestEnabled ? [currentGroup] : [];
    }
    return allGroups.filter(g => isMemberOfLibrary(g, currentUser));
  }, [isGuest, currentGroup, allGroups, currentUser, isMemberOfLibrary]);

  // Si la bibliothèque active ne fait pas partie des bibliothèques autorisées, basculer automatiquement
  useEffect(() => {
    if (isGuest) return;
    if (groups.length > 0) {
      const isCurrentAuthorized = currentGroup && groups.some(g => g.id === currentGroup.id);
      if (!isCurrentAuthorized) {
        const preferredId = currentUser?.currentGroupId;
        const fallbackGroup = (preferredId && groups.find(g => g.id === preferredId)) || groups[0];
        setCurrentGroup(fallbackGroup);
        if (typeof window !== 'undefined') {
          localStorage.setItem('songbook_current_group_id', fallbackGroup.id);
        }
      }
    }
  }, [isGuest, groups, currentGroup?.id, currentUser?.currentGroupId]);

  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [setlistHistory, setSetlistHistory] = useState<SetlistHistoryRecord[]>([]);
  const [customPads, setCustomPads] = useState<CustomPad[]>([]);
  const [planningTeams, setPlanningTeams] = useState<PlanningTeam[]>([]);
  const [planningAvailabilities, setPlanningAvailabilities] = useState<PlanningAvailability[]>([]);
  const [planningAssignments, setPlanningAssignments] = useState<PlanningAssignment[]>([]);
  const [selectedPlanningTargetId, setSelectedPlanningTargetId] = useState<string | null>(null);

  const songsRef = useRef<Song[]>(songs);
  const setlistsRef = useRef<Setlist[]>(setlists);
  const selectedSetlistRef = useRef<Setlist | null>(selectedSetlist);
  const songsServerReadyGroupRef = useRef<string | null>(null);
  const setlistsServerReadyGroupRef = useRef<string | null>(null);
  const cleanedOrphansGroupRef = useRef<string | null>(null);

  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  useEffect(() => {
    setlistsRef.current = setlists;
  }, [setlists]);

  useEffect(() => {
    selectedSetlistRef.current = selectedSetlist;
  }, [selectedSetlist]);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentGroup?.id && !isGuest) {
      try {
        localStorage.setItem(`songbook_cached_custom_pads_${currentGroup.id}`, JSON.stringify(customPads));
      } catch (e) {}
    }
  }, [customPads, currentGroup?.id, isGuest]);

  // Initial hydration from IndexedDB for custom audio pads of current library
  useEffect(() => {
    if (!currentGroup?.id || isGuest) return;
    getAllCustomPadsFromIndexedDB(currentGroup.id).then(stored => {
      if (stored && stored.length > 0) {
        setCustomPads(prev => {
          const padMap = new Map<string, CustomPad>();
          stored.forEach(p => padMap.set(p.id, p));
          prev.forEach(p => padMap.set(p.id, p));
          return Array.from(padMap.values());
        });
      }
    }).catch(() => {});
  }, [currentGroup?.id]);

  // Stage view custom settings
  const [stageSettings, setStageSettings] = useState<StageSettings>(() => {
    const saved = localStorage.getItem('songbook_stage_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STAGE_SETTINGS,
          ...parsed,
          theme: parsed.theme === 'light' ? 'light' : 'dark',
          reduceMotion: parsed.reduceMotion === true
        };
      } catch (e) {}
    }
    return DEFAULT_STAGE_SETTINGS;
  });

  // Per-account personal capos (defaults to 0 when no entry exists)
  const [personalCapos, setPersonalCapos] = useState<Record<string, number>>({});
  const personalCaposRef = useRef<Record<string, number>>({});
  useEffect(() => {
    personalCaposRef.current = personalCapos;
  }, [personalCapos]);

  useEffect(() => {
    const uid = !isGuest ? currentUser?.uid : null;
    if (!uid && !isGuest) {
      personalCaposRef.current = {};
      setPersonalCapos({});
      return;
    }

    const cacheKey = getPersonalCaposCacheKey(uid, isGuest, currentGroup?.id);
    if (typeof window !== 'undefined') {
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        const initial = cachedRaw
          ? sanitizePersonalCapos(JSON.parse(cachedRaw))
          : sanitizePersonalCapos(currentUser?.personalCapos);
        personalCaposRef.current = initial;
        setPersonalCapos(initial);
      } catch {
        const fallback = sanitizePersonalCapos(currentUser?.personalCapos);
        personalCaposRef.current = fallback;
        setPersonalCapos(fallback);
      }
    }

    if (!uid || isGuest) return;

    const userRef = doc(db, 'users', uid);
    const unsubCapos = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) return;
        const remoteCapos = sanitizePersonalCapos(snap.data()?.personalCapos);
        personalCaposRef.current = remoteCapos;
        setPersonalCapos(remoteCapos);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(remoteCapos));
          } catch {}
        }
      },
      (err) => {
        console.warn('Personal capo listener note:', err);
      }
    );

    return () => unsubCapos();
  }, [isGuest, currentUser?.uid, currentGroup?.id]);

  const setPersonalCapo = useCallback(async (capoKey: string, fret: number): Promise<void> => {
    if (!capoKey || capoKey.length > 260) return;
    const normalizedFret = Math.max(0, Math.min(7, Math.trunc(Number(fret) || 0)));
    const nextMap = { ...personalCaposRef.current };
    if (normalizedFret <= 0) {
      delete nextMap[capoKey];
    } else {
      nextMap[capoKey] = normalizedFret;
    }

    personalCaposRef.current = nextMap;
    setPersonalCapos(nextMap);

    const uid = !isGuest ? (currentUser?.uid || auth.currentUser?.uid) : null;
    const cacheKey = getPersonalCaposCacheKey(uid, isGuest, currentGroup?.id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(nextMap));
      } catch {}
    }

    if (!uid || isGuest) return;

    setCurrentUser(prev => prev && prev.uid === uid ? { ...prev, personalCapos: nextMap } : prev);

    const userRef = doc(db, 'users', uid);
    try {
      await updateDoc(userRef, {
        personalCapos: nextMap,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      if (err?.code === 'not-found') {
        try {
          const baseUser = stripUndefined({
            uid,
            email: currentUser?.email || auth.currentUser?.email || '',
            displayName: currentUser?.displayName || auth.currentUser?.displayName || 'Musicien',
            photoURL: currentUser?.photoURL || auth.currentUser?.photoURL || undefined,
            currentGroupId: currentGroup?.id || currentUser?.currentGroupId || null,
            role: currentUser?.role || 'member',
            personalCapos: nextMap
          });
          await setDoc(userRef, {
            ...baseUser,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (setErr: any) {
          if (setErr?.code === 'permission-denied') {
            handleFirestoreError(setErr, OperationType.WRITE, `users/${uid}`);
          }
          console.warn('Personal capo fallback save note:', setErr);
        }
      } else if (err?.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      } else {
        console.warn('Personal capo sync note:', err);
      }
    }
  }, [isGuest, currentUser?.uid, currentUser?.email, currentUser?.displayName, currentUser?.photoURL, currentUser?.currentGroupId, currentUser?.role, currentGroup?.id]);

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
          metadataVisibility: {
            ...DEFAULT_SONG_METADATA_VISIBILITY,
            ...(parsed.metadataVisibility || {})
          }
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
    metadataVisibility?: Partial<SongMetadataVisibility>;
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
        chordColor: newSettings.chordColor !== undefined ? newSettings.chordColor : (prev.chordColor || DEFAULT_DISPLAY_SETTINGS.chordColor || '#60a5fa'),
        metadataVisibility: {
          ...(prev.metadataVisibility || DEFAULT_SONG_METADATA_VISIBILITY),
          ...(newSettings.metadataVisibility || {})
        }
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
    showAlbum: true,
    showCcli: false,
    showCopyright: false,
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
          showAlbum: parsed.showAlbum !== false,
          showCcli: parsed.showCcli === true,
          showCopyright: parsed.showCopyright === true,
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

  // Hydratation initiale depuis IndexedDB pour disponibilité instantanée hors-ligne (scopée par bibliothèque)
  useEffect(() => {
    let isMounted = true;
    const hydrateFromIndexedDB = async () => {
      if (!currentGroup?.id || isGuest) return;
      try {
        const targetGroup = currentGroup.id;
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
              if (!deletedSongIds.has(s.id) && s.groupId === targetGroup) songMap.set(s.id, s);
            });
            prev.forEach(s => {
              if (!deletedSongIds.has(s.id) && s.groupId === targetGroup) songMap.set(s.id, s);
            });
            return Array.from(songMap.values());
          });
        }

        if (cachedSetlists && cachedSetlists.length > 0) {
          setSetlists(prev => {
            const stMap = new Map<string, Setlist>();
            cachedSetlists.forEach(st => {
              if (!deletedSetlistIds.has(st.id) && st.groupId === targetGroup) stMap.set(st.id, st);
            });
            prev.forEach(st => {
              if (!deletedSetlistIds.has(st.id) && st.groupId === targetGroup) stMap.set(st.id, st);
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

    // Register Service Worker pour acces complet hors-ligne avec détection de mise à jour
    const cleanupSw = registerServiceWorker(
      () => {
        refreshOfflineStats();
      },
      () => {
        setIsUpdateAvailable(true);
        refreshOfflineStats();
      }
    );

    const verifyBuildUpdate = () => {
      checkForAppUpdate().then((hasUpdate) => {
        if (hasUpdate) {
          setIsUpdateAvailable(true);
        }
      });
    };

    verifyBuildUpdate();
    const handleVisibilityCheck = () => {
      if (!document.hidden) {
        verifyBuildUpdate();
      }
    };
    window.addEventListener('focus', verifyBuildUpdate);
    document.addEventListener('visibilitychange', handleVisibilityCheck);
    const updatePollId = window.setInterval(verifyBuildUpdate, 180_000);

    refreshOfflineStats();

    return () => {
      cleanupSw();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('focus', verifyBuildUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityCheck);
      window.clearInterval(updatePollId);
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
    if (isGuest) return;
    if (songs.length > 0 || setlists.length > 0) {
      cacheAllDataInWorker(songs, setlists).then(() => {
        refreshOfflineStats();
      });
    }
  }, [isGuest, songs, setlists, refreshOfflineStats]);

  // Deep linking for group shared via URL or QR Code (?inviteCode=... / ?group=... / ?code=...)
  useEffect(() => {
    if (typeof window === 'undefined' || isGuest) return;

    try {
      const params = new URLSearchParams(window.location.search);
      const hashParams = window.location.hash ? new URLSearchParams(window.location.hash.replace(/^#/, '')) : null;
      const targetGroupId =
        params.get('library') ||
        params.get('libraryId') ||
        params.get('group') ||
        params.get('groupId') ||
        hashParams?.get('library') ||
        hashParams?.get('libraryId') ||
        hashParams?.get('group') ||
        hashParams?.get('groupId');
      const targetCode =
        params.get('inviteCode') ||
        params.get('joinCode') ||
        params.get('invite') ||
        params.get('code') ||
        hashParams?.get('inviteCode') ||
        hashParams?.get('joinCode') ||
        hashParams?.get('invite') ||
        hashParams?.get('code') ||
        pendingDeepLinkRef.current?.inviteCode;

      if (targetGroupId) {
        const found = allGroups.find(g => g.id === targetGroupId);
        if (found && currentGroup?.id !== found.id) {
          recordGuestJoinedGroup(found.id);
          setCurrentGroup(found);
          localStorage.setItem('songbook_current_group_id', found.id);
        }
      } else if (targetCode) {
        const foundByCode = allGroups.find(g => g.inviteCode?.toUpperCase() === targetCode.toUpperCase());
        if (foundByCode && currentGroup?.id !== foundByCode.id) {
          recordGuestJoinedGroup(foundByCode.id);
          setCurrentGroup(foundByCode);
          localStorage.setItem('songbook_current_group_id', foundByCode.id);
        }
      }
    } catch (e) {
      console.warn('Erreur lecture lien groupe :', e);
    }
  }, [allGroups, currentGroup?.id, isGuest, recordGuestJoinedGroup]);

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
      const updated: StageSettings = {
        ...prev,
        ...newSettings,
        theme: (newSettings.theme ?? prev.theme) === 'light' ? 'light' : 'dark'
      };
      localStorage.setItem('songbook_stage_settings', JSON.stringify(updated));
      return updated;
    });
    showNotification('Enregistré');
  }, [showNotification]);

  // Sync manual theme mode (dark by default, or light) and reduced motion preference with document root
  useEffect(() => {
    const isPresentation = typeof window !== 'undefined' && (
      new URLSearchParams(window.location.search).get('mode') === 'presentation' ||
      window.location.hash === '#presentation'
    );
    const isLight = !isPresentation && stageSettings.theme === 'light';
    const root = document.documentElement;
    if (isLight) {
      root.classList.remove('dark', 'dark-theme');
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
      root.classList.add('dark', 'dark-theme');
    }
    root.classList.toggle('reduce-motion', Boolean(stageSettings.reduceMotion));
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isLight ? '#F4F6F9' : '#090d16');
    }
  }, [stageSettings.theme, stageSettings.reduceMotion]);

  // Save cache to localStorage scoped strictly per library ID
  useEffect(() => {
    if (currentGroup?.id && !isGuest) {
      localStorage.setItem(`songbook_cached_songs_${currentGroup.id}`, JSON.stringify(songs));
    }
  }, [songs, currentGroup?.id, isGuest]);

  useEffect(() => {
    if (currentGroup?.id && !isGuest) {
      localStorage.setItem(`songbook_cached_setlists_${currentGroup.id}`, JSON.stringify(setlists));
    }
  }, [setlists, currentGroup?.id, isGuest]);

  useEffect(() => {
    if (currentGroup?.id && !isGuest) {
      localStorage.setItem(`songbook_cached_setlist_history_${currentGroup.id}`, JSON.stringify(setlistHistory));
    }
  }, [setlistHistory, currentGroup?.id, isGuest]);

  useEffect(() => {
    if (currentGroup?.id && !isGuest) {
      try {
        localStorage.setItem(`songbook_cached_planning_teams_${currentGroup.id}`, JSON.stringify(planningTeams));
        localStorage.setItem(`songbook_cached_planning_avail_${currentGroup.id}`, JSON.stringify(planningAvailabilities));
        localStorage.setItem(`songbook_cached_planning_assign_${currentGroup.id}`, JSON.stringify(planningAssignments));
      } catch {}
    }
  }, [planningTeams, planningAvailabilities, planningAssignments, currentGroup?.id, isGuest]);

  useEffect(() => {
    if (currentUser && !isGuest) {
      localStorage.setItem('songbook_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('songbook_user');
    }
  }, [currentUser, isGuest]);

  // Ref vers completeSignupCreateLibrary pour utilisation sûre dans onAuthStateChanged
  const completeSignupCreateLibraryRef = useRef<((libraryName: string, libraryDescription?: string, displayNameOverride?: string) => Promise<Group>) | null>(null);

  // Auth Listener & Initial Library Discovery
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsGuest(false);
        if (signupInProgressRef.current) {
          setAuthLoading(false);
          return;
        }
        try {
          const userRef = doc(db, 'users', user.uid);
          const [snap, memberGroupsSnap, ownerGroupsSnap] = await Promise.all([
            getDoc(userRef).catch(() => null),
            getDocs(query(collection(db, 'groups'), where('members', 'array-contains', user.uid))).catch(() => null),
            getDocs(query(collection(db, 'groups'), where('ownerId', '==', user.uid))).catch(() => null)
          ]);

          const groupMap = new Map<string, Group>();
          memberGroupsSnap?.forEach(d => {
            groupMap.set(d.id, { id: d.id, ...d.data() } as Group);
          });
          ownerGroupsSnap?.forEach(d => {
            groupMap.set(d.id, { id: d.id, ...d.data() } as Group);
          });

          const data = snap?.exists() ? (snap.data() as Partial<UserProfile>) : {};

          // Fallback : si currentGroupId est enregistré sur le profil mais non retourné par la liste
          if (data.currentGroupId && !groupMap.has(data.currentGroupId)) {
            try {
              const curGroupSnap = await getDoc(doc(db, 'groups', data.currentGroupId));
              if (curGroupSnap.exists()) {
                const cg = { id: curGroupSnap.id, ...curGroupSnap.data() } as Group;
                if (cg.ownerId === user.uid || (Array.isArray(cg.members) && cg.members.includes(user.uid))) {
                  groupMap.set(cg.id, cg);
                }
              }
            } catch {}
          }

          const userGroups = Array.from(groupMap.values());

          if (userGroups.length > 0) {
            const preferredGroup = userGroups.find(g => g.id === data.currentGroupId) || userGroups[0];
            const accessesInGroup = resolveMemberAccesses(
              preferredGroup,
              user.uid,
              data.role as UserRole,
              data.accesses as AccessPermission[] | undefined
            );
            const roleInGroup: UserRole = accessesToLegacyRole(accessesInGroup);
            const mergedUser: UserProfile = stripUndefined({
              uid: user.uid,
              email: data.email || user.email || '',
              displayName: data.displayName || user.displayName || user.email?.split('@')[0] || 'Musicien',
              photoURL: data.photoURL || user.photoURL || undefined,
              currentGroupId: preferredGroup.id,
              role: roleInGroup,
              accesses: accessesInGroup,
              personalCapos: sanitizePersonalCapos(data.personalCapos)
            });
            if (!snap || !snap.exists()) {
              setDoc(userRef, {
                ...mergedUser,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              }, { merge: true }).catch(() => {});
            }
            setAllGroups(userGroups);
            setCurrentGroup(preferredGroup);
            if (typeof window !== 'undefined') {
              localStorage.setItem('songbook_current_group_id', preferredGroup.id);
            }
            setCurrentUser(mergedUser);
            setNeedsLibraryOnboarding(false);
          } else if (completeSignupCreateLibraryRef.current) {
            // Compte déjà créé sans bibliothèque (ex. compte existant antérieur) : créer sa bibliothèque personnelle et entrer directement
            await completeSignupCreateLibraryRef.current('Ma bibliothèque', 'Bibliothèque personnelle');
          } else {
            setAllGroups([]);
            setCurrentGroup(null);
            setCurrentUser(null);
            setNeedsLibraryOnboarding(true);
          }
        } catch (e) {
          console.warn('Firestore user/library fetch note:', e);
          let restored = false;
          if (typeof window !== 'undefined') {
            try {
              const cachedUserRaw = localStorage.getItem('songbook_user');
              const cachedGroupId = localStorage.getItem('songbook_current_group_id');
              if (cachedUserRaw) {
                const parsedUser = JSON.parse(cachedUserRaw) as UserProfile;
                if (parsedUser?.uid === user.uid) {
                  const fallbackGroupId = parsedUser.currentGroupId || cachedGroupId || `lib_${user.uid.slice(0, 8)}`;
                  const fallbackAccesses = normalizeAccessList(parsedUser.accesses, parsedUser.role || 'admin');
                  const fallbackGroup: Group = {
                    id: fallbackGroupId,
                    name: 'Ma bibliothèque',
                    ownerId: user.uid,
                    members: [user.uid],
                    memberRoles: { [user.uid]: parsedUser.role || 'admin' },
                    memberAccesses: { [user.uid]: fallbackAccesses },
                    inviteCode: generateInviteCode()
                  };
                  setAllGroups([fallbackGroup]);
                  setCurrentGroup(fallbackGroup);
                  setCurrentUser(parsedUser);
                  setNeedsLibraryOnboarding(false);
                  restored = true;
                }
              }
            } catch {}
          }
          if (!restored) {
            setNeedsLibraryOnboarding(true);
          }
        } finally {
          setAuthLoading(false);
        }
      } else {
        setCurrentUser(null);
        setPersonalCapos({});
        personalCaposRef.current = {};
        setNeedsLibraryOnboarding(false);
        setAllGroups([]);
        setCurrentGroup(null);
        setSongs([]);
        setSetlists([]);
        setSetlistHistory([]);
        setCustomPads([]);
        setPlanningTeams([]);
        setPlanningAvailabilities([]);
        setPlanningAssignments([]);
        setSelectedPlanningTargetId(null);
        setAllUsers([]);
        setSelectedSong(null);
        setSelectedSetlist(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('songbook_user');
          localStorage.removeItem('songbook_current_group_id');
        }
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Compléter l'inscription en créant une nouvelle bibliothèque isolée
  const completeSignupCreateLibrary = useCallback(async (
    libraryName: string,
    libraryDescription = '',
    displayNameOverride?: string
  ): Promise<Group> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Vous devez être connecté pour créer une bibliothèque.');
    }

    const cleanName = libraryName.trim();
    if (!cleanName) {
      throw new Error('Veuillez saisir un nom pour votre bibliothèque.');
    }

    const uid = user.uid;
    const cleanEmail = (user.email || '').toLowerCase().trim();
    const finalDisplayName = (displayNameOverride || user.displayName || cleanEmail.split('@')[0] || 'Musicien').trim();
    const newId = 'lib_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const inviteCode = generateInviteCode();

    const newGroup: Group = {
      id: newId,
      name: cleanName,
      description: libraryDescription.trim(),
      ownerId: uid,
      members: [uid],
      memberRoles: { [uid]: 'admin' },
      memberAccesses: { [uid]: [...ALL_ACCESSES] },
      inviteCode
    };

    const userProfile: UserProfile = stripUndefined({
      uid,
      email: cleanEmail,
      displayName: finalDisplayName,
      photoURL: user.photoURL || undefined,
      currentGroupId: newId,
      role: 'admin',
      accesses: [...ALL_ACCESSES]
    });

    const memberEntry = stripUndefined({
      uid,
      displayName: finalDisplayName,
      photoURL: user.photoURL || undefined,
      role: 'admin' as UserRole,
      accesses: [...ALL_ACCESSES]
    });

    try {
      await setDoc(doc(db, 'groups', newId), {
        ...newGroup,
        createdAt: serverTimestamp()
      });
      await setDoc(doc(db, 'library_invites', inviteCode), {
        inviteCode,
        groupId: newId,
        name: cleanName,
        ownerId: uid,
        createdAt: serverTimestamp()
      });
      await setDoc(doc(db, 'groups', newId, 'members', uid), {
        ...memberEntry,
        joinedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'users', uid), {
        ...userProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `groups/${newId}`);
    }

    setSongs([]);
    setSetlists([]);
    setSetlistHistory([]);
    setCustomPads([]);
    setPlanningTeams([]);
    setPlanningAvailabilities([]);
    setPlanningAssignments([]);
    setSelectedPlanningTargetId(null);
    setSelectedSong(null);
    setSelectedSetlist(null);
    setAllGroups(prev => [...prev.filter(g => g.id !== newId), newGroup]);
    setCurrentGroup(newGroup);
    if (typeof window !== 'undefined') {
      localStorage.setItem('songbook_current_group_id', newId);
    }
    setCurrentUser(userProfile);
    setNeedsLibraryOnboarding(false);
    setActiveTab('repertoire');

    showNotification({
      title: 'Bibliothèque créée',
      message: `Identifiant à partager : ${inviteCode}`,
      type: 'success',
      duration: 4500
    });

    return newGroup;
  }, [setActiveTab, showNotification]);

  useEffect(() => {
    completeSignupCreateLibraryRef.current = completeSignupCreateLibrary;
  }, [completeSignupCreateLibrary]);

  // Compléter l'inscription en rejoignant une bibliothèque existante via son identifiant
  const completeSignupJoinLibrary = useCallback(async (
    libraryIdentifier: string,
    displayNameOverride?: string
  ): Promise<Group> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Vous devez être connecté pour rejoindre une bibliothèque.');
    }

    const rawInput = libraryIdentifier.trim();
    const upperCode = rawInput.toUpperCase();
    if (!rawInput) {
      throw new Error("Veuillez saisir l'identifiant de la bibliothèque.");
    }

    let matchedGroup: Group | null = null;

    // 1. Chercher par code d'invitation dans /library_invites/{code}
    if (/^[a-zA-Z0-9_\-]+$/.test(upperCode)) {
      try {
        const inviteSnap = await getDoc(doc(db, 'library_invites', upperCode));
        if (inviteSnap.exists()) {
          const targetGroupId = inviteSnap.data()?.groupId;
          if (targetGroupId) {
            const groupSnap = await getDoc(doc(db, 'groups', targetGroupId));
            if (groupSnap.exists()) {
              matchedGroup = { id: groupSnap.id, ...groupSnap.data() } as Group;
            }
          }
        }
      } catch (e) {
        console.warn('Invite lookup note:', e);
      }

      // 2. Fallback : recherche directe par identifiant technique /groups/{id}
      if (!matchedGroup) {
        try {
          const directSnap = await getDoc(doc(db, 'groups', rawInput));
          if (directSnap.exists()) {
            matchedGroup = { id: directSnap.id, ...directSnap.data() } as Group;
          }
        } catch (e) {
          console.warn('Direct group lookup note:', e);
        }
      }
    }

    if (!matchedGroup) {
      throw new Error(`Aucune bibliothèque trouvée avec l'identifiant « ${rawInput} ». Vérifiez l'identifiant ou créez votre propre bibliothèque.`);
    }

    const uid = user.uid;
    const cleanEmail = (user.email || '').toLowerCase().trim();
    const finalDisplayName = (displayNameOverride || user.displayName || cleanEmail.split('@')[0] || 'Musicien').trim();
    const accessesInLibrary = resolveMemberAccesses(matchedGroup, uid, 'member', ['pupitre']);
    const roleInLibrary: UserRole = accessesToLegacyRole(accessesInLibrary);

    try {
      if (!matchedGroup.members?.includes(uid)) {
        await updateDoc(doc(db, 'groups', matchedGroup.id), {
          members: arrayUnion(uid)
        });
        matchedGroup = {
          ...matchedGroup,
          members: [...(matchedGroup.members || []), uid]
        };
      }

      const memberEntry = stripUndefined({
        uid,
        displayName: finalDisplayName,
        photoURL: user.photoURL || undefined,
        role: roleInLibrary,
        accesses: accessesInLibrary
      });
      await setDoc(doc(db, 'groups', matchedGroup.id, 'members', uid), {
        ...memberEntry,
        joinedAt: serverTimestamp()
      }, { merge: true });

      const userProfile: UserProfile = stripUndefined({
        uid,
        email: cleanEmail,
        displayName: finalDisplayName,
        photoURL: user.photoURL || undefined,
        currentGroupId: matchedGroup.id,
        role: roleInLibrary,
        accesses: accessesInLibrary
      });
      await setDoc(doc(db, 'users', uid), {
        ...userProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSongs([]);
      setSetlists([]);
      setSetlistHistory([]);
      setCustomPads([]);
      setPlanningTeams([]);
      setPlanningAvailabilities([]);
      setPlanningAssignments([]);
      setSelectedPlanningTargetId(null);
      setSelectedSong(null);
      setSelectedSetlist(null);
      setAllGroups(prev => [...prev.filter(g => g.id !== matchedGroup!.id), matchedGroup!]);
      setCurrentGroup(matchedGroup);
      if (typeof window !== 'undefined') {
        localStorage.setItem('songbook_current_group_id', matchedGroup.id);
      }
      setCurrentUser(userProfile);
      setNeedsLibraryOnboarding(false);
      setActiveTab(isRegieOnlyAccesses(accessesInLibrary) ? 'presentation' : 'repertoire');

      showNotification({
        title: `Bibliothèque « ${matchedGroup.name} » rejointe`,
        message: 'Vous êtes maintenant connecté à la base de données de cette bibliothèque.',
        type: 'success'
      });

      return matchedGroup;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${matchedGroup.id}`);
    }
  }, [setActiveTab, showNotification]);

  const blockIfGuest = useCallback((): boolean => {
    if (!isGuest) return false;
    showNotification('Action non disponible en mode invité (lecture seule)', 'info');
    return true;
  }, [isGuest, showNotification]);

  const enterGuestMode = useCallback(async (
    libraryCode: string,
    target?: { setlistId?: string; songId?: string }
  ): Promise<Group> => {
    const rawInput = libraryCode.trim();
    const upperCode = rawInput.toUpperCase();
    if (!rawInput || !/^[a-zA-Z0-9_\-]+$/.test(upperCode)) {
      throw new Error("Code de bibliothèque invalide.");
    }

    let matchedGroup: Group | null = null;
    try {
      const inviteSnap = await getDoc(doc(db, 'library_invites', upperCode));
      if (inviteSnap.exists()) {
        const targetGroupId = inviteSnap.data()?.groupId;
        if (targetGroupId) {
          const groupSnap = await getDoc(doc(db, 'groups', targetGroupId));
          if (groupSnap.exists()) {
            const candidate = { id: groupSnap.id, ...groupSnap.data() } as Group;
            if (candidate.guestEnabled === true) {
              matchedGroup = candidate;
            }
          }
        }
      }

      if (!matchedGroup) {
        const directSnap = await getDoc(doc(db, 'groups', rawInput));
        if (directSnap.exists()) {
          const candidate = { id: directSnap.id, ...directSnap.data() } as Group;
          if (candidate.guestEnabled === true) {
            matchedGroup = candidate;
          }
        }
      }
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        throw new Error("Accès visiteur désactivé pour ce code ou code invalide. Créez un compte pour rejoindre cette bibliothèque.");
      }
      throw new Error(e?.message || "Impossible de vérifier le code de la bibliothèque.");
    }

    if (!matchedGroup) {
      throw new Error("Code de bibliothèque invalide ou accès visiteur désactivé par le propriétaire.");
    }

    const resolvedTarget = target ?? (
      pendingDeepLinkRef.current
        ? { setlistId: pendingDeepLinkRef.current.setlistId, songId: pendingDeepLinkRef.current.songId }
        : undefined
    );
    pendingDeepLinkRef.current = (resolvedTarget?.setlistId || resolvedTarget?.songId)
      ? { inviteCode: upperCode, setlistId: resolvedTarget.setlistId, songId: resolvedTarget.songId }
      : null;

    setSongs([]);
    setSetlists([]);
    setSetlistHistory([]);
    setCustomPads([]);
    setPlanningTeams([]);
    setPlanningAvailabilities([]);
    setPlanningAssignments([]);
    setSelectedPlanningTargetId(null);
    setAllUsers([]);
    setSelectedSong(null);
    setSelectedSetlist(null);
    setDeepLinkSetlistId(null);
    setCurrentUser(null);
    setNeedsLibraryOnboarding(false);
    setIsGuest(true);
    setAllGroups([matchedGroup]);
    setCurrentGroup(matchedGroup);
    setActiveTabState(
      resolvedTarget?.setlistId ? 'setlists' : resolvedTarget?.songId ? 'stage' : 'repertoire'
    );

    showNotification({
      title: `Mode visiteur : ${matchedGroup.name}`,
      message: 'Consultation du répertoire et des setlists en lecture seule.',
      type: 'info',
      duration: 3500
    });

    return matchedGroup;
  }, [showNotification]);

  const exitGuestMode = useCallback(() => {
    pendingDeepLinkRef.current = null;
    setDeepLinkSetlistId(null);
    setIsGuest(false);
    setAllGroups([]);
    setCurrentGroup(null);
    setSongs([]);
    setSetlists([]);
    setSetlistHistory([]);
    setCustomPads([]);
    setPlanningTeams([]);
    setPlanningAvailabilities([]);
    setPlanningAssignments([]);
    setSelectedPlanningTargetId(null);
    setAllUsers([]);
    setSelectedSong(null);
    setSelectedSetlist(null);
  }, []);

  const guestLinkCheckedRef = useRef(false);
  useEffect(() => {
    if (authLoading || guestLinkCheckedRef.current || typeof window === 'undefined') return;
    if (auth.currentUser || isGuest) return;
    guestLinkCheckedRef.current = true;

    try {
      const params = new URLSearchParams(window.location.search);
      const hashParams = window.location.hash ? new URLSearchParams(window.location.hash.replace(/^#/, '')) : null;
      const libraryCodeParam =
        params.get('inviteCode') ||
        params.get('joinCode') ||
        params.get('invite') ||
        params.get('code') ||
        hashParams?.get('inviteCode') ||
        hashParams?.get('joinCode') ||
        hashParams?.get('invite') ||
        hashParams?.get('code');
      if (libraryCodeParam && libraryCodeParam.trim()) {
        const targetSetlistId = (params.get('setlistId') || hashParams?.get('setlistId') || '').trim();
        const targetSongId = (params.get('songId') || params.get('song') || hashParams?.get('songId') || hashParams?.get('song') || '').trim();
        enterGuestMode(libraryCodeParam, {
          ...(targetSetlistId ? { setlistId: targetSetlistId } : {}),
          ...(targetSongId ? { songId: targetSongId } : {}),
        }).catch((err) => {
          showNotification(
            err?.message || "L'accès visiteur est désactivé pour cette bibliothèque. Créez un compte pour la rejoindre.",
            'warning',
            4500
          );
        });
      }
    } catch (e) {
      console.warn('Visitor deep-link note:', e);
    }
  }, [authLoading, isGuest, enterGuestMode, showNotification]);

  const libraryMemberDocsRef = useRef<UserProfile[]>([]);
  const resolvedUserProfilesRef = useRef<Record<string, Partial<UserProfile>>>({});
  const backfilledMemberKeysRef = useRef<Set<string>>(new Set());
  const fetchedUserLookupKeysRef = useRef<Set<string>>(new Set());

  const reconcileLibraryMembers = useCallback((
    snapDocs: UserProfile[],
    group: Group | null,
    user: UserProfile | null
  ): UserProfile[] => {
    const targetGroupId = group?.id;
    if (!targetGroupId || !user?.uid) return [];

    const byUid = new Map<string, UserProfile>();
    for (const docItem of snapDocs) {
      const resolvedAccesses = resolveMemberAccesses(group, docItem.uid, docItem.role, docItem.accesses);
      byUid.set(docItem.uid, {
        ...docItem,
        accesses: resolvedAccesses,
        role: accessesToLegacyRole(resolvedAccesses)
      });
    }

    const expectedUids = Array.from(new Set([
      ...(Array.isArray(group.members) ? group.members : []),
      ...(group.ownerId ? [group.ownerId] : [])
    ])).filter(Boolean);

    const isCurUserAdmin = group.ownerId === user.uid || resolveMemberAccesses(group, user.uid).includes('admin');

    for (const uid of expectedUids) {
      if (byUid.has(uid)) continue;

      const accessesInGroup = resolveMemberAccesses(
        group,
        uid,
        uid === user.uid ? user.role : undefined,
        uid === user.uid ? user.accesses : undefined
      );
      const roleInGroup: UserRole = accessesToLegacyRole(accessesInGroup);

      if (uid === user.uid) {
        const displayName = (user.displayName || user.email?.split('@')[0] || 'Musicien').trim().slice(0, 120) || 'Musicien';
        const validPhoto = user.photoURL && user.photoURL.length <= 2048 ? user.photoURL : undefined;
        byUid.set(uid, {
          uid,
          email: user.email || '',
          displayName,
          photoURL: user.photoURL,
          currentGroupId: targetGroupId,
          role: roleInGroup,
          accesses: accessesInGroup
        });

        const backfillKey = `${targetGroupId}:${uid}`;
        if (!backfilledMemberKeysRef.current.has(backfillKey)) {
          backfilledMemberKeysRef.current.add(backfillKey);
          setDoc(doc(db, 'groups', targetGroupId, 'members', uid), stripUndefined({
            uid,
            displayName,
            photoURL: validPhoto,
            role: roleInGroup,
            accesses: accessesInGroup,
            joinedAt: serverTimestamp()
          }), { merge: true }).catch(() => {});
        }
      } else {
        const cachedProfile = resolvedUserProfilesRef.current[uid];
        const fallbackName = (cachedProfile?.displayName || `Membre (${uid.slice(0, 6)})`).trim().slice(0, 120);
        byUid.set(uid, {
          uid,
          email: cachedProfile?.email || '',
          displayName: fallbackName,
          photoURL: cachedProfile?.photoURL,
          currentGroupId: targetGroupId,
          role: roleInGroup,
          accesses: accessesInGroup
        });

        const lookupKey = `${targetGroupId}:${uid}`;
        if (!fetchedUserLookupKeysRef.current.has(lookupKey)) {
          fetchedUserLookupKeysRef.current.add(lookupKey);
          getDoc(doc(db, 'users', uid)).then((userSnap) => {
            if (!userSnap.exists()) return;
            const uData = userSnap.data() as Partial<UserProfile>;
            const resolvedName = (uData.displayName || uData.email?.split('@')[0] || `Membre (${uid.slice(0, 6)})`).trim().slice(0, 120);
            resolvedUserProfilesRef.current[uid] = {
              displayName: resolvedName,
              email: uData.email || '',
              photoURL: uData.photoURL
            };
            setAllUsers(prev => prev.map(item => item.uid === uid ? {
              ...item,
              displayName: resolvedName,
              email: uData.email || item.email,
              photoURL: uData.photoURL ?? item.photoURL
            } : item));

            if (isCurUserAdmin && !backfilledMemberKeysRef.current.has(lookupKey)) {
              backfilledMemberKeysRef.current.add(lookupKey);
              const validPhoto = uData.photoURL && uData.photoURL.length <= 2048 ? uData.photoURL : undefined;
              setDoc(doc(db, 'groups', targetGroupId, 'members', uid), stripUndefined({
                uid,
                displayName: resolvedName,
                photoURL: validPhoto,
                role: roleInGroup,
                accesses: accessesInGroup,
                joinedAt: serverTimestamp()
              }), { merge: true }).catch(() => {});
            }
          }).catch(() => {});
        }
      }
    }

    return Array.from(byUid.values());
  }, []);

  // Synchronisation en temps réel des membres de la bibliothèque active uniquement (isolation stricte)
  useEffect(() => {
    const targetGroupId = currentGroup?.id;
    if (!targetGroupId || !currentUser?.uid || isGuest) {
      libraryMemberDocsRef.current = [];
      setAllUsers([]);
      return;
    }

    const membersPath = `groups/${targetGroupId}/members`;
    const unsubMembers = onSnapshot(collection(db, 'groups', targetGroupId, 'members'), (snap) => {
      const mList: UserProfile[] = [];
      snap.forEach(d => {
        const data = d.data() as Partial<UserProfile>;
        const uid = data.uid || d.id;
        const cached = resolvedUserProfilesRef.current[uid];
        mList.push({
          uid,
          email: data.email || cached?.email || (uid === currentUser.uid ? currentUser.email : ''),
          displayName: data.displayName || cached?.displayName || 'Musicien',
          photoURL: data.photoURL || cached?.photoURL,
          currentGroupId: targetGroupId,
          role: (data.role as UserRole) || 'member',
          accesses: Array.isArray(data.accesses) ? normalizeAccessList(data.accesses) : undefined
        });
      });
      libraryMemberDocsRef.current = mList;
      setAllUsers(reconcileLibraryMembers(mList, currentGroup, currentUser));
    }, (err) => {
      if (err?.code !== 'unavailable') {
        console.warn('Library members snapshot note:', membersPath, err.message);
      }
      setAllUsers(reconcileLibraryMembers(libraryMemberDocsRef.current, currentGroup, currentUser));
    });

    return () => unsubMembers();
  }, [currentGroup?.id, currentUser?.uid, currentUser?.email, isGuest, reconcileLibraryMembers]);

  // Réconciliation immédiate si currentGroup.members ou memberRoles change sans recréer le listener Firestore
  useEffect(() => {
    if (!currentGroup?.id || !currentUser?.uid || isGuest) return;
    setAllUsers(reconcileLibraryMembers(libraryMemberDocsRef.current, currentGroup, currentUser));
  }, [currentGroup, currentUser, isGuest, reconcileLibraryMembers]);

  // Synchronisation en temps réel de la base de données dédiée de la bibliothèque active (/groups/{groupId}/...)
  useEffect(() => {
    const targetGroupId = currentGroup?.id;
    songsServerReadyGroupRef.current = null;
    setlistsServerReadyGroupRef.current = null;
    cleanedOrphansGroupRef.current = null;

    if (!targetGroupId || (!currentUser?.uid && !isGuest)) {
      setSongs([]);
      setSetlists([]);
      setSetlistHistory([]);
      setCustomPads([]);
      setPlanningTeams([]);
      setPlanningAvailabilities([]);
      setPlanningAssignments([]);
      setSelectedSong(null);
      setSelectedSetlist(null);
      return;
    }

    if (!isGuest) {
      // Hydratation immédiate depuis le cache local isolé de CETTE bibliothèque avant réponse Firestore
      const loadLibraryLocalCache = <T,>(key: string): T[] => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          }
        } catch {}
        return [];
      };

      const cachedSongs = loadLibraryLocalCache<Song>(`songbook_cached_songs_${targetGroupId}`);
      const cachedSetlists = loadLibraryLocalCache<Setlist>(`songbook_cached_setlists_${targetGroupId}`);
      const cachedHistory = loadLibraryLocalCache<SetlistHistoryRecord>(`songbook_cached_setlist_history_${targetGroupId}`);
      const cachedPads = loadLibraryLocalCache<CustomPad>(`songbook_cached_custom_pads_${targetGroupId}`);
      const cachedPlanningTeams = loadLibraryLocalCache<PlanningTeam>(`songbook_cached_planning_teams_${targetGroupId}`);
      const cachedPlanningAvail = loadLibraryLocalCache<PlanningAvailability>(`songbook_cached_planning_avail_${targetGroupId}`);
      const cachedPlanningAssign = loadLibraryLocalCache<PlanningAssignment>(`songbook_cached_planning_assign_${targetGroupId}`);

      setSongs(cachedSongs);
      setSetlists(cachedSetlists);
      setSetlistHistory(cachedHistory);
      setCustomPads(cachedPads);
      setPlanningTeams(cachedPlanningTeams);
      setPlanningAvailabilities(cachedPlanningAvail);
      setPlanningAssignments(cachedPlanningAssign);
      setSelectedSong(cachedSongs[0] || null);
      setSelectedSetlist(null);
    }

    const reconcileOrphanedSetlistSongs = () => {
      if (isGuest) return;
      if (
        songsServerReadyGroupRef.current !== targetGroupId ||
        setlistsServerReadyGroupRef.current !== targetGroupId ||
        cleanedOrphansGroupRef.current === targetGroupId
      ) {
        return;
      }
      cleanedOrphansGroupRef.current = targetGroupId;

      const existingSongIds = new Set(songsRef.current.map(s => s.id));
      const dirtySetlists = setlistsRef.current.filter(st =>
        st.songIds.some(sId => !existingSongIds.has(sId))
      );
      if (dirtySetlists.length === 0) return;

      const cleanedMap = new Map<string, string[]>();
      dirtySetlists.forEach(st => {
        cleanedMap.set(st.id, st.songIds.filter(sId => existingSongIds.has(sId)));
      });

      const nextSetlists = setlistsRef.current.map(st =>
        cleanedMap.has(st.id) ? { ...st, songIds: cleanedMap.get(st.id)! } : st
      );
      setlistsRef.current = nextSetlists;
      setSetlists(nextSetlists);
      setSelectedSetlist(prev => {
        if (!prev) return null;
        return cleanedMap.has(prev.id)
          ? { ...prev, songIds: cleanedMap.get(prev.id)! }
          : prev;
      });

      dirtySetlists.forEach(st => {
        const cleanedIds = cleanedMap.get(st.id)!;
        updateDoc(doc(db, 'groups', targetGroupId, 'setlists', st.id), { songIds: cleanedIds }).catch(() => {});
      });
    };

    // 1. Sync Songs from /groups/{groupId}/songs
    const unsubSongs = onSnapshot(collection(db, 'groups', targetGroupId, 'songs'), (snapshot) => {
      const deletedIds = isGuest ? new Set<string>() : getDeletedSongIds();
      const loadedSongs: Song[] = [];
      snapshot.forEach((d) => {
        const raw = { id: d.id, ...d.data(), groupId: targetGroupId } as Song;
        if (deletedIds.has(raw.id)) return;
        const resolvedDuration = raw.duration || getSongDuration(raw);
        const resolvedLanguage = (raw.language && raw.language.trim())
          ? raw.language
          : detectSongLanguage(raw.title, raw.contentChordPro || raw.content);
        const withDuration = resolvedDuration ? { ...raw, duration: resolvedDuration } : raw;
        loadedSongs.push({ ...withDuration, language: resolvedLanguage });
      });

      songsRef.current = loadedSongs;
      setSongs(loadedSongs);

      const pendingSongLink = pendingDeepLinkRef.current;
      const inviteMatchesForSong = !pendingSongLink?.inviteCode || currentGroup?.inviteCode?.toUpperCase() === pendingSongLink.inviteCode.toUpperCase();
      let handledDeepLinkSong = false;
      if (pendingSongLink && !pendingSongLink.setlistId && pendingSongLink.songId && inviteMatchesForSong) {
        const deepLinkedSong = loadedSongs.find(s => s.id === pendingSongLink.songId);
        if (deepLinkedSong) {
          pendingDeepLinkRef.current = null;
          setSelectedSong(deepLinkedSong);
          setActiveTabState('stage');
          handledDeepLinkSong = true;
        } else if (!snapshot.metadata.fromCache) {
          pendingDeepLinkRef.current = null;
        }
      }

      if (!handledDeepLinkSong) {
        setSelectedSong(prev => {
          if (prev && loadedSongs.some(s => s.id === prev.id)) {
            return loadedSongs.find(s => s.id === prev.id) || prev;
          }
          return loadedSongs[0] || null;
        });
      }

      if (!snapshot.metadata.fromCache) {
        songsServerReadyGroupRef.current = targetGroupId;
        reconcileOrphanedSetlistSongs();
      }
    }, (error) => {
      if (error?.code !== 'unavailable') {
        console.warn('Firestore library songs snapshot notice:', error.message);
      }
    });

    // 2. Sync Setlists from /groups/{groupId}/setlists
    const unsubSetlists = onSnapshot(collection(db, 'groups', targetGroupId, 'setlists'), (snapshot) => {
      const deletedSetlistIds = isGuest ? new Set<string>() : getDeletedSetlistIds();
      const loadedSetlists: Setlist[] = [];
      snapshot.forEach((d) => {
        if (!deletedSetlistIds.has(d.id)) {
          loadedSetlists.push({ id: d.id, ...d.data(), groupId: targetGroupId } as Setlist);
        }
      });
      setlistsRef.current = loadedSetlists;
      setSetlists(loadedSetlists);

      const pendingSetlistLink = pendingDeepLinkRef.current;
      const inviteMatchesForSetlist = !pendingSetlistLink?.inviteCode || currentGroup?.inviteCode?.toUpperCase() === pendingSetlistLink.inviteCode.toUpperCase();
      if (pendingSetlistLink && pendingSetlistLink.setlistId && inviteMatchesForSetlist) {
        const deepLinkedSetlist = loadedSetlists.find(st => st.id === pendingSetlistLink.setlistId);
        if (deepLinkedSetlist) {
          pendingDeepLinkRef.current = null;
          setSelectedSetlist(deepLinkedSetlist);
          setDeepLinkSetlistId(deepLinkedSetlist.id);
          setActiveTabState('setlists');
        } else if (!snapshot.metadata.fromCache) {
          pendingDeepLinkRef.current = null;
        }
      } else {
        setSelectedSetlist(prev => prev ? (loadedSetlists.find(st => st.id === prev.id) || null) : null);
      }

      if (!snapshot.metadata.fromCache) {
        setlistsServerReadyGroupRef.current = targetGroupId;
        reconcileOrphanedSetlistSongs();
      }
    }, (error) => {
      if (error?.code !== 'unavailable') {
        console.warn('Firestore library setlists snapshot notice:', error.message);
      }
    });

    // 3. Sync Setlist History from /groups/{groupId}/setlist_history (members only)
    let unsubHistory: (() => void) | null = null;
    if (!isGuest) {
      unsubHistory = onSnapshot(collection(db, 'groups', targetGroupId, 'setlist_history'), (snapshot) => {
        const deletedHistoryIds = getDeletedHistoryIds();
        const loadedHistory: SetlistHistoryRecord[] = [];
        snapshot.forEach((d) => {
          if (!deletedHistoryIds.has(d.id)) {
            loadedHistory.push({ id: d.id, ...d.data(), groupId: targetGroupId } as SetlistHistoryRecord);
          }
        });
        setSetlistHistory(loadedHistory.sort((a, b) => b.date.localeCompare(a.date)));
      }, (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('Firestore library setlist history snapshot notice:', error.message);
        }
      });
    } else {
      setSetlistHistory([]);
    }

    // 4. Sync Custom Audio Pads from /groups/{groupId}/custom_pads
    const unsubPads = onSnapshot(collection(db, 'groups', targetGroupId, 'custom_pads'), (snapshot) => {
      const loadedPads: CustomPad[] = [];
      snapshot.forEach((d) => {
        const pad = { id: d.id, ...d.data(), groupId: targetGroupId } as CustomPad;
        loadedPads.push(pad);
        if (!isGuest) {
          saveCustomPadToIndexedDB(pad).catch(() => {});
        }
      });
      setCustomPads(loadedPads);
    }, (error) => {
      if (error?.code !== 'unavailable') {
        console.warn('Firestore custom pads snapshot notice:', error.message);
      }
      if (!isGuest) {
        getAllCustomPadsFromIndexedDB(targetGroupId).then(cached => {
          if (cached && cached.length > 0) {
            setCustomPads(cached);
          }
        }).catch(() => {});
      }
    });

    // 5. Sync Planning collections (members only)
    let unsubPlanningTeams: (() => void) | null = null;
    let unsubPlanningAvail: (() => void) | null = null;
    let unsubPlanningAssign: (() => void) | null = null;

    if (!isGuest && currentUser?.uid) {
      unsubPlanningTeams = onSnapshot(collection(db, 'groups', targetGroupId, 'planning_teams'), (snapshot) => {
        const list: PlanningTeam[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data(), groupId: targetGroupId } as PlanningTeam);
        });
        setPlanningTeams(list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr')));
      }, (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('Firestore planning teams snapshot notice:', error.message);
        }
      });

      unsubPlanningAvail = onSnapshot(collection(db, 'groups', targetGroupId, 'planning_availabilities'), (snapshot) => {
        const list: PlanningAvailability[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data(), groupId: targetGroupId } as PlanningAvailability);
        });
        setPlanningAvailabilities(list);
      }, (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('Firestore planning availabilities snapshot notice:', error.message);
        }
      });

      unsubPlanningAssign = onSnapshot(collection(db, 'groups', targetGroupId, 'planning_assignments'), (snapshot) => {
        const list: PlanningAssignment[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data(), groupId: targetGroupId } as PlanningAssignment);
        });
        setPlanningAssignments(list.sort((a, b) => (a.date || '').localeCompare(b.date || '')));
      }, (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('Firestore planning assignments snapshot notice:', error.message);
        }
      });
    } else {
      setPlanningTeams([]);
      setPlanningAvailabilities([]);
      setPlanningAssignments([]);
    }

    return () => {
      unsubSongs();
      unsubSetlists();
      if (unsubHistory) unsubHistory();
      unsubPads();
      if (unsubPlanningTeams) unsubPlanningTeams();
      if (unsubPlanningAvail) unsubPlanningAvail();
      if (unsubPlanningAssign) unsubPlanningAssign();
    };
  }, [currentGroup?.id, currentUser?.uid, isGuest]);

  // Synchronisation en temps réel des bibliothèques dont l'utilisateur connecté est membre
  useEffect(() => {
    if (!currentUser?.uid || !auth.currentUser || isGuest) {
      return;
    }

    const qGroups = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      const loadedGroups: Group[] = [];
      snapshot.forEach((d) => {
        loadedGroups.push({ id: d.id, ...d.data() } as Group);
      });
      setAllGroups(loadedGroups);

      setCurrentGroup(prev => {
        const targetId = prev?.id || (typeof window !== 'undefined' ? localStorage.getItem('songbook_current_group_id') : null);
        const match = targetId ? loadedGroups.find(g => g.id === targetId) : undefined;
        if (match) {
          return match;
        }
        return loadedGroups[0] || null;
      });
    }, (err) => {
      if (err?.code !== 'unavailable') {
        console.warn('Groups sync error:', err.message);
      }
    });

    return () => unsubGroups();
  }, [currentUser?.uid, isGuest]);

  // Song Actions (scopées dans /groups/{groupId}/songs)
  const createSong = useCallback(async (songData: Omit<Song, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>) => {
    if (blockIfGuest()) return '';
    const groupId = currentGroup?.id;
    if (!groupId) {
      showNotification('Aucune bibliothèque active sélectionnée', 'error');
      return '';
    }
    const newId = 'song_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const safeTitle = (typeof songData.title === 'string' ? songData.title : '').trim().slice(0, 240) || 'Nouveau Chant';
    const safeChordPro = (typeof songData.contentChordPro === 'string' ? songData.contentChordPro : '').slice(0, 100000);
    const resolvedLanguage = ((typeof songData.language === 'string' && songData.language.trim())
      ? songData.language
      : detectSongLanguage(safeTitle, safeChordPro || (typeof songData.content === 'string' ? songData.content : undefined))).slice(0, 40);

    const toFiniteInt = (val: unknown): number | undefined => {
      if (typeof val === 'number' && Number.isFinite(val)) return Math.round(val);
      if (typeof val === 'string' && val.trim() !== '') {
        const parsed = Number(val);
        if (Number.isFinite(parsed)) return Math.round(parsed);
      }
      return undefined;
    };
    const toSafeStr = (val: unknown, maxLen: number): string | undefined =>
      typeof val === 'string' ? val.slice(0, maxLen) : undefined;
    const toSafeStrList = (val: unknown, maxItems: number): string[] | undefined =>
      Array.isArray(val) ? val.filter((x): x is string => typeof x === 'string').slice(0, maxItems) : undefined;

    const resolvedBpm = toFiniteInt(songData.bpm) ?? toFiniteInt(songData.tempo);
    const resolvedTimeSig = toSafeStr(songData.timeSignature, 20);
    const explicitDuration = toSafeStr(songData.duration, 32);
    const hasExplicitCustomDuration = Boolean(
      explicitDuration &&
      explicitDuration.trim().toLowerCase() !== 'auto' &&
      songData.durationMode !== 'auto'
    );
    const resolvedDurationMode: 'auto' | 'custom' = hasExplicitCustomDuration ? 'custom' : 'auto';
    const resolvedDuration = hasExplicitCustomDuration
      ? explicitDuration
      : calculateSongAutoDuration(safeChordPro, resolvedBpm || 100, resolvedTimeSig || '4/4').formatted;
    const resolvedYoutubeUrl = toSafeStr(songData.youtubeUrl, 1000);

    const newSong: Song = stripUndefined({
      id: newId,
      groupId,
      title: safeTitle,
      artist: toSafeStr(songData.artist, 200),
      album: toSafeStr(songData.album, 200),
      key: toSafeStr(songData.key, 24),
      tempo: toFiniteInt(songData.tempo),
      bpm: toFiniteInt((songData as any).bpm),
      timeSignature: resolvedTimeSig,
      duration: resolvedDuration,
      durationMode: resolvedDurationMode,
      ccli: toSafeStr(songData.ccli, 64),
      copyright: toSafeStr(songData.copyright, 500),
      youtubeUrl: resolvedYoutubeUrl,
      audioUrl: toSafeStr(songData.audioUrl, 1000),
      spotifyUrl: toSafeStr(songData.spotifyUrl, 1000),
      contentChordPro: safeChordPro,
      content: toSafeStr(songData.content, 100000),
      folderId: songData.folderId === null ? null : toSafeStr(songData.folderId, 128),
      capo: toFiniteInt(songData.capo),
      tags: toSafeStrList(songData.tags, 50),
      language: resolvedLanguage,
      linkedSongIds: toSafeStrList(songData.linkedSongIds, 50),
      notes: toSafeStr(songData.notes, 5000),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    songsRef.current = [newSong, ...songsRef.current.filter(s => s.id !== newId)];
    setSongs(prev => {
      const filtered = prev.filter(s => s.id !== newId);
      return [newSong, ...filtered];
    });
    setSelectedSong(newSong);

    showNotification('Enregistré');

    try {
      const docRef = doc(db, 'groups', groupId, 'songs', newId);
      await setDoc(docRef, stripUndefined({ ...newSong, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
      if (resolvedDurationMode === 'auto' && resolvedYoutubeUrl && getYouTubeVideoId(resolvedYoutubeUrl)) {
        fetchYouTubeDuration(resolvedYoutubeUrl).then((ytDur) => {
          if (!ytDur?.formatted || ytDur.formatted === resolvedDuration) return;
          const nextUpdatedAt = new Date().toISOString();
          songsRef.current = songsRef.current.map(s => s.id === newId ? { ...s, duration: ytDur.formatted, durationMode: 'auto', updatedAt: nextUpdatedAt } : s);
          setSongs(prev => prev.map(s => s.id === newId ? { ...s, duration: ytDur.formatted, durationMode: 'auto', updatedAt: nextUpdatedAt } : s));
          setSelectedSong(prev => (prev && prev.id === newId) ? { ...prev, duration: ytDur.formatted, durationMode: 'auto', updatedAt: nextUpdatedAt } : prev);
          updateDoc(docRef, { duration: ytDur.formatted, durationMode: 'auto', updatedAt: serverTimestamp() }).catch(() => {});
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Saved song locally (Firestore offline/error):', e);
    }

    return newId;
  }, [currentGroup?.id, showNotification]);

  const importSong = useCallback(async (songData: Omit<Song, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>) => {
    return await createSong(songData);
  }, [createSong]);

  const updateSong = useCallback(async (id: string, songData: Partial<Song>) => {
    if (blockIfGuest()) return;
    const existing = songsRef.current.find(s => s.id === id) || songs.find(s => s.id === id);
    const groupId = existing?.groupId || currentGroup?.id;
    if (!groupId) return;

    const resolvedData: Partial<Song> = { ...songData };
    if ('language' in songData && (!songData.language || !songData.language.trim())) {
      const titleToUse = songData.title || existing?.title;
      const contentToUse = songData.contentChordPro || songData.content || existing?.contentChordPro || existing?.content;
      resolvedData.language = detectSongLanguage(titleToUse, contentToUse) || '';
    }

    const prevSongs = songsRef.current;
    const nextUpdatedAt = new Date().toISOString();
    songsRef.current = prevSongs.map(s => s.id === id ? { ...s, ...resolvedData, updatedAt: nextUpdatedAt } : s);
    setSongs(prev => prev.map(s => s.id === id ? { ...s, ...resolvedData, updatedAt: nextUpdatedAt } : s));
    setSelectedSong(prev => (prev && prev.id === id) ? { ...prev, ...resolvedData, updatedAt: nextUpdatedAt } : prev);

    const docRef = doc(db, 'groups', groupId, 'songs', id);
    const baseRepairFields: Partial<Song> = {
      id,
      groupId,
      ...(existing && !existing.title && !resolvedData.title ? { title: 'Nouveau Chant' } : {}),
      ...(existing && typeof existing.contentChordPro !== 'string' && typeof resolvedData.contentChordPro !== 'string'
        ? { contentChordPro: existing.content || '' }
        : {})
    };

    try {
      await updateDoc(docRef, stripUndefined({ ...resolvedData, ...baseRepairFields, updatedAt: serverTimestamp() }));
      showNotification('Enregistré');
    } catch (e: any) {
      if (e?.code === 'not-found' && existing) {
        try {
          await setDoc(docRef, stripUndefined({
            ...existing,
            ...resolvedData,
            id,
            groupId,
            title: resolvedData.title || existing.title || 'Nouveau Chant',
            contentChordPro: resolvedData.contentChordPro ?? existing.contentChordPro ?? existing.content ?? '',
            updatedAt: serverTimestamp()
          }), { merge: true });
          showNotification('Enregistré');
          return;
        } catch (fallbackErr: any) {
          if (fallbackErr?.code === 'unavailable') {
            showNotification('Enregistré');
            return;
          }
          songsRef.current = prevSongs;
          setSongs(prevSongs);
          if (existing) {
            setSelectedSong(prev => (prev && prev.id === id) ? existing : prev);
          }
          showNotification("Erreur lors de l'enregistrement", 'error');
          handleFirestoreError(fallbackErr, OperationType.UPDATE, `groups/${groupId}/songs/${id}`);
        }
      }
      if (e?.code === 'unavailable') {
        showNotification('Enregistré');
        return;
      }
      songsRef.current = prevSongs;
      setSongs(prevSongs);
      if (existing) {
        setSelectedSong(prev => (prev && prev.id === id) ? existing : prev);
      }
      showNotification("Erreur lors de l'enregistrement", 'error');
      handleFirestoreError(e, OperationType.UPDATE, `groups/${groupId}/songs/${id}`);
    }
  }, [songs, currentGroup?.id, showNotification]);

  const autoDetectSongLanguages = useCallback(async (songIds?: string[]): Promise<number> => {
    if (blockIfGuest()) return 0;
    const targetSongs = songIds && songIds.length > 0
      ? songs.filter(s => songIds.includes(s.id))
      : songs;

    const updates: { id: string; groupId: string; language: string }[] = [];
    for (const s of targetSongs) {
      const gid = s.groupId || currentGroup?.id;
      if (!gid) continue;
      const detected = detectSongLanguage(s.title, s.contentChordPro || s.content);
      if (detected && detected !== s.language) {
        updates.push({ id: s.id, groupId: gid, language: detected });
      }
    }

    if (updates.length === 0) return 0;

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

    for (const u of updates) {
      try {
        const docRef = doc(db, 'groups', u.groupId, 'songs', u.id);
        await updateDoc(docRef, { language: u.language, updatedAt: serverTimestamp() });
      } catch (e) {
        console.warn('Updated song language locally (Firestore offline/error):', e);
      }
    }

    return updates.length;
  }, [songs, currentGroup?.id, selectedSong, showNotification]);

  const deleteSong = useCallback(async (id: string) => {
    if (blockIfGuest()) return;
    const groupId = songsRef.current.find(s => s.id === id)?.groupId || songs.find(s => s.id === id)?.groupId || currentGroup?.id;

    try {
      const currentDeleted = new Set<string>(JSON.parse(localStorage.getItem('songbook_deleted_song_ids') || '[]'));
      currentDeleted.add(id);
      localStorage.setItem('songbook_deleted_song_ids', JSON.stringify(Array.from(currentDeleted)));
    } catch (e) {}

    songsRef.current = songsRef.current.filter(s => s.id !== id);
    setSongs(prev => prev.filter(s => s.id !== id));
    if (selectedSong?.id === id) {
      setSelectedSong(songsRef.current[0] || null);
    }

    const affectedSetlists = setlistsRef.current.filter(st => st.songIds.includes(id));
    const nextSetlists = setlistsRef.current.map(st =>
      st.songIds.includes(id)
        ? { ...st, songIds: st.songIds.filter(sId => sId !== id) }
        : st
    );
    setlistsRef.current = nextSetlists;
    setSetlists(nextSetlists);
    setSelectedSetlist(prev =>
      prev && prev.songIds.includes(id)
        ? { ...prev, songIds: prev.songIds.filter(sId => sId !== id) }
        : prev
    );

    showNotification({ title: 'Supprimé', type: 'info' });

    deleteSongFromIndexedDB(id).catch(e => console.warn('Suppression chant IndexedDB note:', e));

    if (groupId) {
      try {
        await deleteDoc(doc(db, 'groups', groupId, 'songs', id));
      } catch (e) {
        console.warn('Deleted song locally:', e);
      }

      for (const st of affectedSetlists) {
        const cleanedSongIds = st.songIds.filter(sId => sId !== id);
        try {
          await updateDoc(doc(db, 'groups', st.groupId || groupId, 'setlists', st.id), { songIds: cleanedSongIds });
        } catch (e) {
          console.warn('Cleaned deleted song from setlist locally:', st.id, e);
        }
      }
    }
  }, [selectedSong?.id, songs, currentGroup?.id, showNotification]);

  const linkSongs = useCallback(async (songId1: string, songId2: string) => {
    if (blockIfGuest()) return;
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
      const groupId = song1?.groupId || song2?.groupId || currentGroup?.id;
      if (song1 && song2 && groupId) {
        const group1 = new Set<string>([songId1, ...(song1.linkedSongIds || [])]);
        const group2 = new Set<string>([songId2, ...(song2.linkedSongIds || [])]);
        const allMerged = Array.from(new Set([...group1, ...group2]));

        for (const sId of allMerged) {
          const linksForSong = allMerged.filter(id => id !== sId);
          await updateDoc(doc(db, 'groups', groupId, 'songs', sId), { linkedSongIds: linksForSong, updatedAt: serverTimestamp() });
        }
      }
    } catch (e) {
      console.warn('Updated links locally:', e);
    }

    showNotification('Enregistré');
  }, [songs, currentGroup?.id, showNotification]);

  const unlinkSongs = useCallback(async (songId1: string, songId2: string) => {
    if (blockIfGuest()) return;
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
      const song2 = songs.find(s => s.id === songId2);
      const groupId = song1?.groupId || song2?.groupId || currentGroup?.id;
      if (groupId) {
        const peersOf1 = new Set<string>([songId1, ...(song1?.linkedSongIds || [])]);

        if (song1) {
          const newLinks1 = (song1.linkedSongIds || []).filter(id => id !== songId2);
          await updateDoc(doc(db, 'groups', groupId, 'songs', songId1), { linkedSongIds: newLinks1, updatedAt: serverTimestamp() });
        }

        if (song2) {
          const newLinks2 = (song2.linkedSongIds || []).filter(id => !peersOf1.has(id));
          await updateDoc(doc(db, 'groups', groupId, 'songs', songId2), { linkedSongIds: newLinks2, updatedAt: serverTimestamp() });
        }

        for (const peerId of peersOf1) {
          if (peerId !== songId1 && peerId !== songId2) {
            const peer = songs.find(s => s.id === peerId);
            if (peer && (peer.linkedSongIds || []).includes(songId2)) {
              const peerLinks = (peer.linkedSongIds || []).filter(id => id !== songId2);
              await updateDoc(doc(db, 'groups', groupId, 'songs', peerId), { linkedSongIds: peerLinks, updatedAt: serverTimestamp() });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Unlinked songs locally:', e);
    }

    showNotification({ title: 'Dissocié', type: 'info' });
  }, [songs, currentGroup?.id, showNotification]);

  const createLanguageVersion = useCallback(async (sourceSongId: string, targetLanguage: string, customTitle?: string) => {
    if (blockIfGuest()) return '';
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

    await linkSongs(sourceSongId, newId);
    if (sourceSong.linkedSongIds && sourceSong.linkedSongIds.length > 0) {
      for (const linkedId of sourceSong.linkedSongIds) {
        await linkSongs(linkedId, newId);
      }
    }

    showNotification('Enregistré');

    return newId;
  }, [songs, createSong, linkSongs, showNotification]);

  // Setlist Actions (scopées dans /groups/{groupId}/setlists)
  const createSetlist = useCallback(async (setlistData: Omit<Setlist, 'id' | 'groupId' | 'createdAt'>) => {
    if (blockIfGuest()) return '';
    const groupId = currentGroup?.id;
    if (!groupId) {
      showNotification('Aucune bibliothèque active sélectionnée', 'error');
      return '';
    }
    const newId = 'setlist_' + Date.now();
    const newSetlist: Setlist = {
      ...setlistData,
      id: newId,
      groupId,
      createdAt: new Date().toISOString()
    };

    setlistsRef.current = [newSetlist, ...setlistsRef.current.filter(st => st.id !== newId)];
    setSetlists(prev => [newSetlist, ...prev]);
    setSelectedSetlist(newSetlist);

    showNotification('Enregistré');

    try {
      await setDoc(doc(db, 'groups', groupId, 'setlists', newId), stripUndefined({ ...newSetlist, createdAt: serverTimestamp() }));
    } catch (e) {
      console.warn('Saved setlist locally:', e);
    }

    return newId;
  }, [currentGroup?.id, showNotification]);

  const updateSetlist = useCallback(async (id: string, setlistData: Partial<Setlist>) => {
    if (blockIfGuest()) return;
    const groupId = setlistsRef.current.find(st => st.id === id)?.groupId || setlists.find(st => st.id === id)?.groupId || currentGroup?.id;
    if (!groupId) return;

    const nextSetlists = setlistsRef.current.map(st => st.id === id ? { ...st, ...setlistData } : st);
    setlistsRef.current = nextSetlists;
    setSetlists(prev => prev.map(st => st.id === id ? { ...st, ...setlistData } : st));
    setSelectedSetlist(prev => prev?.id === id ? { ...prev, ...setlistData } : prev);

    showNotification('Enregistré');

    try {
      const docRef = doc(db, 'groups', groupId, 'setlists', id);
      await updateDoc(docRef, stripUndefined(setlistData));
    } catch (e) {
      console.warn('Updated setlist locally:', e);
    }
  }, [setlists, currentGroup?.id, showNotification]);

  const deleteSetlist = useCallback(async (id: string) => {
    if (blockIfGuest()) return;
    const groupId = setlists.find(st => st.id === id)?.groupId || currentGroup?.id;

    try {
      const currentDeleted = new Set<string>(JSON.parse(localStorage.getItem('songbook_deleted_setlist_ids') || '[]'));
      currentDeleted.add(id);
      localStorage.setItem('songbook_deleted_setlist_ids', JSON.stringify(Array.from(currentDeleted)));
    } catch (e) {}

    setlistsRef.current = setlistsRef.current.filter(st => st.id !== id);
    setSetlists(prev => prev.filter(st => st.id !== id));
    if (selectedSetlist?.id === id) {
      setSelectedSetlist(null);
    }

    showNotification({ title: 'Supprimé', type: 'info' });

    deleteSetlistFromIndexedDB(id).catch(e => console.warn('Suppression setlist IndexedDB note:', e));

    if (groupId) {
      try {
        await deleteDoc(doc(db, 'groups', groupId, 'setlists', id));
      } catch (e) {
        console.warn('Deleted setlist locally:', e);
      }
    }
  }, [setlists, currentGroup?.id, selectedSetlist?.id, showNotification]);

  const updateSetlistSongOverride = useCallback(async (setlistId: string, songId: string, override: Partial<SetlistSongOverride>) => {
    if (blockIfGuest()) return;
    const groupId = setlists.find(st => st.id === setlistId)?.groupId || currentGroup?.id;
    if (!groupId) return;

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
      const docRef = doc(db, 'groups', groupId, 'setlists', setlistId);
      await updateDoc(docRef, { songOverrides: updatedOverrides });
    } catch (e) {
      console.warn('Updated setlist song override locally:', e);
    }
  }, [setlists, currentGroup?.id, selectedSetlist?.id, showNotification]);

  const removeSetlistSongOverride = useCallback(async (setlistId: string, songId: string) => {
    if (blockIfGuest()) return;
    const groupId = setlists.find(st => st.id === setlistId)?.groupId || currentGroup?.id;
    if (!groupId) return;

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
      const docRef = doc(db, 'groups', groupId, 'setlists', setlistId);
      await updateDoc(docRef, { songOverrides: updatedOverrides });
    } catch (e) {
      console.warn('Removed setlist song override locally:', e);
    }
  }, [setlists, currentGroup?.id, selectedSetlist?.id, showNotification]);

  // Setlist History Actions (scopées dans /groups/{groupId}/setlist_history)
  const recordSetlistHistory = useCallback(async (recordData: Omit<SetlistHistoryRecord, 'id' | 'groupId' | 'createdAt'>) => {
    if (blockIfGuest()) return '';
    const groupId = currentGroup?.id;
    if (!groupId) return '';
    const newId = 'history_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newRecord: SetlistHistoryRecord = {
      ...recordData,
      id: newId,
      groupId,
      createdAt: new Date().toISOString()
    };

    setSetlistHistory(prev => [newRecord, ...prev]);

    try {
      await setDoc(doc(db, 'groups', groupId, 'setlist_history', newId), stripUndefined({ ...newRecord, createdAt: serverTimestamp() }));
    } catch (e) {
      console.warn('Saved setlist history locally:', e);
    }

    return newId;
  }, [currentGroup?.id]);

  const updateSetlistHistory = useCallback(async (id: string, recordData: Partial<SetlistHistoryRecord>) => {
    if (blockIfGuest()) return;
    const groupId = setlistHistory.find(h => h.id === id)?.groupId || currentGroup?.id;
    if (!groupId) return;

    setSetlistHistory(prev => prev.map(item => item.id === id ? { ...item, ...recordData } : item));

    try {
      const docRef = doc(db, 'groups', groupId, 'setlist_history', id);
      await updateDoc(docRef, stripUndefined(recordData));
    } catch (e) {
      console.warn('Updated setlist history locally:', e);
    }
  }, [setlistHistory, currentGroup?.id]);

  const deleteSetlistHistory = useCallback(async (id: string) => {
    if (blockIfGuest()) return;
    const groupId = setlistHistory.find(h => h.id === id)?.groupId || currentGroup?.id;

    try {
      const currentDeleted = new Set<string>(JSON.parse(localStorage.getItem('songbook_deleted_history_ids') || '[]'));
      currentDeleted.add(id);
      localStorage.setItem('songbook_deleted_history_ids', JSON.stringify(Array.from(currentDeleted)));
    } catch (e) {}

    setSetlistHistory(prev => prev.filter(item => item.id !== id));

    if (groupId) {
      try {
        await deleteDoc(doc(db, 'groups', groupId, 'setlist_history', id));
      } catch (e) {
        console.warn('Deleted setlist history locally:', e);
      }
    }
  }, [setlistHistory, currentGroup?.id]);

  // Gestion de planning Actions (scopées dans /groups/{groupId}/planning_*)
  const createPlanningTeam = useCallback(async (
    data: Omit<PlanningTeam, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    if (blockIfGuest()) return '';
    const groupId = currentGroup?.id;
    if (!groupId) return '';
    const newId = 'team_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const cleanName = (data.name || '').trim().slice(0, 120) || 'Équipe';
    const cleanDesc = data.description ? data.description.trim().slice(0, 500) : undefined;
    const cleanColor = data.color ? data.color.trim().slice(0, 32) : 'blue';
    const cleanMembers = sanitizePlanningTeamMembers(data.members || []);

    const newTeam: PlanningTeam = stripUndefined({
      id: newId,
      groupId,
      name: cleanName,
      description: cleanDesc,
      color: cleanColor,
      members: cleanMembers,
      createdBy: currentUser?.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setPlanningTeams(prev => [...prev, newTeam].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
    showNotification('Groupe enregistré');

    try {
      await setDoc(doc(db, 'groups', groupId, 'planning_teams', newId), stripUndefined({
        ...newTeam,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }));
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.CREATE, `groups/${groupId}/planning_teams/${newId}`);
      }
      console.warn('Saved planning team locally:', e);
    }

    return newId;
  }, [blockIfGuest, currentGroup?.id, currentUser?.uid, showNotification]);

  const updatePlanningTeam = useCallback(async (
    id: string,
    data: Partial<Pick<PlanningTeam, 'name' | 'description' | 'color' | 'members'>>
  ): Promise<void> => {
    if (blockIfGuest()) return;
    const groupId = planningTeams.find(t => t.id === id)?.groupId || currentGroup?.id;
    if (!groupId) return;

    const patch: Partial<PlanningTeam> = stripUndefined({
      name: data.name !== undefined ? (data.name.trim().slice(0, 120) || 'Équipe') : undefined,
      description: data.description !== undefined ? data.description.trim().slice(0, 500) : undefined,
      color: data.color !== undefined ? data.color.trim().slice(0, 32) : undefined,
      members: data.members !== undefined ? sanitizePlanningTeamMembers(data.members) : undefined,
      updatedAt: new Date().toISOString()
    });

    setPlanningTeams(prev =>
      prev.map(t => (t.id === id ? { ...t, ...patch } : t)).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    );
    showNotification('Groupe mis à jour');

    try {
      await updateDoc(doc(db, 'groups', groupId, 'planning_teams', id), stripUndefined({
        ...patch,
        updatedAt: serverTimestamp()
      }));
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.UPDATE, `groups/${groupId}/planning_teams/${id}`);
      }
      console.warn('Updated planning team locally:', e);
    }
  }, [blockIfGuest, planningTeams, currentGroup?.id, showNotification]);

  const deletePlanningTeam = useCallback(async (id: string): Promise<void> => {
    if (blockIfGuest()) return;
    const groupId = planningTeams.find(t => t.id === id)?.groupId || currentGroup?.id;
    setPlanningTeams(prev => prev.filter(t => t.id !== id));
    showNotification({ title: 'Groupe supprimé', type: 'info' });
    if (!groupId) return;

    try {
      await deleteDoc(doc(db, 'groups', groupId, 'planning_teams', id));
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.DELETE, `groups/${groupId}/planning_teams/${id}`);
      }
      console.warn('Deleted planning team locally:', e);
    }
  }, [blockIfGuest, planningTeams, currentGroup?.id, showNotification]);

  const setPlanningAvailability = useCallback(async (data: {
    date: string;
    status: PlanningAvailabilityStatus;
    preferredPoles?: PlanningPole[];
    note?: string;
    targetUid?: string;
    targetDisplayName?: string;
  }): Promise<void> => {
    if (blockIfGuest()) return;
    const groupId = currentGroup?.id;
    const uid = data.targetUid || currentUser?.uid;
    if (!groupId || !uid || !isValidIsoDate(data.date)) return;

    const cleanDate = data.date.trim().slice(0, 10);
    const docId = makeAvailabilityDocId(cleanDate, uid);
    const displayName = (
      data.targetDisplayName ||
      (uid === currentUser?.uid ? currentUser.displayName : allUsers.find(u => u.uid === uid)?.displayName) ||
      'Musicien'
    ).trim().slice(0, 120);
    const cleanPoles = Array.isArray(data.preferredPoles)
      ? Array.from(new Set(data.preferredPoles.filter((p): p is PlanningPole => p === 'musique' || p === 'chant' || p === 'regie'))).slice(0, 5)
      : undefined;
    const cleanNote = data.note !== undefined ? data.note.trim().slice(0, 300) : undefined;

    const payload: PlanningAvailability = stripUndefined({
      id: docId,
      groupId,
      date: cleanDate,
      uid,
      displayName,
      status: data.status,
      preferredPoles: cleanPoles,
      note: cleanNote,
      updatedAt: new Date().toISOString()
    });

    setPlanningAvailabilities(prev => [...prev.filter(a => a.id !== docId), payload]);
    showNotification('Disponibilité enregistrée');

    const docRef = doc(db, 'groups', groupId, 'planning_availabilities', docId);
    const exists = planningAvailabilities.some(a => a.id === docId);

    try {
      if (exists) {
        await updateDoc(docRef, stripUndefined({
          status: data.status,
          displayName,
          preferredPoles: cleanPoles ?? null,
          note: cleanNote ?? null,
          updatedAt: serverTimestamp()
        }));
      } else {
        await setDoc(docRef, stripUndefined({
          ...payload,
          updatedAt: serverTimestamp()
        }));
      }
    } catch (e: any) {
      if (e?.code === 'not-found') {
        try {
          await setDoc(docRef, stripUndefined({
            ...payload,
            updatedAt: serverTimestamp()
          }));
        } catch (err: any) {
          if (err?.code === 'permission-denied') {
            handleFirestoreError(err, OperationType.WRITE, `groups/${groupId}/planning_availabilities/${docId}`);
          }
        }
      } else if (e?.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.WRITE, `groups/${groupId}/planning_availabilities/${docId}`);
      } else {
        console.warn('Saved planning availability locally:', e);
      }
    }
  }, [blockIfGuest, currentGroup?.id, currentUser?.uid, currentUser?.displayName, allUsers, planningAvailabilities, showNotification]);

  const deletePlanningAvailability = useCallback(async (id: string): Promise<void> => {
    if (blockIfGuest()) return;
    const groupId = planningAvailabilities.find(a => a.id === id)?.groupId || currentGroup?.id;
    setPlanningAvailabilities(prev => prev.filter(a => a.id !== id));
    showNotification({ title: 'Disponibilité effacée', type: 'info' });
    if (!groupId) return;

    try {
      await deleteDoc(doc(db, 'groups', groupId, 'planning_availabilities', id));
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.DELETE, `groups/${groupId}/planning_availabilities/${id}`);
      }
      console.warn('Deleted planning availability locally:', e);
    }
  }, [blockIfGuest, planningAvailabilities, currentGroup?.id, showNotification]);

  const savePlanningAssignment = useCallback(async (
    data: Omit<PlanningAssignment, 'groupId' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<string> => {
    if (blockIfGuest()) return '';
    const groupId = currentGroup?.id;
    if (!groupId) return '';

    const resolvedId = (data.id && data.id.trim())
      || (data.setlistId && data.setlistId.trim())
      || ('plan_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6));
    const safeDate = isValidIsoDate(data.date) ? data.date.trim().slice(0, 10) : getTodayIsoDate();
    const safeTitle = (data.title || data.setlistName || 'Événement').trim().slice(0, 200) || 'Événement';
    const cleanSlots = sanitizePlanningSlots(data.slots || []);

    const existing = planningAssignments.find(a => a.id === resolvedId);
    const payload: PlanningAssignment = stripUndefined({
      id: resolvedId,
      groupId,
      setlistId: data.setlistId ?? null,
      setlistName: data.setlistName ? data.setlistName.trim().slice(0, 200) : null,
      date: safeDate,
      title: safeTitle,
      callTime: data.callTime !== undefined ? (data.callTime ? data.callTime.trim().slice(0, 20) : null) : (existing?.callTime ?? null),
      serviceTime: data.serviceTime !== undefined ? (data.serviceTime ? data.serviceTime.trim().slice(0, 20) : null) : (existing?.serviceTime ?? null),
      location: data.location !== undefined ? (data.location ? data.location.trim().slice(0, 200) : null) : (existing?.location ?? null),
      teamPresetId: data.teamPresetId !== undefined ? data.teamPresetId : (existing?.teamPresetId ?? null),
      teamPresetName: data.teamPresetName !== undefined ? (data.teamPresetName ? data.teamPresetName.trim().slice(0, 120) : null) : (existing?.teamPresetName ?? null),
      slots: cleanSlots,
      notes: data.notes !== undefined ? (data.notes ? data.notes.trim().slice(0, 5000) : null) : (existing?.notes ?? null),
      updatedBy: currentUser?.uid || null,
      updatedByName: currentUser?.displayName ? currentUser.displayName.slice(0, 120) : null,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }) as PlanningAssignment;

    setPlanningAssignments(prev =>
      [...prev.filter(a => a.id !== resolvedId), payload].sort((a, b) => a.date.localeCompare(b.date))
    );
    showNotification('Planning enregistré');

    const docRef = doc(db, 'groups', groupId, 'planning_assignments', resolvedId);
    try {
      if (existing) {
        const { id: _id, groupId: _gid, createdAt: _ca, ...updateFields } = payload;
        await updateDoc(docRef, {
          ...updateFields,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(docRef, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (e: any) {
      if (e?.code === 'not-found') {
        try {
          await setDoc(docRef, {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (err: any) {
          if (err?.code === 'permission-denied') {
            handleFirestoreError(err, OperationType.WRITE, `groups/${groupId}/planning_assignments/${resolvedId}`);
          }
        }
      } else if (e?.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.WRITE, `groups/${groupId}/planning_assignments/${resolvedId}`);
      } else {
        console.warn('Saved planning assignment locally:', e);
      }
    }

    return resolvedId;
  }, [blockIfGuest, currentGroup?.id, currentUser?.uid, currentUser?.displayName, planningAssignments, showNotification]);

  const deletePlanningAssignment = useCallback(async (id: string): Promise<void> => {
    if (blockIfGuest()) return;
    const groupId = planningAssignments.find(a => a.id === id)?.groupId || currentGroup?.id;
    setPlanningAssignments(prev => prev.filter(a => a.id !== id));
    showNotification({ title: 'Planning supprimé', type: 'info' });
    if (!groupId) return;

    try {
      await deleteDoc(doc(db, 'groups', groupId, 'planning_assignments', id));
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.DELETE, `groups/${groupId}/planning_assignments/${id}`);
      }
      console.warn('Deleted planning assignment locally:', e);
    }
  }, [blockIfGuest, planningAssignments, currentGroup?.id, showNotification]);

  const openPlanningForSetlist = useCallback((setlistId: string) => {
    setSelectedPlanningTargetId(setlistId);
    setActiveTab('planning');
  }, [setActiveTab]);

  // Helper permission check pour la bibliothèque ciblée
  const isLibraryAdminForGroup = useCallback((group?: Group | null): boolean => {
    if (!group || !currentUser?.uid) return false;
    return group.ownerId === currentUser.uid || resolveMemberAccesses(group, currentUser.uid).includes('admin');
  }, [currentUser?.uid]);

  // Group / Library Actions (chaque bibliothèque possède sa propre base isolée)
  const createGroup = useCallback(async (name: string, description = '') => {
    if (blockIfGuest()) return '';
    const authUser = auth.currentUser;
    if (!authUser || !currentUser) {
      showNotification('Vous devez être connecté pour créer une bibliothèque', 'error');
      return '';
    }

    const cleanName = name.trim();
    if (!cleanName) return '';

    const newId = 'lib_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const inviteCode = generateInviteCode();
    const uid = authUser.uid;

    const newGroup: Group = {
      id: newId,
      name: cleanName,
      description: description.trim(),
      ownerId: uid,
      members: [uid],
      memberRoles: { [uid]: 'admin' },
      memberAccesses: { [uid]: [...ALL_ACCESSES] },
      inviteCode,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'groups', newId), {
        ...newGroup,
        createdAt: serverTimestamp()
      });
      await setDoc(doc(db, 'library_invites', inviteCode), {
        inviteCode,
        groupId: newId,
        name: cleanName,
        ownerId: uid,
        createdAt: serverTimestamp()
      });
      await setDoc(doc(db, 'groups', newId, 'members', uid), stripUndefined({
        uid,
        displayName: currentUser.displayName || authUser.displayName || 'Musicien',
        photoURL: currentUser.photoURL || authUser.photoURL || undefined,
        role: 'admin' as UserRole,
        accesses: [...ALL_ACCESSES],
        joinedAt: serverTimestamp()
      }));
      await setDoc(doc(db, 'users', uid), {
        currentGroupId: newId,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('Create library Firestore note:', e);
    }

    setSongs([]);
    setSetlists([]);
    setSetlistHistory([]);
    setCustomPads([]);
    setPlanningTeams([]);
    setPlanningAvailabilities([]);
    setPlanningAssignments([]);
    setSelectedPlanningTargetId(null);
    setSelectedSong(null);
    setSelectedSetlist(null);
    setAllGroups(prev => [...prev.filter(g => g.id !== newId), newGroup]);
    setCurrentGroup(newGroup);
    if (typeof window !== 'undefined') {
      localStorage.setItem('songbook_current_group_id', newId);
    }
    setCurrentUser(prev => prev ? { ...prev, currentGroupId: newId } : null);

    showNotification({
      title: 'Bibliothèque créée',
      message: `La bibliothèque « ${cleanName} » est prête (Identifiant : ${inviteCode}).`,
      type: 'success',
      duration: 4000
    });

    return newId;
  }, [currentUser, showNotification]);

  const updateGroup = useCallback(async (groupId: string, data: Partial<Pick<Group, 'name' | 'description' | 'inviteCode'>>): Promise<boolean> => {
    if (blockIfGuest()) return false;
    const targetGroup = allGroups.find(g => g.id === groupId);
    if (!isLibraryAdminForGroup(targetGroup)) {
      showNotification("Seul l'Administrateur de cette bibliothèque peut la modifier", 'error');
      return false;
    }

    const cleanedData: Partial<Pick<Group, 'name' | 'description' | 'inviteCode'>> = { ...data };
    if (typeof cleanedData.inviteCode === 'string') {
      cleanedData.inviteCode = cleanedData.inviteCode.trim().toUpperCase();
    }

    try {
      const docRef = doc(db, 'groups', groupId);
      await updateDoc(docRef, stripUndefined({ ...cleanedData, updatedAt: serverTimestamp() }));

      if (cleanedData.inviteCode && targetGroup && cleanedData.inviteCode !== targetGroup.inviteCode) {
        await setDoc(doc(db, 'library_invites', cleanedData.inviteCode), {
          inviteCode: cleanedData.inviteCode,
          groupId,
          name: cleanedData.name || targetGroup.name,
          ownerId: targetGroup.ownerId,
          createdAt: serverTimestamp()
        });
        if (targetGroup.inviteCode) {
          deleteDoc(doc(db, 'library_invites', targetGroup.inviteCode)).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Updated group locally:', e);
    }

    setAllGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...cleanedData } : g));
    if (currentGroup?.id === groupId) {
      setCurrentGroup(prev => prev ? { ...prev, ...cleanedData } : prev);
    }
    showNotification('Informations de la bibliothèque mises à jour avec succès');
    return true;
  }, [allGroups, isLibraryAdminForGroup, currentGroup?.id, showNotification]);

  const deleteGroup = useCallback(async (
    groupId: string,
    options?: { deleteAssociatedData?: boolean }
  ): Promise<boolean> => {
    if (blockIfGuest()) return false;
    const targetGroup = allGroups.find(g => g.id === groupId);
    if (!targetGroup || targetGroup.ownerId !== currentUser?.uid) {
      showNotification("Seul le propriétaire créateur peut supprimer cette bibliothèque", 'error');
      return false;
    }

    const targetName = targetGroup.name || 'cette bibliothèque';
    const shouldDeleteData = options?.deleteAssociatedData !== false;

    try {
      if (shouldDeleteData) {
        const subcols = ['songs', 'setlists', 'setlist_history', 'custom_pads', 'members'];
        for (const sub of subcols) {
          try {
            const subSnap = await getDocs(collection(db, 'groups', groupId, sub));
            await Promise.all(subSnap.docs.map(d => deleteDoc(d.ref)));
          } catch (cleanupErr) {
            console.warn(`Cleanup ${sub} note:`, cleanupErr);
          }
        }
      } else {
        try {
          const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
          await Promise.all(membersSnap.docs.map(d => deleteDoc(d.ref)));
        } catch {}
      }

      if (targetGroup.inviteCode) {
        await deleteDoc(doc(db, 'library_invites', targetGroup.inviteCode)).catch(() => {});
      }

      await deleteDoc(doc(db, 'groups', groupId));
    } catch (e) {
      console.warn('Delete group Firestore note:', e);
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(`songbook_cached_songs_${groupId}`);
      localStorage.removeItem(`songbook_cached_setlists_${groupId}`);
      localStorage.removeItem(`songbook_cached_setlist_history_${groupId}`);
      localStorage.removeItem(`songbook_cached_custom_pads_${groupId}`);
    }

    const remaining = allGroups.filter(g => g.id !== groupId);
    setAllGroups(remaining);

    if (currentGroup?.id === groupId) {
      const nextGroup = remaining[0] || null;
      setCurrentGroup(nextGroup);
      setSongs([]);
      setSetlists([]);
      setSetlistHistory([]);
      setCustomPads([]);
      setSelectedSong(null);
      setSelectedSetlist(null);

      if (nextGroup) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('songbook_current_group_id', nextGroup.id);
        }
        setCurrentUser(prev => prev ? { ...prev, currentGroupId: nextGroup.id } : null);
        setDoc(doc(db, 'users', currentUser.uid), { currentGroupId: nextGroup.id, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('songbook_current_group_id');
        }
        setDoc(doc(db, 'users', currentUser.uid), { currentGroupId: null, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
        setCurrentUser(null);
        setNeedsLibraryOnboarding(true);
      }
    }

    showNotification({
      title: 'Bibliothèque supprimée',
      message: `La bibliothèque « ${targetName} » et sa base ont été supprimées.`,
      type: 'success'
    });
    return true;
  }, [currentUser?.uid, allGroups, currentGroup?.id, showNotification]);

  const setGroupMembers = useCallback(async (groupId: string, memberUids: string[]): Promise<boolean> => {
    if (blockIfGuest()) return false;
    const targetGroup = allGroups.find(g => g.id === groupId);
    if (!isLibraryAdminForGroup(targetGroup)) {
      showNotification("Seul l'Administrateur de cette bibliothèque peut modifier les membres", 'error');
      return false;
    }

    const withOwner = targetGroup?.ownerId ? [targetGroup.ownerId, ...memberUids] : memberUids;
    const uniqueUids = Array.from(new Set(withOwner));
    const removedUids = (targetGroup?.members || []).filter(id => !uniqueUids.includes(id));

    try {
      await updateDoc(doc(db, 'groups', groupId), { members: uniqueUids, updatedAt: serverTimestamp() });
      for (const uid of uniqueUids) {
        if (!(targetGroup?.members || []).includes(uid)) {
          const profile = allUsers.find(u => u.uid === uid);
          const accessesInGroup = resolveMemberAccesses(targetGroup, uid, profile?.role, profile?.accesses);
          const roleInGroup: UserRole = accessesToLegacyRole(accessesInGroup);
          const validPhoto = profile?.photoURL && profile.photoURL.length <= 2048 ? profile.photoURL : undefined;
          await setDoc(doc(db, 'groups', groupId, 'members', uid), stripUndefined({
            uid,
            displayName: (profile?.displayName || `Membre (${uid.slice(0, 6)})`).slice(0, 120),
            photoURL: validPhoto,
            role: roleInGroup,
            accesses: accessesInGroup,
            joinedAt: serverTimestamp()
          }), { merge: true }).catch(() => {});
        }
      }
      for (const rUid of removedUids) {
        await deleteDoc(doc(db, 'groups', groupId, 'members', rUid)).catch(() => {});
      }
    } catch (e) {
      console.warn('Set group members note:', e);
    }

    setAllGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: uniqueUids } : g));
    if (currentGroup?.id === groupId) {
      setCurrentGroup(prev => prev ? { ...prev, members: uniqueUids } : prev);
    }

    showNotification('Membres de la bibliothèque synchronisés avec succès');
    return true;
  }, [allGroups, allUsers, isLibraryAdminForGroup, currentGroup?.id, showNotification]);

  const assignMembersToGroup = useCallback(async (groupId: string, memberUids: string[]): Promise<boolean> => {
    if (blockIfGuest()) return false;
    const targetGroup = allGroups.find(g => g.id === groupId);
    if (!targetGroup || !isLibraryAdminForGroup(targetGroup)) {
      showNotification("Seul l'Administrateur de cette bibliothèque peut assigner des membres", 'error');
      return false;
    }

    const existingMembers = targetGroup.members || [];
    const mergedMembers = Array.from(new Set([...existingMembers, ...memberUids]));

    try {
      await updateDoc(doc(db, 'groups', groupId), { members: mergedMembers, updatedAt: serverTimestamp() });
      for (const uid of memberUids) {
        if (!existingMembers.includes(uid)) {
          const profile = allUsers.find(u => u.uid === uid);
          const accessesInGroup = resolveMemberAccesses(targetGroup, uid, profile?.role, profile?.accesses);
          const roleInGroup: UserRole = accessesToLegacyRole(accessesInGroup);
          const validPhoto = profile?.photoURL && profile.photoURL.length <= 2048 ? profile.photoURL : undefined;
          await setDoc(doc(db, 'groups', groupId, 'members', uid), stripUndefined({
            uid,
            displayName: (profile?.displayName || `Membre (${uid.slice(0, 6)})`).slice(0, 120),
            photoURL: validPhoto,
            role: roleInGroup,
            accesses: accessesInGroup,
            joinedAt: serverTimestamp()
          }), { merge: true }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Assign members note:', e);
    }

    setAllGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: mergedMembers } : g));
    if (currentGroup?.id === groupId) {
      setCurrentGroup(prev => prev ? { ...prev, members: mergedMembers } : prev);
    }

    showNotification('Membres assignés avec succès à la bibliothèque');
    return true;
  }, [allGroups, allUsers, isLibraryAdminForGroup, currentGroup?.id, showNotification]);

  const removeMemberFromGroup = useCallback(async (groupId: string, memberUid: string): Promise<boolean> => {
    if (blockIfGuest()) return false;
    const targetGroup = allGroups.find(g => g.id === groupId);
    if (!targetGroup || !isLibraryAdminForGroup(targetGroup)) {
      showNotification("Seul l'Administrateur de cette bibliothèque peut retirer des membres", 'error');
      return false;
    }
    if (memberUid === targetGroup.ownerId) {
      showNotification('Impossible de retirer le propriétaire créateur de la bibliothèque', 'warning');
      return false;
    }

    const updatedMembers = (targetGroup.members || []).filter(id => id !== memberUid);

    try {
      await updateDoc(doc(db, 'groups', groupId), { members: updatedMembers, updatedAt: serverTimestamp() });
      await deleteDoc(doc(db, 'groups', groupId, 'members', memberUid)).catch(() => {});
    } catch (e) {
      console.warn('Remove member note:', e);
    }

    setAllGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: updatedMembers } : g));
    if (currentGroup?.id === groupId) {
      setCurrentGroup(prev => prev ? { ...prev, members: updatedMembers } : prev);
    }

    showNotification('Membre retiré de la bibliothèque', 'info');
    return true;
  }, [allGroups, isLibraryAdminForGroup, currentGroup?.id, showNotification]);

  const joinGroup = useCallback(async (inviteCode: string): Promise<boolean> => {
    if (blockIfGuest()) return false;
    const authUser = auth.currentUser;
    if (!authUser || !currentUser) return false;

    const rawInput = inviteCode.trim();
    const upperCode = rawInput.toUpperCase();
    if (!rawInput) return false;

    let matchedGroup: Group | null = null;

    try {
      if (/^[a-zA-Z0-9_\-]+$/.test(upperCode)) {
        // 1. Recherche dans /library_invites/{code}
        const inviteSnap = await getDoc(doc(db, 'library_invites', upperCode));
        if (inviteSnap.exists()) {
          const targetGroupId = inviteSnap.data()?.groupId;
          if (targetGroupId) {
            const groupSnap = await getDoc(doc(db, 'groups', targetGroupId));
            if (groupSnap.exists()) {
              matchedGroup = { id: groupSnap.id, ...groupSnap.data() } as Group;
            }
          }
        }

        // 2. Fallback : recherche directe par ID de bibliothèque /groups/{id}
        if (!matchedGroup) {
          const directSnap = await getDoc(doc(db, 'groups', rawInput));
          if (directSnap.exists()) {
            matchedGroup = { id: directSnap.id, ...directSnap.data() } as Group;
          }
        }
      }

      if (matchedGroup) {
        const uid = authUser.uid;
        const accessesInLib = resolveMemberAccesses(matchedGroup, uid, 'member', ['pupitre']);
        const roleInLib: UserRole = accessesToLegacyRole(accessesInLib);

        if (!matchedGroup.members?.includes(uid)) {
          await updateDoc(doc(db, 'groups', matchedGroup.id), {
            members: arrayUnion(uid)
          });
          matchedGroup = {
            ...matchedGroup,
            members: [...(matchedGroup.members || []), uid]
          };
        }

        await setDoc(doc(db, 'groups', matchedGroup.id, 'members', uid), stripUndefined({
          uid,
          displayName: currentUser.displayName || authUser.displayName || 'Musicien',
          photoURL: currentUser.photoURL || authUser.photoURL || undefined,
          role: roleInLib,
          accesses: accessesInLib,
          joinedAt: serverTimestamp()
        }), { merge: true });

        await setDoc(doc(db, 'users', uid), {
          currentGroupId: matchedGroup.id,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(() => {});

        const finalGroup = matchedGroup;
        setSongs([]);
        setSetlists([]);
        setSetlistHistory([]);
        setCustomPads([]);
        setSelectedSong(null);
        setSelectedSetlist(null);
        setAllGroups(prev => {
          if (prev.find(g => g.id === finalGroup.id)) {
            return prev.map(g => g.id === finalGroup.id ? { ...g, ...finalGroup } : g);
          }
          return [...prev, finalGroup];
        });

        setCurrentGroup(finalGroup);
        if (typeof window !== 'undefined') {
          localStorage.setItem('songbook_current_group_id', finalGroup.id);
        }
        setCurrentUser(prev => prev ? { ...prev, currentGroupId: finalGroup.id } : null);

        showNotification({
          title: `Bibliothèque « ${finalGroup.name} » active`,
          message: 'Bibliothèque rejointe avec succès.',
          type: 'success'
        });
        return true;
      }
    } catch (e) {
      console.warn('Group join failed:', e);
    }

    return false;
  }, [currentUser, showNotification]);

  const toggleLibraryGuestMode = useCallback(async (groupId: string, enabled: boolean): Promise<boolean> => {
    if (blockIfGuest() || !auth.currentUser || !currentUser?.uid) return false;
    const targetGroup = allGroups.find(g => g.id === groupId);
    if (!targetGroup || targetGroup.ownerId !== currentUser.uid) {
      showNotification("Seul le propriétaire créateur peut activer ou désactiver l'accès visiteur", 'error');
      return false;
    }

    try {
      await updateDoc(doc(db, 'groups', groupId), {
        guestEnabled: enabled,
        updatedAt: serverTimestamp()
      });

      const patch = { guestEnabled: enabled };
      setAllGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...patch } : g));
      if (currentGroup?.id === groupId) {
        setCurrentGroup(prev => prev ? { ...prev, ...patch } : prev);
      }
      showNotification(
        enabled ? 'Accès visiteur sans compte activé (lecture seule)' : 'Accès visiteur sans compte désactivé',
        'info'
      );
      return true;
    } catch (e: any) {
      console.error('Toggle visitor mode error:', e);
      showNotification("Impossible de mettre à jour l'accès visiteur", 'error');
      return false;
    }
  }, [blockIfGuest, currentUser?.uid, allGroups, currentGroup?.id, showNotification]);

  const switchGroup = useCallback((groupId: string) => {
    if (blockIfGuest()) return;
    const g = allGroups.find(item => item.id === groupId);
    if (!g || !isMemberOfLibrary(g, currentUser)) {
      showNotification("Vous ne faites pas partie de cette bibliothèque", 'error');
      return;
    }
    setSongs([]);
    setSetlists([]);
    setSetlistHistory([]);
    setCustomPads([]);
    setSelectedSong(null);
    setSelectedSetlist(null);
    setCurrentGroup(g);
    if (typeof window !== 'undefined') {
      localStorage.setItem('songbook_current_group_id', groupId);
    }
    if (currentUser) {
      setCurrentUser(prev => prev ? { ...prev, currentGroupId: groupId } : null);
      setDoc(doc(db, 'users', currentUser.uid), {
        currentGroupId: groupId,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(() => {});
    }
    showNotification({
      title: `Bibliothèque « ${g.name} » active`,
      message: 'Base de données de la bibliothèque chargée.',
      type: 'info'
    });
  }, [allGroups, currentUser, isMemberOfLibrary, showNotification]);

  const updateUserAccesses = useCallback(async (userId: string, newAccesses: AccessPermission[]) => {
    if (blockIfGuest()) return;
    const groupId = currentGroup?.id;
    if (!groupId || !isLibraryAdminForGroup(currentGroup)) {
      showNotification("Seul l'Administrateur de cette bibliothèque peut modifier les accès", 'error');
      return;
    }

    const isOwnerTarget = userId === currentGroup.ownerId;
    let normalized = normalizeAccessList(newAccesses);
    if (isOwnerTarget && !normalized.includes('admin')) {
      showNotification('Le propriétaire créateur conserve l’accès Admin complet', 'warning');
      normalized = [...ALL_ACCESSES];
    }
    const legacyRole = accessesToLegacyRole(normalized);

    try {
      await updateDoc(doc(db, 'groups', groupId), {
        [`memberAccesses.${userId}`]: normalized,
        [`memberRoles.${userId}`]: legacyRole,
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'groups', groupId, 'members', userId), {
        accesses: normalized,
        role: legacyRole
      }, { merge: true });

      const updatedMemberAccesses = { ...(currentGroup.memberAccesses || {}), [userId]: normalized };
      const updatedMemberRoles = { ...(currentGroup.memberRoles || {}), [userId]: legacyRole };
      setAllGroups(prev => prev.map(g => g.id === groupId ? { ...g, memberAccesses: updatedMemberAccesses, memberRoles: updatedMemberRoles } : g));
      setCurrentGroup(prev => prev && prev.id === groupId ? { ...prev, memberAccesses: updatedMemberAccesses, memberRoles: updatedMemberRoles } : prev);
      setAllUsers(prev => prev.map(u => u.uid === userId ? { ...u, accesses: normalized, role: legacyRole } : u));
      if (currentUser && currentUser.uid === userId) {
        setCurrentUser(prev => prev ? { ...prev, accesses: normalized, role: legacyRole } : null);
      }

      showNotification(`Accès mis à jour : ${formatAccessSummary(normalized)}`);
    } catch (err) {
      console.error('Error updating user accesses:', err);
      showNotification('Erreur lors de la mise à jour des accès', 'error');
    }
  }, [currentGroup, currentUser, isLibraryAdminForGroup, showNotification]);

  const bulkUpdateUserAccesses = useCallback(async (userIds: string[], newAccesses: AccessPermission[]): Promise<boolean> => {
    if (blockIfGuest()) return false;
    const groupId = currentGroup?.id;
    if (!groupId || !isLibraryAdminForGroup(currentGroup)) {
      showNotification("Seul l'Administrateur de cette bibliothèque peut modifier les accès", 'error');
      return false;
    }
    const normalized = normalizeAccessList(newAccesses);
    const filteredIds = userIds.filter(uid => uid !== currentGroup.ownerId || normalized.includes('admin'));
    if (filteredIds.length === 0) {
      showNotification('Le propriétaire créateur conserve toujours l’accès Admin complet', 'warning');
      return true;
    }

    const legacyRole = accessesToLegacyRole(normalized);

    try {
      const updatedMemberAccesses = { ...(currentGroup.memberAccesses || {}) };
      const updatedMemberRoles = { ...(currentGroup.memberRoles || {}) };
      const groupUpdates: Record<string, any> = { updatedAt: serverTimestamp() };
      for (const uid of filteredIds) {
        updatedMemberAccesses[uid] = normalized;
        updatedMemberRoles[uid] = legacyRole;
        groupUpdates[`memberAccesses.${uid}`] = normalized;
        groupUpdates[`memberRoles.${uid}`] = legacyRole;
        await setDoc(doc(db, 'groups', groupId, 'members', uid), { accesses: normalized, role: legacyRole }, { merge: true }).catch(() => {});
      }
      await updateDoc(doc(db, 'groups', groupId), groupUpdates);

      setAllGroups(prev => prev.map(g => g.id === groupId ? { ...g, memberAccesses: updatedMemberAccesses, memberRoles: updatedMemberRoles } : g));
      setCurrentGroup(prev => prev && prev.id === groupId ? { ...prev, memberAccesses: updatedMemberAccesses, memberRoles: updatedMemberRoles } : prev);
      setAllUsers(prev => prev.map(u => filteredIds.includes(u.uid) ? { ...u, accesses: normalized, role: legacyRole } : u));

      showNotification(`Accès appliqués (${formatAccessSummary(normalized)}) aux membres sélectionnés`);
      return true;
    } catch (err) {
      console.error('Error bulk updating accesses:', err);
      showNotification('Erreur lors de la modification des accès', 'error');
      return false;
    }
  }, [currentGroup, isLibraryAdminForGroup, showNotification]);

  const updateUserRole = useCallback(async (userId: string, newRole: UserRole) => {
    await updateUserAccesses(userId, legacyRoleToAccesses(newRole));
  }, [updateUserAccesses]);

  const bulkUpdateUserRole = useCallback(async (userIds: string[], newRole: UserRole): Promise<boolean> => {
    return await bulkUpdateUserAccesses(userIds, legacyRoleToAccesses(newRole));
  }, [bulkUpdateUserAccesses]);

  const bulkRemoveMembersFromGroup = useCallback(async (groupId: string, memberUids: string[]): Promise<boolean> => {
    if (blockIfGuest()) return false;
    const targetGroup = allGroups.find(g => g.id === groupId);
    if (!targetGroup || !isLibraryAdminForGroup(targetGroup)) {
      showNotification("Seul l'Administrateur de cette bibliothèque peut retirer des membres", 'error');
      return false;
    }

    const removable = memberUids.filter(id => id !== targetGroup.ownerId);
    const updatedMembers = (targetGroup.members || []).filter(id => !removable.includes(id));

    try {
      await updateDoc(doc(db, 'groups', groupId), { members: updatedMembers, updatedAt: serverTimestamp() });
      for (const uid of removable) {
        await deleteDoc(doc(db, 'groups', groupId, 'members', uid)).catch(() => {});
      }
    } catch (e) {
      console.warn('Bulk remove members note:', e);
    }

    setAllGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: updatedMembers } : g));
    if (currentGroup?.id === groupId) {
      setCurrentGroup(prev => prev ? { ...prev, members: updatedMembers } : prev);
    }
    showNotification('Membres retirés de la bibliothèque', 'info');
    return true;
  }, [allGroups, isLibraryAdminForGroup, currentGroup?.id, showNotification]);

  const bulkDeleteUserAccounts = useCallback(async (userIds: string[]): Promise<boolean> => {
    if (blockIfGuest()) return false;
    if (!currentGroup?.id || !isLibraryAdminForGroup(currentGroup)) {
      showNotification("Seul l'Administrateur de cette bibliothèque peut retirer des membres", 'error');
      return false;
    }
    const targetUids = userIds.filter(id => id !== currentUser?.uid && id !== currentGroup.ownerId);
    if (targetUids.length === 0) {
      showNotification('Impossible de retirer votre propre compte ou le propriétaire', 'error');
      return false;
    }

    return await bulkRemoveMembersFromGroup(currentGroup.id, targetUids);
  }, [currentGroup, currentUser?.uid, isLibraryAdminForGroup, bulkRemoveMembersFromGroup, showNotification]);

  const setAdminByEmail = useCallback(async (targetEmail: string, roleOrAccesses: UserRole | AccessPermission[] = 'admin') => {
    if (blockIfGuest()) return;
    if (!currentGroup || !isLibraryAdminForGroup(currentGroup)) {
      showNotification("Seul l'Administrateur de cette bibliothèque peut attribuer des accès", 'error');
      return;
    }

    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    const targetAccesses = Array.isArray(roleOrAccesses)
      ? normalizeAccessList(roleOrAccesses)
      : legacyRoleToAccesses(roleOrAccesses);

    const existingMember = allUsers.find(u => u.email?.toLowerCase() === cleanEmail);
    if (existingMember) {
      await updateUserAccesses(existingMember.uid, targetAccesses);
    } else {
      showNotification({
        title: 'Membre non présent',
        message: `Partagez l'identifiant « ${currentGroup.inviteCode} » pour que ${cleanEmail} rejoigne d'abord cette bibliothèque.`,
        type: 'info',
        duration: 4500
      });
    }
  }, [currentGroup, isLibraryAdminForGroup, allUsers, updateUserAccesses, showNotification]);

  const selectSvgAvatar = useCallback(async (avatarToken: string): Promise<void> => {
    if (blockIfGuest()) return;
    if (!parseSvgAvatar(avatarToken)) return;
    const userId = currentUser?.uid || auth.currentUser?.uid;
    if (!userId) return;

    try {
      await setDoc(doc(db, 'users', userId), {
        photoURL: avatarToken,
        updatedAt: serverTimestamp()
      }, { merge: true });
      if (currentGroup?.id) {
        await setDoc(doc(db, 'groups', currentGroup.id, 'members', userId), {
          photoURL: avatarToken
        }, { merge: true });
      }
    } catch (e) {
      console.warn('Firestore SVG avatar update error:', e);
    }

    setCurrentUser(prev => prev ? { ...prev, photoURL: avatarToken } : null);
    setAllUsers(prev => prev.map(u => u.uid === userId ? { ...u, photoURL: avatarToken } : u));

    showNotification({
      title: 'Avatar enregistré',
      message: 'Votre avatar SVG a été mis à jour.',
      type: 'success'
    });
  }, [blockIfGuest, currentUser?.uid, currentGroup?.id, showNotification]);

  const removeProfileAvatar = useCallback(async (): Promise<void> => {
    if (blockIfGuest()) return;
    const userId = currentUser?.uid || auth.currentUser?.uid;
    if (!userId) return;

    try {
      await setDoc(doc(db, 'users', userId), { photoURL: '', updatedAt: serverTimestamp() }, { merge: true });
      if (currentGroup?.id) {
        await setDoc(doc(db, 'groups', currentGroup.id, 'members', userId), { photoURL: '' }, { merge: true });
      }
    } catch (e) {}

    setCurrentUser(prev => prev ? { ...prev, photoURL: undefined } : null);
    setAllUsers(prev => prev.map(u => u.uid === userId ? { ...u, photoURL: undefined } : u));

    showNotification({
      title: 'Avatar réinitialisé',
      message: 'Affichage par défaut rétabli.',
      type: 'info'
    });
  }, [blockIfGuest, currentUser?.uid, currentGroup?.id, showNotification]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    setCurrentUser(null);
    setFirebaseUser(null);
    setNeedsLibraryOnboarding(false);
    setAllGroups([]);
    setCurrentGroup(null);
    setSongs([]);
    setSetlists([]);
    setSetlistHistory([]);
    setCustomPads([]);
    setAllUsers([]);
    setSelectedSong(null);
    setSelectedSetlist(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('songbook_user');
      localStorage.removeItem('songbook_current_group_id');
    }
    showNotification('Vous êtes déconnecté', 'info');
  }, [showNotification]);

  // Custom Audio Pad Actions (scopées dans /groups/{groupId}/custom_pads)
  const uploadPadAudio = useCallback(async (file: File): Promise<string> => {
    if (blockIfGuest()) return '';
    const padId = 'pad_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    let audioUrl = '';

    try {
      const ext = file.name.split('.').pop() || 'mp3';
      const filename = `${padId}.${ext}`;
      const fileRef = storageRef(storage, `pads/${currentGroup?.id || 'shared'}/${filename}`);
      const snapshot = await uploadBytes(fileRef, file, {
        contentType: file.type || 'audio/mpeg',
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      });
      audioUrl = await getDownloadURL(snapshot.ref);
    } catch (storageErr) {
      console.warn('Firebase Storage upload notice, falling back to data URL:', storageErr);
      audioUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    return audioUrl;
  }, [currentGroup?.id]);

  const createCustomPad = useCallback(async (padData: Omit<CustomPad, 'id' | 'groupId' | 'createdAt'>): Promise<string> => {
    if (blockIfGuest()) return '';
    const groupId = currentGroup?.id;
    if (!groupId) return '';
    const newId = 'pad_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

    const newPad: CustomPad = {
      ...padData,
      id: newId,
      groupId,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.uid || 'anonymous',
      createdByName: currentUser?.displayName || 'Musicien'
    };

    setCustomPads(prev => {
      const updated = [newPad, ...prev.filter(p => p.id !== newId)];
      try {
        localStorage.setItem(`songbook_cached_custom_pads_${groupId}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await saveCustomPadToIndexedDB(newPad);
    } catch (e) {
      console.warn('IndexedDB pad save notice:', e);
    }

    padAudio.preloadCustomPad(newPad);

    try {
      const docRef = doc(db, 'groups', groupId, 'custom_pads', newId);
      const firestorePayload = { ...newPad };
      if (firestorePayload.audioUrl && firestorePayload.audioUrl.length > 700000) {
        firestorePayload.audioUrl = '';
      }
      await setDoc(docRef, stripUndefined({
        ...firestorePayload,
        createdAt: serverTimestamp()
      }));
    } catch (e) {
      console.warn('Saved custom pad locally (Firestore offline/error):', e);
    }

    return newId;
  }, [currentGroup?.id, currentUser?.uid, currentUser?.displayName]);

  const deleteCustomPad = useCallback(async (id: string): Promise<void> => {
    if (blockIfGuest()) return;
    const groupId = customPads.find(p => p.id === id)?.groupId || currentGroup?.id;
    setCustomPads(prev => prev.filter(p => p.id !== id));
    deleteCustomPadFromIndexedDB(id).catch(() => {});

    if (groupId) {
      try {
        const docRef = doc(db, 'groups', groupId, 'custom_pads', id);
        await deleteDoc(docRef);
      } catch (e) {
        console.warn('Deleted custom pad locally:', e);
      }
    }
  }, [customPads, currentGroup?.id]);

  // Accès cumulables effectifs dans la bibliothèque active
  const effectiveAccesses: AccessPermission[] = useMemo(() => {
    if (isGuest || !currentUser) return ['regie'];
    return resolveMemberAccesses(
      currentGroup,
      currentUser.uid,
      currentUser.role,
      currentUser.accesses
    );
  }, [isGuest, currentUser, currentGroup]);

  const effectiveRole: UserRole = useMemo(() => {
    if (isGuest || !currentUser) return 'viewer';
    return accessesToLegacyRole(effectiveAccesses);
  }, [isGuest, currentUser, effectiveAccesses]);

  const effectiveUser = useMemo<UserProfile | null>(() => {
    if (isGuest || !currentUser) return null;
    return {
      ...currentUser,
      role: effectiveRole,
      accesses: effectiveAccesses,
      currentGroupId: currentGroup?.id || currentUser.currentGroupId
    };
  }, [isGuest, currentUser, effectiveRole, effectiveAccesses, currentGroup?.id]);

  const hasAccess = useCallback((access: AccessPermission): boolean => {
    if (isGuest) return access === 'regie';
    return effectiveAccesses.includes('admin') || effectiveAccesses.includes(access);
  }, [isGuest, effectiveAccesses]);

  const isAdmin = !isGuest && effectiveAccesses.includes('admin');
  const isLeader = !isGuest && !isAdmin && effectiveAccesses.includes('setlists');
  const isEditor = !isGuest && !isAdmin && !isLeader && effectiveAccesses.includes('chants');
  const isMember = !isGuest && !isAdmin && !isLeader && !isEditor && effectiveAccesses.includes('pupitre');
  const isRegieOnly = !isGuest && Boolean(currentUser) && isRegieOnlyAccesses(effectiveAccesses);
  const isViewer = isGuest || isRegieOnly;

  const canAccessRepertoire = isGuest || effectiveAccesses.some(a => a === 'admin' || a === 'setlists' || a === 'chants' || a === 'pupitre');
  const canAccessSetlistsView = isGuest || effectiveAccesses.some(a => a === 'admin' || a === 'setlists' || a === 'pupitre');
  const canAccessStage = isGuest || effectiveAccesses.some(a => a === 'admin' || a === 'setlists' || a === 'chants' || a === 'pupitre');
  const canAccessProjection = isGuest || effectiveAccesses.some(a => a === 'admin' || a === 'setlists' || a === 'chants' || a === 'pupitre' || a === 'regie');
  const canAccessTools = !isRegieOnly && (isGuest || canAccessRepertoire);
  const canAccessGroupsView = !isGuest && !isRegieOnly;

  const canManageSongs = !isGuest && (effectiveAccesses.includes('admin') || effectiveAccesses.includes('chants'));
  const canManageSetlists = !isGuest && (effectiveAccesses.includes('admin') || effectiveAccesses.includes('setlists'));
  const canAccessPlanning = !isGuest && Boolean(currentUser);
  const canManagePlanning = canManageSetlists;
  const canManageGroups = !isGuest && effectiveAccesses.includes('admin');
  const canAccessSettings = !isGuest && !isRegieOnly && canAccessRepertoire;

  permissionsRef.current = {
    isRegieOnly,
    canAccessRepertoire,
    canAccessSetlistsView,
    canAccessPlanning,
    canAccessStage,
    canAccessProjection,
    canAccessGroupsView,
    canManageSongs,
    canAccessSettings
  };

  useEffect(() => {
    if (isGuest || !currentUser) return;
    if (isRegieOnly) {
      if (activeTab !== 'presentation' && activeTab !== 'planning' && activeTab !== 'roadmap') {
        setActiveTabState('presentation');
      }
      setIsPianoOpen(false);
      setIsMetronomeOpen(false);
      setIsTunerOpen(false);
      return;
    }

    const fallback = canAccessRepertoire ? 'repertoire' : canAccessSetlistsView ? 'setlists' : 'presentation';
    if (
      (activeTab === 'repertoire' && !canAccessRepertoire) ||
      (activeTab === 'setlists' && !canAccessSetlistsView) ||
      (activeTab === 'planning' && !canAccessPlanning) ||
      (activeTab === 'stage' && !canAccessStage) ||
      (activeTab === 'editor' && !canManageSongs) ||
      (activeTab === 'groups' && !canAccessGroupsView) ||
      (activeTab === 'settings' && !canAccessSettings) ||
      (activeTab === 'presentation' && !canAccessProjection)
    ) {
      setActiveTabState(fallback);
    }
  }, [
    isGuest,
    currentUser,
    isRegieOnly,
    activeTab,
    canAccessRepertoire,
    canAccessSetlistsView,
    canAccessPlanning,
    canAccessStage,
    canManageSongs,
    canAccessGroupsView,
    canAccessSettings,
    canAccessProjection
  ]);

  return (
    <AppContext.Provider value={{
      currentUser: effectiveUser,
      firebaseUser,
      authLoading,
      isGuest,
      enterGuestMode,
      exitGuestMode,
      toggleLibraryGuestMode,
      deepLinkSetlistId,
      clearDeepLinkSetlistId,
      needsLibraryOnboarding,
      setNeedsLibraryOnboarding,
      setSignupInProgress,
      completeSignupCreateLibrary,
      completeSignupJoinLibrary,
      effectiveAccesses,
      hasAccess,
      isRegieOnly,
      isAdmin,
      isLeader,
      isEditor,
      isMember,
      isViewer,
      canAccessRepertoire,
      canAccessSetlistsView,
      canAccessStage,
      canAccessProjection,
      canAccessTools,
      canAccessGroupsView,
      canManageSongs,
      canManageSetlists,
      canAccessPlanning,
      canManagePlanning,
      canManageGroups,
      canAccessSettings,
      allUsers,
      updateUserAccesses,
      bulkUpdateUserAccesses,
      updateUserRole,
      bulkUpdateUserRole,
      bulkRemoveMembersFromGroup,
      bulkDeleteUserAccounts,
      setAdminByEmail,
      groups,
      currentGroup,
      songs,
      setlists,
      activeTab,
      setActiveTab,
      editorSubTab,
      setEditorSubTab,
      selectedSong,
      setSelectedSong,
      selectedSetlist,
      setSelectedSetlist,
      activeSetlistIndex,
      setActiveSetlistIndex,
      isLiveSetlistOpen,
      setIsLiveSetlistOpen,
      editorReturnTarget,
      setEditorReturnTarget,
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
      isUpdateAvailable,
      isUpdateDismissed,
      isApplyingUpdate,
      applyAppUpdate,
      dismissUpdateBanner,
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
      assignMembersToGroup,
      removeMemberFromGroup,
      setGroupMembers,
      // Aliases Bibliothèque
      libraries: groups,
      currentLibrary: currentGroup,
      createLibrary: createGroup,
      updateLibrary: updateGroup,
      deleteLibrary: deleteGroup,
      joinLibrary: joinGroup,
      switchLibrary: switchGroup,
      assignMembersToLibrary: assignMembersToGroup,
      removeMemberFromLibrary: removeMemberFromGroup,
      setLibraryMembers: setGroupMembers,
      handleSignOut,
      selectSvgAvatar,
      removeProfileAvatar,
      customPads,
      createCustomPad,
      deleteCustomPad,
      uploadPadAudio,
      personalCapos,
      setPersonalCapo,
      planningTeams,
      planningAvailabilities,
      planningAssignments,
      selectedPlanningTargetId,
      setSelectedPlanningTargetId,
      openPlanningForSetlist,
      createPlanningTeam,
      updatePlanningTeam,
      deletePlanningTeam,
      setPlanningAvailability,
      deletePlanningAvailability,
      savePlanningAssignment,
      deletePlanningAssignment
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
