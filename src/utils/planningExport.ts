import { jsPDF } from 'jspdf';
import {
  PlanningAssignment,
  PlanningPole,
  PlanningSlot,
  Setlist,
  Song
} from '../types';
import { getSongDuration } from './chordUtils';
import {
  PLANNING_POLE_ORDER,
  PlanningPoleMeta,
  formatPlanningDateFr,
  formatPlanningDateLongFr,
  getTodayIsoDate,
  isValidIsoDate
} from './planningUtils';

export type PlanningExportPeriodMode = 'month' | 'upcoming' | 'range';
export type PlanningExportScope = 'all' | 'mine';

export interface PlanningExportItem {
  id: string;
  title: string;
  date: string;
  hasValidDate: boolean;
  setlist?: Setlist;
  assignment?: PlanningAssignment;
  slots: PlanningSlot[];
}

export interface PlanningExportFilterOptions {
  periodMode: PlanningExportPeriodMode;
  scope: PlanningExportScope;
  currentUid?: string | null;
  yearMonth?: string; // YYYY-MM
  todayIso?: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

const toPdfSafeText = (value: string): string =>
  value
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ');

const sanitizeFileSlug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'planning';

const matchesRange = (dateStr: string | undefined, start?: string, end?: string): boolean => {
  if (!isValidIsoDate(dateStr)) return false;
  if (isValidIsoDate(start) && dateStr < start) return false;
  if (isValidIsoDate(end) && dateStr > end) return false;
  return true;
};

export function filterPlanningTargetsForExport<T extends PlanningExportItem>(
  targets: T[],
  options: PlanningExportFilterOptions
): T[] {
  const todayIso = options.todayIso && isValidIsoDate(options.todayIso)
    ? options.todayIso
    : getTodayIsoDate();

  let rangeStart = options.startDate;
  let rangeEnd = options.endDate;
  if (isValidIsoDate(rangeStart) && isValidIsoDate(rangeEnd) && rangeStart > rangeEnd) {
    [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
  }

  return targets
    .filter(item => {
      if (options.scope === 'mine') {
        if (!options.currentUid) return false;
        if (!item.slots.some(s => s.uid === options.currentUid)) return false;
      }

      const serviceDate = item.hasValidDate ? item.date : undefined;
      const rehearsalDate = isValidIsoDate(item.assignment?.rehearsalDate)
        ? item.assignment!.rehearsalDate
        : undefined;

      if (options.periodMode === 'month') {
        const ym = options.yearMonth || todayIso.slice(0, 7);
        return Boolean(
          (serviceDate && serviceDate.startsWith(ym)) ||
          (rehearsalDate && rehearsalDate.startsWith(ym))
        );
      }

      if (options.periodMode === 'upcoming') {
        return Boolean(
          (serviceDate && serviceDate >= todayIso) ||
          (rehearsalDate && rehearsalDate >= todayIso)
        );
      }

      // 'range'
      return matchesRange(serviceDate, rangeStart, rangeEnd)
        || matchesRange(rehearsalDate, rangeStart, rangeEnd);
    })
    .slice()
    .sort((a, b) => {
      const da = a.hasValidDate ? a.date : (a.assignment?.rehearsalDate || '9999-99-99');
      const db = b.hasValidDate ? b.date : (b.assignment?.rehearsalDate || '9999-99-99');
      const cmp = da.localeCompare(db);
      return cmp !== 0 ? cmp : a.title.localeCompare(b.title, 'fr');
    });
}

function formatPoleMembers(slots: PlanningSlot[], pole: PlanningPole): string {
  return slots
    .filter(s => s.pole === pole)
    .map(s => (s.roleLabel ? `${s.memberName} (${s.roleLabel})` : s.memberName))
    .join(', ');
}

function getOrderedSongs(item: PlanningExportItem, songsById: Map<string, Song>): Song[] {
  if (!item.setlist) return [];
  return item.setlist.songIds
    .map(id => songsById.get(id))
    .filter((s): s is Song => Boolean(s));
}

function escapeCsvCell(raw: string): string {
  let val = raw ?? '';
  if (/^[=+\-@\t\r]/.test(val)) {
    val = `'${val}`;
  }
  const escaped = val.replace(/"/g, '""');
  return /[;"\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function generatePlanningCsv(
  items: PlanningExportItem[],
  songsById: Map<string, Song>,
  groupName: string,
  periodSlug: string
): { csvContent: string; fileName: string } {
  const headers = [
    'Date service',
    'Événement',
    'Balance',
    'Service',
    'Lieu',
    'Date répétition',
    'Horaire répétition',
    'Lieu répétition',
    'Musique',
    'Chant',
    'Régie',
    'Setlist',
    'Chants',
    'Consignes'
  ];

  const rows = items.map(item => {
    const a = item.assignment;
    const orderedSongs = getOrderedSongs(item, songsById);
    const songLabels = orderedSongs
      .map((s, idx) => `${idx + 1}. ${s.title}${s.key ? ` (${s.key})` : ''}`)
      .join(' | ');

    return [
      item.hasValidDate ? item.date : '',
      item.title,
      a?.callTime || '',
      a?.serviceTime || '',
      a?.location || '',
      isValidIsoDate(a?.rehearsalDate) ? a!.rehearsalDate! : '',
      a?.rehearsalTime || '',
      a?.rehearsalLocation || '',
      formatPoleMembers(item.slots, 'musique'),
      formatPoleMembers(item.slots, 'chant'),
      formatPoleMembers(item.slots, 'regie'),
      item.setlist?.name || '',
      songLabels,
      (a?.notes || '').replace(/\r?\n/g, ' ')
    ].map(escapeCsvCell).join(';');
  });

  const csvContent = `\uFEFF${headers.map(escapeCsvCell).join(';')}\r\n${rows.join('\r\n')}`;
  const fileName = `planning-${sanitizeFileSlug(groupName)}-${sanitizeFileSlug(periodSlug)}.csv`;
  return { csvContent, fileName };
}

export interface GeneratePlanningPdfParams {
  items: PlanningExportItem[];
  songsById: Map<string, Song>;
  poleMetaMap: Record<PlanningPole, PlanningPoleMeta>;
  groupName: string;
  periodLabel: string;
  periodSlug: string;
}

export function generatePlanningPdf({
  items,
  songsById,
  poleMetaMap,
  groupName,
  periodLabel,
  periodSlug
}: GeneratePlanningPdfParams): { doc: jsPDF; blob: Blob; fileName: string } {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const marginY = 14;
  const contentWidth = pageWidth - marginX * 2;
  const maxY = pageHeight - 16;

  const colors = {
    text: [20, 24, 33] as [number, number, number],
    muted: [95, 105, 120] as [number, number, number],
    border: [218, 224, 234] as [number, number, number],
    cardBg: [248, 250, 252] as [number, number, number],
    primary: [37, 99, 235] as [number, number, number],
    amberBg: [255, 251, 235] as [number, number, number],
    amberText: [146, 64, 14] as [number, number, number]
  };

  let y = marginY;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > maxY) {
      doc.addPage();
      y = marginY;
    }
  };

  // Document Header Banner
  doc.setFillColor(...colors.cardBg);
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(0.35);
  doc.roundedRect(marginX, y, contentWidth, 24, 2.5, 2.5, 'FD');

  doc.setFillColor(...colors.primary);
  doc.roundedRect(marginX, y, 2.5, 24, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...colors.text);
  doc.text(toPdfSafeText(`Feuille de route - ${groupName}`), marginX + 6, y + 9);

  const rehearsalCount = items.filter(i => isValidIsoDate(i.assignment?.rehearsalDate)).length;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...colors.muted);
  doc.text(
    toPdfSafeText(
      `${periodLabel}  ·  ${items.length} événement${items.length > 1 ? 's' : ''}  ·  ${rehearsalCount} répétition${rehearsalCount > 1 ? 's' : ''}`
    ),
    marginX + 6,
    y + 17.5
  );

  y += 30;

  items.forEach((item) => {
    const a = item.assignment;
    const orderedSongs = getOrderedSongs(item, songsById);
    const poleLines = PLANNING_POLE_ORDER
      .map(pole => {
        const members = formatPoleMembers(item.slots, pole);
        return members ? `${poleMetaMap[pole].shortLabel} : ${members}` : null;
      })
      .filter((l): l is string => Boolean(l));

    const songsSummary = orderedSongs.length > 0
      ? `Chants (${orderedSongs.length}) : ${orderedSongs
          .map((s, i) => {
            const meta = [s.key || null, s.tempo ? `${s.tempo} BPM` : null, getSongDuration(s) || null]
              .filter(Boolean)
              .join(' · ');
            return `${i + 1}. ${s.title}${meta ? ` (${meta})` : ''}`;
          })
          .join('  |  ')}`
      : '';

    const notesText = a?.notes?.trim() ? `Consignes : ${a.notes.trim()}` : '';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const wrappedPoleLines = poleLines.flatMap(line =>
      doc.splitTextToSize(toPdfSafeText(line), contentWidth - 8) as string[]
    );
    const wrappedSongLines = songsSummary
      ? (doc.splitTextToSize(toPdfSafeText(songsSummary), contentWidth - 8) as string[])
      : [];
    const wrappedNoteLines = notesText
      ? (doc.splitTextToSize(toPdfSafeText(notesText), contentWidth - 8) as string[])
      : [];

    const estimatedHeight =
      10 + // header strip
      12 + // service + rehearsal rows
      (wrappedPoleLines.length > 0 ? wrappedPoleLines.length * 4 + 3 : 5) +
      (wrappedSongLines.length > 0 ? wrappedSongLines.length * 4 + 2 : 0) +
      (wrappedNoteLines.length > 0 ? wrappedNoteLines.length * 4 + 2 : 0) +
      6;

    ensureSpace(Math.min(estimatedHeight, maxY - marginY));

    // Event Header Bar
    doc.setFillColor(...colors.cardBg);
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, y, contentWidth, 9, 1.5, 1.5, 'FD');

    const dateLabel = item.hasValidDate ? formatPlanningDateLongFr(item.date) : 'Date à définir';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);
    doc.text(toPdfSafeText(item.title), marginX + 3.5, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.primary);
    doc.text(toPdfSafeText(dateLabel), pageWidth - marginX - 3.5, y + 6, { align: 'right' });

    y += 12;

    // Service Times Row
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.text);
    doc.text('Service :', marginX + 3, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    const serviceSummary = [
      `Balance ${a?.callTime || '-'}`,
      `Culte ${a?.serviceTime || '-'}`,
      `Lieu ${a?.location || '-'}`
    ].join('  ·  ');
    doc.text(toPdfSafeText(serviceSummary), marginX + 22, y);
    y += 4.8;

    // Rehearsal Row
    const hasRehearsal = Boolean(a?.rehearsalDate || a?.rehearsalTime || a?.rehearsalLocation);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.amberText);
    doc.text('Répétition :', marginX + 3, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    const rehearsalSummary = hasRehearsal
      ? [
          isValidIsoDate(a?.rehearsalDate) ? formatPlanningDateFr(a!.rehearsalDate!) : 'Date non définie',
          a?.rehearsalTime ? `à ${a.rehearsalTime}` : null,
          a?.rehearsalLocation || null
        ]
          .filter(Boolean)
          .join('  ·  ')
      : 'Non planifiée';
    doc.text(toPdfSafeText(rehearsalSummary), marginX + 22, y);
    y += 5.2;

    // Poles / Team
    if (wrappedPoleLines.length > 0) {
      wrappedPoleLines.forEach(line => {
        ensureSpace(4.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...colors.text);
        doc.text(line, marginX + 3, y);
        y += 4;
      });
      y += 1;
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colors.muted);
      doc.text('Équipe : aucune affectation', marginX + 3, y);
      y += 4.5;
    }

    // Setlist Songs
    if (wrappedSongLines.length > 0) {
      wrappedSongLines.forEach((line, idx) => {
        ensureSpace(4.5);
        doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
        doc.setFontSize(8.2);
        doc.setTextColor(...colors.muted);
        doc.text(line, marginX + 3, y);
        y += 3.9;
      });
      y += 1;
    }

    // Notes
    if (wrappedNoteLines.length > 0) {
      wrappedNoteLines.forEach(line => {
        ensureSpace(4.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.2);
        doc.setTextColor(...colors.muted);
        doc.text(line, marginX + 3, y);
        y += 3.9;
      });
      y += 1;
    }

    // Bottom Divider
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.2);
    doc.line(marginX, y + 1, pageWidth - marginX, y + 1);
    y += 6;
  });

  // Page Footers
  const totalPages = doc.getNumberOfPages();
  const todayLabel = getTodayIsoDate();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = pageHeight - 8;
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.2);
    doc.line(marginX, footerY - 3, pageWidth - marginX, footerY - 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    doc.text(toPdfSafeText(`MéloBook · ${groupName}`), marginX, footerY);
    doc.text(
      toPdfSafeText(`Exporté le ${todayLabel}  |  Page ${p}/${totalPages}`),
      pageWidth - marginX,
      footerY,
      { align: 'right' }
    );
  }

  const blob = doc.output('blob');
  const fileName = `planning-${sanitizeFileSlug(groupName)}-${sanitizeFileSlug(periodSlug)}.pdf`;
  return { doc, blob, fileName };
}
