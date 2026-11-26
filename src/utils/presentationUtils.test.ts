import assert from 'node:assert/strict';
import { inferMediaTypeFromUrl } from './presentationUtils';

assert.deepEqual(
  inferMediaTypeFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  { type: 'video', confident: true }
);
assert.deepEqual(
  inferMediaTypeFromUrl('https://cdn.example.com/media/bg-worship.webp?w=1920'),
  { type: 'image', confident: true }
);
assert.deepEqual(
  inferMediaTypeFromUrl('https://cdn.example.com/tracks/pad-g.mp3'),
  { type: 'audio', confident: true }
);
assert.deepEqual(
  inferMediaTypeFromUrl('https://cdn.example.com/clips/intro.mp4#t=2'),
  { type: 'video', confident: true }
);
assert.deepEqual(
  inferMediaTypeFromUrl('https://cdn.example.com/stream/12345'),
  { type: 'video', confident: false }
);

console.log('presentationUtils tests passed!');
