import assert from 'node:assert/strict';
import {
  buildBulkSlotsForMemberGroup,
  buildMemberGroupsByUid,
  computeMemberGroupMembershipUpdates,
  countActiveMembersInGroup,
  normalizeMemberGroupColor,
  sanitizeMemberGroupMemberIds
} from './memberGroupsUtils';
import type { MemberGroup, PlanningSlot, UserProfile } from '../types';

const users: UserProfile[] = [
  {
    uid: 'u1',
    email: 'alice@example.com',
    displayName: 'Alice',
    currentGroupId: 'lib1',
    role: 'member',
    instruments: ['Piano', 'Guitare'],
    vocalRoles: ['Lead']
  },
  {
    uid: 'u2',
    email: 'bob@example.com',
    displayName: 'Bob',
    currentGroupId: 'lib1',
    role: 'member',
    instruments: ['Batterie'],
    vocalRoles: []
  },
  {
    uid: 'u3',
    email: 'claire@example.com',
    displayName: 'Claire',
    currentGroupId: 'lib1',
    role: 'member',
    instruments: [],
    vocalRoles: ['2e voix']
  }
];

const groups: MemberGroup[] = [
  {
    id: 'mg_b',
    groupId: 'lib1',
    name: 'Jeunes',
    color: 'emerald',
    memberIds: ['u1', 'u3']
  },
  {
    id: 'mg_a',
    groupId: 'lib1',
    name: 'Équipe A',
    color: 'blue',
    memberIds: ['u1', 'u2', 'unknown_uid']
  }
];

// 1. Sanitization deduplicates and drops invalid entries
assert.deepEqual(
  sanitizeMemberGroupMemberIds([' u1 ', '', 'u1', 'u2']),
  ['u1', 'u2']
);

// 2. Color normalization falls back safely
assert.equal(normalizeMemberGroupColor('purple'), 'purple');
assert.equal(normalizeMemberGroupColor('invalid-color'), 'blue');

// 3. Cumulative multi-group index sorts alphabetically by group name
const byUid = buildMemberGroupsByUid(groups);
assert.deepEqual(
  (byUid.get('u1') || []).map(g => g.name),
  ['Équipe A', 'Jeunes']
);
assert.deepEqual(
  (byUid.get('u2') || []).map(g => g.name),
  ['Équipe A']
);
assert.equal(byUid.get('missing'), undefined);

// 4. Active member counting ignores removed/unknown UIDs
const activeSet = new Set(users.map(u => u.uid));
assert.equal(countActiveMembersInGroup(groups[1], activeSet), 2);

// 5. Bulk slot assignment into Planning is idempotent and picks member skill
const existingSlots: PlanningSlot[] = [
  {
    id: 's_existing',
    uid: 'u2',
    memberName: 'Bob',
    pole: 'musique',
    roleLabel: 'Batterie',
    status: 'confirmed'
  }
];

const bulkResult = buildBulkSlotsForMemberGroup({
  memberGroup: groups[1], // u1, u2, unknown_uid
  existingSlots,
  pole: 'musique',
  orderedMembers: users,
  suggestedRoles: ['Synthé', 'Basse']
});

assert.equal(bulkResult.addedCount, 1);
assert.equal(bulkResult.skippedExistingCount, 1);
assert.equal(bulkResult.nextSlots.length, 2);
assert.equal(bulkResult.nextSlots[1].uid, 'u1');
assert.equal(bulkResult.nextSlots[1].roleLabel, 'Piano');

// 6. Membership updates diff accurately for cumulative editing
const updates = computeMemberGroupMembershipUpdates(groups, 'u2', ['mg_b']);
assert.deepEqual(updates, [
  { groupId: 'mg_b', memberIds: ['u1', 'u3', 'u2'] },
  { groupId: 'mg_a', memberIds: ['u1', 'unknown_uid'] }
]);

console.log('memberGroupsUtils tests passed');
