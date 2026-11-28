import assert from 'node:assert/strict';
import { includesAllTokensIgnoreAccents } from './songSearchUtils';

const alice = 'Alice Dupont alice@example.com Guitare acoustique, Piano Soprano, Lead';

assert.equal(includesAllTokensIgnoreAccents(alice, ''), true);
assert.equal(includesAllTokensIgnoreAccents(alice, '   '), true);
assert.equal(includesAllTokensIgnoreAccents(alice, 'alice piano'), true);
assert.equal(includesAllTokensIgnoreAccents(alice, 'Soprano guitare'), true);
assert.equal(includesAllTokensIgnoreAccents(alice, 'dupont lead'), true);
assert.equal(includesAllTokensIgnoreAccents('Éléonore Chœur', 'eleonore choeur'), true);
assert.equal(includesAllTokensIgnoreAccents(alice, 'alice batterie'), false);

console.log('songSearchUtils self-check passed');
