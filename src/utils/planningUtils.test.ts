import assert from 'node:assert/strict';
import {
  countSlotsByPole,
  groupRehearsalsByDate,
  isValidIsoDate,
  makeAvailabilityDocId,
  mergeTeamMembersIntoSlots,
  sanitizePlanningSlots,
  sanitizePlanningTeamMembers,
  sortMembersByAvailability
} from './planningUtils';
import { PlanningAssignment, PlanningAvailability, PlanningTeamMember, UserProfile } from '../types';

assert.equal(isValidIsoDate('2026-11-29'), true);
assert.equal(isValidIsoDate('2026-11-29T10:00'), false);
assert.equal(isValidIsoDate('invalid'), false);
assert.equal(makeAvailabilityDocId('2026-11-29', 'u1'), '2026-11-29_u1');

const sanitizedMembers = sanitizePlanningTeamMembers([
  { uid: 'u1', displayName: 'Alice', pole: 'musique', roleLabel: 'Piano' },
  { uid: 'u1', displayName: 'Alice', pole: 'musique', roleLabel: 'piano' },
  { uid: 'u2', displayName: 'Bob', pole: 'regie', roleLabel: 'Projection' }
]);
assert.equal(sanitizedMembers.length, 2);

const mergedReplace = mergeTeamMembersIntoSlots(
  [{ id: 's0', uid: 'u9', memberName: 'Old', pole: 'chant', roleLabel: 'Lead', status: 'assigned' }],
  sanitizedMembers as PlanningTeamMember[],
  'replace'
);
assert.equal(mergedReplace.length, 2);

const mergedAppend = mergeTeamMembersIntoSlots(
  [{ id: 's0', uid: 'u1', memberName: 'Alice', pole: 'musique', roleLabel: 'Piano', status: 'assigned' }],
  sanitizedMembers as PlanningTeamMember[],
  'append'
);
assert.equal(mergedAppend.length, 2);
assert.deepEqual(countSlotsByPole(mergedAppend), { musique: 1, chant: 0, regie: 1 });

const cleanSlots = sanitizePlanningSlots([
  { id: '1', uid: null, memberName: '  Guest Tech  ', pole: 'regie', roleLabel: 'Son', status: 'assigned' },
  { id: '2', uid: null, memberName: '   ', pole: 'musique', roleLabel: 'Basse', status: 'assigned' }
]);
assert.equal(cleanSlots.length, 1);
assert.equal(cleanSlots[0].memberName, 'Guest Tech');

const users: UserProfile[] = [
  { uid: 'u3', email: '', displayName: 'Claire', currentGroupId: 'g1', role: 'member' },
  { uid: 'u1', email: '', displayName: 'Alice', currentGroupId: 'g1', role: 'member' },
  { uid: 'u2', email: '', displayName: 'Bob', currentGroupId: 'g1', role: 'viewer' }
];
const avails: PlanningAvailability[] = [
  { id: '2026-11-29_u3', groupId: 'g1', date: '2026-11-29', uid: 'u3', displayName: 'Claire', status: 'unavailable' },
  { id: '2026-11-29_u2', groupId: 'g1', date: '2026-11-29', uid: 'u2', displayName: 'Bob', status: 'available' }
];
const sorted = sortMembersByAvailability(users, avails);
assert.deepEqual(sorted.map(x => x.user.uid), ['u2', 'u1', 'u3']);

const rehearsalMap = groupRehearsalsByDate([
  { id: 't1', assignment: { id: 't1', groupId: 'g1', date: '2026-12-06', title: 'Culte', slots: [], rehearsalDate: '2026-12-03', rehearsalTime: '19:30' } as PlanningAssignment },
  { id: 't2', assignment: { id: 't2', groupId: 'g1', date: '2026-12-13', title: 'Concert', slots: [], rehearsalDate: 'invalid' } as PlanningAssignment },
  { id: 't3' }
]);
assert.equal(rehearsalMap.get('2026-12-03')?.length, 1);
assert.equal(rehearsalMap.size, 1);

console.log('planningUtils self-check passed');

