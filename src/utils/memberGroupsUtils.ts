import {
  MemberGroup,
  MemberGroupColor,
  PlanningPole,
  PlanningSlot,
  UserProfile
} from '../types';

export interface MemberGroupColorMeta {
  id: MemberGroupColor;
  label: string;
  dotClass: string;
  textClass: string;
  activeButtonClass: string;
}

export const MEMBER_GROUP_COLOR_ORDER: MemberGroupColor[] = [
  'blue',
  'emerald',
  'purple',
  'amber',
  'rose',
  'slate'
];

export const MEMBER_GROUP_COLORS: Record<MemberGroupColor, MemberGroupColorMeta> = {
  blue: {
    id: 'blue',
    label: 'Bleu',
    dotClass: 'bg-blue-500',
    textClass: 'text-blue-600 dark:text-blue-400',
    activeButtonClass: 'bg-blue-600 text-white border-blue-500'
  },
  emerald: {
    id: 'emerald',
    label: 'Émeraude',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    activeButtonClass: 'bg-emerald-600 text-white border-emerald-500'
  },
  purple: {
    id: 'purple',
    label: 'Violet',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600 dark:text-purple-400',
    activeButtonClass: 'bg-purple-600 text-white border-purple-500'
  },
  amber: {
    id: 'amber',
    label: 'Ambre',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
    activeButtonClass: 'bg-amber-600 text-white border-amber-500'
  },
  rose: {
    id: 'rose',
    label: 'Rose',
    dotClass: 'bg-rose-500',
    textClass: 'text-rose-600 dark:text-rose-400',
    activeButtonClass: 'bg-rose-600 text-white border-rose-500'
  },
  slate: {
    id: 'slate',
    label: 'Ardoise',
    dotClass: 'bg-slate-500',
    textClass: 'text-slate-600 dark:text-slate-400',
    activeButtonClass: 'bg-slate-700 text-white border-slate-600'
  }
};

export function normalizeMemberGroupColor(color?: string | null): MemberGroupColor {
  if (color && (MEMBER_GROUP_COLOR_ORDER as string[]).includes(color)) {
    return color as MemberGroupColor;
  }
  return 'blue';
}

export function sanitizeMemberGroupMemberIds(
  memberIds: unknown,
  maxMembers: number = 200
): string[] {
  if (!Array.isArray(memberIds)) return [];
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const raw of memberIds) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim().slice(0, 128);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    clean.push(trimmed);
    if (clean.length >= maxMembers) break;
  }
  return clean;
}

export function buildMemberGroupsByUid(
  memberGroups: MemberGroup[]
): Map<string, MemberGroup[]> {
  const map = new Map<string, MemberGroup[]>();
  const sortedGroups = [...memberGroups].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'fr')
  );
  for (const group of sortedGroups) {
    for (const uid of group.memberIds || []) {
      const list = map.get(uid) || [];
      list.push(group);
      map.set(uid, list);
    }
  }
  return map;
}

export function countActiveMembersInGroup(
  group: MemberGroup,
  activeUids: Set<string>
): number {
  let count = 0;
  for (const uid of group.memberIds || []) {
    if (activeUids.has(uid)) count++;
  }
  return count;
}

export function suggestRoleLabelForMemberInPole(
  member: UserProfile,
  pole: PlanningPole,
  suggestedRoles: string[]
): string {
  if (pole === 'musique') {
    const firstInst = (member.instruments || []).find(s => s.trim().length > 0);
    if (firstInst) return firstInst.trim().slice(0, 80);
  }
  if (pole === 'chant') {
    const firstVocal = (member.vocalRoles || []).find(s => s.trim().length > 0);
    if (firstVocal) return firstVocal.trim().slice(0, 80);
  }
  return (suggestedRoles[0] || 'Autre').slice(0, 80);
}

export function buildBulkSlotsForMemberGroup(params: {
  memberGroup: MemberGroup;
  existingSlots: PlanningSlot[];
  pole: PlanningPole;
  orderedMembers: UserProfile[];
  suggestedRoles: string[];
  maxSlots?: number;
}): { nextSlots: PlanningSlot[]; addedCount: number; skippedExistingCount: number } {
  const {
    memberGroup,
    existingSlots,
    pole,
    orderedMembers,
    suggestedRoles,
    maxSlots = 100
  } = params;

  const groupUidSet = new Set(memberGroup.memberIds || []);
  const alreadyAssignedInPole = new Set(
    existingSlots
      .filter(s => s.pole === pole && Boolean(s.uid))
      .map(s => s.uid as string)
  );

  const candidates = orderedMembers.filter(u => groupUidSet.has(u.uid));
  const nextSlots = [...existingSlots];
  let addedCount = 0;
  let skippedExistingCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const user = candidates[i];
    if (alreadyAssignedInPole.has(user.uid)) {
      skippedExistingCount++;
      continue;
    }
    if (nextSlots.length >= maxSlots) break;

    alreadyAssignedInPole.add(user.uid);
    nextSlots.push({
      id: `slot_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      uid: user.uid,
      memberName: (user.displayName || user.email || 'Membre').trim().slice(0, 120),
      pole,
      roleLabel: suggestRoleLabelForMemberInPole(user, pole, suggestedRoles),
      status: 'assigned'
    });
    addedCount++;
  }

  return { nextSlots, addedCount, skippedExistingCount };
}

export function computeMemberGroupMembershipUpdates(
  memberGroups: MemberGroup[],
  memberUid: string,
  targetGroupIds: string[]
): Array<{ groupId: string; memberIds: string[] }> {
  const wanted = new Set(targetGroupIds);
  const updates: Array<{ groupId: string; memberIds: string[] }> = [];

  for (const group of memberGroups) {
    const currentIds = sanitizeMemberGroupMemberIds(group.memberIds);
    const hasMember = currentIds.includes(memberUid);
    const shouldHaveMember = wanted.has(group.id);

    if (hasMember && !shouldHaveMember) {
      updates.push({
        groupId: group.id,
        memberIds: currentIds.filter(id => id !== memberUid)
      });
    } else if (!hasMember && shouldHaveMember) {
      const nextIds = sanitizeMemberGroupMemberIds([...currentIds, memberUid]);
      updates.push({
        groupId: group.id,
        memberIds: nextIds
      });
    }
  }

  return updates;
}
