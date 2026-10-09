import React, { useState } from 'react';
import { Setlist, Song } from '../types';
import { generateSetlistPdf, sharePdfFile, PdfExportOptions, DEFAULT_PDF_OPTIONS } from '../utils/pdfExport';
import { parseDurationToSeconds, formatSetlistDuration, getSongDuration } from '../utils/chordUtils';
import { 
  FileDown, 
  Share2, 
  Printer, 
  Check, 
  Copy, 
  X, 
  Moon, 
  Sun, 
  FileText, 
  Sparkles,
  Music,
  Loader2,
  FileCode,
  Download
} from 'lucide-react';

interface SetlistPdfModalProps {
  setlist: Setlist;
  songs: Song[];
  onClose: () => void;
  mode?: 'song' | 'setlist';
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
  const [options, setOptions] = useState<PdfExportOptions>({
    ...DEFAULT_PDF_OPTIONS,
    includeCover: true,
    showChords: true,
    notation: 'standard',
    theme: 'light',
    fontSize: 'normal'
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedTextSummary, setCopiedTextSummary] = useState(false);
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

  const handleShare = async () => {
    setIsGenerating(true);
    setStatusMessage('Generation du PDF pour le partage...');
    try {
      const { blob, fileName } = await generateSetlistPdf(setlist, songs, options);
      const totalSecs = setlistSongs.reduce((acc, s) => acc + parseDurationToSeconds(s), 0);
      const durStr = totalSecs > 0 ? ` \u2022 Duree totale : ${formatSetlistDuration(totalSecs)}` : '';
      const textMessage = isSongMode
        ? `\uD83C\uDFB5 ${setlist.name}${durStr}`
        : `\uD83C\uDFB5 Setlist : ${setlist.name} (${setlist.date || 'Programme'})\n${songCount} morceaux prets${durStr}.`;
      const result = await sharePdfFile(blob, fileName, setlist.name, textMessage);
      if (result.method === 'download') {
        setStatusMessage('PDF telecharge ! (Partage direct non supporte par ce navigateur)');
      } else if (result.success) {
        setStatusMessage('Partage effectue avec succes !');
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Erreur lors de la generation du PDF.');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(null), 4500);
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    setStatusMessage('Creation du document PDF...');
    try {
      const { doc, fileName } = await generateSetlistPdf(setlist, songs, options);
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

  const handlePrint = async () => {
    setIsGenerating(true);
    setStatusMessage("Ouverture de l'apercu d'impression...");
    try {
      const { doc } = await generateSetlistPdf(setlist, songs, options);
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        setStatusMessage('Document ouvert dans un nouvel onglet.');
      } else {
        doc.save(`${setlist.name}-impression.pdf`);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage("Erreur d'impression.");
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleCopyTextSummary = () => {
    const totalSecs = setlistSongs.reduce((acc, s) => acc + parseDurationToSeconds(s), 0);
    const durationHeader = totalSecs > 0 ? ` | Duree : ${formatSetlistDuration(totalSecs)}` : '';
    const lines = [
      `\uD83C\uDFB5 ${isSongMode ? 'CHANTS' : 'SETLIST'} : ${setlist.name.toUpperCase()}`,
      !isSongMode ? `\uD83D\uDCC5 Date : ${setlist.date || 'Non specifiee'}${durationHeader}` : '',
      `\n\uD83D\uDCCB PROGRAMME : ${songCount} chants`,
      ...setlistSongs.map((s, i) => {
        const songDur = getSongDuration(s);
        const durPart = songDur ? ` | \u23F1\uFE0F ${songDur}` : '';
        return `${i + 1}. ${s.title} \u2014 ${s.artist || 'Auteur'} [Tonalite : ${s.key} | ${s.tempo} BPM${durPart}]`;
      }),
      `\n\u2728 Genere avec MeloBook Pro`
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedTextSummary(true);
    setTimeout(() => setCopiedTextSummary(false), 3000);
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

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141416] border border-[#242428]">
            <span className="font-semibold text-white">Systeme de notation</span>
            <div className="flex items-center bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
              <button type="button" onClick={() => setOptions(prev => ({ ...prev, notation: 'standard' }))} className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${options.notation === 'standard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>ABC</button>
              <button type="button" onClick={() => setOptions(prev => ({ ...prev, notation: 'latin' }))} className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${options.notation === 'latin' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Do Re Mi</button>
            </div>
          </div>

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

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141416] border border-[#242428]">
            <span className="font-semibold text-white">Page Sommaire / Programme</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={options.includeCover} onChange={(e) => setOptions(prev => ({ ...prev, includeCover: e.target.checked }))} className="sr-only peer" />
              <div className="w-9 h-5 bg-[#2A2A2D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
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
        <div className="space-y-2.5 pt-2 border-t border-[#222224]">
          <button type="button" onClick={handleShare} disabled={isGenerating || songCount === 0} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/30 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer">
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            <span>Partager sur WhatsApp &amp; Applications (PDF)</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={handleDownload} disabled={isGenerating || songCount === 0} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer">
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              <span>Telecharger PDF</span>
            </button>
            <button type="button" onClick={handlePrint} disabled={isGenerating || songCount === 0} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 hover:text-white border border-[#333] font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer">
              <Printer className="w-3.5 h-3.5 text-gray-400" />
              <span>Imprimer / Ouvrir</span>
            </button>
          </div>
          <button type="button" onClick={handleCopyTextSummary} className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#141416] hover:bg-[#1C1C1E] text-gray-400 hover:text-gray-200 border border-[#242428] text-[11px] transition-colors cursor-pointer">
            {copiedTextSummary ? (
              <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400 font-semibold">Programme texte copie !</span></>
            ) : (
              <><Copy className="w-3.5 h-3.5" /><span>Copier le programme sous forme de texte (WhatsApp/SMS)</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
