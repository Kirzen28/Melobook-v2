import assert from 'node:assert/strict';
import {
  getYouTubeVideoId,
  getYouTubeEmbedUrl,
  normalizeYouTubeUrl,
  syncYoutubeDirectiveInChordPro
} from './chordUtils';

// 1. Standard, short, Shorts, Live, and nocookie YouTube URL parsing
assert.equal(getYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
assert.equal(getYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?si=abc123'), 'dQw4w9WgXcQ');
assert.equal(getYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
assert.equal(getYouTubeVideoId('https://youtube.com/live/dQw4w9WgXcQ?feature=share'), 'dQw4w9WgXcQ');
assert.equal(getYouTubeVideoId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
assert.equal(getYouTubeVideoId('youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
assert.equal(getYouTubeVideoId('https://open.spotify.com/track/12345'), null);
assert.ok(getYouTubeEmbedUrl('https://youtube.com/live/dQw4w9WgXcQ')?.includes('dQw4w9WgXcQ'));

// 2. Normalization adds https:// when protocol is omitted
assert.equal(normalizeYouTubeUrl('  youtu.be/dQw4w9WgXcQ  '), 'https://youtu.be/dQw4w9WgXcQ');
assert.equal(normalizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
assert.equal(normalizeYouTubeUrl('   '), '');

// 3. ChordPro {youtube: ...} directive stays in sync on update and removal
const withDirective = '{title: Grace}\n{youtube: https://youtu.be/old12345678}\n{key: C}\n[C]Hello';
assert.equal(
  syncYoutubeDirectiveInChordPro(withDirective, 'https://youtu.be/dQw4w9WgXcQ'),
  '{title: Grace}\n{youtube: https://youtu.be/dQw4w9WgXcQ}\n{key: C}\n[C]Hello'
);
assert.equal(
  syncYoutubeDirectiveInChordPro(withDirective, ''),
  '{title: Grace}\n{key: C}\n[C]Hello'
);

const withoutDirective = '{title: Grace}\n[C]Hello';
assert.equal(
  syncYoutubeDirectiveInChordPro(withoutDirective, 'https://youtu.be/dQw4w9WgXcQ'),
  withoutDirective
);

console.log('youtubeUrl tests passed');
