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
  Eye, 
  EyeOff, 
  Moon, 
  Sun, 
  FileText, 
  Sparkles,
  Layers,
  Music,
  Loader2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

interface SetlistPdfModalProps {
  setlist: Setlist;
  songs: Song[];
  onClose: () => void;
}

export const SetlistPdfModal: React.FC<SetlistPdfModalProps> = ({ setlist, songs, onClose }) => {
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

  // Trigger Native Share (WhatsApp, Telegram, Mail, AirDrop)
  const handleShare = async () => {
    setIsGenerating(true);
    setStatusMessage('Génération du PDF pour le partage...');
    try {
      const { blob, fileName } = await generateSetlistPdf(setlist, songs, options);
      const totalSecs = setlistSongs.reduce((acc, s) => acc + parseDurationToSeconds(s), 0);
      const durStr = totalSecs > 0 ? ` • Durée totale : ${formatSetlistDuration(totalSecs)}` : '';
      const textMessage = `🎵 Setlist : ${setlist.name} (${setlist.date || 'Programme'})\n${setlistSongs.length} morceaux prêts pour répétition et scène${durStr}.`;
      
      const result = await sharePdfFile(blob, fileName, setlist.name, textMessage);
      if (result.method === 'download') {
        setStatusMessage('PDF téléchargé ! (Partage direct non supporté par ce navigateur)');
      } else if (result.success) {
        setStatusMessage('Partage effectué avec succès !');
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Erreur lors de la génération du PDF.');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(null), 4500);
    }
  };

  // Trigger Direct Download
  const handleDownload = async () => {
    setIsGenerating(true);
    setStatusMessage('Création du document PDF...');
    try {
      const { doc, fileName } = await generateSetlistPdf(setlist, songs, options);
      doc.save(fileName);
      setStatusMessage(`Fichier "${fileName}" téléchargé !`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Erreur lors du téléchargement.');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Trigger Print / Open in new window
  const handlePrint = async () => {
    setIsGenerating(true);
    setStatusMessage('Ouverture de l\'aperçu d\'impression...');
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
      setStatusMessage('Erreur d\'impression.');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Copy plain text summary for chat apps
  const handleCopyTextSummary = () => {
    const totalSecs = setlistSongs.reduce((acc, s) => acc + parseDurationToSeconds(s), 0);
    const durationHeader = totalSecs > 0 ? ` | Durée : ${formatSetlistDuration(totalSecs)}` : '';

    const lines = [
      `🎵 SETLIST : ${setlist.name.toUpperCase()}`,
      `📅 Date : ${setlist.date || 'Non spécifiée'}${durationHeader}`,
      `\n📋 PROGRAMME : ${setlistSongs.length} chants`,
      ...setlistSongs.map((s, i) => {
        const songDur = getSongDuration(s);
        const durPart = songDur ? ` | ⏱️ ${songDur}` : '';
        return `${i + 1}. ${s.title} — ${s.artist || 'Auteur'} [Tonalité : ${s.key} | ${s.tempo} BPM${durPart}]`;
      }),
      `\n✨ Généré avec MéloBook Pro`
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
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Exporter la Setlist en PDF</span>
              </h3>
              <p className="text-xs text-gray-400">
                {setlist.name} • {setlistSongs.length} chants
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#1C1C1E] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="py-4 space-y-3 text-xs">
          
          {/* Option: Chords vs Lyrics only */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141416] border border-[#242428]">
            <span className="font-semibold text-white">Contenu des partitions</span>

            <div className="flex items-center bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
              <button
                type="button"
                onClick={() => setOptions(prev => ({ ...prev, showChords: true }))}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  options.showChords ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Music className="w-3 h-3" />
                <span>Accords</span>
              </button>
              <button
                type="button"
                onClick={() => setOptions(prev => ({ ...prev, showChords: false }))}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  !options.showChords ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>Paroles</span>
              </button>
            </div>
          </div>

          {/* Option: Notation standard vs latine */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141416] border border-[#242428]">
            <span className="font-semibold text-white">Système de notation</span>

            <div className="flex items-center bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
              <button
                type="button"
                onClick={() => setOptions(prev => ({ ...prev, notation: 'standard' }))}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  options.notation === 'standard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                ABC
              </button>
              <button
                type="button"
                onClick={() => setOptions(prev => ({ ...prev, notation: 'latin' }))}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  options.notation === 'latin' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Do Ré Mi
              </button>
            </div>
          </div>

          {/* Option: Theme (Print Light vs Dark Stage) */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141416] border border-[#242428]">
            <span className="font-semibold text-white">Thème de rendu</span>

            <div className="flex items-center bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
              <button
                type="button"
                onClick={() => setOptions(prev => ({ ...prev, theme: 'light' }))}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  options.theme === 'light' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Clair / Print</span>
              </button>
              <button
                type="button"
                onClick={() => setOptions(prev => ({ ...prev, theme: 'dark' }))}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  options.theme === 'dark' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>Sombre</span>
              </button>
            </div>
          </div>

          {/* Option: Page de garde / Sommaire */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141416] border border-[#242428]">
            <span className="font-semibold text-white">Page Sommaire / Programme</span>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeCover}
                onChange={(e) => setOptions(prev => ({ ...prev, includeCover: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#2A2A2D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

        </div>

        {/* Status notification */}
        {statusMessage && (
          <div className="mb-4 p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/40 text-blue-300 text-xs flex items-center gap-2 animate-fadeIn">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2 border-t border-[#222224]">
          
          {/* Primary Action: Share via Chat Apps (WhatsApp, Telegram, AirDrop, etc.) */}
          <button
            type="button"
            onClick={handleShare}
            disabled={isGenerating || setlistSongs.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/30 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <span>Partager sur WhatsApp & Applications (PDF)</span>
          </button>

          {/* Secondary Actions Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || setlistSongs.length === 0}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>Télécharger PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isGenerating || setlistSongs.length === 0}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 hover:text-white border border-[#333] font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5 text-gray-400" />
              <span>Imprimer / Ouvrir</span>
            </button>
          </div>

          {/* Copy Plain Text Summary */}
          <button
            type="button"
            onClick={handleCopyTextSummary}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#141416] hover:bg-[#1C1C1E] text-gray-400 hover:text-gray-200 border border-[#242428] text-[11px] transition-colors"
          >
            {copiedTextSummary ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Programme texte copié pour message !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copier le programme sous forme de texte (WhatsApp/SMS)</span>
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  );
};
