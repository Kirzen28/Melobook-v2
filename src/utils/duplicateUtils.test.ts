import assert from 'node:assert/strict';
import {
  buildArtistMergeUpdates,
  buildCategoryMergeUpdates,
  cleanCustomNameList,
  collectArtistVariants,
  collectCategoryVariants,
  findNameDuplicateGroups
} from './duplicateUtils';
import { Song } from '../types';

const makeSong = (id: string, artist: string, tags: string[]): Song => ({
  id,
  groupId: 'g1',
  title: `Song ${id}`,
  artist,
  key: 'C',
  tempo: 100,
  tags,
  contentChordPro: '[C]Test',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
});

const songs: Song[] = [
  makeSong('s1', 'Hillsong United, Chris Tomlin', ['Louange', 'louange', 'Adoration']),
  makeSong('s2', 'hillsong-united', ['louanges', 'Célébration']),
  makeSong('s3', 'Hillsong  United', ['Celebration']),
  makeSong('s4', 'JEM 1', ['Noël']),
  makeSong('s5', 'JEM 2', ['Noel'])
];

// 1. Exact normalized artist duplicates
const artistVariants = collectArtistVariants(songs, ['hillsong-united'], ['Hillsong United']);
const artistExactGroups = findNameDuplicateGroups(artistVariants, 'exact_norm', 'art');
assert.equal(artistExactGroups.length, 1);
assert.equal(artistExactGroups[0].recommendedKeepName, 'Hillsong United');
assert.equal(artistExactGroups[0].variants.length, 3);

// 2. Similar mode catches singular/plural ("Louange" vs "louanges") but NOT "JEM 1" vs "JEM 2"
const catVariants = collectCategoryVariants(songs, ['Celebration'], ['Louange', 'Célébration', 'Noël']);
const catSimilarGroups = findNameDuplicateGroups(catVariants, 'similar', 'cat');
const louangeGroup = catSimilarGroups.find(g => g.variants.some(v => v.name === 'Louange'));
assert.ok(louangeGroup);
assert.equal(louangeGroup.recommendedKeepName, 'Louange');
assert.ok(louangeGroup.variants.some(v => v.name === 'louanges'));

const jemGroups = findNameDuplicateGroups(artistVariants, 'similar', 'art');
assert.equal(jemGroups.some(g => g.variants.some(v => v.name === 'JEM 1')), false);

// 3. Merge updates deduplicate within and across songs
const artistUpdates = buildArtistMergeUpdates(songs, {
  'hillsong-united': 'Hillsong United',
  'Hillsong  United': 'Hillsong United'
});
assert.deepEqual(artistUpdates, [
  { id: 's2', artist: 'Hillsong United' },
  { id: 's3', artist: 'Hillsong United' }
]);

const categoryUpdates = buildCategoryMergeUpdates(songs, {
  louange: 'Louange',
  louanges: 'Louange',
  Celebration: 'Célébration',
  Noel: 'Noël'
});
assert.deepEqual(categoryUpdates, [
  { id: 's1', tags: ['Louange', 'Adoration'] },
  { id: 's2', tags: ['Louange', 'Célébration'] },
  { id: 's3', tags: ['Célébration'] },
  { id: 's5', tags: ['Noël'] }
]);

// 4. Custom list cleanup deduplicates mapped entries
assert.deepEqual(
  cleanCustomNameList(['louange', 'Louange', 'louanges', 'Gospel'], {
    louange: 'Louange',
    louanges: 'Louange'
  }),
  ['Louange', 'Gospel']
);

console.log('duplicateUtils tests passed!');
