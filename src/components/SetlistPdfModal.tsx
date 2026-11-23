import React, { useState } from 'react';
import { Setlist, Song } from '../types';
import { generateSetlistPdf, PdfExportOptions, DEFAULT_PDF_OPTIONS } from '../utils/pdfExport';
import { parseChordPro, transposeChord, stripParentheses } from '../utils/chordUtils';
import { 
  FileDown, 
  X, 
  Moon, 
  Sun, 
  FileText, 
  Sparkles,
  Music,
  Loader2,
  FileCode,
  Download,
  Share2
} from 'lucide-react';

interface SetlistPdfModalProps {
  setlist: Setlist;
  songs: Song[];
  onClose: () => void;
  mode?: 'song' | 'setlist';
  allowCover?: boolean;
  onExportChordPro?: () => void;
  onExportJson?: () => void;
}

export const SetlistPdfModal: React.FC<SetlistPdfModalProps> = ({
  setlist,
  songs,
  onClose,
  mode,
  onExportChordPro,
  onExportJson,
}) => {
  const autoIncludeCover = mode !== 'song';
  const [options, setOptions] = useState<PdfExportOptions>({
    ...DEFAULT_PDF_OPTIONS,
    includeCover: autoIncludeCover,
    showChords: true,
    notation: 'standard',
    theme: 'light',
    fontSize: 'normal'
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const setlistSongs = setlist.songIds
    .map(id => songs.find(s => s.id === id))
    .filter((s): s is Song => s !== undefined);

  const songCount = setlistSongs.length;
  const isSongMode = mode === 'song';

  const title = isSongMode
    ? songCount > 1
      ? 'Exporter les chants en PDF'
      : 'Exporter le chant en PDF'
    : 'Exporter la Setlist en PDF';

  const subtitle = `${setlist.name} \u2022 ${songCount} chant${songCount > 1 ? 's' : ''}`;

  const handleDownload = async () => {
    setIsGenerating(true);
    setStatusMessage('Creation du document PDF...');
    try {
      const { doc, fileName } = await generateSetlistPdf(setlist, songs, {
        ...options,
        includeCover: autoIncludeCover,
      });
      doc.save(fileName);
      setStatusMessage(`Fichier "${fileName}" telecharge !`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Erreur lors du telechargement.');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleExportChordPro = () => {
    if (onExportChordPro) {
      onExportChordPro();
      onClose();
      return;
    }
    if (setlistSongs.length === 0) return;

    const content = setlistSongs.map(song => {
      const raw = (song.contentChordPro || '').trim();
      if (/\{(?:title|t)\s*:/i.test(raw)) return raw;
      const headerLines = [
        `{title: ${song.title}}`,
        song.artist ? `{artist: ${song.artist}}` : '',
        song.key ? `{key: ${song.key}}` : '',
        song.tempo ? `{tempo: ${song.tempo}}` : '',
        song.timeSignature ? `{time: ${song.timeSignature}}` : '',
        song.capo ? `{capo: ${song.capo}}` : '',
      ].filter(Boolean);
      return `${headerLines.join('\n')}\n\n${raw}`;
    }).join('\n\n{new_song}\n\n');

    const safeName = (setlist.name || 'export')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'export';
    const fileName = `${safeName}.cho`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatusMessage(`Fichier "${fileName}" telecharge !`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const buildShareText = () => {
    const formatFrDate = (d?: string) => {
      if (!d) return '';
      const p = d.split('-');
      return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
    };

    if (isSongMode && setlistSongs.length === 1) {
      const s = setlistSongs[0];
      const titleText = stripParentheses(s.title);
      const parsed = parseChordPro(s.contentChordPro || s.content || '');
      const overrideKey = setlist.songOverrides?.[s.id]?.key;
      const rawKey = overrideKey || s.key || parsed.key || '';
      const offset = options.transposeOffsets?.[s.id] ?? (overrideKey ? 0 : (setlist.songOverrides?.[s.id]?.transposeOffset ?? 0));
      const displayKey = rawKey ? transposeChord(rawKey, offset, options.notation) : '';
      const header = [
        `*${titleText}*${s.artist ? ` — ${s.artist}` : ''}`,
        displayKey ? `Tonalité : ${displayKey}` : ''
      ].filter(Boolean).join('\n');

      const bodyLines: string[] = [];
      parsed.sections.forEach((sec) => {
        if (sec.title) bodyLines.push(`\n*${sec.title}*`);
        const secOffset = offset + (sec.transposeOffset || 0);
        sec.lines.forEach((line) => {
          if (line.type === 'empty') {
            bodyLines.push('');
          } else if (line.type === 'comment' || line.type === 'comment_italic' || line.type === 'comment_box') {
            if (line.comment) bodyLines.push(`_${line.comment}_`);
          } else if (line.type === 'grid_row' && line.gridRaw) {
            bodyLines.push(line.gridRaw);
          } else if (line.type === 'lyrics') {
            const textLine = line.items
              .map((it) => {
                const c = options.showChords && it.chord ? `[${transposeChord(it.chord, secOffset, options.notation)}]` : '';
                return `${c}${it.lyrics || ''}`;
              })
              .join('')
              .trimEnd();
            if (textLine) bodyLines.push(textLine);
          }
        });
      });

      const fullText = `${header}\n${bodyLines.join('\n').trim()}`;
      return fullText.length > 3500 ? `${fullText.slice(0, 3497)}...` : fullText;
    }

    const dateLabel = formatFrDate(setlist.date);
    const header = `*${setlist.name}*${dateLabel ? ` (${dateLabel})` : ''}\n${songCount} chant${songCount > 1 ? 's' : ''} :`;
    const listLines = setlistSongs.map((s, idx) => {
      const overrideKey = setlist.songOverrides?.[s.id]?.key;
      const rawKey = overrideKey || s.key || parseChordPro(s.contentChordPro || s.content || '').key || '';
      const offset = options.transposeOffsets?.[s.id] ?? (overrideKey ? 0 : (setlist.songOverrides?.[s.id]?.transposeOffset ?? 0));
      const displayKey = rawKey ? transposeChord(rawKey, offset, options.notation) : '';
      return `${idx + 1}. *${stripParentheses(s.title)}*${s.artist ? ` — ${s.artist}` : ''}${displayKey ? ` (Tonalité : ${displayKey})` : ''}`;
    });

    return [header, '', ...listLines].join('\n');
  };

  const shareMessage = buildShareText();

  const handleShareMessaging = async () => {
    if (songCount === 0) return;
    setIsSharing(true);
    setStatusMessage('Preparation du partage...');
    try {
      const { blob, fileName } = await generateSetlistPdf(setlist, songs, {
        ...options,
        includeCover: autoIncludeCover,
      });
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            title: setlist.name,
            text: shareMessage,
            files: [pdfFile]
          });
          setStatusMessage('Document partage !');
          return;
        }

        await navigator.share({
          title: setlist.name,
          text: shareMessage
        });
        setStatusMessage('Message partage !');
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareMessage);
        setStatusMessage('Texte copie ! Collez-le dans WhatsApp ou votre messagerie.');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setStatusMessage(null);
        return;
      }
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareMessage);
          setStatusMessage('Partage direct indisponible ici : texte copie pour messagerie.');
        } else {
          setStatusMessage('Utilisez le bouton Telecharger PDF.');
        }
      } catch {
        setStatusMessage('Utilisez le bouton Telecharger PDF.');
      }
    } finally {
      setIsSharing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#111112] border border-[#242428] rounded-xl w-full max-w-lg p-5 sm:p-6 shadow-2xl text-[#E0E0E0] my-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#222224]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              <p className="text-xs text-gray-400">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#1C1C1E] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PDF Options */}
        <div className="py-4 space-y-2 text-xs">

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141416] border border-[#242428]">
            <span className="font-semibold text-white">Contenu des partitions</span>
            <div className="flex items-center bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
              <button type="button" onClick={() => setOptions(prev => ({ ...prev, showChords: true }))} className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${options.showChords ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <Music className="w-3 h-3" /><span>Accords</span>
              </button>
              <button type="button" onClick={() => setOptions(prev => ({ ...prev, showChords: false }))} className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${!options.showChords ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <FileText className="w-3 h-3" /><span>Paroles</span>
              </button>
            </div>
          </div>

          {options.showChords && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141416] border border-[#242428]">
              <span className="font-semibold text-white">Systeme de notation</span>
              <div className="flex items-center bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
                <button type="button" onClick={() => setOptions(prev => ({ ...prev, notation: 'standard' }))} className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${options.notation === 'standard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>ABC</button>
                <button type="button" onClick={() => setOptions(prev => ({ ...prev, notation: 'latin' }))} className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${options.notation === 'latin' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Do Re Mi</button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141416] border border-[#242428]">
            <span className="font-semibold text-white">Theme de rendu</span>
            <div className="flex items-center bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
              <button type="button" onClick={() => setOptions(prev => ({ ...prev, theme: 'light' }))} className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${options.theme === 'light' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <Sun className="w-3 h-3" /><span>Clair / Print</span>
              </button>
              <button type="button" onClick={() => setOptions(prev => ({ ...prev, theme: 'dark' }))} className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${options.theme === 'dark' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <Moon className="w-3 h-3" /><span>Sombre</span>
              </button>
            </div>
          </div>

          {(onExportChordPro || onExportJson) && (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 px-0.5 mb-1.5">Autres formats</p>
              <div className="grid grid-cols-2 gap-2">
                {onExportChordPro && (
                  <button type="button" onClick={() => { onExportChordPro(); onClose(); }} className="p-2.5 rounded-lg bg-[#141416] hover:bg-[#1A1A20] border border-[#242428] hover:border-blue-500/40 transition-all text-left flex items-start gap-2 cursor-pointer group">
                    <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0"><FileCode className="w-3.5 h-3.5" /></div>
                    <div><div className="text-[11px] font-semibold text-white">ChordPro</div><div className="text-[10px] text-gray-400 mt-0.5 leading-tight">Texte brut .txt</div></div>
                  </button>
                )}
                {onExportJson && (
                  <button type="button" onClick={() => { onExportJson(); onClose(); }} className="p-2.5 rounded-lg bg-[#141416] hover:bg-[#1A1A20] border border-[#242428] hover:border-amber-500/40 transition-all text-left flex items-start gap-2 cursor-pointer group">
                    <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all shrink-0"><Download className="w-3.5 h-3.5" /></div>
                    <div><div className="text-[11px] font-semibold text-white">JSON</div><div className="text-[10px] text-gray-400 mt-0.5 leading-tight">Sauvegarde complete</div></div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {statusMessage && (
          <div className="mb-4 p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/40 text-blue-300 text-xs flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#222224] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={handleDownload} disabled={isGenerating || isSharing || songCount === 0} className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer">
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              <span>Telecharger PDF</span>
            </button>
            <button type="button" onClick={handleExportChordPro} disabled={isGenerating || isSharing || songCount === 0} className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 hover:text-white border border-[#333] font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer">
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>Exporter ChordPro</span>
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={handleShareMessaging}
              disabled={isGenerating || isSharing || songCount === 0}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/35 font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              title="Partager le PDF ou le texte via vos applications de messagerie"
            >
              {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>Messagerie / Apps</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
