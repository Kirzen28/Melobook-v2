import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  FileUp, 
  FileCode, 
  Globe, 
  BookOpen, 
  Music, 
  Check, 
  Upload, 
  ExternalLink, 
  Eye, 
  Sparkles, 
  Loader2,
  Tag,
  ArrowRight,
  Edit3,
  Flame,
  Plus
} from 'lucide-react';
import { EXTERNAL_SONGS_DATABASE, ExternalSongItem } from '../data/externalSongsDatabase';
import { Song } from '../types';

interface SongImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSong: (songData: Omit<Song, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  onImportAndEdit?: (songData: Omit<Song, 'id' | 'groupId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialSource?: 'search' | 'chordpro' | 'shir' | 'webchords';
}

const SOURCE_OPTIONS: Array<{
  id: string;
  label: string;
  badge: string;
  color: string;
  icon: any;
}> = [
  { id: 'all', label: 'Tous les sites', badge: 'Multi-sources', color: 'bg-blue-600/20 text-blue-300 border-blue-500/30', icon: Globe },
  { id: 'Shir.fr', label: 'Shir.fr', badge: 'Louange FR', color: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30', icon: BookOpen },
  { id: 'WorshipTogether', label: 'WorshipTogether', badge: 'Worship EN', color: 'bg-purple-600/20 text-purple-300 border-purple-500/30', icon: Music },
  { id: 'JEM / Recueils', label: 'JEM / Recueils', badge: 'Cantiques', color: 'bg-amber-600/20 text-amber-300 border-amber-500/30', icon: BookOpen },
  { id: 'Ultimate Guitar', label: 'Ultimate Guitar', badge: 'Tablatures', color: 'bg-rose-600/20 text-rose-300 border-rose-500/30', icon: Music },
  { id: 'LaCuerda', label: 'LaCuerda', badge: 'Alabanza ES', color: 'bg-orange-600/20 text-orange-300 border-orange-500/30', icon: Globe },
];

const QUICK_SUGGESTIONS = [
  'Ce nom si merveilleux',
  '10,000 Reasons',
  'Pour Toi - Dan Luiten',
  'Que ma vie te glorifie',
  'Goodness of God',
  'Way Maker',
  'Majesté',
  'Graves Into Gardens',
  'Je louerai l\'Éternel',
  'Cuan Grande Es Dios'
];

export const SongImportModal: React.FC<SongImportModalProps> = ({
  isOpen,
  onClose,
  onImportSong,
  onImportAndEdit,
  initialSource = 'search'
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'manual'>(
    initialSource === 'search' ? 'search' : 'manual'
  );

  // In-app search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineResults, setOnlineResults] = useState<ExternalSongItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Preview drawer / modal for a song
  const [previewSong, setPreviewSong] = useState<ExternalSongItem | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<string[]>([]);

  // Manual & File tab states
  const [manualSource, setManualSource] = useState<'chordpro' | 'shir' | 'webchords'>('chordpro');
  const [manualTitle, setManualTitle] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const [manualKey, setManualKey] = useState('C');
  const [manualTempo, setManualTempo] = useState(100);
  const [manualText, setManualText] = useState('');
  const [importedFileCount, setImportedFileCount] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset tab on open
  useEffect(() => {
    if (isOpen) {
      if (initialSource === 'chordpro' || initialSource === 'shir' || initialSource === 'webchords') {
        setActiveTab('manual');
        setManualSource(initialSource);
      } else {
        setActiveTab('search');
      }
    }
  }, [isOpen, initialSource]);

  // Convert plain text 2-line chords over lyrics into standard ChordPro
  const convertPlainTextToChordPro = (plainText: string): string => {
    const lines = plainText.split('\n');
    const outputLines: string[] = [];
    const chordPattern = /^[A-G][b#]?(?:m|maj|min|aug|dim|sus[24]?|add[249]|7|9|11|13|6)?(?:\/[A-G][b#]?)?$/i;

    const isChordLine = (line: string): boolean => {
      const tokens = line.trim().split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return false;
      const validChords = tokens.filter(t => chordPattern.test(t.replace(/[()[\]]/g, '')));
      return validChords.length >= Math.ceil(tokens.length * 0.7);
    };

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (isChordLine(currentLine)) {
        if (i + 1 < lines.length && !isChordLine(lines[i + 1]) && lines[i + 1].trim().length > 0) {
          const nextLine = lines[i + 1];
          const chordPositions: { chord: string; index: number }[] = [];
          const regex = /\S+/g;
          let match;
          while ((match = regex.exec(currentLine)) !== null) {
            chordPositions.push({ chord: match[0].replace(/[()]/g, ''), index: match.index });
          }

          let merged = '';
          let lyricIndex = 0;
          chordPositions.forEach((pos) => {
            if (pos.index > lyricIndex) {
              merged += nextLine.slice(lyricIndex, Math.min(pos.index, nextLine.length));
              if (pos.index > nextLine.length) {
                merged += ' '.repeat(pos.index - nextLine.length);
              }
            }
            merged += `[${pos.chord}]`;
            lyricIndex = pos.index;
          });

          if (lyricIndex < nextLine.length) {
            merged += nextLine.slice(lyricIndex);
          }

          outputLines.push(merged);
          i++; // Skip next line
        } else {
          const chordsFormatted = currentLine.trim().split(/\s+/).map(c => `[${c.replace(/[()]/g, '')}]`).join(' ');
          outputLines.push(chordsFormatted);
        }
      } else {
        outputLines.push(currentLine);
      }
    }

    return outputLines.join('\n');
  };

  // Local database search
  const localFilteredResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return EXTERNAL_SONGS_DATABASE.filter(song => {
      // Source filter
      if (selectedSource !== 'all' && song.source !== selectedSource) {
        return false;
      }
      if (!q) return true;
      return (
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.snippet.toLowerCase().includes(q) ||
        song.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedSource]);

  // Combined results (local + online AI search)
  const allResults = useMemo(() => {
    const combined = [...localFilteredResults];
    onlineResults.forEach(online => {
      if (!combined.some(c => c.title.toLowerCase() === online.title.toLowerCase() && c.artist.toLowerCase() === online.artist.toLowerCase())) {
        combined.push(online);
      }
    });
    return combined;
  }, [localFilteredResults, onlineResults]);

  // Trigger Online Search via Server API / AI
  const handlePerformOnlineSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingOnline(true);
    setSearchError(null);

    try {
      const response = await fetch('/api/external-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          source: selectedSource === 'all' ? undefined : selectedSource
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur réseau (${response.status})`);
      }

      const data = await response.json();
      if (data.results && Array.isArray(data.results)) {
        setOnlineResults(data.results);
      }
    } catch (err: any) {
      console.warn('Recherche en ligne indisponible ou erreur:', err);
      // Fallback is already displaying local results
      if (localFilteredResults.length === 0) {
        setSearchError('Recherche en ligne momentanément limitée. Aucun résultat local trouvé.');
      }
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // 1-Click Import song from external results
  const handleImportSingleSong = async (songItem: ExternalSongItem) => {
    setImportingId(songItem.id);
    try {
      await onImportSong({
        title: songItem.title,
        artist: songItem.artist,
        key: songItem.key || 'C',
        tempo: songItem.tempo || 100,
        timeSignature: songItem.timeSignature || '4/4',
        tags: songItem.tags || [],
        contentChordPro: songItem.contentChordPro
      });

      setImportedIds(prev => [...prev, songItem.id]);
    } catch (err) {
      console.error('Erreur importation chant:', err);
    } finally {
      setImportingId(null);
    }
  };

  // Import and open editor directly
  const handleImportAndEditSong = async (songItem: ExternalSongItem) => {
    setImportingId(songItem.id);
    try {
      if (onImportAndEdit) {
        await onImportAndEdit({
          title: songItem.title,
          artist: songItem.artist,
          key: songItem.key || 'C',
          tempo: songItem.tempo || 100,
          timeSignature: songItem.timeSignature || '4/4',
          tags: songItem.tags || [],
          contentChordPro: songItem.contentChordPro
        });
        onClose();
      } else {
        await handleImportSingleSong(songItem);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImportingId(null);
    }
  };

  // Manual File Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let count = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      
      let title = file.name.replace(/\.(cho|pro|chopro|txt|crd)$/i, '');
      let artist = '';
      let key = 'C';
      let tempo = 100;
      let finalChordPro = text;

      if (!text.includes('[') && !text.includes('{')) {
        finalChordPro = convertPlainTextToChordPro(text);
      }

      const lines = finalChordPro.split('\n');
      lines.forEach(l => {
        const match = l.match(/\{([a-zA-Z_]+)\s*:\s*(.+)\}/);
        if (match) {
          const tag = match[1].toLowerCase();
          const val = match[2].trim();
          if (tag === 'title' || tag === 't') title = val;
          if (tag === 'artist' || tag === 'a' || tag === 'subtitle' || tag === 'st') artist = val;
          if (tag === 'key' || tag === 'k') key = val;
          if (tag === 'tempo' || tag === 'bpm') tempo = parseInt(val, 10) || 100;
        }
      });

      await onImportSong({
        title,
        artist,
        key,
        tempo,
        contentChordPro: finalChordPro
      });
      count++;
    }

    setImportedFileCount(count);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Execute manual import from pasted text
  const handleExecuteManualImport = async () => {
    if (!manualText.trim()) return;

    let finalContent = manualText;
    let detectedTitle = manualTitle.trim() || 'Nouveau Chant';
    let detectedArtist = manualArtist.trim() || '';
    let detectedKey = manualKey || 'C';
    let detectedTempo = manualTempo || 100;

    if (manualSource === 'webchords' || manualSource === 'shir' || (!manualText.includes('[') && !manualText.includes('{'))) {
      finalContent = convertPlainTextToChordPro(manualText);
    }

    const lines = finalContent.split('\n');
    lines.forEach(l => {
      const match = l.match(/\{([a-zA-Z_]+)\s*:\s*(.+)\}/);
      if (match) {
        const tag = match[1].toLowerCase();
        const val = match[2].trim();
        if ((tag === 'title' || tag === 't') && !manualTitle.trim()) detectedTitle = val;
        if ((tag === 'artist' || tag === 'a' || tag === 'subtitle' || tag === 'st') && !manualArtist.trim()) detectedArtist = val;
        if ((tag === 'key' || tag === 'k') && !manualKey) detectedKey = val;
        if ((tag === 'tempo' || tag === 'bpm') && !manualTempo) detectedTempo = parseInt(val, 10) || 100;
      }
    });

    await onImportSong({
      title: detectedTitle,
      artist: detectedArtist,
      key: detectedKey,
      tempo: detectedTempo,
      contentChordPro: finalContent
    });

    setManualText('');
    setManualTitle('');
    setManualArtist('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#111112] border border-[#2A2A2D] rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#222224] bg-[#141416]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Importer des Chants</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30">
                  Shir.fr • WorshipTogether • ChordPro
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Recherchez directement sur les répertoires externes ou téléversez des partitions
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C1C1E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Mode Tabs Switcher */}
        <div className="flex border-b border-[#222224] bg-[#0A0A0B] px-4 sm:px-6">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'search'
                ? 'border-blue-500 text-blue-400 bg-blue-950/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Rechercher sur les sites externes</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-600/30 text-blue-300 font-bold ml-1">
              Direct
            </span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'manual'
                ? 'border-blue-500 text-blue-400 bg-blue-950/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Fichiers & Copier-Coller</span>
          </button>
        </div>

        {/* Modal Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* TAB 1: SEARCH DIRECTLY IN EXTERNAL SITES */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              
              {/* Search Bar with Submit Button */}
              <div className="space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePerformOnlineSearch();
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Rechercher par titre, artiste, paroles (ex: Ce nom si merveilleux, 10,000 Reasons, Dan Luiten...)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#18181A] border border-[#333] hover:border-[#444] rounded-lg pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingOnline || !searchQuery.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-md transition-colors whitespace-nowrap"
                  >
                    {isSearchingOnline ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Recherche...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Rechercher</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Source Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[11px] text-gray-400 mr-1 shrink-0 font-medium">Source :</span>
                  {SOURCE_OPTIONS.map((src) => {
                    const isSelected = selectedSource === src.id;
                    const Icon = src.icon;
                    return (
                      <button
                        key={src.id}
                        type="button"
                        onClick={() => setSelectedSource(src.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all border ${
                          isSelected
                            ? `${src.color} border-blue-500 font-semibold shadow-sm`
                            : 'bg-[#18181A] border-[#2A2A2D] text-gray-400 hover:text-gray-200 hover:border-[#38383C]'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{src.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Quick suggestions chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    <span>Suggestions :</span>
                  </span>
                  {QUICK_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setSearchQuery(sug);
                      }}
                      className="text-[11px] px-2 py-0.5 rounded bg-[#18181A] hover:bg-[#222226] text-gray-300 hover:text-blue-300 border border-[#2A2A2D] transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error warning if online search had an issue */}
              {searchError && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                  <span>{searchError}</span>
                  <button onClick={() => setSearchError(null)} className="text-gray-400 hover:text-white ml-2">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Results List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                  <span>
                    Chants trouvés ({allResults.length})
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Cliquez sur &quot;Importer&quot; pour ajouter directement à votre bibliothèque
                  </span>
                </div>

                {allResults.length === 0 ? (
                  <div className="text-center py-12 bg-[#0A0A0B] border border-[#222224] rounded-xl p-6">
                    <Search className="w-10 h-10 text-gray-600 mx-auto mb-3 opacity-60" />
                    <h3 className="text-sm font-bold text-white mb-1">
                      {searchQuery ? `Aucun résultat direct pour "${searchQuery}"` : 'Recherchez un chant parmi nos sources'}
                    </h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto mb-4">
                      Recherchez des partitions d&apos;accords complètes issues de Shir.fr, WorshipTogether, JEM, Cantiques et répertoires chrétiens.
                    </p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handlePerformOnlineSearch}
                        disabled={isSearchingOnline}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Lancer une recherche approfondie sur le web</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {allResults.map((song) => {
                      const isImported = importedIds.includes(song.id);
                      const isImporting = importingId === song.id;

                      return (
                        <div
                          key={song.id}
                          className="p-3.5 rounded-lg bg-[#141416] border border-[#222224] hover:border-[#38383C] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group shadow-sm"
                        >
                          {/* Song Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                {song.title}
                              </h4>
                              
                              {/* Source Badge */}
                              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30">
                                {song.source}
                              </span>

                              {/* Key & BPM */}
                              {song.key && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#1C1C1E] text-blue-400 border border-[#333]">
                                  Tonalité : {song.key}
                                </span>
                              )}
                              {song.tempo > 0 && (
                                <span className="text-[10px] text-gray-400 bg-[#1C1C1E] px-1.5 py-0.2 rounded border border-[#2A2A2D]">
                                  {song.tempo} BPM
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-400 mb-1.5">
                              {song.artist || 'Auteur inconnu'}
                            </p>

                            {/* Snippet */}
                            {song.snippet && (
                              <p className="text-[11px] text-gray-500 italic line-clamp-1">
                                &laquo; {song.snippet} &raquo;
                              </p>
                            )}

                            {/* Tags */}
                            {song.tags && song.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {song.tags.map((t, idx) => (
                                  <span key={idx} className="text-[9px] px-1.5 py-0.2 rounded bg-[#0A0A0B] text-gray-400 border border-[#222224]">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#222224]">
                            {/* Preview Button */}
                            <button
                              type="button"
                              onClick={() => setPreviewSong(song)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-xs font-medium border border-[#333] transition-colors"
                              title="Aperçu des accords & paroles"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-400" />
                              <span>Aperçu</span>
                            </button>

                            {/* Import and Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleImportAndEditSong(song)}
                              disabled={isImporting}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 text-xs font-medium border border-[#333] transition-colors"
                              title="Importer et ouvrir l'éditeur"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                              <span className="hidden sm:inline">Éditer</span>
                            </button>

                            {/* Instant 1-Click Import Button */}
                            <button
                              type="button"
                              onClick={() => handleImportSingleSong(song)}
                              disabled={isImporting || isImported}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm ${
                                isImported
                                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-blue-600 hover:bg-blue-500 text-white'
                              }`}
                            >
                              {isImporting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Import...</span>
                                </>
                              ) : isImported ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Importé !</span>
                                </>
                              ) : (
                                <>
                                  <FileUp className="w-3.5 h-3.5" />
                                  <span>Importer</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: MANUAL FILES & PASTE CONVERTER */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              
              {/* Format selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setManualSource('chordpro')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    manualSource === 'chordpro'
                      ? 'bg-[#1C1C1E] border-blue-500 text-white shadow-sm'
                      : 'bg-[#0A0A0B] border-[#222224] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-400 mb-0.5">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Fichiers ChordPro (.pro, .cho)</span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Fichiers ou balises [C]
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setManualSource('shir')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    manualSource === 'shir'
                      ? 'bg-[#1C1C1E] border-blue-500 text-white shadow-sm'
                      : 'bg-[#0A0A0B] border-[#222224] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-400 mb-0.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Coller depuis Shir.fr</span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Recueil de louange chrétien
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setManualSource('webchords')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    manualSource === 'webchords'
                      ? 'bg-[#1C1C1E] border-blue-500 text-white shadow-sm'
                      : 'bg-[#0A0A0B] border-[#222224] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-400 mb-0.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Sites Web (Accords 2 lignes)</span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    LaCuerda, Ultimate-Guitar, etc.
                  </div>
                </button>
              </div>

              {/* Local File upload box */}
              {manualSource === 'chordpro' && (
                <div className="p-3.5 bg-[#0A0A0B] border border-[#222224] rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Téléverser des fichiers locaux (.cho, .pro, .txt, .crd)
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Importez un ou plusieurs fichiers simultanément
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-white border border-[#333] text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Choisir fichier(s)...</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    accept=".cho,.pro,.chopro,.txt,.crd"
                    className="hidden"
                  />
                </div>
              )}

              {importedFileCount > 0 && (
                <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{importedFileCount} fichier(s) importé(s) avec succès !</span>
                </div>
              )}

              {/* Metadata Inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-300 mb-1">Titre</label>
                  <input
                    type="text"
                    placeholder="ex: Dieu Tout-Puissant"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full bg-[#18181A] border border-[#333] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-300 mb-1">Artiste / Auteur</label>
                  <input
                    type="text"
                    placeholder="ex: Dan Luiten / Hillsong"
                    value={manualArtist}
                    onChange={(e) => setManualArtist(e.target.value)}
                    className="w-full bg-[#18181A] border border-[#333] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-300 mb-1">Tonalité</label>
                  <select
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value)}
                    className="w-full bg-[#18181A] border border-[#333] rounded-md px-2.5 py-1.5 text-xs text-blue-400 font-bold focus:outline-none focus:border-blue-500"
                  >
                    {['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'Am', 'Em', 'Dm', 'Bm'].map(k => (
                      <option key={k} value={k} className="bg-[#111112] text-gray-200">{k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-300 mb-1">Tempo (BPM)</label>
                  <input
                    type="number"
                    min={40}
                    max={240}
                    value={manualTempo}
                    onChange={(e) => setManualTempo(parseInt(e.target.value, 10) || 100)}
                    className="w-full bg-[#18181A] border border-[#333] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Paste area */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Coller les paroles & accords bruts :</span>
                  <span className="text-[10px] text-blue-400 font-normal">
                    Formatage automatique
                  </span>
                </label>
                <textarea
                  rows={8}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={
                    manualSource === 'chordpro'
                      ? "{title: Mon Chant}\n{artist: Louange}\n{key: G}\n\n[G]Voici le premier [C]accord..."
                      : "Couplet 1:\n  G           C\nDans ta présence Seigneur\n  D           G\nJe trouve la paix..."
                  }
                  className="w-full bg-[#0A0A0B] font-mono text-xs text-gray-100 border border-[#333] rounded-md p-3 focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              {/* Execute Manual Import */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleExecuteManualImport}
                  disabled={!manualText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors shadow-md"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Importer ce chant</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#141416] border-t border-[#222224] text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Format ChordPro standard • Transposition &amp; Catégories automatiques</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-xs font-medium border border-[#333] transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>

      {/* Interactive Song Preview Modal (if a song preview is active) */}
      {previewSong && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in zoom-in-95 duration-100">
          <div className="bg-[#141416] border border-[#333] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Preview Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222224] bg-[#18181A]">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30">
                  {previewSong.source}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{previewSong.title}</h3>
                <p className="text-xs text-gray-400">{previewSong.artist} • Tonalité : <strong className="text-blue-400">{previewSong.key}</strong> • {previewSong.tempo} BPM</p>
              </div>
              <button
                onClick={() => setPreviewSong(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#222]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0A0A0B]">
              <pre className="font-mono text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                {previewSong.contentChordPro}
              </pre>
            </div>

            {/* Preview Footer Actions */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#222224] bg-[#18181A]">
              <button
                type="button"
                onClick={() => setPreviewSong(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-[#222]"
              >
                Retour
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleImportAndEditSong(previewSong);
                    setPreviewSong(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 text-xs font-semibold border border-[#333] transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Importer et Éditer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleImportSingleSong(previewSong);
                    setPreviewSong(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Importer ce chant</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
