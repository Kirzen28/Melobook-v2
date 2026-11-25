import assert from 'node:assert/strict';
import {
  ALL_ACCESSES,
  accessesToLegacyRole,
  formatAccessSummary,
  isRegieOnlyAccesses,
  legacyRoleToAccesses,
  normalizeAccessList,
  resolveMemberAccesses,
  toggleAccessInList
} from './accessUtils';
import { Group } from '../types';

// 1. Admin always expands to all 5 accesses
assert.deepEqual(normalizeAccessList(['admin']), ALL_ACCESSES);

// 2. Unchecking a sub-access while admin is enabled removes both admin and that sub-access
assert.deepEqual(
  toggleAccessInList(['admin'], 'setlists', false),
  ['chants', 'pupitre', 'regie']
);

// 3. Checking admin turns on all 5 accesses; owner cannot be downgraded
assert.deepEqual(toggleAccessInList(['regie'], 'admin', false), ALL_ACCESSES);
assert.deepEqual(toggleAccessInList(['admin'], 'regie', true), ALL_ACCESSES);

// 4. Regie-only isolation
assert.equal(isRegieOnlyAccesses(['regie']), true);
assert.equal(isRegieOnlyAccesses(['regie', 'pupitre']), false);
assert.equal(isRegieOnlyAccesses(['admin']), false);
assert.equal(isRegieOnlyAccesses([]), false);

// 5. Per-library resolution prefers memberAccesses, falls back to memberRoles, then user fallback
const sampleGroup: Group = {
  id: 'g1',
  name: 'Groupe 1',
  ownerId: 'owner-1',
  members: ['owner-1', 'u-regie', 'u-legacy', 'u-default'],
  inviteCode: 'ABC123',
  memberAccesses: {
    'u-regie': ['regie']
  },
  memberRoles: {
    'u-legacy': 'editor'
  }
};

assert.deepEqual(resolveMemberAccesses(sampleGroup, 'owner-1', 'member'), ALL_ACCESSES);
assert.deepEqual(resolveMemberAccesses(sampleGroup, 'u-regie', 'admin'), ['regie']);
assert.deepEqual(resolveMemberAccesses(sampleGroup, 'u-legacy'), ['chants', 'pupitre']);
assert.deepEqual(resolveMemberAccesses(sampleGroup, 'u-default'), ['pupitre']);

// 6. Legacy mapping & formatting
assert.deepEqual(legacyRoleToAccesses('viewer'), ['regie']);
assert.deepEqual(legacyRoleToAccesses('member'), ['pupitre']);
assert.equal(accessesToLegacyRole(['regie']), 'viewer');
assert.equal(accessesToLegacyRole(['chants', 'regie']), 'editor');
assert.equal(formatAccessSummary(['chants', 'regie']), 'Chants · Régie');
assert.equal(formatAccessSummary(['admin']), 'Admin (Accès complet)');

console.log('accessUtils self-check passed');
