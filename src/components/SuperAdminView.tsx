import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  Eye,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Loader2,
  Mic2,
  Music2,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Trash2,
  Type,
  Upload,
  Users,
  X,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AccessPermission, AppBrandingConfig, Group, UserProfile } from '../types';
import {
  ACCESS_DEFINITIONS,
  ACCESS_ORDER,
  formatAccessSummary,
  toggleAccessInList
} from '../utils/accessUtils';
import {
  ACCENT_PRESETS,
  APP_BRANDING_FONTS,
  DEFAULT_APP_BRANDING,
  SURFACE_PALETTE_PRESETS,
  getBrandingFontMeta,
  getContrastTextColor,
  normalizeHexColor,
  processLogoFile,
  sanitizeBrandingConfig
} from '../utils/brandingUtils';
import { MelobookLogo } from './MelobookLogo';
import { UserAvatar } from '../utils/avatarPresets';
import {
  MAX_DEFAULT_INSTRUMENTS,
  MAX_DEFAULT_VOCAL_ROLES
} from '../utils/memberSkillsUtils';

type SuperAdminSubTab = 'libraries' | 'branding' | 'skills';

interface SkillDraftItem {
  id: string;
  name: string;
  originalName: string | null;
}

const toSkillDraftItems = (list: string[], prefix: string): SkillDraftItem[] =>
  list.map((name, idx) => ({
    id: `${prefix}_${idx}_${name}`,
    name,
    originalName: name
  }));

export const SuperAdminView: React.FC = () => {
  const {
    isSuperAdmin,
    currentUser,
    currentGroup,
    groups,
    switchGroup,
    setActiveTab,
    toggleLibraryGuestMode,
    deleteGroup,
    fetchLibraryMembersForSuperAdmin,
    updateGroupMemberAccessesForSuperAdmin,
    appBranding,
    saveAppBranding,
    resetAppBranding,
    memberSkillsConfig,
    saveMemberSkillsConfig,
    resetMemberSkillsConfig
  } = useApp();

  const [subTab, setSubTab] = useState<SuperAdminSubTab>('libraries');

  // --- Sub-tab 1: Libraries & Access State ---
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'guest'>('all');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [togglingGuestGroupId, setTogglingGuestGroupId] = useState<string | null>(null);

  const [inspectGroup, setInspectGroup] = useState<Group | null>(null);
  const [inspectMembers, setInspectMembers] = useState<UserProfile[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [updatingMemberUid, setUpdatingMemberUid] = useState<string | null>(null);

  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [deleteAssociatedData, setDeleteAssociatedData] = useState(true);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // --- Sub-tab 2: Global Branding State ---
  const [draft, setDraft] = useState<AppBrandingConfig>(() => sanitizeBrandingConfig(appBranding));
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('dark');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isConfirmingResetAll, setIsConfirmingResetAll] = useState(false);
  const [accentHexInput, setAccentHexInput] = useState(appBranding.accentColor);
  const [surfaceHexInputs, setSurfaceHexInputs] = useState({
    lightBgColor: appBranding.lightBgColor,
    lightSurfaceColor: appBranding.lightSurfaceColor,
    darkBgColor: appBranding.darkBgColor,
    darkSurfaceColor: appBranding.darkSurfaceColor
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  // --- Sub-tab 3: Default Instruments & Vocal Roles State ---
  const [instDraft, setInstDraft] = useState<SkillDraftItem[]>(() =>
    toSkillDraftItems(memberSkillsConfig.instruments, 'inst')
  );
  const [vocDraft, setVocDraft] = useState<SkillDraftItem[]>(() =>
    toSkillDraftItems(memberSkillsConfig.vocalRoles, 'voc')
  );
  const [deletedInstOriginals, setDeletedInstOriginals] = useState<string[]>([]);
  const [deletedVocOriginals, setDeletedVocOriginals] = useState<string[]>([]);
  const [newInstInput, setNewInstInput] = useState('');
  const [newVocInput, setNewVocInput] = useState('');
  const [editingSkillKey, setEditingSkillKey] = useState<string | null>(null);
  const [editingSkillValue, setEditingSkillValue] = useState('');
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  const [isConfirmingResetSkills, setIsConfirmingResetSkills] = useState(false);

  useEffect(() => {
    setInstDraft(toSkillDraftItems(memberSkillsConfig.instruments, 'inst'));
    setVocDraft(toSkillDraftItems(memberSkillsConfig.vocalRoles, 'voc'));
    setDeletedInstOriginals([]);
    setDeletedVocOriginals([]);
    setEditingSkillKey(null);
    setSkillsError(null);
  }, [memberSkillsConfig]);

  const skillMutationSummary = useMemo(() => {
    const instRenames = instDraft
      .filter(i => i.originalName && i.originalName.toLowerCase() !== i.name.toLowerCase())
      .map(i => ({ from: i.originalName as string, to: i.name }));
    const vocRenames = vocDraft
      .filter(v => v.originalName && v.originalName.toLowerCase() !== v.name.toLowerCase())
      .map(v => ({ from: v.originalName as string, to: v.name }));
    const activeInstOrig = new Set(instDraft.map(i => i.originalName?.toLowerCase()).filter(Boolean));
    const activeVocOrig = new Set(vocDraft.map(v => v.originalName?.toLowerCase()).filter(Boolean));
    const instDeletions = deletedInstOriginals.filter(d => !activeInstOrig.has(d.toLowerCase()));
    const vocDeletions = deletedVocOriginals.filter(d => !activeVocOrig.has(d.toLowerCase()));

    const listChanged =
      instDraft.length !== memberSkillsConfig.instruments.length ||
      instDraft.some((item, idx) => item.name !== memberSkillsConfig.instruments[idx]) ||
      vocDraft.length !== memberSkillsConfig.vocalRoles.length ||
      vocDraft.some((item, idx) => item.name !== memberSkillsConfig.vocalRoles[idx]);

    return {
      instRenames,
      instDeletions,
      vocRenames,
      vocDeletions,
      hasChanges: listChanged || instRenames.length > 0 || instDeletions.length > 0 || vocRenames.length > 0 || vocDeletions.length > 0
    };
  }, [instDraft, vocDraft, deletedInstOriginals, deletedVocOriginals, memberSkillsConfig]);

  // Sync draft when remote appBranding updates (and no dirty local override)
  const hasUnsavedBrandingChanges = useMemo(() => {
    const cleanDraft = sanitizeBrandingConfig(draft);
    const cleanSaved = sanitizeBrandingConfig(appBranding);
    return (
      cleanDraft.logoMode !== cleanSaved.logoMode ||
      cleanDraft.customLogoDataUrl !== cleanSaved.customLogoDataUrl ||
      cleanDraft.accentColor !== cleanSaved.accentColor ||
      cleanDraft.lightBgColor !== cleanSaved.lightBgColor ||
      cleanDraft.lightSurfaceColor !== cleanSaved.lightSurfaceColor ||
      cleanDraft.darkBgColor !== cleanSaved.darkBgColor ||
      cleanDraft.darkSurfaceColor !== cleanSaved.darkSurfaceColor ||
      cleanDraft.fontFamily !== cleanSaved.fontFamily
    );
  }, [draft, appBranding]);

  useEffect(() => {
    setDraft(sanitizeBrandingConfig(appBranding));
    setAccentHexInput(appBranding.accentColor);
    setSurfaceHexInputs({
      lightBgColor: appBranding.lightBgColor,
      lightSurfaceColor: appBranding.lightSurfaceColor,
      darkBgColor: appBranding.darkBgColor,
      darkSurfaceColor: appBranding.darkSurfaceColor
    });
  }, [appBranding]);

  // Preload Google Fonts in SuperAdminView Branding tab so each font option renders accurately
  useEffect(() => {
    if (subTab !== 'branding' || typeof document === 'undefined') return;
    const queries = APP_BRANDING_FONTS.map(f => f.googleFontsQuery).filter((q): q is string => Boolean(q));
    if (queries.length === 0) return;
    const linkId = 'melobook-superadmin-font-previews';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?${queries.map(q => `family=${q}`).join('&')}&display=swap`;
      document.head.appendChild(link);
    }
  }, [subTab]);

  // Keep inspectGroup synchronized with live groups snapshot
  const liveInspectGroup = useMemo(() => {
    if (!inspectGroup) return null;
    return groups.find(g => g.id === inspectGroup.id) || inspectGroup;
  }, [inspectGroup, groups]);

  const filteredGroups = useMemo(() => {
    const term = librarySearch.trim().toLowerCase();
    return [...groups]
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
      .filter(g => {
        if (libraryFilter === 'guest' && !g.guestEnabled) return false;
        if (!term) return true;
        return (
          g.name.toLowerCase().includes(term) ||
          (g.inviteCode || '').toLowerCase().includes(term) ||
          g.id.toLowerCase().includes(term) ||
          (g.description || '').toLowerCase().includes(term)
        );
      });
  }, [groups, librarySearch, libraryFilter]);

  const stats = useMemo(() => {
    const totalLibraries = groups.length;
    const totalMemberSlots = groups.reduce((acc, g) => acc + (Array.isArray(g.members) ? g.members.length : 0), 0);
    const guestEnabledCount = groups.filter(g => Boolean(g.guestEnabled)).length;
    return { totalLibraries, totalMemberSlots, guestEnabledCount };
  }, [groups]);

  const filteredInspectMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return inspectMembers;
    return inspectMembers.filter(
      m =>
        (m.displayName || '').toLowerCase().includes(term) ||
        (m.email || '').toLowerCase().includes(term) ||
        m.uid.toLowerCase().includes(term)
    );
  }, [inspectMembers, memberSearch]);

  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Accès réservé à l’Admin Suprême</h1>
        <p className="text-xs text-slate-600 dark:text-gray-400">
          Cette section est exclusivement autorisée au compte administrateur principal de l’application.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('repertoire')}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
        >
          Retour au répertoire
        </button>
      </div>
    );
  }

  const handleOpenInspect = async (group: Group) => {
    setInspectGroup(group);
    setMemberSearch('');
    setIsLoadingMembers(true);
    try {
      const list = await fetchLibraryMembersForSuperAdmin(group.id);
      setInspectMembers(list);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleToggleMemberAccess = async (member: UserProfile, acc: AccessPermission) => {
    if (!liveInspectGroup) return;
    const isOwner = member.uid === liveInspectGroup.ownerId;
    if (isOwner) return;

    const currentAccesses = member.accesses || ['pupitre'];
    const nextAccesses = toggleAccessInList(currentAccesses, acc, false);

    setUpdatingMemberUid(member.uid);
    // Optimistic update
    setInspectMembers(prev => prev.map(m => (m.uid === member.uid ? { ...m, accesses: nextAccesses } : m)));
    try {
      await updateGroupMemberAccessesForSuperAdmin(liveInspectGroup.id, member.uid, nextAccesses);
    } finally {
      setUpdatingMemberUid(null);
    }
  };

  const handleCopyCode = (group: Group) => {
    if (!group.inviteCode) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopiedCodeId(group.id);
    setTimeout(() => setCopiedCodeId(prev => (prev === group.id ? null : prev)), 1800);
  };

  const handleToggleGuest = async (group: Group) => {
    setTogglingGuestGroupId(group.id);
    try {
      await toggleLibraryGuestMode(group.id, !group.guestEnabled);
    } finally {
      setTogglingGuestGroupId(null);
    }
  };

  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsDeletingGroup(true);
    try {
      const deletingId = groupToDelete.id;
      await deleteGroup(deletingId, { deleteAssociatedData });
      if (inspectGroup?.id === deletingId) {
        setInspectGroup(null);
        setInspectMembers([]);
      }
      setGroupToDelete(null);
    } finally {
      setIsDeletingGroup(false);
    }
  };

  // --- Branding handlers ---
  const handleLogoFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setLogoError(null);
    setIsProcessingLogo(true);
    try {
      const dataUrl = await processLogoFile(file);
      setDraft(prev => ({
        ...prev,
        logoMode: 'custom',
        customLogoDataUrl: dataUrl
      }));
    } catch (err: any) {
      setLogoError(err?.message || 'Impossible de traiter ce logo.');
    } finally {
      setIsProcessingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleResetLogo = () => {
    setLogoError(null);
    setDraft(prev => ({
      ...prev,
      logoMode: 'default',
      customLogoDataUrl: null
    }));
  };

  const handleAccentChange = (rawHex: string) => {
    setAccentHexInput(rawHex);
    const clean = rawHex.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      setDraft(prev => ({ ...prev, accentColor: clean.toUpperCase() }));
    }
  };

  const handleSurfaceHexChange = (
    field: 'lightBgColor' | 'lightSurfaceColor' | 'darkBgColor' | 'darkSurfaceColor',
    rawHex: string
  ) => {
    setSurfaceHexInputs(prev => ({ ...prev, [field]: rawHex }));
    const clean = rawHex.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      setDraft(prev => ({ ...prev, [field]: clean.toUpperCase() }));
    }
  };

  const handleApplySurfacePreset = (preset: (typeof SURFACE_PALETTE_PRESETS)[number]) => {
    setDraft(prev => ({
      ...prev,
      lightBgColor: preset.lightBgColor,
      lightSurfaceColor: preset.lightSurfaceColor,
      darkBgColor: preset.darkBgColor,
      darkSurfaceColor: preset.darkSurfaceColor
    }));
    setSurfaceHexInputs({
      lightBgColor: preset.lightBgColor,
      lightSurfaceColor: preset.lightSurfaceColor,
      darkBgColor: preset.darkBgColor,
      darkSurfaceColor: preset.darkSurfaceColor
    });
  };

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
      await saveAppBranding(sanitizeBrandingConfig(draft));
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleDiscardBrandingChanges = () => {
    const clean = sanitizeBrandingConfig(appBranding);
    setDraft(clean);
    setAccentHexInput(clean.accentColor);
    setSurfaceHexInputs({
      lightBgColor: clean.lightBgColor,
      lightSurfaceColor: clean.lightSurfaceColor,
      darkBgColor: clean.darkBgColor,
      darkSurfaceColor: clean.darkSurfaceColor
    });
    setLogoError(null);
  };

  const handleResetAllBranding = async () => {
    setIsSavingBranding(true);
    try {
      await resetAppBranding();
      setIsConfirmingResetAll(false);
    } finally {
      setIsSavingBranding(false);
    }
  };

  const previewFontMeta = getBrandingFontMeta(draft.fontFamily);
  const previewBg = previewTheme === 'dark' ? draft.darkBgColor : draft.lightBgColor;
  const previewSurface = previewTheme === 'dark' ? draft.darkSurfaceColor : draft.lightSurfaceColor;
  const previewBorder = previewTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)';
  const previewText = previewTheme === 'dark' ? '#F1F5F9' : '#0F172A';
  const previewMuted = previewTheme === 'dark' ? '#94A3B8' : '#64748B';
  const accentOnColor = getContrastTextColor(draft.accentColor);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-14 text-slate-900 dark:text-[#E0E0E0] space-y-6">
      {/* Header + Segmented Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#222224]">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 shrink-0" />
            <span>Console Admin Suprême</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-gray-400 mt-1 truncate">
            Supervision globale de toutes les bibliothèques et identité visuelle de l’application · {currentUser?.email}
          </p>
        </div>

        <div className="inline-flex items-center p-1 rounded-lg bg-[#EDF1F5] dark:bg-[#141417] border border-slate-200 dark:border-[#242428] self-start md:self-auto shrink-0 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setSubTab('libraries')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'libraries'
                ? 'bg-white dark:bg-[#1E1E24] text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-[#2E2E36]'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Bibliothèques &amp; Accès</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('skills')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'skills'
                ? 'bg-white dark:bg-[#1E1E24] text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-[#2E2E36]'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Music2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Instruments &amp; Voix</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('branding')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'branding'
                ? 'bg-white dark:bg-[#1E1E24] text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-[#2E2E36]'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-amber-500" />
            <span>Apparence &amp; Identité</span>
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: LIBRARIES & ACCESS ==================== */}
      {subTab === 'libraries' && (
        <div className="space-y-5">
          {/* Unboxed KPI Strip */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6 px-1">
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-gray-400">Bibliothèques</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {stats.totalLibraries}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-gray-400">Inscriptions membres</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {stats.totalMemberSlots}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-gray-400">Mode visiteur actif</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {stats.guestEnabledCount}
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Rechercher par nom, code d’invitation ou ID..."
                className="w-full bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#242428] focus:border-blue-500 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
              {librarySearch && (
                <button
                  type="button"
                  onClick={() => setLibrarySearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center p-0.5 rounded-lg bg-[#EDF1F5] dark:bg-[#141417] border border-slate-200 dark:border-[#242428]">
                <button
                  type="button"
                  onClick={() => setLibraryFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                    libraryFilter === 'all'
                      ? 'bg-white dark:bg-[#1E1E24] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-gray-400'
                  }`}
                >
                  Toutes ({groups.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLibraryFilter('guest')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                    libraryFilter === 'guest'
                      ? 'bg-white dark:bg-[#1E1E24] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-gray-400'
                  }`}
                >
                  Visiteur actif ({stats.guestEnabledCount})
                </button>
              </div>
            </div>
          </div>

          {/* Libraries Table Surface */}
          <div className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl overflow-hidden">
            {filteredGroups.length === 0 ? (
              <div className="px-6 py-12 text-center space-y-2">
                <Layers className="w-7 h-7 text-slate-400 mx-auto" />
                <div className="text-sm font-semibold text-slate-800 dark:text-gray-200">
                  Aucune bibliothèque correspondante
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  {librarySearch || libraryFilter !== 'all'
                    ? 'Modifiez ou réinitialisez vos filtres pour voir toutes les bibliothèques.'
                    : 'Aucune bibliothèque n’est encore enregistrée.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#222224] bg-slate-50/70 dark:bg-[#151518] text-[11px] font-semibold text-slate-500 dark:text-gray-400">
                      <th className="py-2.5 px-4">Bibliothèque</th>
                      <th className="py-2.5 px-3">Code d’invitation</th>
                      <th className="py-2.5 px-3 text-right">Membres</th>
                      <th className="py-2.5 px-3">Mode visiteur</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1F1F23]">
                    {filteredGroups.map(g => {
                      const isActive = currentGroup?.id === g.id;
                      const memberCount = Array.isArray(g.members) ? g.members.length : 0;
                      const isTogglingGuest = togglingGuestGroupId === g.id;
                      return (
                        <tr
                          key={g.id}
                          className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-[#16161A] ${
                            isActive ? 'bg-blue-50/40 dark:bg-blue-950/15' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[230px]">
                                {g.name}
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                                  Active
                                </span>
                              )}
                            </div>
                            {g.description && (
                              <div className="text-[11px] text-slate-500 dark:text-gray-400 truncate max-w-[280px] mt-0.5">
                                {g.description}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {g.inviteCode ? (
                              <button
                                type="button"
                                onClick={() => handleCopyCode(g)}
                                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                                title="Copier le code d’invitation"
                              >
                                <span>{g.inviteCode}</span>
                                {copiedCodeId === g.id ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3 opacity-60" />
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-semibold tabular-nums text-slate-700 dark:text-gray-300">
                            {memberCount}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={Boolean(g.guestEnabled)}
                              disabled={isTogglingGuest}
                              onClick={() => handleToggleGuest(g)}
                              className="inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              <span
                                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                  g.guestEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-[#2E2E36]'
                                }`}
                              >
                                <span
                                  className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
                                    g.guestEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                                  }`}
                                />
                              </span>
                              <span className="text-[11px] text-slate-600 dark:text-gray-400">
                                {isTogglingGuest ? '...' : g.guestEnabled ? 'Activé' : 'Désactivé'}
                              </span>
                            </button>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  switchGroup(g.id);
                                  setActiveTab('repertoire');
                                }}
                                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-[#2A2A32] hover:border-blue-500/50 text-slate-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="Ouvrir cette bibliothèque dans le répertoire"
                              >
                                <FolderOpen className="w-3 h-3" />
                                <span>Ouvrir</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenInspect(g)}
                                className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Users className="w-3 h-3" />
                                <span>Gérer les accès</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setGroupToDelete(g)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Supprimer cette bibliothèque"
                                aria-label={`Supprimer ${g.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: GLOBAL APPEARANCE & BRANDING ==================== */}
      {subTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left column: Controls */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. App Logo */}
            <section className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Logo de l’application</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                    PNG, JPG, WebP ou SVG (redimensionné automatiquement à 256×256 max). Appliqué sur la barre, l’écran de connexion et l’icône du navigateur.
                  </p>
                </div>
                {draft.logoMode === 'custom' && (
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#2A2A32] hover:bg-slate-100 dark:hover:bg-[#1B1B20] text-[11px] font-semibold text-slate-700 dark:text-gray-200 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Réinitialiser</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-16 h-16 rounded-xl bg-[#F4F6F9] border border-slate-200 flex items-center justify-center p-2" title="Aperçu sur fond clair">
                    <MelobookLogo
                      className="w-11 h-11"
                      overrideLogoUrl={draft.logoMode === 'custom' ? draft.customLogoDataUrl : null}
                      forceDefault={draft.logoMode === 'default'}
                    />
                  </div>
                  <div className="w-16 h-16 rounded-xl bg-[#0A0A0B] border border-[#242428] flex items-center justify-center p-2" title="Aperçu sur fond sombre">
                    <MelobookLogo
                      className="w-11 h-11"
                      overrideLogoUrl={draft.logoMode === 'custom' ? draft.customLogoDataUrl : null}
                      forceDefault={draft.logoMode === 'default'}
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => handleLogoFileSelected(e.target.files?.[0])}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isProcessingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full px-4 py-3 rounded-lg border border-dashed border-slate-300 dark:border-[#303038] hover:border-blue-500 bg-slate-50/70 dark:bg-[#151519] text-xs font-semibold text-slate-700 dark:text-gray-200 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingLogo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span>Optimisation en cours...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Importer un logo personnalisé (SVG / PNG / WebP / JPG)</span>
                      </>
                    )}
                  </button>
                  {logoError && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5">{logoError}</p>
                  )}
                </div>
              </div>
            </section>

            {/* 2. Accent Color */}
            <section className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-4 sm:p-5 space-y-3.5">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Couleur d’accentuation principale</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                  Couleur appliquée aux boutons principaux, indicateurs actifs, liens et sélections dans toute l’application.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {ACCENT_PRESETS.map(preset => {
                  const selected = draft.accentColor.toUpperCase() === preset.hex.toUpperCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => handleAccentChange(preset.hex)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                        selected
                          ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-[#1C1C22] text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-[#282830] text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-[#18181D]'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-gray-300">
                  <span>Personnalisée :</span>
                  <input
                    type="color"
                    value={normalizeHexColor(draft.accentColor, DEFAULT_APP_BRANDING.accentColor)}
                    onChange={(e) => handleAccentChange(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-300 dark:border-[#333] bg-transparent p-0"
                  />
                </label>
                <input
                  type="text"
                  value={accentHexInput}
                  onChange={(e) => handleAccentChange(e.target.value)}
                  maxLength={7}
                  spellCheck={false}
                  placeholder="#2563EB"
                  className="w-28 font-mono text-xs bg-slate-50 dark:bg-[#16161A] border border-slate-300 dark:border-[#2E2E36] rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
                  style={{ backgroundColor: draft.accentColor, color: accentOnColor }}
                >
                  Contraste bouton
                </span>
              </div>
            </section>

            {/* 3. Background & Surface Palette */}
            <section className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-4 sm:p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Palette Fond &amp; Surfaces (Clair / Sombre)</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                  Personnalisez le fond général et la couleur des panneaux pour les thèmes clair et sombre.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {SURFACE_PALETTE_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplySurfacePreset(preset)}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#282830] hover:bg-slate-50 dark:hover:bg-[#18181D] text-[11px] font-semibold text-slate-700 dark:text-gray-300 cursor-pointer"
                  >
                    <span className="inline-flex items-center -space-x-1">
                      <span className="w-3 h-3 rounded-full border border-black/15" style={{ backgroundColor: preset.lightBgColor }} />
                      <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: preset.darkBgColor }} />
                    </span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {([
                  { key: 'lightBgColor', label: 'Fond général (Clair)' },
                  { key: 'lightSurfaceColor', label: 'Surfaces / Cartes (Clair)' },
                  { key: 'darkBgColor', label: 'Fond général (Sombre)' },
                  { key: 'darkSurfaceColor', label: 'Surfaces / Cartes (Sombre)' }
                ] as const).map(item => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-[#242428] bg-slate-50/50 dark:bg-[#151519]"
                  >
                    <span className="text-[11px] font-medium text-slate-700 dark:text-gray-300 truncate">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="color"
                        value={draft[item.key]}
                        onChange={(e) => handleSurfaceHexChange(item.key, e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border border-slate-300 dark:border-[#333] bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={surfaceHexInputs[item.key]}
                        onChange={(e) => handleSurfaceHexChange(item.key, e.target.value)}
                        maxLength={7}
                        spellCheck={false}
                        className="w-20 font-mono text-[11px] bg-white dark:bg-[#111112] border border-slate-300 dark:border-[#2E2E36] rounded px-1.5 py-1 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Global Font Family */}
            <section className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-4 sm:p-5 space-y-3.5">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Police globale de l’interface</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                  Typographie appliquée à l’ensemble de la navigation, des fiches et du répertoire.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {APP_BRANDING_FONTS.map(font => {
                  const selected = draft.fontFamily === font.id;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, fontFamily: font.id }))}
                      className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                        selected
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-[#242428] hover:bg-slate-50 dark:hover:bg-[#16161B]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-sm font-bold text-slate-900 dark:text-white"
                          style={{ fontFamily: font.cssFamily }}
                        >
                          {font.label}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-gray-400 shrink-0">
                          {font.category}
                        </span>
                      </div>
                      <div
                        className="text-[11px] text-slate-600 dark:text-gray-400 mt-1 truncate"
                        style={{ fontFamily: font.cssFamily }}
                      >
                        Abc 123 · Chants &amp; Louange
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Save / Discard / Reset Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224]">
              <div className="flex items-center gap-2">
                {!isConfirmingResetAll ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingResetAll(true)}
                    disabled={isSavingBranding}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2A2A32] hover:border-rose-500/40 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Valeurs par défaut</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isSavingBranding}
                      onClick={handleResetAllBranding}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Confirmer la réinitialisation
                    </button>
                    <button
                      type="button"
                      disabled={isSavingBranding}
                      onClick={() => setIsConfirmingResetAll(false)}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1E1E24] text-xs font-semibold text-slate-700 dark:text-gray-300 cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {hasUnsavedBrandingChanges && (
                  <button
                    type="button"
                    disabled={isSavingBranding}
                    onClick={handleDiscardBrandingChanges}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2A2A32] text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-[#1A1A20] cursor-pointer"
                  >
                    Annuler
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSavingBranding || !hasUnsavedBrandingChanges}
                  onClick={handleSaveBranding}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  {isSavingBranding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Application...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Enregistrer pour toute l’app</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right column: Live Preview */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-3">
            <div className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Aperçu en direct
                </span>
                <div className="inline-flex items-center p-0.5 rounded-lg bg-[#EDF1F5] dark:bg-[#18181D] border border-slate-200 dark:border-[#282830]">
                  <button
                    type="button"
                    onClick={() => setPreviewTheme('light')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                      previewTheme === 'light'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 dark:text-gray-400'
                    }`}
                  >
                    <Sun className="w-3 h-3" />
                    <span>Clair</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTheme('dark')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                      previewTheme === 'dark'
                        ? 'bg-[#22222A] text-white shadow-xs'
                        : 'text-slate-500 dark:text-gray-400'
                    }`}
                  >
                    <Moon className="w-3 h-3" />
                    <span>Sombre</span>
                  </button>
                </div>
              </div>

              {/* Preview Viewport Canvas */}
              <div
                className="rounded-xl overflow-hidden border transition-colors"
                style={{
                  backgroundColor: previewBg,
                  borderColor: previewBorder,
                  color: previewText,
                  fontFamily: previewFontMeta.cssFamily
                }}
              >
                {/* Simulated Top Bar */}
                <div
                  className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2"
                  style={{ backgroundColor: previewSurface, borderColor: previewBorder }}
                >
                  <div className="flex items-center gap-2">
                    <MelobookLogo
                      className="w-7 h-7"
                      overrideLogoUrl={draft.logoMode === 'custom' ? draft.customLogoDataUrl : null}
                      forceDefault={draft.logoMode === 'default'}
                    />
                    <span className="text-xs font-bold tracking-tight">Melobook</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                    <span className="px-2 py-1 rounded" style={{ color: draft.accentColor }}>
                      Chants
                    </span>
                    <span className="px-2 py-1 rounded" style={{ color: previewMuted }}>
                      Planning
                    </span>
                  </div>
                </div>

                {/* Simulated Content */}
                <div className="p-4 space-y-3">
                  <div
                    className="rounded-lg border p-3.5 space-y-2"
                    style={{ backgroundColor: previewSurface, borderColor: previewBorder }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold">Louange du Dimanche</div>
                        <div className="text-[11px] mt-0.5" style={{ color: previewMuted }}>
                          Police : {previewFontMeta.label} · 12 chants
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ backgroundColor: draft.accentColor, color: accentOnColor }}
                      >
                        Ouvrir
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px]" style={{ color: previewMuted }}>
                      Accent : <span className="font-mono font-semibold" style={{ color: draft.accentColor }}>{draft.accentColor}</span>
                    </span>
                    <span className="text-[11px]" style={{ color: previewMuted }}>
                      {hasUnsavedBrandingChanges ? 'Modifications non enregistrées' : 'Synchronisé en temps réel'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: DEFAULT INSTRUMENTS & VOCAL ROLES ==================== */}
      {subTab === 'skills' && (
        <div className="space-y-5">
          {/* Header summary & actions */}
          <div className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Référentiel global des instruments &amp; voix
              </h2>
              <p className="text-xs text-slate-600 dark:text-gray-400">
                Ces choix par défaut alimentent l’annuaire des membres et les pôles Musique / Chant du Planning dans toute l’application. Les renommages et suppressions mettent automatiquement à jour les fiches membres existantes.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {!isConfirmingResetSkills ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingResetSkills(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1A1A20] hover:bg-slate-200 dark:hover:bg-[#23232B] border border-slate-200 dark:border-[#2C2C34] text-xs font-semibold text-slate-700 dark:text-gray-300 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Valeurs standard</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isSavingSkills}
                    onClick={async () => {
                      setIsSavingSkills(true);
                      try {
                        await resetMemberSkillsConfig();
                        setIsConfirmingResetSkills(false);
                      } finally {
                        setIsSavingSkills(false);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Confirmer réinitialisation
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingResetSkills(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1A1A20] text-xs font-medium text-slate-600 dark:text-gray-300 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Annuler
                  </button>
                </div>
              )}

              {skillMutationSummary.hasChanges && (
                <button
                  type="button"
                  onClick={() => {
                    setInstDraft(toSkillDraftItems(memberSkillsConfig.instruments, 'inst'));
                    setVocDraft(toSkillDraftItems(memberSkillsConfig.vocalRoles, 'voc'));
                    setDeletedInstOriginals([]);
                    setDeletedVocOriginals([]);
                    setEditingSkillKey(null);
                    setSkillsError(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1A1A20] border border-slate-200 dark:border-[#2C2C34] text-xs font-semibold text-slate-700 dark:text-gray-300 cursor-pointer whitespace-nowrap shrink-0"
                >
                  Annuler
                </button>
              )}

              <button
                type="button"
                disabled={isSavingSkills || !skillMutationSummary.hasChanges}
                onClick={async () => {
                  if (isSavingSkills || !skillMutationSummary.hasChanges) return;
                  setIsSavingSkills(true);
                  setSkillsError(null);
                  try {
                    await saveMemberSkillsConfig(
                      {
                        id: 'member_skills',
                        instruments: instDraft.map(i => i.name),
                        vocalRoles: vocDraft.map(v => v.name)
                      },
                      {
                        instrumentRenames: skillMutationSummary.instRenames,
                        instrumentDeletions: skillMutationSummary.instDeletions,
                        vocalRoleRenames: skillMutationSummary.vocRenames,
                        vocalRoleDeletions: skillMutationSummary.vocDeletions
                      }
                    );
                  } catch {
                    setSkillsError('Erreur lors de la sauvegarde du référentiel.');
                  } finally {
                    setIsSavingSkills(false);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                {isSavingSkills ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Enregistrer &amp; Appliquer</span>
              </button>
            </div>
          </div>

          {skillsError && (
            <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
              <span>{skillsError}</span>
              <button type="button" onClick={() => setSkillsError(null)} className="cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {(skillMutationSummary.instRenames.length > 0 ||
            skillMutationSummary.instDeletions.length > 0 ||
            skillMutationSummary.vocRenames.length > 0 ||
            skillMutationSummary.vocDeletions.length > 0) && (
            <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="tabular-nums">
                Propagation prévue à l’enregistrement :{' '}
                {skillMutationSummary.instRenames.length + skillMutationSummary.vocRenames.length} renommage(s),{' '}
                {skillMutationSummary.instDeletions.length + skillMutationSummary.vocDeletions.length} suppression(s) sur les fiches membres existantes.
              </span>
            </div>
          )}

          {/* Two columns: Instruments & Vocal Roles */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Column 1: Instruments */}
            <section className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Instruments par défaut</span>
                </h3>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-gray-400">
                  {instDraft.length} / {MAX_DEFAULT_INSTRUMENTS}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newInstInput}
                  maxLength={80}
                  onChange={(e) => setNewInstInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    const trimmed = newInstInput.trim().slice(0, 80);
                    if (!trimmed) return;
                    if (instDraft.length >= MAX_DEFAULT_INSTRUMENTS) {
                      setSkillsError(`Maximum ${MAX_DEFAULT_INSTRUMENTS} instruments par défaut.`);
                      return;
                    }
                    if (instDraft.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) {
                      setSkillsError(`« ${trimmed} » existe déjà dans la liste des instruments.`);
                      return;
                    }
                    setSkillsError(null);
                    setInstDraft(prev => [...prev, { id: `inst_new_${Date.now()}`, name: trimmed, originalName: null }]);
                    setNewInstInput('');
                  }}
                  placeholder="Nouvel instrument par défaut..."
                  className="flex-1 bg-[#F4F6F9] dark:bg-[#17171C] border border-slate-200 dark:border-[#2A2A32] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = newInstInput.trim().slice(0, 80);
                    if (!trimmed) return;
                    if (instDraft.length >= MAX_DEFAULT_INSTRUMENTS) {
                      setSkillsError(`Maximum ${MAX_DEFAULT_INSTRUMENTS} instruments par défaut.`);
                      return;
                    }
                    if (instDraft.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) {
                      setSkillsError(`« ${trimmed} » existe déjà dans la liste des instruments.`);
                      return;
                    }
                    setSkillsError(null);
                    setInstDraft(prev => [...prev, { id: `inst_new_${Date.now()}`, name: trimmed, originalName: null }]);
                    setNewInstInput('');
                  }}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>

              {instDraft.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-gray-400 border border-dashed border-slate-200 dark:border-[#26262E] rounded-lg">
                  Aucun instrument par défaut configuré.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-[#202026] border border-slate-200 dark:border-[#222228] rounded-lg overflow-hidden">
                  {instDraft.map((item) => {
                    const editKey = `inst:${item.id}`;
                    const isEditing = editingSkillKey === editKey;
                    const isRenamed = Boolean(item.originalName && item.originalName !== item.name);
                    return (
                      <div key={item.id} className="px-3 py-2.5 flex items-center justify-between gap-2 bg-white dark:bg-[#111112] hover:bg-slate-50 dark:hover:bg-[#16161B]">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <input
                              type="text"
                              autoFocus
                              maxLength={80}
                              value={editingSkillValue}
                              onChange={(e) => setEditingSkillValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingSkillKey(null);
                                  return;
                                }
                                if (e.key !== 'Enter') return;
                                e.preventDefault();
                                const trimmed = editingSkillValue.trim().slice(0, 80);
                                if (!trimmed) return;
                                if (instDraft.some(other => other.id !== item.id && other.name.toLowerCase() === trimmed.toLowerCase())) {
                                  setSkillsError(`« ${trimmed} » existe déjà dans les instruments.`);
                                  return;
                                }
                                setSkillsError(null);
                                setInstDraft(prev => prev.map(x => x.id === item.id ? { ...x, name: trimmed } : x));
                                setEditingSkillKey(null);
                              }}
                              className="flex-1 bg-[#EDF1F5] dark:bg-[#1C1C22] border border-blue-500 rounded-md px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const trimmed = editingSkillValue.trim().slice(0, 80);
                                if (!trimmed) return;
                                if (instDraft.some(other => other.id !== item.id && other.name.toLowerCase() === trimmed.toLowerCase())) {
                                  setSkillsError(`« ${trimmed} » existe déjà dans les instruments.`);
                                  return;
                                }
                                setSkillsError(null);
                                setInstDraft(prev => prev.map(x => x.id === item.id ? { ...x, name: trimmed } : x));
                                setEditingSkillKey(null);
                              }}
                              className="p-1.5 rounded-md bg-blue-600 text-white cursor-pointer"
                              aria-label="Valider le renommage"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSkillKey(null)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              aria-label="Annuler"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                {item.name}
                              </div>
                              {isRenamed && (
                                <div className="text-[11px] text-amber-600 dark:text-amber-400 truncate">
                                  Renommé depuis « {item.originalName} »
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSkillKey(editKey);
                                  setEditingSkillValue(item.name);
                                }}
                                className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#1E1E24] cursor-pointer"
                                title="Renommer"
                                aria-label={`Renommer ${item.name}`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setInstDraft(prev => prev.filter(x => x.id !== item.id));
                                  if (item.originalName) {
                                    setDeletedInstOriginals(prev =>
                                      prev.some(d => d.toLowerCase() === item.originalName!.toLowerCase())
                                        ? prev
                                        : [...prev, item.originalName!]
                                    );
                                  }
                                }}
                                className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                title="Supprimer"
                                aria-label={`Supprimer ${item.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Column 2: Vocal Roles */}
            <section className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mic2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Voix &amp; Chant par défaut</span>
                </h3>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-gray-400">
                  {vocDraft.length} / {MAX_DEFAULT_VOCAL_ROLES}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newVocInput}
                  maxLength={80}
                  onChange={(e) => setNewVocInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    const trimmed = newVocInput.trim().slice(0, 80);
                    if (!trimmed) return;
                    if (vocDraft.length >= MAX_DEFAULT_VOCAL_ROLES) {
                      setSkillsError(`Maximum ${MAX_DEFAULT_VOCAL_ROLES} voix par défaut.`);
                      return;
                    }
                    if (vocDraft.some(v => v.name.toLowerCase() === trimmed.toLowerCase())) {
                      setSkillsError(`« ${trimmed} » existe déjà dans la liste des voix.`);
                      return;
                    }
                    setSkillsError(null);
                    setVocDraft(prev => [...prev, { id: `voc_new_${Date.now()}`, name: trimmed, originalName: null }]);
                    setNewVocInput('');
                  }}
                  placeholder="Nouvelle voix / rôle vocal par défaut..."
                  className="flex-1 bg-[#F4F6F9] dark:bg-[#17171C] border border-slate-200 dark:border-[#2A2A32] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = newVocInput.trim().slice(0, 80);
                    if (!trimmed) return;
                    if (vocDraft.length >= MAX_DEFAULT_VOCAL_ROLES) {
                      setSkillsError(`Maximum ${MAX_DEFAULT_VOCAL_ROLES} voix par défaut.`);
                      return;
                    }
                    if (vocDraft.some(v => v.name.toLowerCase() === trimmed.toLowerCase())) {
                      setSkillsError(`« ${trimmed} » existe déjà dans la liste des voix.`);
                      return;
                    }
                    setSkillsError(null);
                    setVocDraft(prev => [...prev, { id: `voc_new_${Date.now()}`, name: trimmed, originalName: null }]);
                    setNewVocInput('');
                  }}
                  className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>

              {vocDraft.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-gray-400 border border-dashed border-slate-200 dark:border-[#26262E] rounded-lg">
                  Aucune voix par défaut configurée.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-[#202026] border border-slate-200 dark:border-[#222228] rounded-lg overflow-hidden">
                  {vocDraft.map((item) => {
                    const editKey = `voc:${item.id}`;
                    const isEditing = editingSkillKey === editKey;
                    const isRenamed = Boolean(item.originalName && item.originalName !== item.name);
                    return (
                      <div key={item.id} className="px-3 py-2.5 flex items-center justify-between gap-2 bg-white dark:bg-[#111112] hover:bg-slate-50 dark:hover:bg-[#16161B]">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <input
                              type="text"
                              autoFocus
                              maxLength={80}
                              value={editingSkillValue}
                              onChange={(e) => setEditingSkillValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingSkillKey(null);
                                  return;
                                }
                                if (e.key !== 'Enter') return;
                                e.preventDefault();
                                const trimmed = editingSkillValue.trim().slice(0, 80);
                                if (!trimmed) return;
                                if (vocDraft.some(other => other.id !== item.id && other.name.toLowerCase() === trimmed.toLowerCase())) {
                                  setSkillsError(`« ${trimmed} » existe déjà dans les voix.`);
                                  return;
                                }
                                setSkillsError(null);
                                setVocDraft(prev => prev.map(x => x.id === item.id ? { ...x, name: trimmed } : x));
                                setEditingSkillKey(null);
                              }}
                              className="flex-1 bg-[#EDF1F5] dark:bg-[#1C1C22] border border-purple-500 rounded-md px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const trimmed = editingSkillValue.trim().slice(0, 80);
                                if (!trimmed) return;
                                if (vocDraft.some(other => other.id !== item.id && other.name.toLowerCase() === trimmed.toLowerCase())) {
                                  setSkillsError(`« ${trimmed} » existe déjà dans les voix.`);
                                  return;
                                }
                                setSkillsError(null);
                                setVocDraft(prev => prev.map(x => x.id === item.id ? { ...x, name: trimmed } : x));
                                setEditingSkillKey(null);
                              }}
                              className="p-1.5 rounded-md bg-purple-600 text-white cursor-pointer"
                              aria-label="Valider le renommage"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSkillKey(null)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              aria-label="Annuler"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                {item.name}
                              </div>
                              {isRenamed && (
                                <div className="text-[11px] text-amber-600 dark:text-amber-400 truncate">
                                  Renommé depuis « {item.originalName} »
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSkillKey(editKey);
                                  setEditingSkillValue(item.name);
                                }}
                                className="p-1.5 rounded-md text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-[#1E1E24] cursor-pointer"
                                title="Renommer"
                                aria-label={`Renommer ${item.name}`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setVocDraft(prev => prev.filter(x => x.id !== item.id));
                                  if (item.originalName) {
                                    setDeletedVocOriginals(prev =>
                                      prev.some(d => d.toLowerCase() === item.originalName!.toLowerCase())
                                        ? prev
                                        : [...prev, item.originalName!]
                                    );
                                  }
                                }}
                                className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                title="Supprimer"
                                aria-label={`Supprimer ${item.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ==================== MODAL: LIBRARY MEMBER ACCESS INSPECTOR ==================== */}
      {liveInspectGroup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#24242A] rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-[#222226] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  Accès membres · {liveInspectGroup.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                  Code : <span className="font-mono font-semibold">{liveInspectGroup.inviteCode}</span> · {(liveInspectGroup.members || []).length} membre(s)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectGroup(null);
                  setInspectMembers([]);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E1E24] cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-slate-200 dark:border-[#222226] bg-slate-50/70 dark:bg-[#151519]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Filtrer les membres par nom ou email..."
                  className="w-full bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#2A2A32] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-[#1F1F24]">
              {isLoadingMembers ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span>Chargement des membres...</span>
                </div>
              ) : filteredInspectMembers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 dark:text-gray-400">
                  Aucun membre trouvé dans cette bibliothèque.
                </div>
              ) : (
                filteredInspectMembers.map(member => {
                  const isOwner = member.uid === liveInspectGroup.ownerId;
                  const accesses = member.accesses || ['pupitre'];
                  const isBusy = updatingMemberUid === member.uid;
                  return (
                    <div key={member.uid} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          displayName={member.displayName}
                          sizeClass="w-8 h-8 text-xs"
                          iconClass="w-4 h-4"
                          fallbackClassName="bg-slate-100 dark:bg-[#1C1C22] border border-slate-200 dark:border-[#2C2C34] text-slate-800 dark:text-white"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {member.displayName}
                            </span>
                            {isOwner && (
                              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                                Propriétaire
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-gray-400 truncate">
                            {member.email || formatAccessSummary(accesses)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap shrink-0">
                        {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 mr-1" />}
                        {ACCESS_ORDER.map(acc => {
                          const enabled = isOwner || accesses.includes(acc);
                          const def = ACCESS_DEFINITIONS[acc];
                          return (
                            <button
                              key={acc}
                              type="button"
                              disabled={isOwner || isBusy}
                              onClick={() => handleToggleMemberAccess(member, acc)}
                              className={`px-2 py-1 rounded-md border text-[10px] font-semibold transition-colors ${
                                enabled
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-slate-50 dark:bg-[#16161B] border-slate-200 dark:border-[#2A2A32] text-slate-600 dark:text-gray-400 hover:border-blue-500/40'
                              } ${isOwner ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {def.shortLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DELETE LIBRARY CONFIRMATION ==================== */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141418] border border-slate-200 dark:border-[#2E2E38] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Supprimer la bibliothèque ?
                </h3>
                <p className="text-xs text-slate-600 dark:text-gray-400 mt-0.5 truncate">
                  « <strong className="text-slate-900 dark:text-white">{groupToDelete.name}</strong> »
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed">
              Cette action est irréversible. Les membres perdront l’accès à cette bibliothèque ({groupToDelete.inviteCode}).
            </p>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deleteAssociatedData}
                onChange={(e) => setDeleteAssociatedData(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-rose-600 cursor-pointer"
              />
              <span>Supprimer également les chants et setlists associés</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#24242A]">
              <button
                type="button"
                disabled={isDeletingGroup}
                onClick={() => setGroupToDelete(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-[#1E1E24] text-xs font-semibold text-slate-700 dark:text-gray-300 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeletingGroup}
                onClick={handleConfirmDeleteGroup}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Supprimer définitivement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
