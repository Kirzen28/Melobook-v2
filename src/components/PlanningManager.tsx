import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Calendar,
  CalendarCheck2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit3,
  FileDown,
  Layers,
  ListMusic,
  MapPin,
  Mic2,
  Monitor,
  Music2,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  PlanningAssignment,
  PlanningAvailability,
  PlanningAvailabilityStatus,
  PlanningPole,
  PlanningSlot,
  PlanningTeam,
  PlanningTeamMember,
  Setlist,
  Song
} from '../types';
import { formatSetlistDuration, parseDurationToSeconds } from '../utils/chordUtils';
import { SetlistSongsPanel } from './SetlistSongsPanel';
import { SetlistAddSongsModal } from './SetlistAddSongsModal';
import { SetlistPdfModal } from './SetlistPdfModal';
import { LiveSetlistPlayer } from './LiveSetlistPlayer';
import {
  AVAILABILITY_STATUS_META,
  PLANNING_POLE_ORDER,
  buildPlanningPoleMetaMap,
  countSlotsByPole,
  formatPlanningDateFr,
  formatPlanningDateLongFr,
  getAssignmentForSetlist,
  getTodayIsoDate,
  groupRehearsalsByDate,
  isValidIsoDate,
  mergeTeamMembersIntoSlots,
  sortMembersByAvailability
} from '../utils/planningUtils';
import {
  PlanningExportPeriodMode,
  PlanningExportScope,
  filterPlanningTargetsForExport,
  generatePlanningCsv,
  generatePlanningPdf
} from '../utils/planningExport';
import { buildBulkSlotsForMemberGroup, countActiveMembersInGroup } from '../utils/memberGroupsUtils';
import { MODAL_BACKDROP_MOTION, MODAL_PANEL_MOTION, STAGE_EASE } from '../utils/motionPresets';
import { UserAvatar } from '../utils/avatarPresets';
import { DarkDateInput } from './SetlistDatePickerModal';

type PlanningSubTab = 'planning' | 'availabilities' | 'teams';
type CalendarFilter = 'all' | 'mine';

interface PlanningTarget {
  id: string;
  title: string;
  date: string;
  hasValidDate: boolean;
  setlist?: Setlist;
  assignment?: PlanningAssignment;
  slots: PlanningSlot[];
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAY_NAMES_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const POLE_ICONS: Record<PlanningPole, React.FC<{ className?: string }>> = {
  musique: Music2,
  chant: Mic2,
  regie: Monitor
};

function formatIsoYmd(y: number, mZeroIndexed: number, d: number): string {
  return `${y}-${String(mZeroIndexed + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const PlanningManager: React.FC = () => {
  const {
    currentUser,
    currentGroup,
    allUsers,
    memberSkillsConfig,
    songs,
    setlists,
    selectedSetlist,
    planningTeams,
    planningAvailabilities,
    planningAssignments,
    memberGroups,
    selectedPlanningTargetId,
    setSelectedPlanningTargetId,
    canManagePlanning,
    canManageSetlists,
    setSelectedSetlist,
    setSelectedSong,
    setActiveSetlistIndex,
    isLiveSetlistOpen,
    setIsLiveSetlistOpen,
    createSetlist,
    updateSetlist,
    deleteSetlist,
    createPlanningTeam,
    updatePlanningTeam,
    deletePlanningTeam,
    setPlanningAvailability,
    deletePlanningAvailability,
    savePlanningAssignment,
    deletePlanningAssignment,
    showNotification
  } = useApp();

  const poleMetaMap = useMemo(
    () => buildPlanningPoleMetaMap(memberSkillsConfig),
    [memberSkillsConfig]
  );

  const todayIso = getTodayIsoDate();
  const [todayY, todayM] = useMemo(() => {
    const parts = todayIso.split('-').map(Number);
    return [parts[0], parts[1] - 1];
  }, [todayIso]);

  const [subTab, setSubTab] = useState<PlanningSubTab>('planning');
  const [calendarFilter, setCalendarFilter] = useState<CalendarFilter>('all');

  // Shared monthly calendar state
  const [calYear, setCalYear] = useState<number>(todayY);
  const [calMonth, setCalMonth] = useState<number>(todayM);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'team' | 'setlist'>('team');
  const [isAddSongModalOpen, setIsAddSongModalOpen] = useState(false);
  const [pdfModalSetlist, setPdfModalSetlist] = useState<Setlist | null>(null);
  const [confirmDeleteSetlistId, setConfirmDeleteSetlistId] = useState<string | null>(null);

  // Create / Edit setlist modals
  const [isCreateSetlistOpen, setIsCreateSetlistOpen] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDate, setNewSetDate] = useState(todayIso);
  const [newSetNotes, setNewSetNotes] = useState('');
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);
  const [editSetName, setEditSetName] = useState('');
  const [editSetDate, setEditSetDate] = useState('');
  const [editSetNotes, setEditSetNotes] = useState('');
  const drawerTeamTabRef = useRef<HTMLButtonElement>(null);
  const drawerSetlistTabRef = useRef<HTMLButtonElement>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(todayY);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  // Logistics editing
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailCallTime, setDetailCallTime] = useState('');
  const [detailServiceTime, setDetailServiceTime] = useState('');
  const [detailLocation, setDetailLocation] = useState('');
  const [detailRehearsalDate, setDetailRehearsalDate] = useState('');
  const [detailRehearsalTime, setDetailRehearsalTime] = useState('');
  const [detailRehearsalLocation, setDetailRehearsalLocation] = useState('');
  const [detailNotes, setDetailNotes] = useState('');

  // Inline slot add per pôle
  const [addingPole, setAddingPole] = useState<PlanningPole | null>(null);
  const [slotMemberUid, setSlotMemberUid] = useState<string>('');
  const [slotGroupFilterId, setSlotGroupFilterId] = useState<string>('all');
  const [slotCustomName, setSlotCustomName] = useState<string>('');
  const [slotRoleLabel, setSlotRoleLabel] = useState<string>('');
  const [slotExternalMode, setSlotExternalMode] = useState<boolean>(false);

  // Inline slot role edit
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingSlotRole, setEditingSlotRole] = useState<string>('');

  // Apply / Save team modals
  const [applyTeamId, setApplyTeamId] = useState<string>('');
  const [applyTeamMode, setApplyTeamMode] = useState<'append' | 'replace'>('append');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isSaveAsTeamOpen, setIsSaveAsTeamOpen] = useState(false);
  const [saveAsTeamName, setSaveAsTeamName] = useState('');

  // Create standalone planned date modal
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanDate, setNewPlanDate] = useState(todayIso);
  const [newPlanCallTime, setNewPlanCallTime] = useState('08:30');
  const [newPlanServiceTime, setNewPlanServiceTime] = useState('10:00');
  const [newPlanLocation, setNewPlanLocation] = useState('');
  const [newPlanRehearsalDate, setNewPlanRehearsalDate] = useState('');
  const [newPlanRehearsalTime, setNewPlanRehearsalTime] = useState('');
  const [newPlanRehearsalLocation, setNewPlanRehearsalLocation] = useState('');

  // Export planning modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportPeriodMode, setExportPeriodMode] = useState<PlanningExportPeriodMode>('month');
  const [exportScope, setExportScope] = useState<PlanningExportScope>('all');
  const [exportStartDate, setExportStartDate] = useState(todayIso);
  const [exportEndDate, setExportEndDate] = useState(todayIso);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Date availability drawer inside planning view
  const [showDateAvailPanel, setShowDateAvailPanel] = useState(false);
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<string | null>(null);

  // Availabilities view state
  const [availViewMode, setAvailViewMode] = useState<'mine' | 'team'>('mine');
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [editingNoteDate, setEditingNoteDate] = useState<string | null>(null);

  // Teams view state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<PlanningTeam | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamMembers, setTeamMembers] = useState<PlanningTeamMember[]>([]);
  const [newTmUid, setNewTmUid] = useState('');
  const [newTmPole, setNewTmPole] = useState<PlanningPole>('musique');
  const [newTmRole, setNewTmRole] = useState('');
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState<string | null>(null);
  const [teamApplyModalTeam, setTeamApplyModalTeam] = useState<PlanningTeam | null>(null);
  const [teamApplyTargetId, setTeamApplyTargetId] = useState<string>('');
  const [teamApplyMode, setTeamApplyMode] = useState<'append' | 'replace'>('append');

  // Close month picker on outside click / Escape
  useEffect(() => {
    if (!isMonthPickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMonthPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [isMonthPickerOpen]);

  // Close off-canvas drawer on Escape when no secondary modal or inline edit is open
  useEffect(() => {
    if (!isDayDrawerOpen) return;
    const hasOverlayOrInlineEdit =
      isCreatePlanOpen ||
      isApplyModalOpen ||
      isSaveAsTeamOpen ||
      isTeamModalOpen ||
      Boolean(teamApplyModalTeam) ||
      isMonthPickerOpen ||
      isAddSongModalOpen ||
      Boolean(pdfModalSetlist) ||
      isCreateSetlistOpen ||
      Boolean(editingSetlist) ||
      isLiveSetlistOpen ||
      isExportModalOpen ||
      Boolean(editingSlotId) ||
      Boolean(editingNoteDate);
    if (hasOverlayOrInlineEdit) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDayDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    isDayDrawerOpen,
    isCreatePlanOpen,
    isApplyModalOpen,
    isSaveAsTeamOpen,
    isTeamModalOpen,
    teamApplyModalTeam,
    isMonthPickerOpen,
    isExportModalOpen,
    editingSlotId,
    editingNoteDate
  ]);

  useEffect(() => {
    if (!isExportModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExportModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isExportModalOpen]);

  const existingSongIdsSet = useMemo(() => new Set(songs.map(s => s.id)), [songs]);
  const songsById = useMemo(() => new Map(songs.map(s => [s.id, s])), [songs]);

  const handleLaunchLive = (st: Setlist, startIndex = 0) => {
    const liveSetlist = setlists.find(s => s.id === st.id) || st;
    const validSongs = liveSetlist.songIds
      .map(id => songsById.get(id))
      .filter((s): s is Song => Boolean(s));
    setSelectedSetlist(liveSetlist);
    setActiveSetlistIndex(startIndex);
    if (validSongs[startIndex]) {
      setSelectedSong(validSongs[startIndex]);
    }
    setIsLiveSetlistOpen(true);
  };

  const handleToggleSongInDrawerSetlist = async (songId: string) => {
    const st = activeTarget?.setlist;
    if (!st) return;
    const validIds = st.songIds.filter(id => existingSongIdsSet.has(id) || id === songId);
    const newSongIds = validIds.includes(songId)
      ? validIds.filter(id => id !== songId)
      : [...validIds, songId];
    await updateSetlist(st.id, { songIds: newSongIds });
  };

  const handleAddMultipleSongsToDrawerSetlist = async (songIdsToAdd: string[]) => {
    const st = activeTarget?.setlist;
    if (!st) return;
    const addSet = new Set(songIdsToAdd);
    const newIds = st.songIds.filter(id => existingSongIdsSet.has(id) || addSet.has(id));
    const existing = new Set(newIds);
    songIdsToAdd.forEach(id => {
      if (!existing.has(id)) {
        newIds.push(id);
        existing.add(id);
      }
    });
    await updateSetlist(st.id, { songIds: newIds });
  };

  const handleRemoveMultipleSongsFromDrawerSetlist = async (songIdsToRemove: string[]) => {
    const st = activeTarget?.setlist;
    if (!st) return;
    const removeSet = new Set(songIdsToRemove);
    const newIds = st.songIds.filter(id => !removeSet.has(id) && existingSongIdsSet.has(id));
    await updateSetlist(st.id, { songIds: newIds });
  };

  useEffect(() => {
    if (!confirmDeleteSetlistId) return;
    const timer = window.setTimeout(() => setConfirmDeleteSetlistId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmDeleteSetlistId]);

  const handleOpenEditSetlistModal = (st: Setlist) => {
    setEditingSetlist(st);
    setEditSetName(st.name || '');
    setEditSetDate(st.date || todayIso);
    setEditSetNotes(st.notes || '');
  };

  const handleSaveEditSetlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetlist || !editSetName.trim()) return;
    const trimmedName = editSetName.trim();
    const trimmedNotes = editSetNotes.trim().slice(0, 5000);
    await updateSetlist(editingSetlist.id, {
      name: trimmedName,
      date: editSetDate,
      notes: trimmedNotes
    });
    if (selectedSetlist?.id === editingSetlist.id) {
      setSelectedSetlist({
        ...selectedSetlist,
        name: trimmedName,
        date: editSetDate,
        notes: trimmedNotes
      });
    }
    if (isValidIsoDate(editSetDate)) {
      const [y, m] = editSetDate.split('-').map(Number);
      setCalYear(y);
      setCalMonth(m - 1);
      setSelectedDate(editSetDate);
    }
    setEditingSetlist(null);
  };

  const handleCreateNewSetlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) return;
    const trimmedNotes = newSetNotes.trim().slice(0, 5000);
    const newId = await createSetlist({
      name: newSetName.trim(),
      date: newSetDate,
      songIds: [],
      notes: trimmedNotes,
      targetDuration: 25
    });
    if (newId) {
      if (isValidIsoDate(newSetDate)) {
        const [y, m] = newSetDate.split('-').map(Number);
        setCalYear(y);
        setCalMonth(m - 1);
        setSelectedDate(newSetDate);
      }
      setSelectedPlanningTargetId(newId);
      setDrawerTab('setlist');
      setIsDayDrawerOpen(true);
    }
    setNewSetName('');
    setNewSetNotes('');
    setIsCreateSetlistOpen(false);
  };

  const handleDuplicateSetlist = async (st: Setlist) => {
    const newId = await createSetlist({
      name: `${st.name} (copie)`,
      date: st.date || todayIso,
      songIds: [...st.songIds],
      songOverrides: st.songOverrides ? JSON.parse(JSON.stringify(st.songOverrides)) : undefined,
      notes: st.notes || '',
      targetDuration: st.targetDuration || 20
    });
    if (newId) {
      setSelectedPlanningTargetId(newId);
      setDrawerTab('setlist');
      showNotification('Setlist dupliquée.', 'success');
    }
  };

  // Unified targets: setlists + standalone planningAssignments
  const allTargets = useMemo<PlanningTarget[]>(() => {
    const setlistIds = new Set(setlists.map(s => s.id));
    const list: PlanningTarget[] = [];

    for (const st of setlists) {
      const assignment = getAssignmentForSetlist(planningAssignments, st.id);
      const rawDate = assignment?.date || st.date || '';
      const hasValidDate = isValidIsoDate(rawDate);
      list.push({
        id: st.id,
        title: st.name,
        date: hasValidDate ? rawDate : '',
        hasValidDate,
        setlist: st,
        assignment,
        slots: assignment?.slots || []
      });
    }

    for (const pa of planningAssignments) {
      if (pa.setlistId && setlistIds.has(pa.setlistId)) continue;
      if (setlistIds.has(pa.id)) continue;
      const hasValidDate = isValidIsoDate(pa.date);
      list.push({
        id: pa.id,
        title: pa.title,
        date: hasValidDate ? pa.date : '',
        hasValidDate,
        assignment: pa,
        slots: pa.slots || []
      });
    }

    return list.sort((a, b) => {
      if (a.hasValidDate && b.hasValidDate) return a.date.localeCompare(b.date);
      if (a.hasValidDate) return -1;
      if (b.hasValidDate) return 1;
      return a.title.localeCompare(b.title, 'fr');
    });
  }, [setlists, planningAssignments]);

  const activeYearMonth = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;

  const exportTargets = useMemo(
    () =>
      filterPlanningTargetsForExport(allTargets, {
        periodMode: exportPeriodMode,
        scope: exportScope,
        currentUid: currentUser?.uid,
        yearMonth: activeYearMonth,
        todayIso,
        startDate: exportStartDate,
        endDate: exportEndDate
      }),
    [
      allTargets,
      exportPeriodMode,
      exportScope,
      currentUser?.uid,
      activeYearMonth,
      todayIso,
      exportStartDate,
      exportEndDate
    ]
  );

  const exportRehearsalCount = useMemo(
    () => exportTargets.filter(t => isValidIsoDate(t.assignment?.rehearsalDate)).length,
    [exportTargets]
  );

  const exportPeriodMeta = useMemo(() => {
    const scopeSuffix = exportScope === 'mine' ? ' (Mes services)' : '';
    if (exportPeriodMode === 'month') {
      return {
        label: `${MONTH_NAMES_FR[calMonth]} ${calYear}${scopeSuffix}`,
        slug: activeYearMonth
      };
    }
    if (exportPeriodMode === 'upcoming') {
      return {
        label: `À venir à partir du ${formatPlanningDateFr(todayIso)}${scopeSuffix}`,
        slug: `avenir-${todayIso}`
      };
    }
    const startLabel = isValidIsoDate(exportStartDate) ? formatPlanningDateFr(exportStartDate) : '...';
    const endLabel = isValidIsoDate(exportEndDate) ? formatPlanningDateFr(exportEndDate) : '...';
    return {
      label: `Du ${startLabel} au ${endLabel}${scopeSuffix}`,
      slug: `${exportStartDate || 'debut'}_${exportEndDate || 'fin'}`
    };
  }, [exportPeriodMode, exportScope, calMonth, calYear, activeYearMonth, todayIso, exportStartDate, exportEndDate]);

  const openExportModal = () => {
    setExportScope(calendarFilter);
    setExportPeriodMode('month');
    const monthStart = `${activeYearMonth}-01`;
    const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
    const monthEnd = formatIsoYmd(calYear, calMonth, lastDay);
    setExportStartDate(monthStart);
    setExportEndDate(monthEnd);
    setIsExportModalOpen(true);
  };

  const handleExportCsv = () => {
    if (exportTargets.length === 0) return;
    const { csvContent, fileName } = generatePlanningCsv(
      exportTargets,
      songsById,
      currentGroup?.name || 'Groupe',
      exportPeriodMeta.slug
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('Planning exporté en CSV.', 'success');
  };

  const handleExportPdf = (share = false) => {
    if (exportTargets.length === 0 || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const { doc, blob, fileName } = generatePlanningPdf({
        items: exportTargets,
        songsById,
        poleMetaMap,
        groupName: currentGroup?.name || 'Groupe',
        periodLabel: exportPeriodMeta.label,
        periodSlug: exportPeriodMeta.slug
      });
      if (share && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          navigator
            .share({
              title: `Planning - ${currentGroup?.name || 'Groupe'}`,
              text: exportPeriodMeta.label,
              files: [file]
            })
            .catch(() => {
              doc.save(fileName);
            });
          return;
        }
      }
      doc.save(fileName);
      showNotification('Planning exporté en PDF.', 'success');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const filteredTargets = useMemo(() => {
    if (calendarFilter !== 'mine') return allTargets;
    return allTargets.filter(t =>
      t.slots.some(s => s.uid && currentUser?.uid && s.uid === currentUser.uid)
    );
  }, [allTargets, calendarFilter, currentUser?.uid]);

  const { targetsByDate, undatedTargets, rehearsalsByDate } = useMemo(() => {
    const byDate = new Map<string, PlanningTarget[]>();
    const undated: PlanningTarget[] = [];
    for (const t of filteredTargets) {
      if (!t.hasValidDate) {
        undated.push(t);
        continue;
      }
      const arr = byDate.get(t.date) || [];
      arr.push(t);
      byDate.set(t.date, arr);
    }
    return {
      targetsByDate: byDate,
      undatedTargets: undated,
      rehearsalsByDate: groupRehearsalsByDate(filteredTargets)
    };
  }, [filteredTargets]);

  // Deep-link from SetlistManager: jump calendar to target's month & date and open drawer
  useEffect(() => {
    if (!selectedPlanningTargetId) return;
    const found = allTargets.find(t => t.id === selectedPlanningTargetId);
    if (!found) return;
    setSubTab('planning');
    if (found.hasValidDate) {
      const [y, m] = found.date.split('-').map(Number);
      setCalYear(y);
      setCalMonth(m - 1);
      setSelectedDate(found.date);
    }
    setIsDayDrawerOpen(true);
  }, [selectedPlanningTargetId, allTargets]);

  const targetsForSelectedDate = useMemo(
    () => targetsByDate.get(selectedDate) || [],
    [targetsByDate, selectedDate]
  );

  const rehearsalsForSelectedDate = useMemo(
    () => rehearsalsByDate.get(selectedDate) || [],
    [rehearsalsByDate, selectedDate]
  );

  // Active target for the detail panel:
  // If selectedPlanningTargetId matches an undated target or a target on selectedDate, use it; otherwise first event of selectedDate.
  const activeTarget = useMemo(() => {
    if (selectedPlanningTargetId) {
      const exact = allTargets.find(t => t.id === selectedPlanningTargetId);
      if (exact && (!exact.hasValidDate || exact.date === selectedDate)) {
        return exact;
      }
    }
    return targetsForSelectedDate[0] || null;
  }, [selectedPlanningTargetId, allTargets, selectedDate, targetsForSelectedDate]);

  // Sync logistics draft when activeTarget changes
  useEffect(() => {
    setIsEditingDetails(false);
    setAddingPole(null);
    setEditingSlotId(null);
    setConfirmDeletePlanId(null);
    if (!activeTarget) return;
    setDetailCallTime(activeTarget.assignment?.callTime || '');
    setDetailServiceTime(activeTarget.assignment?.serviceTime || '');
    setDetailLocation(activeTarget.assignment?.location || '');
    setDetailRehearsalDate(activeTarget.assignment?.rehearsalDate || '');
    setDetailRehearsalTime(activeTarget.assignment?.rehearsalTime || '');
    setDetailRehearsalLocation(activeTarget.assignment?.rehearsalLocation || '');
    setDetailNotes(activeTarget.assignment?.notes || '');
  }, [
    activeTarget?.id,
    activeTarget?.assignment?.callTime,
    activeTarget?.assignment?.serviceTime,
    activeTarget?.assignment?.location,
    activeTarget?.assignment?.rehearsalDate,
    activeTarget?.assignment?.rehearsalTime,
    activeTarget?.assignment?.rehearsalLocation,
    activeTarget?.assignment?.notes
  ]);

  // Calendar grid matrix (Monday-first)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    let startDow = firstDay.getDay() - 1;
    if (startDow === -1) startDow = 6;
    const prevLast = new Date(calYear, calMonth, 0).getDate();

    const cells: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isWeekend: boolean;
    }> = [];

    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevLast - i;
      const m = calMonth === 0 ? 11 : calMonth - 1;
      const y = calMonth === 0 ? calYear - 1 : calYear;
      const dow = new Date(y, m, d).getDay();
      cells.push({
        dayNumber: d,
        dateStr: formatIsoYmd(y, m, d),
        isCurrentMonth: false,
        isWeekend: dow === 0 || dow === 6
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dow = new Date(calYear, calMonth, d).getDay();
      cells.push({
        dayNumber: d,
        dateStr: formatIsoYmd(calYear, calMonth, d),
        isCurrentMonth: true,
        isWeekend: dow === 0 || dow === 6
      });
    }

    const rem = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= rem; d++) {
      const m = calMonth === 11 ? 0 : calMonth + 1;
      const y = calMonth === 11 ? calYear + 1 : calYear;
      const dow = new Date(y, m, d).getDay();
      cells.push({
        dayNumber: d,
        dateStr: formatIsoYmd(y, m, d),
        isCurrentMonth: false,
        isWeekend: dow === 0 || dow === 6
      });
    }

    return cells;
  }, [calYear, calMonth]);

  const yearOptions = useMemo(() => {
    const list: number[] = [];
    const end = Math.max(todayY + 10, calYear + 4);
    for (let y = 2020; y <= end; y++) list.push(y);
    return list;
  }, [todayY, calYear]);

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(y => y - 1);
    } else {
      setCalMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(y => y + 1);
    } else {
      setCalMonth(m => m + 1);
    }
  };

  const handleGoToday = () => {
    setCalYear(todayY);
    setCalMonth(todayM);
    setSelectedDate(todayIso);
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    const dayTargets = targetsByDate.get(dateStr) || [];
    setSelectedPlanningTargetId(dayTargets[0]?.id || null);
    setEditingNoteDate(null);
    setIsDayDrawerOpen(true);
  };

  // Availabilities for the selected date (or activeTarget date)
  const detailDate = activeTarget?.hasValidDate ? activeTarget.date : selectedDate;
  const availabilitiesForDetailDate = useMemo(
    () => planningAvailabilities.filter(a => a.date === detailDate),
    [planningAvailabilities, detailDate]
  );

  const availByUidForDetailDate = useMemo(() => {
    const map = new Map<string, PlanningAvailability>();
    for (const av of availabilitiesForDetailDate) map.set(av.uid, av);
    return map;
  }, [availabilitiesForDetailDate]);

  const sortedMembersForDetailDate = useMemo(
    () => sortMembersByAvailability(allUsers, availabilitiesForDetailDate),
    [allUsers, availabilitiesForDetailDate]
  );

  const activeUserUids = useMemo(() => new Set(allUsers.map(u => u.uid)), [allUsers]);

  const selectedSlotMemberGroup = useMemo(
    () => (slotGroupFilterId === 'all' ? null : memberGroups.find(mg => mg.id === slotGroupFilterId) || null),
    [slotGroupFilterId, memberGroups]
  );

  const filteredMembersForSlotAdd = useMemo(() => {
    if (!selectedSlotMemberGroup) return sortedMembersForDetailDate;
    const uidSet = new Set(selectedSlotMemberGroup.memberIds || []);
    return sortedMembersForDetailDate.filter(item => uidSet.has(item.user.uid));
  }, [sortedMembersForDetailDate, selectedSlotMemberGroup]);

  const availCountsForDetailDate = useMemo(() => {
    let available = 0;
    let maybe = 0;
    let unavailable = 0;
    for (const av of availabilitiesForDetailDate) {
      if (av.status === 'available') available++;
      else if (av.status === 'maybe') maybe++;
      else if (av.status === 'unavailable') unavailable++;
    }
    return { available, maybe, unavailable };
  }, [availabilitiesForDetailDate]);

  const myAvailByDate = useMemo(() => {
    const map = new Map<string, PlanningAvailability>();
    if (!currentUser?.uid) return map;
    for (const av of planningAvailabilities) {
      if (av.uid === currentUser.uid) map.set(av.date, av);
    }
    return map;
  }, [planningAvailabilities, currentUser?.uid]);

  const teamMatrixDates = useMemo(() => {
    const set = new Set<string>();
    for (const t of allTargets) {
      if (t.hasValidDate && t.date >= todayIso) set.add(t.date);
    }
    for (const av of planningAvailabilities) {
      if (av.date >= todayIso) set.add(av.date);
    }
    return Array.from(set).sort().slice(0, 12);
  }, [allTargets, planningAvailabilities, todayIso]);

  // Persist helper
  const persistSlotsForTarget = async (
    target: PlanningTarget,
    nextSlots: PlanningSlot[],
    extra?: Partial<
      Pick<
        PlanningAssignment,
        | 'callTime'
        | 'serviceTime'
        | 'location'
        | 'rehearsalDate'
        | 'rehearsalTime'
        | 'rehearsalLocation'
        | 'notes'
        | 'teamPresetId'
        | 'teamPresetName'
      >
    >
  ) => {
    const validDate = target.hasValidDate ? target.date : todayIso;
    await savePlanningAssignment({
      id: target.assignment?.id || target.id,
      setlistId: target.setlist?.id ?? target.assignment?.setlistId ?? null,
      setlistName: target.setlist?.name ?? target.assignment?.setlistName ?? target.title,
      date: validDate,
      title: target.title,
      callTime: extra?.callTime !== undefined ? extra.callTime : target.assignment?.callTime,
      serviceTime: extra?.serviceTime !== undefined ? extra.serviceTime : target.assignment?.serviceTime,
      location: extra?.location !== undefined ? extra.location : target.assignment?.location,
      rehearsalDate: extra?.rehearsalDate !== undefined ? extra.rehearsalDate : target.assignment?.rehearsalDate,
      rehearsalTime: extra?.rehearsalTime !== undefined ? extra.rehearsalTime : target.assignment?.rehearsalTime,
      rehearsalLocation: extra?.rehearsalLocation !== undefined ? extra.rehearsalLocation : target.assignment?.rehearsalLocation,
      teamPresetId: extra?.teamPresetId !== undefined ? extra.teamPresetId : target.assignment?.teamPresetId ?? null,
      teamPresetName: extra?.teamPresetName !== undefined ? extra.teamPresetName : target.assignment?.teamPresetName ?? null,
      notes: extra?.notes !== undefined ? extra.notes : target.assignment?.notes,
      slots: nextSlots
    });
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTarget || !canManagePlanning) return;
    await persistSlotsForTarget(activeTarget, activeTarget.slots, {
      callTime: detailCallTime.trim(),
      serviceTime: detailServiceTime.trim(),
      location: detailLocation.trim(),
      rehearsalDate: isValidIsoDate(detailRehearsalDate) ? detailRehearsalDate.trim() : '',
      rehearsalTime: detailRehearsalTime.trim(),
      rehearsalLocation: detailRehearsalLocation.trim(),
      notes: detailNotes.trim()
    });
    setIsEditingDetails(false);
    showNotification('Horaires enregistrés.', 'success');
  };

  const openInlineAddForPole = (pole: PlanningPole) => {
    setAddingPole(pole);
    setSlotExternalMode(false);
    setSlotGroupFilterId('all');
    setSlotCustomName('');
    setSlotRoleLabel(poleMetaMap[pole].suggestedRoles[0] || '');
    const firstMember = sortedMembersForDetailDate[0]?.user;
    setSlotMemberUid(firstMember?.uid || '');
  };

  const handleChangeSlotGroupFilter = (nextGroupId: string) => {
    setSlotGroupFilterId(nextGroupId);
    if (nextGroupId === 'all') {
      if (!slotMemberUid && sortedMembersForDetailDate[0]?.user) {
        setSlotMemberUid(sortedMembersForDetailDate[0].user.uid);
      }
      return;
    }
    const targetGroup = memberGroups.find(mg => mg.id === nextGroupId);
    const uidSet = new Set(targetGroup?.memberIds || []);
    const matching = sortedMembersForDetailDate.filter(m => uidSet.has(m.user.uid));
    if (matching.length > 0 && !matching.some(m => m.user.uid === slotMemberUid)) {
      setSlotMemberUid(matching[0].user.uid);
    } else if (matching.length === 0) {
      setSlotMemberUid('');
    }
  };

  const handleBulkAddMemberGroupToPole = async () => {
    if (!activeTarget || !addingPole || !canManagePlanning || !selectedSlotMemberGroup) return;
    const { nextSlots, addedCount } = buildBulkSlotsForMemberGroup({
      memberGroup: selectedSlotMemberGroup,
      existingSlots: activeTarget.slots,
      pole: addingPole,
      orderedMembers: sortedMembersForDetailDate.map(m => m.user),
      suggestedRoles: poleMetaMap[addingPole].suggestedRoles
    });

    if (addedCount === 0) {
      showNotification(
        `Tous les membres de « ${selectedSlotMemberGroup.name} » sont déjà affectés sur ce pôle.`,
        'info'
      );
      return;
    }

    await persistSlotsForTarget(activeTarget, nextSlots);
    setAddingPole(null);
    setSlotCustomName('');
    showNotification(
      `${addedCount} membre${addedCount > 1 ? 's' : ''} de « ${selectedSlotMemberGroup.name} » ajouté${addedCount > 1 ? 's' : ''}.`,
      'success'
    );
  };

  const handleConfirmAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTarget || !addingPole || !canManagePlanning) return;

    let uid: string | null = null;
    let memberName = '';
    if (slotExternalMode) {
      memberName = slotCustomName.trim();
      if (!memberName) return;
    } else {
      const found = allUsers.find(u => u.uid === slotMemberUid);
      if (!found) return;
      uid = found.uid;
      memberName = found.displayName || found.email || 'Membre';
    }

    const roleLabel = slotRoleLabel.trim() || poleMetaMap[addingPole].suggestedRoles[0] || 'Autre';
    const newSlot: PlanningSlot = {
      id: `slot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      uid,
      memberName,
      pole: addingPole,
      roleLabel,
      status: 'assigned'
    };

    await persistSlotsForTarget(activeTarget, [...activeTarget.slots, newSlot]);
    setAddingPole(null);
    setSlotCustomName('');
    showNotification(`${memberName} affecté (${roleLabel}).`, 'success');
  };

  const handleRemoveSlot = async (slotId: string) => {
    if (!activeTarget || !canManagePlanning) return;
    await persistSlotsForTarget(activeTarget, activeTarget.slots.filter(s => s.id !== slotId));
  };

  const handleSaveSlotRole = async (slotId: string) => {
    if (!activeTarget || !canManagePlanning) return;
    const trimmed = editingSlotRole.trim();
    if (!trimmed) {
      setEditingSlotId(null);
      return;
    }
    await persistSlotsForTarget(
      activeTarget,
      activeTarget.slots.map(s => (s.id === slotId ? { ...s, roleLabel: trimmed } : s))
    );
    setEditingSlotId(null);
  };

  const handleApplyTeamToTarget = async (
    target: PlanningTarget,
    team: PlanningTeam,
    mode: 'append' | 'replace'
  ) => {
    if (!canManagePlanning) return;
    const merged = mergeTeamMembersIntoSlots(target.slots, team.members, mode);
    await persistSlotsForTarget(target, merged, {
      teamPresetId: team.id,
      teamPresetName: team.name
    });
    showNotification(`Équipe « ${team.name} » appliquée.`, 'success');
  };

  const handleSaveTargetAsTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTarget || !canManagePlanning) return;
    const trimmed = saveAsTeamName.trim();
    if (!trimmed) return;
    const members: PlanningTeamMember[] = activeTarget.slots
      .filter(s => Boolean(s.uid))
      .map(s => ({
        uid: s.uid!,
        displayName: s.memberName,
        pole: s.pole,
        roleLabel: s.roleLabel
      }));
    if (members.length === 0) {
      showNotification('Affectez au moins un membre du groupe.', 'info');
      return;
    }
    await createPlanningTeam({
      name: trimmed,
      description: activeTarget.title,
      members
    });
    setIsSaveAsTeamOpen(false);
    setSaveAsTeamName('');
  };

  const handleCreateStandalonePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePlanning) return;
    const title = newPlanTitle.trim();
    if (!title || !isValidIsoDate(newPlanDate)) return;
    const createdId = await savePlanningAssignment({
      date: newPlanDate,
      title,
      callTime: newPlanCallTime.trim() || undefined,
      serviceTime: newPlanServiceTime.trim() || undefined,
      location: newPlanLocation.trim() || undefined,
      rehearsalDate: isValidIsoDate(newPlanRehearsalDate) ? newPlanRehearsalDate.trim() : undefined,
      rehearsalTime: newPlanRehearsalTime.trim() || undefined,
      rehearsalLocation: newPlanRehearsalLocation.trim() || undefined,
      slots: []
    });
    const [y, m] = newPlanDate.split('-').map(Number);
    setCalYear(y);
    setCalMonth(m - 1);
    setSelectedDate(newPlanDate);
    setSelectedPlanningTargetId(createdId);
    setIsCreatePlanOpen(false);
    setIsDayDrawerOpen(true);
    setNewPlanTitle('');
    setNewPlanLocation('');
    setNewPlanRehearsalDate('');
    setNewPlanRehearsalTime('');
    setNewPlanRehearsalLocation('');
    showNotification(`Date « ${title} » enregistrée.`, 'success');
  };

  const handleTogglePreferredPole = async (date: string, pole: PlanningPole) => {
    const existing = myAvailByDate.get(date);
    const currentStatus: PlanningAvailabilityStatus = existing?.status || 'available';
    const currentPoles = existing?.preferredPoles || [];
    const nextPoles = currentPoles.includes(pole)
      ? currentPoles.filter(p => p !== pole)
      : [...currentPoles, pole];
    await setPlanningAvailability({
      date,
      status: currentStatus,
      preferredPoles: nextPoles,
      note: existing?.note
    });
  };

  // Teams modal helpers
  const openNewTeamModal = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamDesc('');
    setTeamMembers([]);
    setNewTmUid(allUsers[0]?.uid || '');
    setNewTmPole('musique');
    setNewTmRole(poleMetaMap.musique.suggestedRoles[0] || '');
    setIsTeamModalOpen(true);
  };

  const openEditTeamModal = (team: PlanningTeam) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamDesc(team.description || '');
    setTeamMembers(team.members);
    setNewTmUid(allUsers[0]?.uid || '');
    setNewTmPole('musique');
    setNewTmRole(poleMetaMap.musique.suggestedRoles[0] || '');
    setIsTeamModalOpen(true);
  };

  const handleAddMemberToTeamDraft = () => {
    const user = allUsers.find(u => u.uid === newTmUid);
    if (!user) return;
    const roleLabel = newTmRole.trim() || poleMetaMap[newTmPole].suggestedRoles[0] || 'Autre';
    const key = `${user.uid}:${newTmPole}:${roleLabel.toLowerCase()}`;
    if (teamMembers.some(m => `${m.uid}:${m.pole}:${m.roleLabel.toLowerCase()}` === key)) return;
    setTeamMembers(prev => [
      ...prev,
      {
        uid: user.uid,
        displayName: user.displayName || user.email || 'Membre',
        pole: newTmPole,
        roleLabel
      }
    ]);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePlanning) return;
    const trimmed = teamName.trim();
    if (!trimmed) return;
    if (editingTeam) {
      await updatePlanningTeam(editingTeam.id, {
        name: trimmed,
        description: teamDesc.trim() || undefined,
        members: teamMembers
      });
    } else {
      await createPlanningTeam({
        name: trimmed,
        description: teamDesc.trim() || undefined,
        members: teamMembers
      });
    }
    setIsTeamModalOpen(false);
  };

  // Shared Calendar Header + Grid Renderer
  const renderMonthlyCalendar = (mode: 'planning' | 'availabilities') => (
    <div className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-3 sm:p-5 space-y-3.5">
      {/* Calendar Toolbar */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap pb-3 border-b border-slate-200 dark:border-[#202026]">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            ref={monthPickerRef}
            onClick={() => {
              setIsMonthPickerOpen(v => {
                if (!v) setPickerYear(calYear);
                return !v;
              });
            }}
            className="relative flex items-center bg-[#F4F6F9] dark:bg-[#17171C] border border-slate-300 dark:border-[#2A2A30] rounded-lg p-0.5 cursor-pointer"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevMonth();
              }}
              className="p-1.5 rounded-md text-slate-700 dark:text-gray-300 hover:bg-slate-200/70 dark:hover:bg-[#23232A] cursor-pointer"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-2.5 py-1 min-w-[140px] text-center flex items-center justify-center gap-1.5">
              <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                {MONTH_NAMES_FR[calMonth]} {calYear}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                  isMonthPickerOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                }`}
              />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNextMonth();
              }}
              className="p-1.5 rounded-md text-slate-700 dark:text-gray-300 hover:bg-slate-200/70 dark:hover:bg-[#23232A] cursor-pointer"
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {isMonthPickerOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-2 z-50 w-72 bg-white dark:bg-[#141418] border border-slate-300 dark:border-[#2C2C34] rounded-xl p-3 shadow-2xl cursor-default"
              >
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-200 dark:border-[#22222A]">
                  <button
                    type="button"
                    onClick={() => setPickerYear(y => y - 1)}
                    className="p-1.5 rounded-md bg-[#EDF1F5] dark:bg-[#1C1C22] border border-slate-300 dark:border-[#2D2D36] cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <select
                    value={pickerYear}
                    onChange={(e) => setPickerYear(Number(e.target.value))}
                    className="bg-[#EDF1F5] dark:bg-[#1C1C22] border border-slate-300 dark:border-[#2D2D36] rounded-md px-3 py-1 text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
                  >
                    {yearOptions.map(y => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setPickerYear(y => y + 1)}
                    className="p-1.5 rounded-md bg-[#EDF1F5] dark:bg-[#1C1C22] border border-slate-300 dark:border-[#2D2D36] cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {MONTH_NAMES_FR.map((mName, mIdx) => {
                    const active = mIdx === calMonth && pickerYear === calYear;
                    return (
                      <button
                        key={mName}
                        type="button"
                        onClick={() => {
                          setCalYear(pickerYear);
                          setCalMonth(mIdx);
                          setIsMonthPickerOpen(false);
                        }}
                        className={`py-1.5 px-1 rounded-md text-xs font-semibold cursor-pointer truncate ${
                          active
                            ? 'bg-blue-600 text-white'
                            : 'bg-[#EDF1F5] dark:bg-[#1A1A20] text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#24242D]'
                        }`}
                      >
                        {mName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleGoToday}
            className="px-2.5 py-1.5 rounded-lg bg-[#F4F6F9] dark:bg-[#18181D] hover:bg-slate-200/70 dark:hover:bg-[#22222A] border border-slate-300 dark:border-[#2C2C34] text-xs font-semibold text-blue-600 dark:text-blue-400 cursor-pointer"
          >
            Aujourd’hui
          </button>
        </div>

        {/* Right Toolbar */}
        {mode === 'planning' ? (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-0.5 bg-[#F4F6F9] dark:bg-[#0A0A0B] p-0.5 rounded-lg border border-slate-200 dark:border-[#222224] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCalendarFilter('all')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  calendarFilter === 'all'
                    ? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white border border-slate-200 dark:border-[#333]'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tout
              </button>
              <button
                type="button"
                onClick={() => setCalendarFilter('mine')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  calendarFilter === 'mine'
                    ? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white border border-slate-200 dark:border-[#333]'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Mes services
              </button>
            </div>

            <button
              type="button"
              onClick={openExportModal}
              className="px-3 py-1.5 rounded-lg bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-slate-800 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Exporter le Planning</span>
            </button>

            {canManagePlanning && (
              <button
                type="button"
                onClick={() => {
                  setNewPlanDate(selectedDate || todayIso);
                  setIsCreatePlanOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-slate-800 dark:text-gray-200 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Date</span>
              </button>
            )}

            {canManageSetlists && (
              <button
                type="button"
                onClick={() => {
                  setNewSetDate(selectedDate || todayIso);
                  setNewSetName('');
                  setNewSetNotes('');
                  setIsCreateSetlistOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Setlist</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-gray-400">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Dispo</span>
            <span>·</span>
            <span className="font-semibold text-amber-700 dark:text-amber-400">Incertain</span>
            <span>·</span>
            <span className="font-semibold text-rose-700 dark:text-rose-400">Indispo</span>
          </div>
        )}
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
        {DAY_NAMES_FR.map((name, i) => (
          <div
            key={name}
            className={`py-1 text-[11px] font-bold uppercase tracking-wider rounded-md ${
              i >= 5 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-gray-400'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Month Cells */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {calendarCells.map((cell, idx) => {
          const isToday = cell.dateStr === todayIso;
          const isSelected = cell.dateStr === selectedDate;
          const dayTargets = targetsByDate.get(cell.dateStr) || [];
          const dayRehearsals = rehearsalsByDate.get(cell.dateStr) || [];
          const myAvail = myAvailByDate.get(cell.dateStr);
          const myAvailMeta = myAvail ? AVAILABILITY_STATUS_META[myAvail.status] : null;
          const myAssignedSlots = dayTargets.flatMap(t =>
            t.slots.filter(s => s.uid && currentUser?.uid && s.uid === currentUser.uid)
          );

          return (
            <div
              key={`${cell.dateStr}-${idx}`}
              onClick={() => handleSelectDate(cell.dateStr)}
              className={`min-h-[76px] sm:min-h-[96px] p-1.5 sm:p-2 rounded-lg border flex flex-col justify-between transition-colors cursor-pointer group select-none ${
                isSelected
                  ? 'bg-[#EDF1F5] dark:bg-[#191922] border-blue-500 ring-1 ring-blue-500/50'
                  : isToday
                  ? 'bg-blue-50/70 dark:bg-blue-950/15 border-blue-500/40 hover:border-blue-400'
                  : cell.isCurrentMonth
                  ? 'bg-slate-50/70 dark:bg-[#141417] border-slate-200 dark:border-[#222226] hover:border-slate-300 dark:hover:border-[#34343D]'
                  : 'bg-white/60 dark:bg-[#0E0E10]/60 border-slate-200/60 dark:border-[#1B1B1F] opacity-40 hover:opacity-75'
              }`}
            >
              {/* Top row: day number + quick add or status */}
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center tabular-nums ${
                    isToday
                      ? 'bg-blue-600 text-white'
                      : isSelected
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-slate-800 dark:text-gray-200'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {mode === 'planning' && canManagePlanning && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDate(cell.dateStr);
                      setSelectedPlanningTargetId(dayTargets[0]?.id || null);
                      setEditingNoteDate(null);
                      setNewPlanDate(cell.dateStr);
                      setIsCreatePlanOpen(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-600/15 transition-opacity cursor-pointer"
                    aria-label={`Planifier le ${cell.dayNumber}`}
                    title="Planifier cette date"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}

                {mode === 'availabilities' && myAvailMeta && (
                  <span className={`text-[10px] font-bold truncate ${myAvailMeta.textClass}`}>
                    {myAvailMeta.shortLabel}
                  </span>
                )}
              </div>

              {/* Cell body */}
              {mode === 'planning' ? (
                <div className="mt-1 space-y-1 overflow-hidden">
                  {dayTargets.slice(0, 2).map(target => {
                    const counts = countSlotsByPole(target.slots);
                    const hasAny = target.slots.length > 0;
                    const iAmHere = Boolean(
                      currentUser?.uid && target.slots.some(s => s.uid === currentUser.uid)
                    );
                    const isFocused = activeTarget?.id === target.id && isSelected;
                    return (
                      <button
                        key={target.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(cell.dateStr);
                          setSelectedPlanningTargetId(target.id);
                          setEditingNoteDate(null);
                          setIsDayDrawerOpen(true);
                        }}
                        className={`w-full text-left px-1.5 py-0.5 rounded border text-[10px] sm:text-[11px] truncate transition-colors cursor-pointer ${
                          isFocused
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-white dark:bg-[#1C1C22] border-slate-300 dark:border-[#2E2E38] text-slate-800 dark:text-gray-200 hover:border-blue-500/50'
                        }`}
                        title={target.title}
                      >
                        <div className="font-semibold truncate">{target.title}</div>
                        <div
                          className={`text-[9px] sm:text-[10px] truncate tabular-nums ${
                            isFocused ? 'text-blue-100' : 'text-slate-500 dark:text-gray-400'
                          }`}
                        >
                          {hasAny
                            ? `${counts.musique}M · ${counts.chant}C · ${counts.regie}R`
                            : 'À compléter'}
                          {iAmHere ? ' · Moi' : ''}
                        </div>
                      </button>
                    );
                  })}
                  {dayTargets.length > 2 && (
                    <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 pl-1 tabular-nums">
                      +{dayTargets.length - 2}
                    </div>
                  )}
                  {dayRehearsals.slice(0, 2).map(target => (
                    <button
                      key={`reh_${target.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlanningTargetId(target.id);
                        setEditingNoteDate(null);
                        setIsDayDrawerOpen(true);
                      }}
                      className="w-full text-left px-1.5 py-0.5 rounded border border-amber-300/90 dark:border-amber-700/50 bg-amber-50/90 dark:bg-amber-950/25 text-amber-900 dark:text-amber-200 hover:border-amber-500/70 text-[10px] truncate transition-colors cursor-pointer tabular-nums"
                      title={`Répétition : ${target.title}${target.assignment?.rehearsalTime ? ` (${target.assignment.rehearsalTime})` : ''}${target.assignment?.rehearsalLocation ? ` · ${target.assignment.rehearsalLocation}` : ''}`}
                    >
                      <span className="font-semibold">Répét.</span>
                      {target.assignment?.rehearsalTime ? ` ${target.assignment.rehearsalTime}` : ''}
                      {' · '}
                      {target.title}
                    </button>
                  ))}
                  {dayRehearsals.length > 2 && (
                    <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 pl-1 tabular-nums">
                      +{dayRehearsals.length - 2} répét.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-1 space-y-0.5 overflow-hidden text-[10px]">
                  {dayTargets.slice(0, 2).map(t => (
                    <div
                      key={t.id}
                      className="truncate text-slate-700 dark:text-gray-300 font-medium"
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  ))}
                  {dayRehearsals.slice(0, 1).map(t => (
                    <div
                      key={`av_reh_${t.id}`}
                      className="truncate text-amber-700 dark:text-amber-400 font-medium tabular-nums"
                      title={`Répétition : ${t.title}`}
                    >
                      Répét. · {t.title}
                    </div>
                  ))}
                  {myAssignedSlots.length > 0 && (
                    <div className="truncate font-semibold text-blue-600 dark:text-blue-400">
                      {myAssignedSlots.map(s => s.roleLabel).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compact strip for undated setlists in planning mode */}
      {mode === 'planning' && undatedTargets.length > 0 && (
        <div className="pt-2.5 border-t border-slate-200 dark:border-[#202026] flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-500 dark:text-gray-400 font-medium">Sans date :</span>
          {undatedTargets.map(t => {
            const active = activeTarget?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedPlanningTargetId(t.id);
                  setIsDayDrawerOpen(true);
                }}
                className={`px-2 py-1 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                  active
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-[#F4F6F9] dark:bg-[#17171C] border-slate-300 dark:border-[#2C2C34] text-slate-800 dark:text-gray-200 hover:border-blue-500/50'
                }`}
              >
                {t.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 text-slate-900 dark:text-[#E0E0E0]">
      {/* Page Header & Concise Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarCheck2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Planning</span>
        </h1>

        <div className="flex items-center gap-1 bg-white dark:bg-[#111112] p-1 rounded-lg border border-slate-200 dark:border-[#222224] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setSubTab('planning');
              setIsDayDrawerOpen(false);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'planning'
                ? 'bg-[#EDF1F5] dark:bg-[#1C1C1E] text-slate-900 dark:text-white border border-slate-300 dark:border-[#333]'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Calendrier</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('availabilities');
              setIsDayDrawerOpen(false);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'availabilities'
                ? 'bg-[#EDF1F5] dark:bg-[#1C1C1E] text-slate-900 dark:text-white border border-slate-300 dark:border-[#333]'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Disponibilités</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('teams');
              setIsDayDrawerOpen(false);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'teams'
                ? 'bg-[#EDF1F5] dark:bg-[#1C1C1E] text-slate-900 dark:text-white border border-slate-300 dark:border-[#333]'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Équipes</span>
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-gray-400">
              {planningTeams.length}
            </span>
          </button>
        </div>
      </div>

      {/* ==================== SUB-TAB 1: CALENDRIER ==================== */}
      {subTab === 'planning' && renderMonthlyCalendar('planning')}

      {/* ==================== SUB-TAB 2: DISPONIBILITÉS EN CALENDRIER ==================== */}
      {subTab === 'availabilities' && (
        <div className="space-y-4">
          {canManagePlanning && (
            <div className="inline-flex items-center gap-1 bg-white dark:bg-[#111112] p-1 rounded-lg border border-slate-200 dark:border-[#222224]">
              <button
                type="button"
                onClick={() => setAvailViewMode('mine')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  availViewMode === 'mine'
                    ? 'bg-[#EDF1F5] dark:bg-[#1C1C1E] text-slate-900 dark:text-white border border-slate-300 dark:border-[#333]'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Mes réponses
              </button>
              <button
                type="button"
                onClick={() => {
                  setAvailViewMode('team');
                  setIsDayDrawerOpen(false);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  availViewMode === 'team'
                    ? 'bg-[#EDF1F5] dark:bg-[#1C1C1E] text-slate-900 dark:text-white border border-slate-300 dark:border-[#333]'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Matrice équipe
              </button>
            </div>
          )}

          {availViewMode === 'mine' || !canManagePlanning ? (
            renderMonthlyCalendar('availabilities')
          ) : (
            /* Responsable Team Availability Matrix */
            <div className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl overflow-hidden">
              {teamMatrixDates.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-gray-400">
                  Aucune date à venir.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-[#222224] bg-[#F4F6F9] dark:bg-[#16161A]">
                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-gray-300 sticky left-0 bg-[#F4F6F9] dark:bg-[#16161A]">
                          Membre
                        </th>
                        {teamMatrixDates.map(d => (
                          <th
                            key={d}
                            className="py-3 px-3 font-semibold text-center text-slate-700 dark:text-gray-300 border-l border-slate-200 dark:border-[#222224] whitespace-nowrap tabular-nums capitalize"
                          >
                            {formatPlanningDateFr(d)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-[#202026]">
                      {allUsers.map(user => (
                        <tr key={user.uid} className="hover:bg-slate-50 dark:hover:bg-[#16161A]">
                          <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-[#111112] whitespace-nowrap">
                            {user.displayName || user.email}
                          </td>
                          {teamMatrixDates.map(date => {
                            const av = planningAvailabilities.find(
                              a => a.date === date && a.uid === user.uid
                            );
                            const meta = av ? AVAILABILITY_STATUS_META[av.status] : null;
                            return (
                              <td
                                key={date}
                                title={av?.note || meta?.label || 'Non renseigné'}
                                className="py-2.5 px-3 text-center border-l border-slate-200 dark:border-[#202026] whitespace-nowrap"
                              >
                                {meta ? (
                                  <span className={`font-semibold ${meta.textClass}`}>
                                    {meta.shortLabel}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-gray-600">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== SUB-TAB 3: ÉQUIPES TYPES ==================== */}
      {subTab === 'teams' && (
        <div className="space-y-4">
          {canManagePlanning && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={openNewTeamModal}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouvelle équipe</span>
              </button>
            </div>
          )}

          {planningTeams.length === 0 ? (
            <div className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-10 text-center space-y-3">
              <Users className="w-9 h-9 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">
                Aucun modèle enregistré
              </p>
              {canManagePlanning && (
                <button
                  type="button"
                  onClick={openNewTeamModal}
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Créer une équipe</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {planningTeams.map(team => {
                const counts = { musique: 0, chant: 0, regie: 0 };
                for (const m of team.members) counts[m.pole] += 1;

                return (
                  <div
                    key={team.id}
                    className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {team.name}
                          </h3>
                          <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5 tabular-nums">
                            {counts.musique}M · {counts.chant}C · {counts.regie}R
                            {team.description ? ` · ${team.description}` : ''}
                          </div>
                        </div>

                        {canManagePlanning && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditTeamModal(team)}
                              className="p-1.5 rounded-lg bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-slate-700 dark:text-gray-300 cursor-pointer"
                              title="Modifier"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirmDeleteTeamId === team.id) {
                                  await deletePlanningTeam(team.id);
                                  setConfirmDeleteTeamId(null);
                                } else {
                                  setConfirmDeleteTeamId(team.id);
                                }
                              }}
                              className={`p-1.5 rounded-lg border cursor-pointer ${
                                confirmDeleteTeamId === team.id
                                  ? 'bg-rose-600 text-white border-rose-500'
                                  : 'bg-[#EDF1F5] dark:bg-[#1C1C1E] text-rose-600 dark:text-rose-400 border-slate-300 dark:border-[#333] hover:bg-rose-500/15'
                              }`}
                              title={confirmDeleteTeamId === team.id ? 'Confirmer' : 'Supprimer'}
                            >
                              {confirmDeleteTeamId === team.id ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        {PLANNING_POLE_ORDER.map(pole => {
                          const list = team.members.filter(m => m.pole === pole);
                          if (list.length === 0) return null;
                          return (
                            <div key={pole} className="text-xs flex items-baseline gap-2">
                              <span className={`font-semibold shrink-0 w-16 ${poleMetaMap[pole].accentText}`}>
                                {poleMetaMap[pole].shortLabel}
                              </span>
                              <span className="text-slate-700 dark:text-gray-300">
                                {list.map(m => `${m.displayName} (${m.roleLabel})`).join(', ')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {canManagePlanning && allTargets.length > 0 && (
                      <div className="pt-2.5 border-t border-slate-200 dark:border-[#222224] flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setTeamApplyModalTeam(team);
                            setTeamApplyTargetId(activeTarget?.id || allTargets[0].id);
                            setTeamApplyMode('append');
                          }}
                          className="px-2.5 py-1 rounded-md bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-xs font-semibold text-slate-800 dark:text-gray-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Appliquer</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== OFF-CANVAS DAY DETAIL DRAWER ==================== */}
      <AnimatePresence>
        {isDayDrawerOpen &&
          (subTab === 'planning' ||
            (subTab === 'availabilities' && (availViewMode === 'mine' || !canManagePlanning))) && (
          <motion.div
            {...MODAL_BACKDROP_MOTION}
            className="fixed inset-0 z-[45] bg-black/50 backdrop-blur-[1px] flex justify-end"
            onClick={() => setIsDayDrawerOpen(false)}
          >
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={subTab === 'planning' ? 'Détails du planning' : 'Mes disponibilités'}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.2, ease: STAGE_EASE }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-[540px] max-w-full h-full bg-white dark:bg-[#111112] border-l border-slate-200 dark:border-[#222224] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Sticky Drawer Header */}
              <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-[#222224] flex items-start justify-between gap-3 shrink-0 bg-white dark:bg-[#111112]">
                <div className="min-w-0 space-y-0.5">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white truncate capitalize">
                    {subTab === 'planning' && activeTarget
                      ? activeTarget.title
                      : formatPlanningDateLongFr(selectedDate)}
                  </h2>

                  {subTab === 'planning' ? (
                    activeTarget ? (
                      <div className="text-xs text-slate-600 dark:text-gray-400 flex items-center gap-1.5 flex-wrap tabular-nums">
                        <span className="capitalize font-medium text-slate-800 dark:text-gray-200">
                          {activeTarget.hasValidDate
                            ? formatPlanningDateLongFr(activeTarget.date)
                            : `Sans date (${todayIso})`}
                        </span>
                        {activeTarget.assignment?.callTime && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Balance {activeTarget.assignment.callTime}
                            </span>
                          </>
                        )}
                        {activeTarget.assignment?.serviceTime && (
                          <>
                            <span>·</span>
                            <span>Service {activeTarget.assignment.serviceTime}</span>
                          </>
                        )}
                        {activeTarget.assignment?.location && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {activeTarget.assignment.location}
                            </span>
                          </>
                        )}
                        {activeTarget.assignment?.rehearsalDate && (
                          <>
                            <span>·</span>
                            <span className="text-amber-700 dark:text-amber-400 font-medium">
                              Répét. {formatPlanningDateFr(activeTarget.assignment.rehearsalDate)}
                              {activeTarget.assignment.rehearsalTime ? ` ${activeTarget.assignment.rehearsalTime}` : ''}
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-gray-400">
                        Aucun service prévu ce jour
                      </div>
                    )
                  ) : (
                    <div className="text-xs text-slate-500 dark:text-gray-400">
                      Disponibilité personnelle
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsDayDrawerOpen(false)}
                  aria-label="Fermer le panneau"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C1C22] cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {subTab === 'planning' ? (
                  <>
                    {/* Event switcher if multiple events on selectedDate */}
                    {targetsForSelectedDate.length > 1 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {targetsForSelectedDate.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedPlanningTargetId(t.id)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                              activeTarget?.id === t.id
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-[#F4F6F9] dark:bg-[#16161A] border-slate-200 dark:border-[#242429] text-slate-700 dark:text-gray-300'
                            }`}
                          >
                            {t.title}
                          </button>
                        ))}
                      </div>
                    )}

                    {!activeTarget ? (
                      <div className="space-y-3">
                        <div className="bg-[#F4F6F9] dark:bg-[#16161A] border border-slate-200 dark:border-[#242429] rounded-xl p-5 flex flex-col gap-3">
                          <div className="text-xs text-slate-600 dark:text-gray-400">
                            Aucun service planifié pour cette date.
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {canManagePlanning && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewPlanDate(selectedDate);
                                  setIsCreatePlanOpen(true);
                                }}
                                className="px-3.5 py-2 rounded-lg bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-slate-800 dark:text-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Créer un événement</span>
                              </button>
                            )}
                            {canManageSetlists && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewSetDate(selectedDate);
                                  setNewSetName('');
                                  setNewSetNotes('');
                                  setIsCreateSetlistOpen(true);
                                }}
                                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Créer une setlist</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {rehearsalsForSelectedDate.length > 0 && (
                          <div className="bg-[#F8FAFC] dark:bg-[#151518] border border-slate-200 dark:border-[#222226] rounded-xl p-3.5 space-y-2">
                            <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                              Répétitions prévues ce jour
                            </div>
                            <div className="space-y-1.5">
                              {rehearsalsForSelectedDate.map(t => (
                                <button
                                  key={`drawer_reh_${t.id}`}
                                  type="button"
                                  onClick={() => setSelectedPlanningTargetId(t.id)}
                                  className="w-full text-left text-xs bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#242429] hover:border-amber-500/60 rounded-lg px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                                >
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                                      {t.title}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-gray-400 tabular-nums truncate">
                                      {[
                                        t.assignment?.rehearsalTime ? `Horaire ${t.assignment.rehearsalTime}` : null,
                                        t.assignment?.rehearsalLocation || null,
                                        t.hasValidDate ? `Service le ${formatPlanningDateFr(t.date)}` : null
                                      ]
                                        .filter(Boolean)
                                        .join(' · ') || 'Voir l’événement'}
                                    </div>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Drawer Tabs: Équipe & Planning vs Setlist */}
                        <div
                          role="tablist"
                          aria-label="Vues de l'événement"
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowRight' || e.key === 'End') {
                              e.preventDefault();
                              setDrawerTab('setlist');
                              drawerSetlistTabRef.current?.focus();
                            } else if (e.key === 'ArrowLeft' || e.key === 'Home') {
                              e.preventDefault();
                              setDrawerTab('team');
                              drawerTeamTabRef.current?.focus();
                            }
                          }}
                          className="flex items-center gap-1 border-b border-slate-200 dark:border-[#222226] overflow-x-auto"
                        >
                          <button
                            ref={drawerTeamTabRef}
                            type="button"
                            role="tab"
                            id="planning-drawer-tab-team"
                            aria-selected={drawerTab === 'team'}
                            tabIndex={drawerTab === 'team' ? 0 : -1}
                            onClick={() => setDrawerTab('team')}
                            className={`relative px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                              drawerTab === 'team'
                                ? 'text-blue-600 dark:text-blue-400 after:content-[""] after:absolute after:inset-x-0 after:bottom-0 after:border-b-2 after:border-blue-600 dark:after:border-blue-400'
                                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Équipe &amp; Planning</span>
                          </button>

                          <button
                            ref={drawerSetlistTabRef}
                            type="button"
                            role="tab"
                            id="planning-drawer-tab-setlist"
                            aria-selected={drawerTab === 'setlist'}
                            tabIndex={drawerTab === 'setlist' ? 0 : -1}
                            onClick={() => setDrawerTab('setlist')}
                            className={`relative px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                              drawerTab === 'setlist'
                                ? 'text-blue-600 dark:text-blue-400 after:content-[""] after:absolute after:inset-x-0 after:bottom-0 after:border-b-2 after:border-blue-600 dark:after:border-blue-400'
                                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <ListMusic className="w-3.5 h-3.5" />
                            <span>Setlist</span>
                            {activeTarget.setlist && (
                              <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-[#1E1E24] text-slate-700 dark:text-gray-300">
                                {activeTarget.setlist.songIds.filter(id => existingSongIdsSet.has(id)).length}
                              </span>
                            )}
                          </button>
                        </div>

                        <div
                          role="tabpanel"
                          aria-labelledby="planning-drawer-tab-team"
                          hidden={drawerTab !== 'team'}
                        >
                          <div className="space-y-4">
                        {/* Event Actions, Schedules & Availability Summary Card */}
                        <div className="bg-[#F8FAFC] dark:bg-[#151518] border border-slate-200 dark:border-[#222226] rounded-xl p-3.5 space-y-3">
                          {canManagePlanning && (
                            planningTeams.length > 0 ||
                            activeTarget.slots.some(s => s.uid) ||
                            (!activeTarget.setlist && activeTarget.assignment)
                          ) && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {planningTeams.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setApplyTeamId(planningTeams[0]?.id || '');
                                    setApplyTeamMode(activeTarget.slots.length === 0 ? 'replace' : 'append');
                                    setIsApplyModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Layers className="w-3.5 h-3.5" />
                                  <span>Modèle</span>
                                </button>
                              )}

                              {activeTarget.slots.some(s => s.uid) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSaveAsTeamName(activeTarget.title);
                                    setIsSaveAsTeamOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1C1C1E] hover:bg-slate-100 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-xs font-medium text-slate-800 dark:text-gray-200 flex items-center gap-1.5 cursor-pointer"
                                  title="Enregistrer cette composition comme modèle d’équipe"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                  <span>Sauver</span>
                                </button>
                              )}

                              {!activeTarget.setlist && activeTarget.assignment && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirmDeletePlanId === activeTarget.id) {
                                      await deletePlanningAssignment(activeTarget.id);
                                      setConfirmDeletePlanId(null);
                                      setSelectedPlanningTargetId(null);
                                    } else {
                                      setConfirmDeletePlanId(activeTarget.id);
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ml-auto ${
                                    confirmDeletePlanId === activeTarget.id
                                      ? 'bg-rose-600 text-white border-rose-500'
                                      : 'bg-white dark:bg-[#1C1C1E] text-rose-600 dark:text-rose-400 border-slate-300 dark:border-[#333] hover:bg-rose-500/15'
                                  }`}
                                  title={confirmDeletePlanId === activeTarget.id ? 'Confirmer' : 'Supprimer'}
                                >
                                  {confirmDeletePlanId === activeTarget.id ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Always-visible Schedules & Rehearsal Summary (editable by managers only) */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-800 dark:text-gray-200 inline-flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>Horaires &amp; Répétition</span>
                              </span>

                              {canManagePlanning && !isEditingDetails && (
                                <button
                                  type="button"
                                  onClick={() => setIsEditingDetails(true)}
                                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1C1C1E] hover:bg-slate-100 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-[11px] font-medium text-slate-700 dark:text-gray-200 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Modifier</span>
                                </button>
                              )}
                            </div>

                            {!isEditingDetails ? (
                              <div className="space-y-2 text-xs">
                                <div className="grid grid-cols-3 gap-2 bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#242429] rounded-lg px-3 py-2">
                                  <div className="min-w-0">
                                    <div className="text-[11px] text-slate-500 dark:text-gray-400">Balance</div>
                                    <div className="font-semibold text-slate-900 dark:text-white tabular-nums truncate">
                                      {activeTarget.assignment?.callTime || '—'}
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[11px] text-slate-500 dark:text-gray-400">Service</div>
                                    <div className="font-semibold text-slate-900 dark:text-white tabular-nums truncate">
                                      {activeTarget.assignment?.serviceTime || '—'}
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[11px] text-slate-500 dark:text-gray-400">Lieu</div>
                                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                                      {activeTarget.assignment?.location || '—'}
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#242429] rounded-lg px-3 py-2 space-y-1.5">
                                  <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                                    Répétition
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div className="min-w-0">
                                      <div className="text-[11px] text-slate-500 dark:text-gray-400">Date</div>
                                      <div className="font-semibold text-slate-900 dark:text-white tabular-nums capitalize truncate">
                                        {activeTarget.assignment?.rehearsalDate
                                          ? formatPlanningDateFr(activeTarget.assignment.rehearsalDate)
                                          : '—'}
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[11px] text-slate-500 dark:text-gray-400">Horaire</div>
                                      <div className="font-semibold text-slate-900 dark:text-white tabular-nums truncate">
                                        {activeTarget.assignment?.rehearsalTime || '—'}
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[11px] text-slate-500 dark:text-gray-400">Lieu</div>
                                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                                        {activeTarget.assignment?.rehearsalLocation || '—'}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {activeTarget.assignment?.notes && (
                                  <div className="text-xs text-slate-700 dark:text-gray-300 bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#242429] rounded-lg px-3 py-2 whitespace-pre-wrap">
                                    {activeTarget.assignment.notes}
                                  </div>
                                )}
                              </div>
                            ) : canManagePlanning ? (
                              <form
                                onSubmit={handleSaveDetails}
                                className="pt-2.5 border-t border-slate-200 dark:border-[#222224] space-y-3"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                  <div>
                                    <label className="block text-[11px] font-medium text-slate-600 dark:text-gray-400 mb-1">
                                      Balance
                                    </label>
                                    <input
                                      type="text"
                                      value={detailCallTime}
                                      onChange={(e) => setDetailCallTime(e.target.value)}
                                      placeholder="08:30"
                                      maxLength={20}
                                      className="w-full bg-white dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-medium text-slate-600 dark:text-gray-400 mb-1">
                                      Service
                                    </label>
                                    <input
                                      type="text"
                                      value={detailServiceTime}
                                      onChange={(e) => setDetailServiceTime(e.target.value)}
                                      placeholder="10:00"
                                      maxLength={20}
                                      className="w-full bg-white dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-medium text-slate-600 dark:text-gray-400 mb-1">
                                      Lieu
                                    </label>
                                    <input
                                      type="text"
                                      value={detailLocation}
                                      onChange={(e) => setDetailLocation(e.target.value)}
                                      placeholder="Grande salle"
                                      maxLength={200}
                                      className="w-full bg-white dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200 dark:border-[#202026] space-y-2">
                                  <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                                    Répétition
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                      <label className="block text-[11px] font-medium text-slate-600 dark:text-gray-400 mb-1">
                                        Date
                                      </label>
                                      <DarkDateInput
                                        value={detailRehearsalDate}
                                        onChange={setDetailRehearsalDate}
                                        placeholder="Optionnel"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-medium text-slate-600 dark:text-gray-400 mb-1">
                                        Horaire
                                      </label>
                                      <input
                                        type="text"
                                        value={detailRehearsalTime}
                                        onChange={(e) => setDetailRehearsalTime(e.target.value)}
                                        placeholder="19:30"
                                        maxLength={20}
                                        className="w-full bg-white dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-medium text-slate-600 dark:text-gray-400 mb-1">
                                        Lieu
                                      </label>
                                      <input
                                        type="text"
                                        value={detailRehearsalLocation}
                                        onChange={(e) => setDetailRehearsalLocation(e.target.value)}
                                        placeholder="Salle annexe"
                                        maxLength={200}
                                        className="w-full bg-white dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-medium text-slate-600 dark:text-gray-400 mb-1">
                                    Consignes
                                  </label>
                                  <textarea
                                    rows={2}
                                    maxLength={1000}
                                    value={detailNotes}
                                    onChange={(e) => setDetailNotes(e.target.value)}
                                    className="w-full bg-white dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                  />
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDetailCallTime(activeTarget.assignment?.callTime || '');
                                      setDetailServiceTime(activeTarget.assignment?.serviceTime || '');
                                      setDetailLocation(activeTarget.assignment?.location || '');
                                      setDetailRehearsalDate(activeTarget.assignment?.rehearsalDate || '');
                                      setDetailRehearsalTime(activeTarget.assignment?.rehearsalTime || '');
                                      setDetailRehearsalLocation(activeTarget.assignment?.rehearsalLocation || '');
                                      setDetailNotes(activeTarget.assignment?.notes || '');
                                      setIsEditingDetails(false);
                                    }}
                                    className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-gray-400 cursor-pointer"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    type="submit"
                                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                                  >
                                    Enregistrer
                                  </button>
                                </div>
                              </form>
                            ) : null}
                          </div>

                          {/* Availability summary & quick self-response */}
                          <div className="pt-2.5 border-t border-slate-200 dark:border-[#202026] flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setShowDateAvailPanel(v => !v)}
                                className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white cursor-pointer tabular-nums"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>
                                  Réponses : <strong className="text-emerald-700 dark:text-emerald-400">{availCountsForDetailDate.available}</strong> dispo
                                  {' · '}
                                  <strong className="text-amber-700 dark:text-amber-400">{availCountsForDetailDate.maybe}</strong> incertain
                                  {' · '}
                                  <strong className="text-rose-700 dark:text-rose-400">{availCountsForDetailDate.unavailable}</strong> indispo
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDateAvailPanel ? 'rotate-180' : ''}`} />
                              </button>

                              {activeTarget.hasValidDate && currentUser && (
                                <div className="inline-flex items-center gap-1">
                                  {(['available', 'maybe', 'unavailable'] as PlanningAvailabilityStatus[]).map(status => {
                                    const meta = AVAILABILITY_STATUS_META[status];
                                    const myStatus = availByUidForDetailDate.get(currentUser.uid)?.status;
                                    const isActive = myStatus === status;
                                    return (
                                      <button
                                        key={status}
                                        type="button"
                                        onClick={() => setPlanningAvailability({ date: activeTarget.date, status })}
                                        className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                                          isActive
                                            ? meta.activeButtonClass
                                            : 'bg-white dark:bg-[#111112] border-slate-200 dark:border-[#2A2A30] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                      >
                                        {meta.shortLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <AnimatePresence initial={false}>
                              {showDateAvailPanel && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {sortedMembersForDetailDate.map(({ user, availability }) => {
                                      const statusMeta = availability ? AVAILABILITY_STATUS_META[availability.status] : null;
                                      return (
                                        <div
                                          key={user.uid}
                                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#242429] text-xs"
                                        >
                                          <div className="min-w-0">
                                            <div className="font-semibold text-slate-900 dark:text-white truncate">
                                              {user.displayName || user.email}
                                            </div>
                                            {availability?.note && (
                                              <div className="text-[10px] text-slate-500 dark:text-gray-400 truncate">
                                                {availability.note}
                                              </div>
                                            )}
                                          </div>
                                          <span
                                            className={`text-[11px] font-semibold shrink-0 ${
                                              statusMeta ? statusMeta.textClass : 'text-slate-400 dark:text-gray-500'
                                            }`}
                                          >
                                            {statusMeta ? statusMeta.shortLabel : '—'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* 3 Pôles Stacked inside Drawer */}
                        <div className="space-y-3">
                          {PLANNING_POLE_ORDER.map(pole => {
                            const meta = poleMetaMap[pole];
                            const PoleIcon = POLE_ICONS[pole];
                            const poleSlots = activeTarget.slots.filter(s => s.pole === pole);
                            const isAddingHere = addingPole === pole;
                            const shortHeading =
                              pole === 'musique' ? 'Musiciens' : pole === 'chant' ? 'Chant' : 'Régie';

                            return (
                              <div
                                key={pole}
                                className="bg-white dark:bg-[#151518] border border-slate-200 dark:border-[#222226] rounded-xl p-3.5 space-y-2.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <PoleIcon className={`w-4 h-4 ${meta.accentText}`} />
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                      {shortHeading}
                                    </h3>
                                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-gray-400">
                                      {poleSlots.length}
                                    </span>
                                  </div>

                                  {canManagePlanning && !isAddingHere && (
                                    <button
                                      type="button"
                                      onClick={() => openInlineAddForPole(pole)}
                                      className="p-1.5 rounded-md bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-blue-600 dark:text-blue-400 cursor-pointer"
                                      aria-label={`Ajouter en ${shortHeading}`}
                                      title={`Ajouter en ${shortHeading}`}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {isAddingHere && canManagePlanning && (
                                  <form
                                    onSubmit={handleConfirmAddSlot}
                                    className="p-2.5 rounded-lg bg-[#F4F6F9] dark:bg-[#111112] border border-slate-300 dark:border-[#2D2D35] space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[11px] font-semibold text-slate-700 dark:text-gray-300">
                                        {slotExternalMode ? 'Invité externe' : 'Membre'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setSlotExternalMode(v => !v)}
                                        className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                      >
                                        {slotExternalMode ? 'Membre' : 'Invité'}
                                      </button>
                                    </div>

                                    {slotExternalMode ? (
                                      <input
                                        type="text"
                                        value={slotCustomName}
                                        onChange={(e) => setSlotCustomName(e.target.value)}
                                        placeholder="Nom complet..."
                                        maxLength={120}
                                        required
                                        className="w-full bg-white dark:bg-[#18181D] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                      />
                                    ) : (
                                      <div className="space-y-2">
                                        {memberGroups.length > 0 && (
                                          <div className="flex items-center gap-1.5">
                                            <select
                                              value={slotGroupFilterId}
                                              onChange={(e) => handleChangeSlotGroupFilter(e.target.value)}
                                              aria-label="Filtrer par groupe de membres"
                                              className="flex-1 min-w-0 bg-white dark:bg-[#18181D] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                                            >
                                              <option value="all">Tous les groupes ({allUsers.length})</option>
                                              {memberGroups.map(mg => {
                                                const count = countActiveMembersInGroup(mg, activeUserUids);
                                                return (
                                                  <option key={mg.id} value={mg.id}>
                                                    {mg.name} ({count})
                                                  </option>
                                                );
                                              })}
                                            </select>
                                            {selectedSlotMemberGroup && (
                                              <button
                                                type="button"
                                                onClick={handleBulkAddMemberGroupToPole}
                                                disabled={filteredMembersForSlotAdd.length === 0}
                                                className="px-2.5 py-1.5 rounded-md bg-[#EDF1F5] dark:bg-[#1C1C22] hover:bg-slate-200 dark:hover:bg-[#25252D] border border-slate-300 dark:border-[#333] text-[11px] font-semibold text-blue-600 dark:text-blue-400 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                                                title="Ajouter tous les membres de ce groupe non encore affectés sur ce pôle"
                                              >
                                                + Tout le groupe
                                              </button>
                                            )}
                                          </div>
                                        )}

                                        <select
                                          value={slotMemberUid}
                                          onChange={(e) => setSlotMemberUid(e.target.value)}
                                          className="w-full bg-white dark:bg-[#18181D] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                        >
                                          {filteredMembersForSlotAdd.length === 0 ? (
                                            <option value="">Aucun membre dans ce groupe</option>
                                          ) : (
                                            filteredMembersForSlotAdd.map(({ user, availability }) => {
                                              const statusLabel = availability
                                                ? AVAILABILITY_STATUS_META[availability.status].shortLabel
                                                : '—';
                                              return (
                                                <option key={user.uid} value={user.uid}>
                                                  {user.displayName || user.email} ({statusLabel})
                                                </option>
                                              );
                                            })
                                          )}
                                        </select>
                                      </div>
                                    )}

                                    <input
                                      type="text"
                                      list={`roles-${pole}`}
                                      value={slotRoleLabel}
                                      onChange={(e) => setSlotRoleLabel(e.target.value)}
                                      placeholder="Poste / Instrument"
                                      maxLength={80}
                                      className="w-full bg-white dark:bg-[#18181D] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                    <datalist id={`roles-${pole}`}>
                                      {meta.suggestedRoles.map(r => (
                                        <option key={r} value={r} />
                                      ))}
                                    </datalist>

                                    <div className="flex items-center justify-end gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setAddingPole(null)}
                                        className="px-2 py-1 rounded text-xs text-slate-600 dark:text-gray-400 cursor-pointer"
                                      >
                                        Annuler
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={!slotExternalMode && !slotMemberUid}
                                        className="px-2.5 py-1 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 cursor-pointer"
                                      >
                                        Valider
                                      </button>
                                    </div>
                                  </form>
                                )}

                                {poleSlots.length === 0 ? (
                                  <div className="text-xs text-slate-500 dark:text-gray-400 py-1">
                                    Personne d’assigné
                                  </div>
                                ) : (
                                  <div className="divide-y divide-slate-200 dark:divide-[#202026]">
                                    {poleSlots.map(slot => {
                                      const avail = slot.uid ? availByUidForDetailDate.get(slot.uid) : undefined;
                                      const availMeta = avail ? AVAILABILITY_STATUS_META[avail.status] : null;
                                      const isUnavailable = avail?.status === 'unavailable';
                                      const isMe = Boolean(slot.uid && currentUser?.uid && slot.uid === currentUser.uid);

                                      return (
                                        <div
                                          key={slot.id}
                                          className={`py-2 flex items-center justify-between gap-2 ${
                                            isUnavailable ? 'bg-rose-50/70 dark:bg-rose-950/20 -mx-2 px-2 rounded-md' : ''
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <UserAvatar
                                              displayName={slot.memberName}
                                              sizeClass="w-6 h-6 text-[10px]"
                                              iconClass="w-3 h-3"
                                            />
                                            <div className="min-w-0">
                                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                {slot.memberName}
                                                {isMe && (
                                                  <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">
                                                    (Moi)
                                                  </span>
                                                )}
                                              </div>

                                              {editingSlotId === slot.id ? (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                  <input
                                                    type="text"
                                                    value={editingSlotRole}
                                                    onChange={(e) => setEditingSlotRole(e.target.value)}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleSaveSlotRole(slot.id);
                                                      } else if (e.key === 'Escape') {
                                                        setEditingSlotId(null);
                                                      }
                                                    }}
                                                    maxLength={80}
                                                    autoFocus
                                                    className="w-32 bg-white dark:bg-[#111112] border border-blue-500 rounded px-1.5 py-0.5 text-[11px] text-slate-900 dark:text-white focus:outline-none"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => handleSaveSlotRole(slot.id)}
                                                    className="text-emerald-600 dark:text-emerald-400 cursor-pointer"
                                                  >
                                                    <Check className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              ) : (
                                                <div className="text-[11px] text-slate-600 dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
                                                  <span className="truncate">{slot.roleLabel}</span>
                                                  {activeTarget.hasValidDate && isUnavailable && (
                                                    <>
                                                      <span>·</span>
                                                      <span className="inline-flex items-center gap-0.5 text-rose-700 dark:text-rose-400 font-semibold">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Indispo
                                                      </span>
                                                    </>
                                                  )}
                                                  {activeTarget.hasValidDate && !isUnavailable && availMeta && (
                                                    <>
                                                      <span>·</span>
                                                      <span className={`font-medium ${availMeta.textClass}`}>
                                                        {availMeta.shortLabel}
                                                      </span>
                                                    </>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {canManagePlanning && (
                                            <div className="flex items-center gap-0.5 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingSlotId(slot.id);
                                                  setEditingSlotRole(slot.roleLabel);
                                                }}
                                                className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                                title="Modifier le poste"
                                              >
                                                <Edit3 className="w-3 h-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveSlot(slot.id)}
                                                className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                                                title="Retirer"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                          </div>
                        </div>

                        <div
                          role="tabpanel"
                          aria-labelledby="planning-drawer-tab-setlist"
                          hidden={drawerTab !== 'setlist'}
                        >
                          <div className="space-y-3">
                            {activeTarget.setlist ? (
                              <>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {(() => {
                                      const totalSecs = activeTarget.setlist!.songIds.reduce((total, id) => {
                                        const s = songsById.get(id);
                                        return total + parseDurationToSeconds(s);
                                      }, 0);
                                      if (totalSecs <= 0) return null;
                                      return (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-mono font-medium text-xs">
                                          <Clock className="w-3 h-3 shrink-0" />
                                          <span>{formatSetlistDuration(totalSecs)}</span>
                                        </span>
                                      );
                                    })()}
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {canManageSetlists && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedSetlist(activeTarget.setlist!);
                                          setIsAddSongModalOpen(true);
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Ajouter chant</span>
                                      </button>
                                    )}
                                    {canManageSetlists && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditSetlistModal(activeTarget.setlist!)}
                                        className="p-1.5 rounded-lg bg-white dark:bg-[#1C1C1E] hover:bg-slate-100 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-slate-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"
                                        title="Modifier les infos de la setlist"
                                        aria-label="Modifier la setlist"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {canManageSetlists && (
                                      <button
                                        type="button"
                                        onClick={() => handleDuplicateSetlist(activeTarget.setlist!)}
                                        className="p-1.5 rounded-lg bg-white dark:bg-[#1C1C1E] hover:bg-slate-100 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-slate-700 dark:text-gray-300 hover:text-cyan-700 dark:hover:text-cyan-400 cursor-pointer"
                                        title="Dupliquer la setlist"
                                        aria-label="Dupliquer la setlist"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setPdfModalSetlist(activeTarget.setlist!)}
                                      className="p-1.5 rounded-lg bg-white dark:bg-[#1C1C1E] hover:bg-slate-100 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-slate-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"
                                      title="Partager (QR code, lien ou PDF)"
                                      aria-label="Partager"
                                    >
                                      <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    </button>
                                    {canManageSetlists && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const st = activeTarget.setlist!;
                                          if (confirmDeleteSetlistId === st.id) {
                                            await deleteSetlist(st.id);
                                            setConfirmDeleteSetlistId(null);
                                            if (selectedSetlist?.id === st.id) {
                                              setSelectedSetlist(null);
                                            }
                                            setSelectedPlanningTargetId(null);
                                          } else {
                                            setConfirmDeleteSetlistId(st.id);
                                          }
                                        }}
                                        className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                                          confirmDeleteSetlistId === activeTarget.setlist.id
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 animate-pulse'
                                            : 'bg-white dark:bg-[#1C1C1E] hover:bg-rose-500/15 border-slate-300 dark:border-[#333] text-rose-600 dark:text-rose-400'
                                        }`}
                                        title={
                                          confirmDeleteSetlistId === activeTarget.setlist.id
                                            ? 'Confirmer la suppression'
                                            : 'Supprimer la setlist'
                                        }
                                        aria-label={
                                          confirmDeleteSetlistId === activeTarget.setlist.id
                                            ? 'Confirmer la suppression'
                                            : 'Supprimer la setlist'
                                        }
                                      >
                                        {confirmDeleteSetlistId === activeTarget.setlist.id ? (
                                          <Check className="w-3.5 h-3.5" />
                                        ) : (
                                          <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <SetlistSongsPanel
                                  setlist={activeTarget.setlist}
                                  onLaunchLive={handleLaunchLive}
                                  onOpenAddSongs={
                                    canManageSetlists
                                      ? (st) => {
                                          setSelectedSetlist(st);
                                          setIsAddSongModalOpen(true);
                                        }
                                      : undefined
                                  }
                                  onEditNotes={canManageSetlists ? handleOpenEditSetlistModal : undefined}
                                />
                              </>
                            ) : (
                              <div className="bg-[#F4F6F9] dark:bg-[#16161A] border border-slate-200 dark:border-[#242429] rounded-xl p-5 flex flex-col gap-3">
                                <div className="text-xs text-slate-600 dark:text-gray-400">
                                  Aucune setlist liée à cet événement.
                                </div>
                                {canManageSetlists && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewSetDate(activeTarget.hasValidDate ? activeTarget.date : selectedDate);
                                      setNewSetName(activeTarget.title || '');
                                      setNewSetNotes('');
                                      setIsCreateSetlistOpen(true);
                                    }}
                                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 self-start cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Créer une setlist</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  /* Availabilities Day Drawer Content */
                  (() => {
                    const av = myAvailByDate.get(selectedDate);
                    const currentStatus = av?.status;
                    const preferredPoles = av?.preferredPoles || [];
                    const dayTargets = targetsByDate.get(selectedDate) || [];
                    const myAssigned = dayTargets.flatMap(t =>
                      t.slots.filter(s => s.uid && currentUser?.uid && s.uid === currentUser.uid)
                    );
                    const isEditingNote = editingNoteDate === selectedDate;

                    return (
                      <div className="space-y-4">
                        {/* Events scheduled on this date */}
                        <div className="bg-[#F8FAFC] dark:bg-[#151518] border border-slate-200 dark:border-[#222226] rounded-xl p-3.5 space-y-2">
                          <div className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                            Services prévus
                          </div>
                          {dayTargets.length === 0 ? (
                            <div className="text-xs text-slate-500 dark:text-gray-400">
                              Aucun service prévu ce jour.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {dayTargets.map(t => (
                                <div
                                  key={t.id}
                                  className="text-xs bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#242429] rounded-lg px-3 py-2 space-y-0.5"
                                >
                                  <div className="font-semibold text-slate-900 dark:text-white">
                                    {t.title}
                                  </div>
                                  {(t.assignment?.callTime || t.assignment?.serviceTime || t.assignment?.location) && (
                                    <div className="text-[11px] text-slate-500 dark:text-gray-400 tabular-nums">
                                      {[
                                        t.assignment?.callTime ? `Balance ${t.assignment.callTime}` : null,
                                        t.assignment?.serviceTime ? `Service ${t.assignment.serviceTime}` : null,
                                        t.assignment?.location || null
                                      ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {myAssigned.length > 0 && (
                            <div className="pt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                              Affecté : {myAssigned.map(s => s.roleLabel).join(', ')}
                            </div>
                          )}
                        </div>

                        {/* Availability Status Selector */}
                        <div className="bg-[#F8FAFC] dark:bg-[#151518] border border-slate-200 dark:border-[#222226] rounded-xl p-3.5 space-y-3">
                          <div className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                            Ma réponse
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(['available', 'maybe', 'unavailable'] as PlanningAvailabilityStatus[]).map(status => {
                              const meta = AVAILABILITY_STATUS_META[status];
                              const active = currentStatus === status;
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() =>
                                    setPlanningAvailability({
                                      date: selectedDate,
                                      status,
                                      preferredPoles: av?.preferredPoles,
                                      note: av?.note
                                    })
                                  }
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                    active
                                      ? meta.activeButtonClass
                                      : 'bg-white dark:bg-[#1C1C1E] border-slate-300 dark:border-[#333] text-slate-700 dark:text-gray-300 hover:border-slate-400 dark:hover:border-[#444]'
                                  }`}
                                >
                                  {meta.shortLabel}
                                </button>
                              );
                            })}
                            {av && (
                              <button
                                type="button"
                                onClick={() => deletePlanningAvailability(av.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer ml-auto"
                                title="Effacer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Preferred Poles */}
                          <div className="pt-2.5 border-t border-slate-200 dark:border-[#202026] space-y-2 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-slate-500 dark:text-gray-400">Pôles :</span>
                              {PLANNING_POLE_ORDER.map(pole => {
                                const active = preferredPoles.includes(pole);
                                return (
                                  <button
                                    key={pole}
                                    type="button"
                                    onClick={() => handleTogglePreferredPole(selectedDate, pole)}
                                    className={`px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                                      active
                                        ? 'bg-blue-600/15 border-blue-500/50 text-blue-700 dark:text-blue-300 font-semibold'
                                        : 'bg-white dark:bg-[#18181B] border-slate-200 dark:border-[#2A2A30] text-slate-600 dark:text-gray-400'
                                    }`}
                                  >
                                    {poleMetaMap[pole].shortLabel}
                                  </button>
                                );
                              })}
                            </div>

                            {isEditingNote ? (
                              <form
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  await setPlanningAvailability({
                                    date: selectedDate,
                                    status: av?.status || 'available',
                                    preferredPoles: av?.preferredPoles,
                                    note: noteDraft.trim() || undefined
                                  });
                                  setEditingNoteDate(null);
                                }}
                                className="flex items-center gap-1.5 pt-1"
                              >
                                <input
                                  type="text"
                                  value={noteDraft}
                                  onChange={(e) => setNoteDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') setEditingNoteDate(null);
                                  }}
                                  placeholder="Précision..."
                                  maxLength={300}
                                  autoFocus
                                  className="flex-1 bg-white dark:bg-[#1C1C1E] border border-blue-500 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
                                />
                                <button
                                  type="submit"
                                  className="px-2.5 py-1 rounded bg-blue-600 text-white font-semibold cursor-pointer"
                                >
                                  OK
                                </button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteDate(selectedDate);
                                  setNoteDraft(av?.note || '');
                                }}
                                className="text-left text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              >
                                {av?.note ? `Note : « ${av.note} »` : '+ Note'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== MODALS ==================== */}

      {/* Create Standalone Planned Date Modal */}
      <AnimatePresence>
        {isCreatePlanOpen && (
          <motion.div
            {...MODAL_BACKDROP_MOTION}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsCreatePlanOpen(false)}
          >
            <motion.div
              {...MODAL_PANEL_MOTION}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Nouvelle date</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatePlanOpen(false)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateStandalonePlan} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                    Événement *
                  </label>
                  <input
                    type="text"
                    value={newPlanTitle}
                    onChange={(e) => setNewPlanTitle(e.target.value)}
                    placeholder="ex: Culte Dimanche Matin"
                    maxLength={200}
                    required
                    autoFocus
                    className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <DarkDateInput value={newPlanDate} onChange={setNewPlanDate} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                      Balance
                    </label>
                    <input
                      type="text"
                      value={newPlanCallTime}
                      onChange={(e) => setNewPlanCallTime(e.target.value)}
                      maxLength={20}
                      className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                      Service
                    </label>
                    <input
                      type="text"
                      value={newPlanServiceTime}
                      onChange={(e) => setNewPlanServiceTime(e.target.value)}
                      maxLength={20}
                      className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                    Lieu
                  </label>
                  <input
                    type="text"
                    value={newPlanLocation}
                    onChange={(e) => setNewPlanLocation(e.target.value)}
                    placeholder="Grande salle"
                    maxLength={200}
                    className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-[#222224] space-y-2.5">
                  <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Répétition (optionnel)
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                      Date de répétition
                    </label>
                    <DarkDateInput
                      value={newPlanRehearsalDate}
                      onChange={setNewPlanRehearsalDate}
                      placeholder="Choisir une date"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                        Horaire
                      </label>
                      <input
                        type="text"
                        value={newPlanRehearsalTime}
                        onChange={(e) => setNewPlanRehearsalTime(e.target.value)}
                        placeholder="19:30"
                        maxLength={20}
                        className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                        Lieu
                      </label>
                      <input
                        type="text"
                        value={newPlanRehearsalLocation}
                        onChange={(e) => setNewPlanRehearsalLocation(e.target.value)}
                        placeholder="Salle annexe"
                        maxLength={200}
                        className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#222224]">
                  <button
                    type="button"
                    onClick={() => setIsCreatePlanOpen(false)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-gray-400 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!newPlanTitle.trim() || !isValidIsoDate(newPlanDate)}
                    className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 cursor-pointer"
                  >
                    Créer
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apply Team Modal */}
      <AnimatePresence>
        {isApplyModalOpen && activeTarget && (
          <motion.div
            {...MODAL_BACKDROP_MOTION}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsApplyModalOpen(false)}
          >
            <motion.div
              {...MODAL_PANEL_MOTION}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Appliquer un modèle
                </h3>
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <select
                  value={applyTeamId}
                  onChange={(e) => setApplyTeamId(e.target.value)}
                  className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-white cursor-pointer"
                >
                  {planningTeams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.members.length})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setApplyTeamMode('append')}
                    className={`flex-1 py-1.5 rounded-md border font-semibold cursor-pointer ${
                      applyTeamMode === 'append'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-[#EDF1F5] dark:bg-[#1C1C1E] border-slate-300 dark:border-[#333] text-slate-700 dark:text-gray-300'
                    }`}
                  >
                    Compléter
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyTeamMode('replace')}
                    className={`flex-1 py-1.5 rounded-md border font-semibold cursor-pointer ${
                      applyTeamMode === 'replace'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-[#EDF1F5] dark:bg-[#1C1C1E] border-slate-300 dark:border-[#333] text-slate-700 dark:text-gray-300'
                    }`}
                  >
                    Remplacer
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#222224]">
                  <button
                    type="button"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-gray-400 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const team = planningTeams.find(t => t.id === applyTeamId);
                      if (team) {
                        await handleApplyTeamToTarget(activeTarget, team, applyTeamMode);
                      }
                      setIsApplyModalOpen(false);
                    }}
                    className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Lineup as Team Modal */}
      <AnimatePresence>
        {isSaveAsTeamOpen && (
          <motion.div
            {...MODAL_BACKDROP_MOTION}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsSaveAsTeamOpen(false)}
          >
            <motion.div
              {...MODAL_PANEL_MOTION}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Enregistrer le modèle
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSaveAsTeamOpen(false)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTargetAsTeam} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={saveAsTeamName}
                    onChange={(e) => setSaveAsTeamName(e.target.value)}
                    maxLength={120}
                    required
                    autoFocus
                    className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#222224]">
                  <button
                    type="button"
                    onClick={() => setIsSaveAsTeamOpen(false)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-gray-400 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!saveAsTeamName.trim()}
                    className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 cursor-pointer"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Team Modal */}
      <AnimatePresence>
        {isTeamModalOpen && (
          <motion.div
            {...MODAL_BACKDROP_MOTION}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsTeamModalOpen(false)}
          >
            <motion.div
              {...MODAL_PANEL_MOTION}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-200 dark:border-[#222224] flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>{editingTeam ? 'Modifier l’équipe' : 'Nouvelle équipe'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTeam} className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                      Nom *
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="ex: Équipe Dimanche A"
                      maxLength={120}
                      required
                      autoFocus
                      className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={teamDesc}
                      onChange={(e) => setTeamDesc(e.target.value)}
                      placeholder="Culte principal"
                      maxLength={500}
                      className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#F4F6F9] dark:bg-[#16161A] border border-slate-200 dark:border-[#25252B] grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={newTmUid}
                    onChange={(e) => setNewTmUid(e.target.value)}
                    className="w-full bg-white dark:bg-[#111112] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    {allUsers.map(u => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName || u.email}
                      </option>
                    ))}
                  </select>

                  <select
                    value={newTmPole}
                    onChange={(e) => {
                      const next = e.target.value as PlanningPole;
                      setNewTmPole(next);
                      setNewTmRole(poleMetaMap[next].suggestedRoles[0] || '');
                    }}
                    className="w-full bg-white dark:bg-[#111112] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    {PLANNING_POLE_ORDER.map(p => (
                      <option key={p} value={p}>
                        {poleMetaMap[p].shortLabel}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      list="team-role-suggestions"
                      value={newTmRole}
                      onChange={(e) => setNewTmRole(e.target.value)}
                      placeholder="Poste"
                      maxLength={80}
                      className="w-full bg-white dark:bg-[#111112] border border-slate-300 dark:border-[#333] rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                    <datalist id="team-role-suggestions">
                      {poleMetaMap[newTmPole].suggestedRoles.map(r => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                    <button
                      type="button"
                      onClick={handleAddMemberToTeamDraft}
                      className="px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700 dark:text-gray-300 tabular-nums">
                    Membres ({teamMembers.length})
                  </div>
                  {teamMembers.length === 0 ? (
                    <div className="text-xs text-slate-500 dark:text-gray-400 py-3 text-center border border-dashed border-slate-200 dark:border-[#25252B] rounded-lg">
                      Aucun membre.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-[#202026] border border-slate-200 dark:border-[#242429] rounded-lg">
                      {teamMembers.map((m, idx) => (
                        <div
                          key={`${m.uid}-${m.pole}-${m.roleLabel}-${idx}`}
                          className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {m.displayName}
                            </span>
                            <span className="text-slate-500 dark:text-gray-400">
                              {' · '}
                              <span className={poleMetaMap[m.pole].accentText}>
                                {poleMetaMap[m.pole].shortLabel}
                              </span>
                              {' · '}
                              {m.roleLabel}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTeamMembers(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#222224]">
                  <button
                    type="button"
                    onClick={() => setIsTeamModalOpen(false)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-gray-400 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!teamName.trim()}
                    className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 cursor-pointer"
                  >
                    {editingTeam ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apply Team from Teams Tab Modal */}
      <AnimatePresence>
        {teamApplyModalTeam && (
          <motion.div
            {...MODAL_BACKDROP_MOTION}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setTeamApplyModalTeam(null)}
          >
            <motion.div
              {...MODAL_PANEL_MOTION}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Appliquer « {teamApplyModalTeam.name} »
                </h3>
                <button
                  type="button"
                  onClick={() => setTeamApplyModalTeam(null)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <select
                  value={teamApplyTargetId}
                  onChange={(e) => setTeamApplyTargetId(e.target.value)}
                  className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-white cursor-pointer"
                >
                  {allTargets.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title} {t.hasValidDate ? `(${formatPlanningDateFr(t.date)})` : ''}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTeamApplyMode('append')}
                    className={`flex-1 py-1.5 rounded-md border font-semibold cursor-pointer ${
                      teamApplyMode === 'append'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-[#EDF1F5] dark:bg-[#1C1C1E] border-slate-300 dark:border-[#333] text-slate-700 dark:text-gray-300'
                    }`}
                  >
                    Compléter
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamApplyMode('replace')}
                    className={`flex-1 py-1.5 rounded-md border font-semibold cursor-pointer ${
                      teamApplyMode === 'replace'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-[#EDF1F5] dark:bg-[#1C1C1E] border-slate-300 dark:border-[#333] text-slate-700 dark:text-gray-300'
                    }`}
                  >
                    Remplacer
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#222224]">
                  <button
                    type="button"
                    onClick={() => setTeamApplyModalTeam(null)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-gray-400 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const target = allTargets.find(t => t.id === teamApplyTargetId);
                      if (target) {
                        await handleApplyTeamToTarget(target, teamApplyModalTeam, teamApplyMode);
                        if (target.hasValidDate) {
                          const [y, m] = target.date.split('-').map(Number);
                          setCalYear(y);
                          setCalMonth(m - 1);
                          setSelectedDate(target.date);
                        }
                        setSelectedPlanningTargetId(target.id);
                        setSubTab('planning');
                        setIsDayDrawerOpen(true);
                      }
                      setTeamApplyModalTeam(null);
                    }}
                    className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTarget?.setlist && (
        <SetlistAddSongsModal
          isOpen={isAddSongModalOpen}
          onClose={() => setIsAddSongModalOpen(false)}
          setlist={activeTarget.setlist}
          songs={songs}
          onToggleSong={handleToggleSongInDrawerSetlist}
          onAddMultipleSongs={handleAddMultipleSongsToDrawerSetlist}
          onRemoveMultipleSongs={handleRemoveMultipleSongsFromDrawerSetlist}
        />
      )}

      {pdfModalSetlist && (
        <SetlistPdfModal
          setlist={pdfModalSetlist}
          songs={songs}
          onClose={() => setPdfModalSetlist(null)}
        />
      )}

      {isLiveSetlistOpen && selectedSetlist && (
        <LiveSetlistPlayer onClose={() => setIsLiveSetlistOpen(false)} />
      )}

      {/* Modal: Create Setlist */}
      <AnimatePresence>
        {isCreateSetlistOpen && (
          <motion.div
            {...MODAL_BACKDROP_MOTION}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsCreateSetlistOpen(false)}
          >
            <motion.div
              {...MODAL_PANEL_MOTION}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl w-full max-w-md p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Nouvelle Setlist</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateSetlistOpen(false)}
                  className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreateNewSetlist} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                    Nom de l&apos;événement / Setlist *
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Culte Dimanche 30 Août"
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                    Date de l&apos;événement
                  </label>
                  <DarkDateInput value={newSetDate} onChange={setNewSetDate} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                    Notes pour la setlist
                  </label>
                  <textarea
                    rows={3}
                    maxLength={5000}
                    placeholder="Consignes, transitions, thème du culte..."
                    value={newSetNotes}
                    onChange={(e) => setNewSetNotes(e.target.value)}
                    className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-y"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#222224]">
                  <button
                    type="button"
                    onClick={() => setIsCreateSetlistOpen(false)}
                    className="px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-gray-400 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!newSetName.trim()}
                    className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 cursor-pointer"
                  >
                    Créer la setlist
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Edit Setlist Metadata */}
      <AnimatePresence>
        {editingSetlist && (
          <motion.div
            {...MODAL_BACKDROP_MOTION}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingSetlist(null)}
          >
            <motion.div
              {...MODAL_PANEL_MOTION}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl w-full max-w-md p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-[#222224]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Modifier les métadonnées de la setlist</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingSetlist(null)}
                  className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveEditSetlist} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                    Nom de la setlist *
                  </label>
                  <input
                    type="text"
                    value={editSetName}
                    onChange={(e) => setEditSetName(e.target.value)}
                    className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                    Date de l&apos;événement
                  </label>
                  <DarkDateInput value={editSetDate} onChange={setEditSetDate} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                    Notes pour la setlist
                  </label>
                  <textarea
                    rows={3}
                    maxLength={5000}
                    placeholder="Consignes, transitions, thème du culte..."
                    value={editSetNotes}
                    onChange={(e) => setEditSetNotes(e.target.value)}
                    className="w-full bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-y"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#222224]">
                  <button
                    type="button"
                    onClick={() => setEditingSetlist(null)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-gray-400 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!editSetName.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Enregistrer</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Planning Modal (PDF / CSV) */}
      <AnimatePresence>
        {isExportModalOpen && (
          <motion.div
            {...MODAL_BACKDROP_MOTION}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsExportModalOpen(false)}
          >
            <motion.div
              {...MODAL_PANEL_MOTION}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#222224]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Exporter le Planning</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  aria-label="Fermer"
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Period selector */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                  Période
                </div>
                <div className="grid grid-cols-3 gap-1 bg-[#F4F6F9] dark:bg-[#0A0A0B] p-1 rounded-lg border border-slate-200 dark:border-[#222224] text-xs font-semibold">
                  {(
                    [
                      { id: 'month', label: 'Mois affiché' },
                      { id: 'upcoming', label: 'À venir' },
                      { id: 'range', label: 'Plage libre' }
                    ] as Array<{ id: PlanningExportPeriodMode; label: string }>
                  ).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExportPeriodMode(opt.id)}
                      className={`px-2 py-1.5 rounded-md cursor-pointer transition-colors whitespace-nowrap ${
                        exportPeriodMode === opt.id
                          ? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white border border-slate-200 dark:border-[#333]'
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {exportPeriodMode === 'range' && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-gray-400 mb-1">
                        Du
                      </label>
                      <DarkDateInput value={exportStartDate} onChange={setExportStartDate} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-gray-400 mb-1">
                        Au
                      </label>
                      <DarkDateInput value={exportEndDate} onChange={setExportEndDate} />
                    </div>
                  </div>
                )}
              </div>

              {/* Scope selector */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                  Périmètre
                </div>
                <div className="grid grid-cols-2 gap-1 bg-[#F4F6F9] dark:bg-[#0A0A0B] p-1 rounded-lg border border-slate-200 dark:border-[#222224] text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`px-2.5 py-1.5 rounded-md cursor-pointer transition-colors whitespace-nowrap ${
                      exportScope === 'all'
                        ? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white border border-slate-200 dark:border-[#333]'
                        : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Tout le groupe
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportScope('mine')}
                    className={`px-2.5 py-1.5 rounded-md cursor-pointer transition-colors whitespace-nowrap ${
                      exportScope === 'mine'
                        ? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white border border-slate-200 dark:border-[#333]'
                        : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Mes services
                  </button>
                </div>
              </div>

              {/* Live preview summary */}
              <div className="bg-[#F8FAFC] dark:bg-[#151518] border border-slate-200 dark:border-[#222226] rounded-lg px-3.5 py-2.5 space-y-1 text-xs">
                <div className="font-semibold text-slate-900 dark:text-white capitalize truncate">
                  {exportPeriodMeta.label}
                </div>
                {exportTargets.length === 0 ? (
                  <div className="text-amber-700 dark:text-amber-400">
                    Aucun événement ou répétition sur cette période.
                  </div>
                ) : (
                  <div className="text-slate-600 dark:text-gray-400 tabular-nums">
                    {exportTargets.length} événement{exportTargets.length > 1 ? 's' : ''}
                    {' · '}
                    {exportRehearsalCount} répétition{exportRehearsalCount > 1 ? 's' : ''}
                    {' · '}
                    Horaires, équipe et chants inclus
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#222224] flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-gray-400 cursor-pointer mr-auto"
                >
                  Fermer
                </button>

                <button
                  type="button"
                  disabled={exportTargets.length === 0}
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 rounded-lg bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-slate-800 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-45 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>

                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    type="button"
                    disabled={exportTargets.length === 0 || isExportingPdf}
                    onClick={() => handleExportPdf(true)}
                    className="px-3 py-1.5 rounded-lg bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#333] text-slate-800 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-45 cursor-pointer whitespace-nowrap"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Partager</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={exportTargets.length === 0 || isExportingPdf}
                  onClick={() => handleExportPdf(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-45 cursor-pointer whitespace-nowrap"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
