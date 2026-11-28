import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar,
  Check,
  Edit3,
  Layers,
  Mail,
  Mic2,
  Music2,
  Plus,
  Search,
  Settings2,
  Shield,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { AccessPermission, MemberGroup, MemberGroupColor, UserProfile } from '../types';
import { useApp } from '../context/AppContext';
import {
  ACCESS_DEFINITIONS,
  ACCESS_ORDER,
  formatAccessSummary,
  resolveMemberAccesses,
  toggleAccessInList
} from '../utils/accessUtils';
import {
  formatPlanningDateFr,
  getTodayIsoDate,
  isValidIsoDate
} from '../utils/planningUtils';
import { MODAL_BACKDROP_MOTION, MODAL_PANEL_MOTION } from '../utils/motionPresets';
import { UserAvatar } from '../utils/avatarPresets';
import { includesAllTokensIgnoreAccents } from '../utils/songSearchUtils';
import {
  MEMBER_GROUP_COLORS,
  MEMBER_GROUP_COLOR_ORDER,
  buildMemberGroupsByUid,
  countActiveMembersInGroup,
  normalizeMemberGroupColor
} from '../utils/memberGroupsUtils';

export const MembersDirectory: React.FC = () => {
  const {
    currentUser,
    currentGroup,
    allUsers,
    memberSkillsConfig,
    planningAssignments,
    memberGroups,
    canManagePlanning,
    canManageGroups,
    updateMemberDirectoryInfo,
    updateUserAccesses,
    createMemberGroup,
    updateMemberGroup,
    deleteMemberGroup,
    setMemberGroupAssignmentsForMember,
    setActiveTab,
    setSelectedPlanningTargetId
  } = useApp();

  const defaultInstruments = memberSkillsConfig?.instruments || [];
  const defaultVocalRoles = memberSkillsConfig?.vocalRoles || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState<'all' | AccessPermission>('all');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Detail & Edit modal state
  const [inspectingMember, setInspectingMember] = useState<UserProfile | null>(null);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [draftInstruments, setDraftInstruments] = useState<string[]>([]);
  const [draftVocalRoles, setDraftVocalRoles] = useState<string[]>([]);
  const [draftGroupIds, setDraftGroupIds] = useState<string[]>([]);
  const [customInstrumentInput, setCustomInstrumentInput] = useState('');
  const [customVocalInput, setCustomVocalInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Member Groups manager modal state
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupDraftName, setGroupDraftName] = useState('');
  const [groupDraftDesc, setGroupDraftDesc] = useState('');
  const [groupDraftColor, setGroupDraftColor] = useState<MemberGroupColor>('blue');
  const [groupDraftMemberIds, setGroupDraftMemberIds] = useState<string[]>([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState('');
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);

  const todayIso = getTodayIsoDate();

  const canManageMemberGroups = canManagePlanning || canManageGroups;

  const canEditMember = (member: UserProfile) =>
    Boolean(
      currentUser &&
        (member.uid === currentUser.uid || canManagePlanning || canManageGroups)
    );

  const activeUserUids = useMemo(() => new Set(allUsers.map(u => u.uid)), [allUsers]);
  const memberGroupsByUid = useMemo(() => buildMemberGroupsByUid(memberGroups), [memberGroups]);

  // Build dynamic list of all instruments + vocal roles present across members
  const { availableInstruments, availableVocals } = useMemo(() => {
    const instSet = new Set<string>();
    const vocalSet = new Set<string>();
    for (const u of allUsers) {
      for (const inst of u.instruments || []) {
        if (inst.trim()) instSet.add(inst.trim());
      }
      for (const v of u.vocalRoles || []) {
        if (v.trim()) vocalSet.add(v.trim());
      }
    }
    return {
      availableInstruments: Array.from(instSet).sort((a, b) => a.localeCompare(b, 'fr')),
      availableVocals: Array.from(vocalSet).sort((a, b) => a.localeCompare(b, 'fr'))
    };
  }, [allUsers]);

  // Compute upcoming scheduled slots per uid
  const upcomingServicesByUid = useMemo(() => {
    const map = new Map<string, Array<{ targetId: string; date: string; title: string; roleLabel: string }>>();
    for (const pa of planningAssignments) {
      if (!isValidIsoDate(pa.date) || pa.date < todayIso) continue;
      for (const slot of pa.slots || []) {
        if (!slot.uid) continue;
        const list = map.get(slot.uid) || [];
        list.push({
          targetId: pa.setlistId || pa.id,
          date: pa.date,
          title: pa.title,
          roleLabel: slot.roleLabel
        });
        map.set(slot.uid, list);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.date.localeCompare(b.date));
    }
    return map;
  }, [planningAssignments, todayIso]);

  // Access counts for filter tabs
  const accessCounts = useMemo(() => {
    const counts: Record<'all' | AccessPermission, number> = {
      all: allUsers.length,
      admin: 0,
      setlists: 0,
      chants: 0,
      pupitre: 0,
      regie: 0
    };
    for (const u of allUsers) {
      const accs = resolveMemberAccesses(currentGroup, u.uid, u.role, u.accesses);
      for (const key of ACCESS_ORDER) {
        if (accs.includes(key)) counts[key] += 1;
      }
    }
    return counts;
  }, [allUsers, currentGroup]);

  // Filtered & sorted members (owner / self / alphabetical)
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim();
    return allUsers
      .filter(u => {
        const accs = resolveMemberAccesses(currentGroup, u.uid, u.role, u.accesses);
        if (accessFilter !== 'all' && !accs.includes(accessFilter)) {
          return false;
        }
        if (skillFilter !== 'all') {
          const allSkills = [...(u.instruments || []), ...(u.vocalRoles || [])];
          if (!allSkills.some(s => s.toLowerCase() === skillFilter.toLowerCase())) {
            return false;
          }
        }
        const uGroups = memberGroupsByUid.get(u.uid) || [];
        if (groupFilter !== 'all' && !uGroups.some(mg => mg.id === groupFilter)) {
          return false;
        }
        if (q) {
          const haystack = [
            u.displayName,
            u.email,
            ...(u.instruments || []),
            ...(u.vocalRoles || []),
            ...uGroups.map(mg => mg.name),
            formatAccessSummary(accs)
          ].join(' ');
          if (!includesAllTokensIgnoreAccents(haystack, q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (a.uid === currentUser?.uid) return -1;
        if (b.uid === currentUser?.uid) return 1;
        return (a.displayName || a.email || '').localeCompare(
          b.displayName || b.email || '',
          'fr'
        );
      });
  }, [allUsers, currentGroup, accessFilter, skillFilter, groupFilter, searchQuery, memberGroupsByUid, currentUser?.uid]);

  const hasActiveFilter = Boolean(
    accessFilter !== 'all' || skillFilter !== 'all' || groupFilter !== 'all' || searchQuery.trim()
  );

  useEffect(() => {
    if (groupFilter !== 'all' && !memberGroups.some(mg => mg.id === groupFilter)) {
      setGroupFilter('all');
    }
  }, [groupFilter, memberGroups]);

  // Keep inspectingMember synced with updated allUsers
  useEffect(() => {
    if (!inspectingMember) return;
    const fresh = allUsers.find(u => u.uid === inspectingMember.uid);
    if (fresh) setInspectingMember(fresh);
  }, [allUsers, inspectingMember]);

  // Escape key closes topmost modal
  useEffect(() => {
    if (!editingMember && !inspectingMember && !isGroupsModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isGroupsModalOpen) setIsGroupsModalOpen(false);
      else if (editingMember) setEditingMember(null);
      else if (inspectingMember) setInspectingMember(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingMember, inspectingMember, isGroupsModalOpen]);

  const openEditModal = (member: UserProfile) => {
    setEditingMember(member);
    setDraftInstruments(member.instruments || []);
    setDraftVocalRoles(member.vocalRoles || []);
    setDraftGroupIds((memberGroupsByUid.get(member.uid) || []).map(mg => mg.id));
    setCustomInstrumentInput('');
    setCustomVocalInput('');
  };

  const resetGroupEditorToNew = () => {
    setEditingGroupId(null);
    setGroupDraftName('');
    setGroupDraftDesc('');
    setGroupDraftColor('blue');
    setGroupDraftMemberIds([]);
    setGroupMemberSearch('');
    setConfirmDeleteGroupId(null);
  };

  const loadGroupIntoEditor = (group: MemberGroup) => {
    setEditingGroupId(group.id);
    setGroupDraftName(group.name || '');
    setGroupDraftDesc(group.description || '');
    setGroupDraftColor(normalizeMemberGroupColor(group.color));
    setGroupDraftMemberIds((group.memberIds || []).filter(uid => activeUserUids.has(uid)));
    setGroupMemberSearch('');
    setConfirmDeleteGroupId(null);
  };

  const openGroupsModal = () => {
    if (memberGroups.length > 0) {
      loadGroupIntoEditor(memberGroups[0]);
    } else {
      resetGroupEditorToNew();
    }
    setIsGroupsModalOpen(true);
  };

  const toggleMemberInGroupDraft = (uid: string) => {
    setGroupDraftMemberIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMemberGroups || isSavingGroup) return;
    const cleanName = groupDraftName.trim();
    if (!cleanName) return;

    setIsSavingGroup(true);
    try {
      if (editingGroupId) {
        await updateMemberGroup(editingGroupId, {
          name: cleanName,
          description: groupDraftDesc,
          color: groupDraftColor,
          memberIds: groupDraftMemberIds
        });
      } else {
        const createdId = await createMemberGroup({
          name: cleanName,
          description: groupDraftDesc,
          color: groupDraftColor,
          memberIds: groupDraftMemberIds
        });
        if (createdId) {
          setEditingGroupId(createdId);
        }
      }
      setConfirmDeleteGroupId(null);
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!canManageMemberGroups) return;
    if (confirmDeleteGroupId !== id) {
      setConfirmDeleteGroupId(id);
      return;
    }
    await deleteMemberGroup(id);
    setConfirmDeleteGroupId(null);
    const remaining = memberGroups.filter(mg => mg.id !== id);
    if (remaining.length > 0) {
      loadGroupIntoEditor(remaining[0]);
    } else {
      resetGroupEditorToNew();
    }
  };

  const filteredModalMembers = useMemo(() => {
    const q = groupMemberSearch.trim();
    const sorted = [...allUsers].sort((a, b) =>
      (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '', 'fr')
    );
    if (!q) return sorted;
    return sorted.filter(u => {
      const haystack = [
        u.displayName,
        u.email,
        ...(u.instruments || []),
        ...(u.vocalRoles || [])
      ].join(' ');
      return includesAllTokensIgnoreAccents(haystack, q);
    });
  }, [allUsers, groupMemberSearch]);

  const toggleItem = (list: string[], value: string): string[] => {
    const exists = list.some(item => item.toLowerCase() === value.toLowerCase());
    if (exists) return list.filter(item => item.toLowerCase() !== value.toLowerCase());
    return [...list, value];
  };

  const handleAddCustomInstrument = () => {
    const trimmed = customInstrumentInput.trim().slice(0, 80);
    if (!trimmed) return;
    if (!draftInstruments.some(i => i.toLowerCase() === trimmed.toLowerCase())) {
      setDraftInstruments(prev => [...prev, trimmed]);
    }
    setCustomInstrumentInput('');
  };

  const handleAddCustomVocal = () => {
    const trimmed = customVocalInput.trim().slice(0, 80);
    if (!trimmed) return;
    if (!draftVocalRoles.some(v => v.toLowerCase() === trimmed.toLowerCase())) {
      setDraftVocalRoles(prev => [...prev, trimmed]);
    }
    setCustomVocalInput('');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || isSaving) return;
    setIsSaving(true);
    try {
      await updateMemberDirectoryInfo(editingMember.uid, {
        instruments: draftInstruments,
        vocalRoles: draftVocalRoles
      });
      if (canManageMemberGroups && memberGroups.length > 0) {
        await setMemberGroupAssignmentsForMember(editingMember.uid, draftGroupIds);
      }
      setEditingMember(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 text-slate-900 dark:text-[#E0E0E0]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Membres</span>
          </h1>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-gray-400">
            {hasActiveFilter
              ? `${filteredMembers.length} / ${allUsers.length} affiché${filteredMembers.length > 1 ? 's' : ''}`
              : `${allUsers.length} au total`}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentUser && (
            <button
              type="button"
              onClick={() => {
                const me = allUsers.find(u => u.uid === currentUser.uid) || currentUser;
                openEditModal(me);
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Ma fiche musicale</span>
            </button>
          )}

          {canManageMemberGroups && (
            <button
              type="button"
              onClick={openGroupsModal}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#111112] hover:bg-slate-100 dark:hover:bg-[#1C1C22] border border-slate-200 dark:border-[#222224] text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Groupes</span>
              {memberGroups.length > 0 && (
                <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-gray-400">
                  {memberGroups.length}
                </span>
              )}
            </button>
          )}

          {canManageGroups && (
            <button
              type="button"
              onClick={() => setActiveTab('groups')}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#111112] hover:bg-slate-100 dark:hover:bg-[#1C1C22] border border-slate-200 dark:border-[#222224] text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
              <span>Invitations &amp; Bibliothèque</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2.5">
          {/* Fast Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && searchQuery) {
                  e.stopPropagation();
                  setSearchQuery('');
                }
              }}
              aria-label="Rechercher un membre, un instrument ou une voix"
              placeholder="Rechercher un membre, un instrument, une voix..."
              className="w-full bg-[#F4F6F9] dark:bg-[#17171C] border border-slate-200 dark:border-[#2A2A32] rounded-lg pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                aria-label="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Instrument / Voice Dropdown Filter */}
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            aria-label="Filtrer par instrument ou voix"
            className="bg-[#F4F6F9] dark:bg-[#17171C] border border-slate-200 dark:border-[#2A2A32] rounded-lg px-3 py-2 text-xs font-medium text-slate-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer md:w-60"
          >
            <option value="all">Tous instruments &amp; voix</option>
            {availableInstruments.length > 0 && (
              <optgroup label="Instruments">
                {availableInstruments.map(inst => (
                  <option key={`inst-${inst}`} value={inst}>
                    {inst}
                  </option>
                ))}
              </optgroup>
            )}
            {availableVocals.length > 0 && (
              <optgroup label="Voix / Chant">
                {availableVocals.map(voc => (
                  <option key={`voc-${voc}`} value={voc}>
                    {voc}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {memberGroups.length > 0 && (
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              aria-label="Filtrer par groupe de membres"
              className="bg-[#F4F6F9] dark:bg-[#17171C] border border-slate-200 dark:border-[#2A2A32] rounded-lg px-3 py-2 text-xs font-medium text-slate-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer md:w-56"
            >
              <option value="all">Tous les groupes</option>
              {memberGroups.map(mg => {
                const count = countActiveMembersInGroup(mg, activeUserUids);
                return (
                  <option key={mg.id} value={mg.id}>
                    {mg.name} ({count})
                  </option>
                );
              })}
            </select>
          )}
        </div>

        {/* Access Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setAccessFilter('all')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              accessFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-[#F4F6F9] dark:bg-[#17171C] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Tous</span>
            <span className="text-[11px] font-mono tabular-nums opacity-80">
              {accessCounts.all}
            </span>
          </button>

          {ACCESS_ORDER.map(acc => {
            const meta = ACCESS_DEFINITIONS[acc];
            const active = accessFilter === acc;
            return (
              <button
                key={acc}
                type="button"
                onClick={() => setAccessFilter(acc)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#F4F6F9] dark:bg-[#17171C] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{meta.shortLabel}</span>
                <span className="text-[11px] font-mono tabular-nums opacity-80">
                  {accessCounts[acc]}
                </span>
              </button>
            );
          })}

          {hasActiveFilter && (
            <div className="ml-auto flex items-center gap-2.5 shrink-0">
              <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-gray-400">
                {filteredMembers.length} résultat{filteredMembers.length > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAccessFilter('all');
                  setSkillFilter('all');
                  setGroupFilter('all');
                  setSearchQuery('');
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trombinoscope Grid */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-10 text-center space-y-2.5">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">
            Aucun membre trouvé
          </p>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Ajustez la recherche ou les filtres d’accès pour afficher les membres de la bibliothèque.
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setAccessFilter('all');
                setSkillFilter('all');
                setGroupFilter('all');
                setSearchQuery('');
              }}
              className="mt-1 px-3 py-1.5 rounded-lg bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-xs font-semibold text-slate-800 dark:text-gray-200 cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMembers.map((member, index) => {
            const accesses = resolveMemberAccesses(
              currentGroup,
              member.uid,
              member.role,
              member.accesses
            );
            const isOwner = Boolean(currentGroup?.ownerId && currentGroup.ownerId === member.uid);
            const isSelf = currentUser?.uid === member.uid;
            const instruments = member.instruments || [];
            const vocalRoles = member.vocalRoles || [];
            const memberGroupsList = memberGroupsByUid.get(member.uid) || [];
            const upcoming = upcomingServicesByUid.get(member.uid) || [];
            const editable = canEditMember(member);

            return (
              <div
                key={`${member.uid}-${index}`}
                onClick={() => setInspectingMember(member)}
                className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] hover:border-blue-500/40 rounded-xl p-4 flex flex-col justify-between gap-3.5 transition-colors cursor-pointer group"
              >
                <div className="space-y-3">
                  {/* Trombinoscope Top: Portrait + Name + Unboxed Access Line */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        displayName={member.displayName}
                        sizeClass="w-12 h-12 text-base"
                        iconClass="w-5 h-5"
                        fallbackClassName="bg-[#EDF1F5] dark:bg-[#1C1C22] text-slate-700 dark:text-gray-200 border border-slate-300 dark:border-[#32323A]"
                      />
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {member.displayName || 'Membre'}
                          {isSelf && (
                            <span className="ml-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                              (Moi)
                            </span>
                          )}
                        </h2>
                        <div className="text-[11px] text-slate-500 dark:text-gray-400 truncate mt-0.5">
                          {isOwner
                            ? 'Propriétaire · Admin'
                            : accesses.map(a => ACCESS_DEFINITIONS[a].shortLabel).join(' · ')}
                        </div>
                      </div>
                    </div>

                    {editable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(member);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C1C22] cursor-pointer shrink-0"
                        title="Modifier la fiche"
                        aria-label={`Modifier la fiche de ${member.displayName}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Instruments & Voices */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      <Music2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 text-slate-700 dark:text-gray-300">
                        {instruments.length > 0 ? (
                          instruments.join(' · ')
                        ) : (
                          <span className="text-slate-400 dark:text-gray-500">
                            Aucun instrument renseigné
                          </span>
                        )}
                      </div>
                    </div>

                    {vocalRoles.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Mic2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 text-slate-700 dark:text-gray-300">
                          {vocalRoles.join(' · ')}
                        </div>
                      </div>
                    )}

                    {memberGroupsList.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 text-slate-600 dark:text-gray-400 font-medium">
                          {memberGroupsList.map(mg => mg.name).join(' · ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Next service / email */}
                <div className="pt-2.5 border-t border-slate-200 dark:border-[#202026] flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-gray-400">
                  <span className="truncate font-mono">
                    {member.email || '—'}
                  </span>
                  {upcoming.length > 0 && (
                    <span className="shrink-0 font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatPlanningDateFr(upcoming[0].date)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== MODAL: MEMBER DETAIL (TROMBINOSCOPE CARD) ==================== */}
      <AnimatePresence>
        {inspectingMember && (
          <motion.div
            {...MODAL_BACKDROP_MOTION}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setInspectingMember(null)}
          >
            <motion.div
              {...MODAL_PANEL_MOTION}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-200 dark:border-[#222224] flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <UserAvatar
                    displayName={inspectingMember.displayName}
                    sizeClass="w-16 h-16 text-xl"
                    iconClass="w-6 h-6"
                    fallbackClassName="bg-[#EDF1F5] dark:bg-[#1C1C22] text-slate-700 dark:text-gray-200 border border-slate-300 dark:border-[#32323A]"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {inspectingMember.displayName || 'Membre'}
                      {currentUser?.uid === inspectingMember.uid && (
                        <span className="ml-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                          (Moi)
                        </span>
                      )}
                    </h2>
                    {inspectingMember.email && (
                      <div className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1.5 truncate font-mono">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{inspectingMember.email}</span>
                      </div>
                    )}
                    <div className="text-xs text-slate-600 dark:text-gray-400">
                      {currentGroup?.ownerId === inspectingMember.uid
                        ? 'Propriétaire · Admin'
                        : formatAccessSummary(
                            resolveMemberAccesses(
                              currentGroup,
                              inspectingMember.uid,
                              inspectingMember.role,
                              inspectingMember.accesses
                            )
                          )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {canEditMember(inspectingMember) && (
                    <button
                      type="button"
                      onClick={() => openEditModal(inspectingMember)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-xs font-semibold text-slate-800 dark:text-gray-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setInspectingMember(null)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    aria-label="Fermer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* Instruments */}
                <div className="space-y-1">
                  <div className="font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Music2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Instruments joués</span>
                  </div>
                  <div className="text-slate-700 dark:text-gray-300">
                    {inspectingMember.instruments && inspectingMember.instruments.length > 0 ? (
                      inspectingMember.instruments.join(' · ')
                    ) : (
                      <span className="text-slate-400 dark:text-gray-500">
                        Aucun instrument renseigné
                      </span>
                    )}
                  </div>
                </div>

                {/* Vocal Roles */}
                <div className="space-y-1">
                  <div className="font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Mic2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Voix &amp; Chant</span>
                  </div>
                  <div className="text-slate-700 dark:text-gray-300">
                    {inspectingMember.vocalRoles && inspectingMember.vocalRoles.length > 0 ? (
                      inspectingMember.vocalRoles.join(' · ')
                    ) : (
                      <span className="text-slate-400 dark:text-gray-500">
                        Non renseigné
                      </span>
                    )}
                  </div>
                </div>

                {/* Member Groups */}
                <div className="space-y-1">
                  <div className="font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Groupes</span>
                  </div>
                  <div className="text-slate-700 dark:text-gray-300">
                    {(() => {
                      const assignedGroups = memberGroupsByUid.get(inspectingMember.uid) || [];
                      if (assignedGroups.length === 0) {
                        return (
                          <span className="text-slate-400 dark:text-gray-500">
                            Aucun groupe attribué
                          </span>
                        );
                      }
                      return assignedGroups.map(mg => mg.name).join(' · ');
                    })()}
                  </div>
                </div>

                {/* Admin quick access editor */}
                {canManageGroups && (
                  <div className="pt-3 border-t border-slate-200 dark:border-[#222224] space-y-2">
                    <div className="font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Accès bibliothèque</span>
                    </div>
                    {(() => {
                      const isOwner = Boolean(
                        currentGroup?.ownerId && currentGroup.ownerId === inspectingMember.uid
                      );
                      const memberAccs = resolveMemberAccesses(
                        currentGroup,
                        inspectingMember.uid,
                        inspectingMember.role,
                        inspectingMember.accesses
                      );
                      return (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ACCESS_ORDER.map(acc => {
                            const active = memberAccs.includes(acc);
                            return (
                              <button
                                key={acc}
                                type="button"
                                disabled={isOwner}
                                onClick={() =>
                                  updateUserAccesses(
                                    inspectingMember.uid,
                                    toggleAccessInList(memberAccs, acc, isOwner)
                                  )
                                }
                                className={`px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                  active
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : 'bg-[#F4F6F9] dark:bg-[#17171C] border-slate-200 dark:border-[#2A2A32] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                {ACCESS_DEFINITIONS[acc].shortLabel}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Upcoming scheduled dates */}
                <div className="pt-3 border-t border-slate-200 dark:border-[#222224] space-y-2">
                  <div className="font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Prochains services</span>
                  </div>
                  {(() => {
                    const upcoming = upcomingServicesByUid.get(inspectingMember.uid) || [];
                    if (upcoming.length === 0) {
                      return (
                        <div className="text-slate-400 dark:text-gray-500">
                          Aucune affectation à venir.
                        </div>
                      );
                    }
                    return (
                      <div className="divide-y divide-slate-200 dark:divide-[#202026] border border-slate-200 dark:border-[#242429] rounded-lg">
                        {upcoming.slice(0, 6).map((item, idx) => (
                          <button
                            key={`${item.targetId}-${idx}`}
                            type="button"
                            onClick={() => {
                              setSelectedPlanningTargetId(item.targetId);
                              setInspectingMember(null);
                              setActiveTab('planning');
                            }}
                            className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-[#18181D] cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-white truncate">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-gray-400">
                                {item.roleLabel}
                              </div>
                            </div>
                            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 tabular-nums shrink-0">
                              {formatPlanningDateFr(item.date)}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL: EDIT MEMBER INSTRUMENTS & VOICES ==================== */}
      <AnimatePresence>
        {editingMember && (
          <motion.div
            {...MODAL_BACKDROP_MOTION}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingMember(null)}
          >
            <motion.div
              {...MODAL_PANEL_MOTION}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-200 dark:border-[#222224] flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Fiche de {editingMember.displayName || 'Membre'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* Instruments multi-selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Music2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Instruments joués (sélection multiple)</span>
                    </label>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-gray-400">
                      {draftInstruments.length} sélectionné{draftInstruments.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Array.from(new Set([...defaultInstruments, ...draftInstruments])).map(inst => {
                      const active = draftInstruments.some(
                        i => i.toLowerCase() === inst.toLowerCase()
                      );
                      return (
                        <button
                          key={inst}
                          type="button"
                          onClick={() => setDraftInstruments(prev => toggleItem(prev, inst))}
                          className={`px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                            active
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-[#F4F6F9] dark:bg-[#17171C] border-slate-200 dark:border-[#2A2A32] text-slate-700 dark:text-gray-300 hover:border-slate-400'
                          }`}
                        >
                          {active && <Check className="w-3 h-3 shrink-0" />}
                          <span>{inst}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customInstrumentInput}
                      onChange={(e) => setCustomInstrumentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomInstrument();
                        }
                      }}
                      placeholder="Autre instrument (ex: Accordéon, Flûte)..."
                      maxLength={80}
                      className="flex-1 bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomInstrument}
                      className="px-2.5 py-1.5 rounded-md bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-slate-800 dark:text-gray-200 font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                </div>

                {/* Vocal Roles cumulative selection */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#222224]">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Mic2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Voix &amp; Chant (cumulables)</span>
                    </label>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-gray-400">
                      {draftVocalRoles.length} sélectionnée{draftVocalRoles.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Array.from(new Set([...defaultVocalRoles, ...draftVocalRoles])).map(voc => {
                      const active = draftVocalRoles.some(
                        v => v.toLowerCase() === voc.toLowerCase()
                      );
                      return (
                        <button
                          key={voc}
                          type="button"
                          onClick={() => setDraftVocalRoles(prev => toggleItem(prev, voc))}
                          className={`px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                            active
                              ? 'bg-purple-600 text-white border-purple-500'
                              : 'bg-[#F4F6F9] dark:bg-[#17171C] border-slate-200 dark:border-[#2A2A32] text-slate-700 dark:text-gray-300 hover:border-slate-400'
                          }`}
                        >
                          {active && <Check className="w-3 h-3 shrink-0" />}
                          <span>{voc}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customVocalInput}
                      onChange={(e) => setCustomVocalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomVocal();
                        }
                      }}
                      placeholder="Autre rôle vocal..."
                      maxLength={80}
                      className="flex-1 bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomVocal}
                      className="px-2.5 py-1.5 rounded-md bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-slate-800 dark:text-gray-200 font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                </div>

                {/* Cumulative Member Groups Assignment (Managers & Admins) */}
                {canManageMemberGroups && memberGroups.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#222224]">
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Groupes (cumulables)</span>
                      </label>
                      <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-gray-400">
                        {draftGroupIds.length} sélectionné{draftGroupIds.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {memberGroups.map(mg => {
                        const active = draftGroupIds.includes(mg.id);
                        const colorMeta = MEMBER_GROUP_COLORS[normalizeMemberGroupColor(mg.color)];
                        return (
                          <button
                            key={mg.id}
                            type="button"
                            onClick={() =>
                              setDraftGroupIds(prev =>
                                prev.includes(mg.id)
                                  ? prev.filter(id => id !== mg.id)
                                  : [...prev, mg.id]
                              )
                            }
                            className={`px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                              active
                                ? colorMeta.activeButtonClass
                                : 'bg-[#F4F6F9] dark:bg-[#17171C] border-slate-200 dark:border-[#2A2A32] text-slate-700 dark:text-gray-300 hover:border-slate-400'
                            }`}
                          >
                            {active && <Check className="w-3 h-3 shrink-0" />}
                            <span>{mg.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#222224]">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="px-3.5 py-1.5 rounded-lg font-medium text-slate-600 dark:text-gray-400 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL: MEMBER GROUPS MANAGER ==================== */}
      <AnimatePresence>
        {isGroupsModalOpen && canManageMemberGroups && (
          <motion.div
            {...MODAL_BACKDROP_MOTION}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsGroupsModalOpen(false)}
          >
            <motion.div
              {...MODAL_PANEL_MOTION}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-200 dark:border-[#222224] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Groupes de membres</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                    Un membre peut appartenir à plusieurs groupes simultanément.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGroupsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-[#222224]">
                {/* Left Sidebar: Existing Member Groups */}
                <div className="md:col-span-5 p-4 space-y-2.5 bg-[#F8FAFC] dark:bg-[#0D0D0F]">
                  <button
                    type="button"
                    onClick={resetGroupEditorToNew}
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      editingGroupId === null
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-white dark:bg-[#16161A] border-slate-200 dark:border-[#2A2A32] text-slate-800 dark:text-gray-200 hover:border-blue-500/50'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nouveau groupe</span>
                  </button>

                  {memberGroups.length === 0 ? (
                    <div className="py-8 px-3 text-center text-xs text-slate-500 dark:text-gray-400">
                      Aucun groupe créé pour cette bibliothèque.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {memberGroups.map(mg => {
                        const active = editingGroupId === mg.id;
                        const count = countActiveMembersInGroup(mg, activeUserUids);
                        const colorMeta = MEMBER_GROUP_COLORS[normalizeMemberGroupColor(mg.color)];
                        return (
                          <button
                            key={mg.id}
                            type="button"
                            onClick={() => loadGroupIntoEditor(mg)}
                            className={`w-full px-3 py-2 rounded-lg border text-left text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                              active
                                ? 'bg-white dark:bg-[#18181D] border-blue-500 text-slate-900 dark:text-white font-semibold'
                                : 'bg-transparent border-transparent hover:bg-white/70 dark:hover:bg-[#151519] text-slate-700 dark:text-gray-300'
                            }`}
                          >
                            <span className="min-w-0 truncate flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${colorMeta.dotClass}`} />
                              <span className="truncate">{mg.name}</span>
                            </span>
                            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-gray-400 shrink-0">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Form: Create / Edit Member Group */}
                <form onSubmit={handleSaveGroup} className="md:col-span-7 p-4 space-y-3.5 text-xs flex flex-col">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-gray-300 block">
                      Nom du groupe
                    </label>
                    <input
                      type="text"
                      value={groupDraftName}
                      onChange={(e) => setGroupDraftName(e.target.value)}
                      placeholder="Ex: Équipe A, Jeunes, Chorale..."
                      maxLength={120}
                      required
                      className="w-full bg-[#F4F6F9] dark:bg-[#17171C] border border-slate-200 dark:border-[#2A2A32] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-gray-300 block">
                        Couleur
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {MEMBER_GROUP_COLOR_ORDER.map(colorKey => {
                          const meta = MEMBER_GROUP_COLORS[colorKey];
                          const selected = groupDraftColor === colorKey;
                          return (
                            <button
                              key={colorKey}
                              type="button"
                              onClick={() => setGroupDraftColor(colorKey)}
                              title={meta.label}
                              aria-label={meta.label}
                              className={`w-6 h-6 rounded-md flex items-center justify-center border cursor-pointer transition-transform ${
                                selected
                                  ? 'border-slate-900 dark:border-white scale-105'
                                  : 'border-slate-200 dark:border-[#2A2A32] opacity-80 hover:opacity-100'
                              }`}
                            >
                              <span className={`w-3.5 h-3.5 rounded-sm ${meta.dotClass}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-gray-300 block">
                        Description (optionnelle)
                      </label>
                      <input
                        type="text"
                        value={groupDraftDesc}
                        onChange={(e) => setGroupDraftDesc(e.target.value)}
                        placeholder="Note courte..."
                        maxLength={300}
                        className="w-full bg-[#F4F6F9] dark:bg-[#17171C] border border-slate-200 dark:border-[#2A2A32] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Member Multi-Select Checklist */}
                  <div className="space-y-2 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-700 dark:text-gray-300">
                        Membres du groupe
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-mono tabular-nums text-slate-500 dark:text-gray-400">
                          {groupDraftMemberIds.length} / {allUsers.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setGroupDraftMemberIds(allUsers.map(u => u.uid))}
                          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Tout cocher
                        </button>
                        <button
                          type="button"
                          onClick={() => setGroupDraftMemberIds([])}
                          className="text-slate-500 dark:text-gray-400 hover:underline cursor-pointer"
                        >
                          Vider
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={groupMemberSearch}
                        onChange={(e) => setGroupMemberSearch(e.target.value)}
                        placeholder="Filtrer les membres..."
                        className="w-full bg-[#F4F6F9] dark:bg-[#17171C] border border-slate-200 dark:border-[#2A2A32] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="border border-slate-200 dark:border-[#242429] rounded-lg divide-y divide-slate-200 dark:divide-[#202026] max-h-56 overflow-y-auto">
                      {filteredModalMembers.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 dark:text-gray-500">
                          Aucun membre correspondant.
                        </div>
                      ) : (
                        filteredModalMembers.map(user => {
                          const checked = groupDraftMemberIds.includes(user.uid);
                          const skillsPreview = [
                            ...(user.instruments || []),
                            ...(user.vocalRoles || [])
                          ].join(' · ');
                          return (
                            <label
                              key={user.uid}
                              className="flex items-center justify-between gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-[#17171C] cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleMemberInGroupDraft(user.uid)}
                                  className="rounded border-slate-300 dark:border-[#333] text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-900 dark:text-white truncate">
                                    {user.displayName || user.email}
                                  </div>
                                  {skillsPreview && (
                                    <div className="text-[11px] text-slate-500 dark:text-gray-400 truncate">
                                      {skillsPreview}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Modal Form Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-[#222224]">
                    <div>
                      {editingGroupId && (
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(editingGroupId)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                            confirmDeleteGroupId === editingGroupId
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#2A2A32] text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>
                            {confirmDeleteGroupId === editingGroupId
                              ? 'Confirmer la suppression'
                              : 'Supprimer'}
                          </span>
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingGroup || !groupDraftName.trim()}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {isSavingGroup
                          ? 'Enregistrement...'
                          : editingGroupId
                            ? 'Enregistrer'
                            : 'Créer le groupe'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
