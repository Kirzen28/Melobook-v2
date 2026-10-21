import fs from 'fs';

const content = fs.readFileSync('./src/components/SongList.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('setSortBy')) {
    console.log(`Line ${idx+1}: ${l}`);
  }
});
