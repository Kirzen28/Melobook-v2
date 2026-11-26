import assert from 'node:assert/strict';
import {
  calculateSongAutoDuration,
  getSongDuration,
  isSongDurationAuto
} from './chordUtils';

// 1. Auto duration scales inversely with tempo and accounts for repeats & chorus_recall
const slowSong = `
{title: Test}
{tempo: 60}
{time: 4/4}
{start_of_verse: Couplet 1}
[C]Ligne un [G]ligne deux
[Am]Ligne trois [F]ligne quatre
{end_of_verse}
{start_of_chorus: Refrain}
[F]Refrain un [C]refrain deux
{end_of_chorus}
{chorus: label="Refrain" repeat="2"}
`;

const slowRes = calculateSongAutoDuration(slowSong, 60, '4/4');
const fastRes = calculateSongAutoDuration(slowSong, 120, '4/4');
assert.ok(slowRes.seconds > fastRes.seconds, `expected slow (${slowRes.seconds}s) > fast (${fastRes.seconds}s)`);

// Verify chorus_recall repeat=2 produces longer duration than repeat=1
const singleRecall = slowSong.replace('repeat="2"', 'repeat="1"');
const singleRes = calculateSongAutoDuration(singleRecall, 60, '4/4');
assert.ok(slowRes.seconds > singleRes.seconds, 'expected repeat=2 to increase estimated duration');

// 2. getSongDuration falls back to tempo/structure estimation when duration is missing or mode is auto without YouTube
const autoSong = {
  contentChordPro: slowSong,
  tempo: 120,
  timeSignature: '4/4'
};
assert.equal(isSongDurationAuto(autoSong), true);
assert.equal(getSongDuration(autoSong), fastRes.formatted);
assert.notEqual(getSongDuration(autoSong), '03:30');
assert.equal(
  getSongDuration({ ...autoSong, duration: '03:30', durationMode: 'auto' }),
  fastRes.formatted
);

// 3. Auto mode preserves fetched YouTube duration when a valid YouTube link exists
assert.equal(
  getSongDuration({
    ...autoSong,
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '03:33',
    durationMode: 'auto'
  }),
  '03:33'
);

// 4. Explicit custom duration overrides estimation
assert.equal(
  getSongDuration({ ...autoSong, duration: '04:15', durationMode: 'custom' }),
  '04:15'
);

console.log('songDuration tests passed');
