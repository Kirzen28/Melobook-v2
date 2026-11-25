import assert from 'node:assert/strict';
import {
  ROADMAP_COLUMNS,
  ROADMAP_DESCRIPTION_MAX,
  ROADMAP_MAX_IMAGES,
  ROADMAP_TITLE_MAX,
  canChangeRoadmapStatus,
  canEditRoadmapItem,
  formatRoadmapDate,
  isMainAppAdmin,
  sanitizeRoadmapComment,
  sanitizeRoadmapInput
} from './roadmapUtils';

// 1. Columns structure
assert.deepEqual(
  ROADMAP_COLUMNS.map(c => c.id),
  ['idea_bug', 'in_progress', 'live']
);

// 2. Main admin detection & status change permissions
assert.equal(isMainAppAdmin('kriveravelasquez@rivera-marketing.com'), true);
assert.equal(isMainAppAdmin('KRIVERAVELASQUEZ@RIVERA-MARKETING.COM '), true);
assert.equal(isMainAppAdmin('member@example.com'), false);
assert.equal(isMainAppAdmin(null), false);

assert.equal(canChangeRoadmapStatus('kriveravelasquez@rivera-marketing.com', false), true);
assert.equal(canChangeRoadmapStatus('kriveravelasquez@rivera-marketing.com', true), false);
assert.equal(canChangeRoadmapStatus('other@example.com', false), false);

// 3. Author edit permissions
assert.equal(canEditRoadmapItem({ authorId: 'u1' }, 'u1', false), true);
assert.equal(canEditRoadmapItem({ authorId: 'u1' }, 'u2', false), false);
assert.equal(canEditRoadmapItem({ authorId: 'u1' }, 'u1', true), false);
assert.equal(canEditRoadmapItem({ authorId: 'u1' }, null, false), false);

// 4. Input sanitization & image limits
const sanitized = sanitizeRoadmapInput({
  title: '  ' + 'A'.repeat(ROADMAP_TITLE_MAX + 20),
  description: '  ' + 'B'.repeat(ROADMAP_DESCRIPTION_MAX + 20),
  category: 'bug',
  images: ['img1', 'img2', 'img3', 'img4']
});
assert.equal(sanitized.title.length, ROADMAP_TITLE_MAX);
assert.equal(sanitized.description.length, ROADMAP_DESCRIPTION_MAX);
assert.equal(sanitized.category, 'bug');
assert.equal(sanitized.images.length, ROADMAP_MAX_IMAGES);

assert.throws(() =>
  sanitizeRoadmapInput({ title: '   ', description: 'ok', category: 'idea', images: [] })
);
assert.throws(() =>
  sanitizeRoadmapInput({ title: 'ok', description: '   ', category: 'idea', images: [] })
);
assert.throws(() => sanitizeRoadmapComment('   '));
assert.equal(sanitizeRoadmapComment('  Super idée !  '), 'Super idée !');

// 5. Date formatting
const now = 1700000000000;
assert.equal(formatRoadmapDate(new Date(now - 30_000), now), 'À l’instant');
assert.equal(formatRoadmapDate(new Date(now - 5 * 60_000), now), 'Il y a 5 min');
assert.equal(formatRoadmapDate(new Date(now - 3 * 3600_000), now), 'Il y a 3 h');
assert.equal(formatRoadmapDate(new Date(now - 2 * 86400_000), now), 'Il y a 2 j');
