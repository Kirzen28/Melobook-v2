import { jsPDF } from 'jspdf';
import { Setlist, Song, NotationSystem } from '../types';
import { parseChordPro, transposeChord, ParsedSongData, ParsedSection } from './chordUtils';

export interface PdfExportOptions {
  includeCover: boolean;
  showChords: boolean;
  notation: NotationSystem;
  theme: 'light' | 'dark';
  fontSize: 'normal' | 'large' | 'compact';
  transposeOffsets?: Record<string, number>; // songId -> semitone offset
}

export const DEFAULT_PDF_OPTIONS: PdfExportOptions = {
  includeCover: true,
  showChords: true,
  notation: 'standard',
  theme: 'light',
  fontSize: 'normal',
  transposeOffsets: {}
};

/**
 * Generate a complete, beautifully paginated PDF for a setlist or single song
 */
export async function generateSetlistPdf(
  setlist: Setlist,
  songs: Song[],
  options: PdfExportOptions = DEFAULT_PDF_OPTIONS
): Promise<{ doc: jsPDF; blob: Blob; fileName: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const marginY = 14;
  const contentWidth = pageWidth - (marginX * 2);
  const contentHeight = pageHeight - (marginY * 2);

  const isDark = options.theme === 'dark';

  // Palette definitions
  const colors = {
    bg: isDark ? [15, 15, 18] as [number, number, number] : [255, 255, 255] as [number, number, number],
    cardBg: isDark ? [24, 24, 28] as [number, number, number] : [248, 249, 250] as [number, number, number],
    text: isDark ? [240, 240, 245] as [number, number, number] : [20, 20, 24] as [number, number, number],
    textMuted: isDark ? [150, 150, 160] as [number, number, number] : [100, 100, 110] as [number, number, number],
    border: isDark ? [45, 45, 52] as [number, number, number] : [220, 224, 230] as [number, number, number],
    primary: [37, 99, 235] as [number, number, number], // #2563eb (Royal Blue)
    primaryLight: isDark ? [30, 58, 138] as [number, number, number] : [239, 246, 255] as [number, number, number],
    chord: isDark ? [96, 165, 250] as [number, number, number] : [29, 78, 216] as [number, number, number], // vibrant chord blue
    vocalLead: [217, 119, 6] as [number, number, number], // Amber
    vocalUnisson: [8, 145, 178] as [number, number, number], // Cyan
    vocal2e: [147, 51, 234] as [number, number, number], // Purple
    vocal3e: [16, 185, 129] as [number, number, number], // Emerald
    chorusBorder: [59, 130, 246] as [number, number, number],
    verseBorder: [100, 116, 139] as [number, number, number],
    bridgeBorder: [168, 85, 247] as [number, number, number]
  };

  // Font scale multipliers
  const scale = options.fontSize === 'large' ? 1.15 : options.fontSize === 'compact' ? 0.9 : 1.0;
  const titleSize = 18 * scale;
  const headerSize = 10 * scale;
  const metaSize = 9 * scale;
  const sectionTitleSize = 9.5 * scale;
  const chordSize = 9.5 * scale;
  const lyricsSize = 10 * scale;
  const footerSize = 8;

  // Filter songs in order
  const setlistSongs = setlist.songIds
    .map(id => songs.find(s => s.id === id))
    .filter((s): s is Song => s !== undefined);

  let isFirstPage = true;

  // Helper to fill page background if dark
  const renderPageBackground = () => {
    if (isDark) {
      doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    }
  };

  // Helper to draw clean page header & footer
  const renderFooter = (pageNo: number, totalPagesPlaceholder = true) => {
    const yPos = pageHeight - 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(footerSize);
    doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
    
    // Left: Brand / App
    doc.text(`MéloBook Pro • ${setlist.name}`, marginX, yPos);
    
    // Right: Date & Page indicator
    const dateStr = setlist.date || new Date().toISOString().split('T')[0];
    doc.text(`${dateStr}  |  Page ${pageNo}`, pageWidth - marginX, yPos, { align: 'right' });

    // Subtle divider above footer
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.2);
    doc.line(marginX, yPos - 3, pageWidth - marginX, yPos - 3);
  };

  // ==========================================
  // 1. OPTIONAL: COVER / SUMMARY PAGE
  // ==========================================
  if (options.includeCover) {
    renderPageBackground();

    let currentY = marginY + 4;

    // Header Card
    doc.setFillColor(colors.cardBg[0], colors.cardBg[1], colors.cardBg[2]);
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(marginX, currentY, contentWidth, 38, 3, 3, 'FD');

    // Accent line on left of Header Card
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.roundedRect(marginX, currentY, 3, 38, 1.5, 1.5, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(setlist.name, marginX + 8, currentY + 11);

    // Meta details (Date, Total Chants, Durée)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
    
    const dateText = `Date : ${setlist.date || 'Non définie'}`;
    const countText = `${setlistSongs.length} Chants`;
    const durText = `Durée est. : ${setlist.targetDuration || 25} min`;
    doc.text(`${dateText}   •   ${countText}   •   ${durText}`, marginX + 8, currentY + 20);

    // Setlist Notes if present
    if (setlist.notes) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      const splitNotes = doc.splitTextToSize(`Consignes : ${setlist.notes}`, contentWidth - 16);
      doc.text(splitNotes, marginX + 8, currentY + 29);
    }

    currentY += 46;

    // Section title: Programme de la Setlist
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('PROGRAMME DE LA SETLIST', marginX, currentY);
    currentY += 6;

    // Table of Songs Header
    doc.setFillColor(isDark ? 30 : 235, isDark ? 32 : 240, isDark ? 38 : 248);
    doc.roundedRect(marginX, currentY, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);

    doc.text('#', marginX + 4, currentY + 5.5);
    doc.text('TITRE DU CHANT', marginX + 14, currentY + 5.5);
    doc.text('AUTEUR', marginX + 92, currentY + 5.5);
    doc.text('TONALITÉ', marginX + 140, currentY + 5.5);
    doc.text('TEMPO', marginX + 162, currentY + 5.5);

    currentY += 9;

    // Table rows
    setlistSongs.forEach((song, idx) => {
      const offset = options.transposeOffsets?.[song.id] || 0;
      const effectiveKey = offset !== 0 ? transposeChord(song.key, offset, options.notation) : (options.notation === 'latin' ? transposeChord(song.key, 0, 'latin') : song.key);
      const rowHeight = 12;

      // Alternating row background
      if (idx % 2 === 1) {
        doc.setFillColor(colors.cardBg[0], colors.cardBg[1], colors.cardBg[2]);
        doc.roundedRect(marginX, currentY, contentWidth, rowHeight - 1, 1, 1, 'F');
      }

      // Index badge
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.roundedRect(marginX + 3, currentY + 2.5, 6, 6, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(String(idx + 1), marginX + 6, currentY + 6.8, { align: 'center' });

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      const safeTitle = song.title.length > 38 ? song.title.substring(0, 36) + '...' : song.title;
      doc.text(safeTitle, marginX + 14, currentY + 6.5);

      // Artist
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
      const safeArtist = (song.artist || 'Auteur').length > 24 ? (song.artist || 'Auteur').substring(0, 22) + '...' : (song.artist || 'Auteur');
      doc.text(safeArtist, marginX + 92, currentY + 6.5);

      // Key
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text(effectiveKey, marginX + 140, currentY + 6.5);

      // Tempo & Capo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      let tempoStr = song.tempo ? `${song.tempo} BPM` : '-';
      if (song.capo && song.capo > 0) tempoStr += ` (Capo ${song.capo})`;
      doc.text(tempoStr, marginX + 162, currentY + 6.5);

      currentY += rowHeight;
    });

    isFirstPage = false;
  }

  // ==========================================
  // 2. SONG PAGES
  // ==========================================
  for (let sIdx = 0; sIdx < setlistSongs.length; sIdx++) {
    const song = setlistSongs[sIdx];
    const offset = options.transposeOffsets?.[song.id] || 0;
    const parsedData: ParsedSongData = parseChordPro(song.contentChordPro || '');
    
    // Effective key
    const songKey = song.key || parsedData.key || 'C';
    const effectiveKey = offset !== 0 
      ? transposeChord(songKey, offset, options.notation) 
      : (options.notation === 'latin' ? transposeChord(songKey, 0, 'latin') : songKey);

    // New page for each song
    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;
    renderPageBackground();

    let currentY = marginY;

    // --- Song Header ---
    doc.setFillColor(colors.cardBg[0], colors.cardBg[1], colors.cardBg[2]);
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, contentWidth, 24, 2, 2, 'FD');

    // Left info: Song # in Setlist + Title & Artist
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(`CHANT ${sIdx + 1} SUR ${setlistSongs.length} • SETLIST : ${setlist.name.toUpperCase()}`, marginX + 5, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(titleSize);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    const cleanTitle = parsedData.title || song.title;
    const splitTitle = doc.splitTextToSize(cleanTitle, contentWidth - 65);
    doc.text(splitTitle[0] || cleanTitle, marginX + 5, currentY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(metaSize);
    doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
    doc.text(parsedData.artist || song.artist || 'Auteur', marginX + 5, currentY + 20);

    // Right Metadata Box (Tonalité, Tempo, Capo)
    const metaBoxWidth = 54;
    const metaBoxX = marginX + contentWidth - metaBoxWidth - 3;
    const metaBoxY = currentY + 3;

    doc.setFillColor(isDark ? 18 : 240, isDark ? 18 : 243, isDark ? 22 : 246);
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.roundedRect(metaBoxX, metaBoxY, metaBoxWidth, 18, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
    doc.text('TONALITÉ :', metaBoxX + 4, metaBoxY + 5.5);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(effectiveKey, metaBoxX + 24, metaBoxY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
    doc.text('TEMPO :', metaBoxX + 4, metaBoxY + 11);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(`${song.tempo || parsedData.tempo || 120} BPM`, metaBoxX + 24, metaBoxY + 11);

    const effectiveCapo = song.capo || parsedData.capo || 0;
    if (effectiveCapo > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(190, 90, 10);
      doc.text(`CAPO : ${effectiveCapo}`, metaBoxX + 4, metaBoxY + 15.5);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
      doc.text(`SIGN : ${song.timeSignature || parsedData.timeSignature || '4/4'}`, metaBoxX + 4, metaBoxY + 15.5);
    }

    currentY += 28;

    // --- Song Sections (Couplets, Refrains, etc.) ---
    const sections: ParsedSection[] = parsedData.sections.length > 0
      ? parsedData.sections
      : [{ type: 'general', lines: [] }];

    for (let secIdx = 0; secIdx < sections.length; secIdx++) {
      const section = sections[secIdx];
      
      // Calculate estimated section height
      const lineHeight = options.showChords ? (8.5 * scale) : (5.5 * scale);
      const estSecHeight = (section.lines.length * lineHeight) + 12;

      // Check for page overflow
      if (currentY + Math.min(estSecHeight, 35) > pageHeight - marginY - 10) {
        doc.addPage();
        renderPageBackground();
        currentY = marginY;

        // Subheader on continuation page
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
        doc.text(`${cleanTitle} (suite) • Tonalité : ${effectiveKey}`, marginX, currentY + 3);
        currentY += 8;
      }

      // Determine section color styling
      let secBorderColor = colors.verseBorder;
      let secBgColor: [number, number, number] = isDark ? [20, 20, 24] : [250, 250, 252];
      
      if (section.type === 'chorus') {
        secBorderColor = colors.chorusBorder;
        secBgColor = isDark ? [24, 28, 36] : [243, 247, 255];
      } else if (section.type === 'bridge') {
        secBorderColor = colors.bridgeBorder;
        secBgColor = isDark ? [28, 22, 34] : [250, 245, 255];
      }

      const secStartY = currentY;

      // Section Header (Title + Vocal Badge)
      if (section.title || section.vocal) {
        // Section Title Pill
        if (section.title) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(sectionTitleSize);
          doc.setTextColor(secBorderColor[0], secBorderColor[1], secBorderColor[2]);
          doc.text(section.title.toUpperCase(), marginX + 4, currentY + 4);
        }

        // Vocal Arrangement Pastille
        if (section.vocal) {
          const vocLower = section.vocal.toLowerCase();
          let vocColor = colors.vocalLead;
          if (vocLower.includes('unisson')) vocColor = colors.vocalUnisson;
          else if (vocLower.includes('2')) vocColor = colors.vocal2e;
          else if (vocLower.includes('3')) vocColor = colors.vocal3e;

          const vocText = `Voix : ${section.vocal}`;
          const vocWidth = doc.getTextWidth(vocText) + 8;
          const vocX = marginX + contentWidth - vocWidth - 2;

          doc.setFillColor(isDark ? 30 : 240, isDark ? 30 : 240, isDark ? 35 : 245);
          doc.setDrawColor(vocColor[0], vocColor[1], vocColor[2]);
          doc.setLineWidth(0.4);
          doc.roundedRect(vocX, currentY - 0.5, vocWidth, 6, 2, 2, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(vocColor[0], vocColor[1], vocColor[2]);
          doc.text(vocText, vocX + 4, currentY + 3.8);
        }

        currentY += 7;
      }

      // Section Lines
      for (const line of section.lines) {
        if (line.type === 'empty') {
          currentY += 3;
          continue;
        }

        // Page break check within section
        if (currentY > pageHeight - marginY - 14) {
          // Draw left accent bar for the part of the section on this page
          doc.setDrawColor(secBorderColor[0], secBorderColor[1], secBorderColor[2]);
          doc.setLineWidth(1.2);
          doc.line(marginX, secStartY, marginX, currentY);

          doc.addPage();
          renderPageBackground();
          currentY = marginY;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
          doc.text(`${cleanTitle} • ${section.title || 'Section'} (suite)`, marginX, currentY + 3);
          currentY += 8;
        }

        if (line.type === 'lyrics') {
          // Check if there are chords in this line
          const hasChords = options.showChords && line.items.some(item => !!item.chord);

          let currentX = marginX + 4;

          if (hasChords) {
            // Draw chords row first
            doc.setFont('courier', 'bold');
            doc.setFontSize(chordSize);
            doc.setTextColor(colors.chord[0], colors.chord[1], colors.chord[2]);

            let chordX = currentX;
            line.items.forEach(item => {
              const transposedChord = item.chord
                ? (offset !== 0 ? transposeChord(item.chord, offset, options.notation) : (options.notation === 'latin' ? transposeChord(item.chord, 0, 'latin') : item.chord))
                : '';

              if (transposedChord) {
                doc.text(transposedChord, chordX, currentY + 3.5);
              }

              // Advance X based on lyrics or chord width
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(lyricsSize);
              const lyricsWidth = doc.getTextWidth(item.lyrics || ' ');
              doc.setFont('courier', 'bold');
              doc.setFontSize(chordSize);
              const chordWidth = doc.getTextWidth(transposedChord ? transposedChord + ' ' : '');
              
              chordX += Math.max(lyricsWidth, chordWidth);
            });

            currentY += 4.5;
          }

          // Draw lyrics row
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(lyricsSize);
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

          let textX = currentX;
          line.items.forEach(item => {
            if (item.lyrics) {
              doc.text(item.lyrics, textX, currentY + 3.5);
            }

            const lyricsWidth = doc.getTextWidth(item.lyrics || ' ');
            const transposedChord = options.showChords && item.chord
              ? (offset !== 0 ? transposeChord(item.chord, offset, options.notation) : (options.notation === 'latin' ? transposeChord(item.chord, 0, 'latin') : item.chord))
              : '';
            
            doc.setFont('courier', 'bold');
            doc.setFontSize(chordSize);
            const chordWidth = doc.getTextWidth(transposedChord ? transposedChord + ' ' : '');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(lyricsSize);

            textX += Math.max(lyricsWidth, chordWidth);
          });

          currentY += 5.5 * scale;
        }
      }

      // Draw vertical side-bar for section
      doc.setDrawColor(secBorderColor[0], secBorderColor[1], secBorderColor[2]);
      doc.setLineWidth(1.2);
      doc.line(marginX, secStartY, marginX, currentY);

      currentY += 4;
    }
  }

  // ==========================================
  // 3. NUMBER ALL PAGES WITH TOTAL COUNT
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    renderFooter(i);
  }

  // Generate binary output
  const blob = doc.output('blob');
  const sanitizedName = (setlist.name || 'Setlist')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');
  const dateSuffix = setlist.date ? `-${setlist.date}` : '';
  const fileName = `${sanitizedName}${dateSuffix}.pdf`;

  return { doc, blob, fileName };
}

/**
 * Share PDF file using Web Share API (WhatsApp, Telegram, AirDrop, etc.) with fallback to download
 */
export async function sharePdfFile(
  blob: Blob,
  fileName: string,
  title: string,
  text: string
): Promise<{ success: boolean; method: 'web-share' | 'download' | 'error'; message?: string }> {
  try {
    const file = new File([blob], fileName, { type: 'application/pdf' });

    // Check if device supports sharing files
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: title || 'Setlist MéloBook',
        text: text || 'Voici la partition/setlist au format PDF.',
        files: [file]
      });
      return { success: true, method: 'web-share' };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, method: 'web-share', message: 'Partage annulé par l\'utilisateur.' };
    }
    console.warn('Web Share API error, falling back to download:', err);
  }

  // Fallback: Trigger browser file download
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { success: true, method: 'download' };
  } catch (err: any) {
    return { success: false, method: 'error', message: err.message };
  }
}
