import {
  MemberSkillsConfig,
  PlanningAssignment,
  PlanningAvailability,
  PlanningAvailabilityStatus,
  PlanningPole,
  PlanningSlot,
  PlanningTeamMember,
  UserProfile
} from '../types';

export const PLANNING_POLE_ORDER: PlanningPole[] = ['musique', 'chant', 'regie'];

export interface PlanningPoleMeta {
  key: PlanningPole;
  label: string;
  shortLabel: string;
  emptyLabel: string;
  suggestedRoles: string[];
  accentText: string;
  surfaceTint: string;
}

export const PLANNING_POLE_META: Record<PlanningPole, PlanningPoleMeta> = {
  musique: {
    key: 'musique',
    label: 'Musiciens',
    shortLabel: 'Musique',
    emptyLabel: 'Aucun musicien assigné',
    suggestedRoles: [
      'Piano / Clavier',
      'Guitare acoustique',
      'Guitare électrique',
      'Basse',
      'Batterie',
      'Percussions',
      'Violon',
      'Cuivres / Sax'
    ],
    accentText: 'text-blue-600 dark:text-blue-400',
    surfaceTint: 'bg-blue-500/10 border-blue-500/25'
  },
  chant: {
    key: 'chant',
    label: 'Chant & Voix',
    shortLabel: 'Chant',
    emptyLabel: 'Aucun chantre assigné',
    suggestedRoles: [
      'Direction / Lead',
      'Chant Lead',
      'Chœur',
      'Soprano',
      'Alto',
      'Ténor'
    ],
    accentText: 'text-purple-600 dark:text-purple-400',
    surfaceTint: 'bg-purple-500/10 border-purple-500/25'
  },
  regie: {
    key: 'regie',
    label: 'Régie & Technique',
    shortLabel: 'Régie',
    emptyLabel: 'Aucune personne en régie',
    suggestedRoles: [
      'Sonorisation (Façade)',
      'Retours / In-Ear',
      'Projection / Paroles',
      'Caméra / Vidéo',
      'Livestream',
      'Lumière'
    ],
    accentText: 'text-cyan-700 dark:text-cyan-400',
    surfaceTint: 'bg-cyan-500/10 border-cyan-500/25'
  }
};

export function buildPlanningPoleMetaMap(
  skillsConfig?: MemberSkillsConfig | null
): Record<PlanningPole, PlanningPoleMeta> {
  const musiqueRoles =
    skillsConfig && Array.isArray(skillsConfig.instruments) && skillsConfig.instruments.length > 0
      ? skillsConfig.instruments
      : PLANNING_POLE_META.musique.suggestedRoles;
  const chantRoles =
    skillsConfig && Array.isArray(skillsConfig.vocalRoles) && skillsConfig.vocalRoles.length > 0
      ? skillsConfig.vocalRoles
      : PLANNING_POLE_META.chant.suggestedRoles;

  return {
    musique: {
      ...PLANNING_POLE_META.musique,
      suggestedRoles: musiqueRoles
    },
    chant: {
      ...PLANNING_POLE_META.chant,
      suggestedRoles: chantRoles
    },
    regie: PLANNING_POLE_META.regie
  };
}

export interface AvailabilityStatusMeta {
  key: PlanningAvailabilityStatus;
  label: string;
  shortLabel: string;
  textClass: string;
  activeButtonClass: string;
}

export const AVAILABILITY_STATUS_META: Record<PlanningAvailabilityStatus, AvailabilityStatusMeta> = {
  available: {
    key: 'available',
    label: 'Disponible',
    shortLabel: 'Dispo',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    activeButtonClass: 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
  },
  maybe: {
    key: 'maybe',
    label: 'Incertain',
    shortLabel: 'Incertain',
    textClass: 'text-amber-700 dark:text-amber-400',
    activeButtonClass: 'bg-amber-600 text-white border-amber-500 shadow-xs'
  },
  unavailable: {
    key: 'unavailable',
    label: 'Indisponible',
    shortLabel: 'Indispo',
    textClass: 'text-rose-700 dark:text-rose-400',
    activeButtonClass: 'bg-rose-600 text-white border-rose-500 shadow-xs'
  }
};

export function isValidIsoDate(dateStr: string): boolean {
  return typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim());
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function makeAvailabilityDocId(date: string, uid: string): string {
  return `${date.trim()}_${uid.trim()}`;
}

export function formatPlanningDateFr(dateStr?: string): string {
  if (!dateStr || !isValidIsoDate(dateStr)) return dateStr || 'Date non définie';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatPlanningDateLongFr(dateStr?: string): string {
  if (!dateStr || !isValidIsoDate(dateStr)) return dateStr || 'Date non définie';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function normalizePlanningPole(pole: unknown): PlanningPole {
  if (pole === 'chant' || pole === 'regie' || pole === 'musique') return pole;
  return 'musique';
}

export function sanitizePlanningTeamMembers(members: PlanningTeamMember[]): PlanningTeamMember[] {
  if (!Array.isArray(members)) return [];
  const seen = new Set<string>();
  const clean: PlanningTeamMember[] = [];
  for (const m of members) {
    if (!m || typeof m.uid !== 'string' || !m.uid.trim()) continue;
    const uid = m.uid.trim().slice(0, 128);
    const pole = normalizePlanningPole(m.pole);
    const roleLabel = (typeof m.roleLabel === 'string' ? m.roleLabel.trim() : '').slice(0, 80) || PLANNING_POLE_META[pole].suggestedRoles[0];
    const dedupeKey = `${uid}:${pole}:${roleLabel.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    clean.push({
      uid,
      displayName: (typeof m.displayName === 'string' ? m.displayName.trim() : '').slice(0, 120) || 'Membre',
      pole,
      roleLabel
    });
    if (clean.length >= 100) break;
  }
  return clean;
}

export function sanitizePlanningSlots(slots: PlanningSlot[]): PlanningSlot[] {
  if (!Array.isArray(slots)) return [];
  const clean: PlanningSlot[] = [];
  for (let i = 0; i < slots.length && clean.length < 100; i++) {
    const s = slots[i];
    if (!s) continue;
    const pole = normalizePlanningPole(s.pole);
    const memberName = (typeof s.memberName === 'string' ? s.memberName.trim() : '').slice(0, 120);
    if (!memberName) continue;
    const roleLabel = (typeof s.roleLabel === 'string' ? s.roleLabel.trim() : '').slice(0, 80) || PLANNING_POLE_META[pole].suggestedRoles[0];
    const status = s.status === 'confirmed' || s.status === 'declined' ? s.status : 'assigned';
    const uid = typeof s.uid === 'string' && s.uid.trim() ? s.uid.trim().slice(0, 128) : null;
    const note = typeof s.note === 'string' && s.note.trim() ? s.note.trim().slice(0, 300) : undefined;
    const id = typeof s.id === 'string' && s.id.trim() ? s.id.trim().slice(0, 128) : `slot_${Date.now()}_${i}`;
    clean.push({
      id,
      uid,
      memberName,
      pole,
      roleLabel,
      status,
      ...(note ? { note } : {})
    });
  }
  return clean;
}

export function mergeTeamMembersIntoSlots(
  existingSlots: PlanningSlot[],
  teamMembers: PlanningTeamMember[],
  mode: 'replace' | 'append' = 'append'
): PlanningSlot[] {
  const base = mode === 'replace' ? [] : sanitizePlanningSlots(existingSlots);
  const existingKeys = new Set(
    base.map(s => `${s.uid || s.memberName.toLowerCase()}:${s.pole}:${s.roleLabel.toLowerCase()}`)
  );
  const next = [...base];

  for (let i = 0; i < teamMembers.length && next.length < 100; i++) {
    const tm = teamMembers[i];
    const key = `${tm.uid}:${tm.pole}:${tm.roleLabel.toLowerCase()}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    next.push({
      id: `slot_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      uid: tm.uid,
      memberName: tm.displayName,
      pole: tm.pole,
      roleLabel: tm.roleLabel,
      status: 'assigned'
    });
  }

  return next;
}

export function sortMembersByAvailability(
  users: UserProfile[],
  availabilitiesForDate: PlanningAvailability[]
): Array<{ user: UserProfile; availability?: PlanningAvailability }> {
  const availByUid = new Map<string, PlanningAvailability>();
  for (const av of availabilitiesForDate) {
    availByUid.set(av.uid, av);
  }

  const weight = (status?: PlanningAvailabilityStatus): number => {
    if (status === 'available') return 0;
    if (status === 'maybe') return 1;
    if (!status) return 2;
    return 3;
  };

  return [...users]
    .map(user => ({ user, availability: availByUid.get(user.uid) }))
    .sort((a, b) => {
      const diff = weight(a.availability?.status) - weight(b.availability?.status);
      if (diff !== 0) return diff;
      return (a.user.displayName || '').localeCompare(b.user.displayName || '', 'fr');
    });
}

export function countSlotsByPole(slots: PlanningSlot[]): Record<PlanningPole, number> {
  const counts: Record<PlanningPole, number> = { musique: 0, chant: 0, regie: 0 };
  for (const slot of slots) {
    if (slot.pole === 'musique' || slot.pole === 'chant' || slot.pole === 'regie') {
      counts[slot.pole] += 1;
    }
  }
  return counts;
}

export function getAssignmentForSetlist(
  assignments: PlanningAssignment[],
  setlistId: string
): PlanningAssignment | undefined {
  return assignments.find(a => a.setlistId === setlistId || a.id === setlistId);
}

export function groupRehearsalsByDate<T extends { assignment?: PlanningAssignment }>(
  targets: T[]
): Map<string, T[]> {
  const byDate = new Map<string, T[]>();
  for (const t of targets) {
    const rDate = t.assignment?.rehearsalDate;
    if (!isValidIsoDate(rDate)) continue;
    const arr = byDate.get(rDate) || [];
    arr.push(t);
    byDate.set(rDate, arr);
  }
  return byDate;
}

