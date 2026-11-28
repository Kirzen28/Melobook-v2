import assert from 'node:assert/strict';
import {
  PlanningExportItem,
  filterPlanningTargetsForExport,
  generatePlanningCsv
} from './planningExport';
import { PlanningAssignment, Setlist, Song } from '../types';

const items: PlanningExportItem[] = [
  {
    id: 'p1',
    title: 'Culte Dimanche 1',
    date: '2026-12-06',
    hasValidDate: true,
    setlist: {
      id: 's1',
      groupId: 'g1',
      name: 'Culte Dimanche 1',
      songIds: ['song1']
    } as Setlist,
    assignment: {
      id: 'p1',
      groupId: 'g1',
      date: '2026-12-06',
      title: 'Culte Dimanche 1',
      callTime: '08:30',
      serviceTime: '10:00',
      location: 'Grande salle',
      rehearsalDate: '2026-11-29',
      rehearsalTime: '19:30',
      rehearsalLocation: 'Salle annexe',
      notes: 'Tenue sombre',
      slots: []
    } as PlanningAssignment,
    slots: [
      { id: 'sl1', uid: 'u1', memberName: 'Alice', pole: 'musique', roleLabel: 'Piano', status: 'assigned' },
      { id: 'sl2', uid: 'u2', memberName: 'Bob', pole: 'chant', roleLabel: 'Lead', status: 'assigned' }
    ]
  },
  {
    id: 'p2',
    title: 'Veillée Noël',
    date: '2026-12-20',
    hasValidDate: true,
    slots: [
      { id: 'sl3', uid: 'u2', memberName: 'Bob', pole: 'regie', roleLabel: 'Son', status: 'assigned' }
    ]
  },
  {
    id: 'p3',
    title: 'Culte Passé',
    date: '2026-10-11',
    hasValidDate: true,
    slots: []
  }
];

// Month filter includes item if rehearsalDate falls in 2026-11 even when service is 2026-12-06
const novItems = filterPlanningTargetsForExport(items, {
  periodMode: 'month',
  scope: 'all',
  yearMonth: '2026-11',
  todayIso: '2026-11-28'
});
assert.equal(novItems.length, 1);
assert.equal(novItems[0].id, 'p1');

// Upcoming + mine scope filters to u1 only
const myUpcoming = filterPlanningTargetsForExport(items, {
  periodMode: 'upcoming',
  scope: 'mine',
  currentUid: 'u1',
  todayIso: '2026-11-28'
});
assert.equal(myUpcoming.length, 1);
assert.equal(myUpcoming[0].id, 'p1');

// Custom range handles inverted start/end gracefully
const rangeItems = filterPlanningTargetsForExport(items, {
  periodMode: 'range',
  scope: 'all',
  startDate: '2026-12-31',
  endDate: '2026-12-01'
});
assert.equal(rangeItems.length, 2);

// CSV generation includes UTF-8 BOM, headers, rehearsal info, poles, songs
const songsById = new Map<string, Song>([
  ['song1', { id: 'song1', groupId: 'g1', title: 'Grâce Infinie', artist: 'Auteur', key: 'G', tempo: 72, contentChordPro: '' } as Song]
]);
const { csvContent, fileName } = generatePlanningCsv(novItems, songsById, 'Équipe Louange', '2026-11');
assert.ok(csvContent.startsWith('\uFEFFDate service;'));
assert.ok(csvContent.includes('2026-11-29;19:30;Salle annexe'));
assert.ok(csvContent.includes('Alice (Piano);Bob (Lead)'));
assert.ok(csvContent.includes('1. Grâce Infinie (G)'));
assert.equal(fileName, 'planning-equipe-louange-2026-11.csv');

console.log('planningExport self-check passed');
