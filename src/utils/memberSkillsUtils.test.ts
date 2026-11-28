import assert from 'node:assert/strict';
import {
  DEFAULT_INSTRUMENTS,
  DEFAULT_VOCAL_ROLES,
  applySkillMutationsToList,
  applySkillsMutationToProfile,
  sanitizeMemberSkillsConfig
} from './memberSkillsUtils';

// 1. Default fallback when raw config is missing or malformed
const fallback = sanitizeMemberSkillsConfig(null);
assert.deepEqual(fallback.instruments, DEFAULT_INSTRUMENTS);
assert.deepEqual(fallback.vocalRoles, DEFAULT_VOCAL_ROLES);

// 2. Deduplication (case-insensitive) & trimming while preserving explicit empty array
const deduped = sanitizeMemberSkillsConfig({
  instruments: ['  Piano  ', 'piano', '', 'Basse'],
  vocalRoles: []
});
assert.deepEqual(deduped.instruments, ['Piano', 'Basse']);
assert.deepEqual(deduped.vocalRoles, []);

// 3. Renaming updates existing member profile and deduplicates collision
const renamed = applySkillMutationsToList(
  ['Piano / Clavier', 'Clavier', 'Basse'],
  [{ from: 'piano / clavier', to: 'Clavier' }],
  [],
  20
);
assert.equal(renamed.changed, true);
assert.deepEqual(renamed.next, ['Clavier', 'Basse']);

// 4. Deletion removes matching skill case-insensitively and preserves custom ones
const deleted = applySkillsMutationToProfile(
  ['Batterie', 'Accordéon'],
  ['Soprano', 'Chant Lead'],
  {
    instrumentDeletions: ['batterie'],
    vocalRoleRenames: [{ from: 'Chant Lead', to: 'Lead Vocal' }],
    vocalRoleDeletions: ['soprano']
  }
);
assert.equal(deleted.changed, true);
assert.deepEqual(deleted.instruments, ['Accordéon']);
assert.deepEqual(deleted.vocalRoles, ['Lead Vocal']);

// 5. No-op returns changed: false
const unchanged = applySkillMutationsToList(['Guitare acoustique'], [], ['Batterie'], 20);
assert.equal(unchanged.changed, false);
assert.deepEqual(unchanged.next, ['Guitare acoustique']);

console.log('memberSkillsUtils tests passed');
