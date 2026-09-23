import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  ChevronDown,
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
  initialSource?: 'search' | 'file' | 'chordpro' | 'shir' | 'webchords';
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

export const SongImportModal: React.FC<SongImportModalProps> = ({
  isOpen,
  onClose,
  onImportSong,
  onImportAndEdit,
  initialSource = 'search'
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'file' | 'chordpro'>(
    initialSource === 'file'
      ? 'file'
      : (initialSource === 'chordpro' || initialSource === 'shir' || initialSource === 'webchords')
      ? 'chordpro'
      : 'search'
  );

  // In-app search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineResults, setOnlineResults] = useState<ExternalSongItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);

  // Preview drawer / modal for a song
  const [previewSong, setPreviewSong] = useState<ExternalSongItem | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<string[]>([]);

  // File and ChordPro states
  const [isDragging, setIsDragging] = useState(false);
  const [manualSource, setManualSource] = useState<'chordpro' | 'shir' | 'webchords'>('chordpro');
  const [manualTitle, setManualTitle] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const [manualKey, setManualKey] = useState('C');
  const [manualTempo, setManualTempo] = useState(100);
  const [manualText, setManualText] = useState('');
  const [importedFileCount, setImportedFileCount] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset tab on open and reset search state
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setOnlineResults([]);
      setSearchError(null);
      setImportedFileCount(0);
      setIsDragging(false);
      if (initialSource === 'chordpro' || initialSource === 'shir' || initialSource === 'webchords') {
        setActiveTab('chordpro');
        setManualSource(initialSource);
      } else if (initialSource === 'file') {
        setActiveTab('file');
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

  // Local database search (only active when user has typed a query)
  const localFilteredResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return EXTERNAL_SONGS_DATABASE.filter(song => {
      // Source filter
      if (selectedSource !== 'all' && song.source !== selectedSource) {
        return false;
      }
      return (
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.snippet.toLowerCase().includes(q) ||
        song.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedSource]);

  // Combined results with priority given to real external site queries
  const allResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q && onlineResults.length === 0) {
      return [];
    }
    if (onlineResults.length > 0) {
      if (selectedSource === 'Shir.fr') {
        return onlineResults;
      }
      const combined = [...onlineResults];
      localFilteredResults.forEach(local => {
        if (!combined.some(c => c.title.toLowerCase() === local.title.toLowerCase() && c.artist.toLowerCase() === local.artist.toLowerCase())) {
          combined.push(local);
        }
      });
      return combined;
    }
    return localFilteredResults;
  }, [localFilteredResults, onlineResults, selectedSource, searchQuery]);

  // Ensure full ChordPro content is loaded for a song before previewing or importing
  const ensureSongLoaded = async (songItem: ExternalSongItem): Promise<ExternalSongItem> => {
    if (songItem.contentChordPro && songItem.contentChordPro.trim().length > 25) {
      return songItem;
    }

    try {
      const pageTitle = (songItem as any).pageTitle || songItem.title;
      const tabUrl = (songItem as any).tabUrl || (songItem as any).url;
      const response = await fetch('/api/external-song-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageTitle,
          tabUrl,
          source: songItem.source
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.ok && data?.song) {
          const enriched: ExternalSongItem = {
            ...songItem,
            title: data.song.title || songItem.title,
            artist: data.song.artist || songItem.artist,
            key: data.song.key || songItem.key,
            tempo: data.song.tempo || songItem.tempo,
            tags: data.song.tags || songItem.tags,
            contentChordPro: data.song.contentChordPro || songItem.contentChordPro
          };

          setOnlineResults(prev => prev.map(s => s.id === songItem.id ? enriched : s));
          return enriched;
        }
      }
    } catch (e) {
      console.warn('Impossible de charger les détails du chant:', e);
    }
    return songItem;
  };

  // Open Preview with full ChordPro fetched
  const handleOpenPreview = async (songItem: ExternalSongItem) => {
    setLoadingSongId(songItem.id);
    try {
      const fullSong = await ensureSongLoaded(songItem);
      setPreviewSong(fullSong);
    } finally {
      setLoadingSongId(null);
    }
  };

  // Trigger Online Search via Server API directly querying site directories
  const handlePerformOnlineSearch = async (overrideQuery?: string, overrideSource?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : searchQuery).trim();
    if (!q) return;
    const src = overrideSource !== undefined ? overrideSource : selectedSource;

    setIsSearchingOnline(true);
    setSearchError(null);

    try {
      const response = await fetch('/api/external-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          source: src === 'all' ? undefined : src
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la recherche sur les répertoires externes');
      }

      if (data.results && Array.isArray(data.results)) {
        setOnlineResults(data.results);
      }
    } catch (err: any) {
      console.warn('Recherche externe indisponible ou erreur:', err);
      if (localFilteredResults.length === 0) {
        setSearchError(err?.message || 'Recherche externe momentanément indisponible.');
      }
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // 1-Click Import song from external results
  const handleImportSingleSong = async (songItem: ExternalSongItem) => {
    setImportingId(songItem.id);
    try {
      const fullSong = await ensureSongLoaded(songItem);
      await onImportSong({
        title: fullSong.title,
        artist: fullSong.artist,
        key: fullSong.key || 'C',
        tempo: fullSong.tempo || 100,
        timeSignature: fullSong.timeSignature || '4/4',
        tags: fullSong.tags || [],
        contentChordPro: fullSong.contentChordPro
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
      const fullSong = await ensureSongLoaded(songItem);
      if (onImportAndEdit) {
        await onImportAndEdit({
          title: fullSong.title,
          artist: fullSong.artist,
          key: fullSong.key || 'C',
          tempo: fullSong.tempo || 100,
          timeSignature: fullSong.timeSignature || '4/4',
          tags: fullSong.tags || [],
          contentChordPro: fullSong.contentChordPro
        });
        onClose();
      } else {
        await handleImportSingleSong(fullSong);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImportingId(null);
    }
  };

  // Process uploaded or dropped files
  const processFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    let count = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      
      let title = file.name.replace(/\.(cho|pro|chopro|txt|crd)$/i, '');
      let artist = '';
      let key = 'C';
      let tempo = 100;
      let duration: string | undefined = undefined;
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
          if (tag === 'duration' || tag === 'd' || tag === 'dur') duration = val;
        }
      });

      await onImportSong({
        title,
        artist,
        key,
        tempo,
        duration,
        contentChordPro: finalChordPro
      });
      count++;
    }

    setImportedFileCount(count);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  // Manual File Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
  };

  // Execute manual import from pasted text
  const handleExecuteManualImport = async () => {
    if (!manualText.trim()) return;

    let finalContent = manualText;
    let detectedTitle = manualTitle.trim() || 'Nouveau Chant';
    let detectedArtist = manualArtist.trim() || '';
    let detectedKey = manualKey || 'C';
    let detectedTempo = manualTempo || 100;
    let detectedDuration: string | undefined = undefined;

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
        if (tag === 'duration' || tag === 'd' || tag === 'dur') detectedDuration = val;
      }
    });

    await onImportSong({
      title: detectedTitle,
      artist: detectedArtist,
      key: detectedKey,
      tempo: detectedTempo,
      duration: detectedDuration,
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
              <h2 className="text-base font-bold text-white">
                Importer des Chants
              </h2>
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
        <div className="flex items-center justify-center border-b border-[#222224] bg-[#0A0A0B] px-3 sm:px-6 overflow-x-auto scrollbar-none">
          <button
            id="tab-search-online"
            onClick={() => setActiveTab('search')}
            className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'search'
                ? 'border-blue-500 text-blue-400 bg-blue-950/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Recherche en ligne</span>
          </button>

          <button
            id="tab-import-file"
            onClick={() => setActiveTab('file')}
            className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'file'
                ? 'border-blue-500 text-blue-400 bg-blue-950/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Importer un fichier</span>
          </button>

          <button
            id="tab-write-chordpro"
            onClick={() => setActiveTab('chordpro')}
            className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'chordpro'
                ? 'border-blue-500 text-blue-400 bg-blue-950/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Écrire / Coller ChordPro</span>
          </button>
        </div>

        {/* Modal Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* TAB 1: SEARCH DIRECTLY IN EXTERNAL SITES */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              
              {/* Search Bar with Embedded Source Dropdown on the left */}
              <div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePerformOnlineSearch();
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1 flex items-stretch bg-[#18181A] border border-[#333] hover:border-[#444] focus-within:border-blue-500 rounded-lg shadow-inner transition-colors">
                    {/* Source Sites Dropdown at the left */}
                    <div className="relative flex items-center shrink-0 border-r border-[#2E2E33] bg-[#141416] rounded-l-lg hover:bg-[#1C1C20] transition-colors">
                      <select
                        id="song-import-source-select"
                        value={selectedSource}
                        onChange={(e) => {
                          const newSource = e.target.value;
                          setSelectedSource(newSource);
                          if (searchQuery.trim()) {
                            handlePerformOnlineSearch(searchQuery.trim(), newSource);
                          }
                        }}
                        className="appearance-none bg-transparent pl-3 pr-7 py-2.5 text-xs sm:text-sm font-medium text-gray-200 cursor-pointer focus:outline-none max-w-[130px] sm:max-w-[170px] truncate"
                        title="Sélectionner le site source"
                        aria-label="Sélectionner le site source"
                      >
                        {SOURCE_OPTIONS.map((src) => (
                          <option key={src.id} value={src.id} className="bg-[#1C1C20] text-gray-200 py-1">
                            {src.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 flex items-center">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="song-import-search-input"
                        type="text"
                        placeholder="Rechercher par titre, artiste, paroles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent pl-9 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none"
                        autoFocus
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setOnlineResults([]);
                            setSearchError(null);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                          title="Effacer la recherche"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSearchingOnline || !searchQuery.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-md transition-colors whitespace-nowrap cursor-pointer"
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
                {!searchQuery.trim() && onlineResults.length === 0 ? (
                  <div className="text-center py-12 bg-[#0A0A0B] border border-[#222224] rounded-xl p-6">
                    <Search className="w-10 h-10 text-gray-600 mx-auto mb-3 opacity-60" />
                    <h3 className="text-sm font-bold text-white mb-1">
                      Recherchez un chant parmi nos sources
                    </h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                      Saisissez un titre, un artiste ou des paroles dans la barre de recherche ci-dessus pour afficher des partitions.
                    </p>
                  </div>
                ) : allResults.length === 0 ? (
                  <div className="text-center py-12 bg-[#0A0A0B] border border-[#222224] rounded-xl p-6">
                    <Search className="w-10 h-10 text-gray-600 mx-auto mb-3 opacity-60" />
                    <h3 className="text-sm font-bold text-white mb-1">
                      Aucun résultat direct pour &quot;{searchQuery}&quot;
                    </h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto mb-4">
                      Vérifiez l&apos;orthographe ou essayez avec un autre mot-clé ou une autre source.
                    </p>
                    <button
                      type="button"
                      onClick={() => handlePerformOnlineSearch()}
                      disabled={isSearchingOnline}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Lancer une recherche approfondie</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                      <span>
                        Chants trouvés : {allResults.length}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Cliquez sur &quot;Importer&quot; pour ajouter directement à votre bibliothèque
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                    {allResults.map((song) => {
                      const isImported = importedIds.includes(song.id);
                      const isImporting = importingId === song.id;
                      const isLoadingDetails = loadingSongId === song.id;

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
                              onClick={() => handleOpenPreview(song)}
                              disabled={isLoadingDetails}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-xs font-medium border border-[#333] transition-colors disabled:opacity-50"
                              title="Aperçu des accords et paroles"
                            >
                              {isLoadingDetails ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                              ) : (
                                <Eye className="w-3.5 h-3.5 text-blue-400" />
                              )}
                              <span>Aperçu</span>
                            </button>

                            {/* Import and Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleImportAndEditSong(song)}
                              disabled={isImporting || isLoadingDetails}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-amber-500/15 text-gray-200 hover:text-amber-300 text-xs font-medium border border-[#333] hover:border-amber-500/50 transition-colors disabled:opacity-50 cursor-pointer group"
                              title="Importer et ouvrir l'éditeur"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                              <span className="hidden sm:inline">Éditer</span>
                            </button>

                            {/* Instant 1-Click Import Button */}
                            <button
                              type="button"
                              onClick={() => handleImportSingleSong(song)}
                              disabled={isImporting || isImported || isLoadingDetails}
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
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Importer</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            </div>
          )}

          {/* TAB 2: FILE IMPORT / DRAG & DROP */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    processFiles(Array.from(e.dataTransfer.files));
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 sm:p-12 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-600/10 ring-2 ring-blue-500/30'
                    : 'border-[#333] hover:border-blue-500/60 bg-[#0A0A0B] hover:bg-[#101013]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept=".cho,.pro,.chopro,.txt,.crd"
                  className="hidden"
                />
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[#1C1C20] border border-[#2E2E33] flex items-center justify-center text-blue-400">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                  Glissez-déposez vos fichiers ici
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto mb-5 leading-relaxed">
                  Glissez directement vos fichiers ou cliquez pour sélectionner un ou plusieurs fichiers depuis votre ordinateur, tablette ou smartphone.
                </p>

                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-colors pointer-events-none">
                  <Upload className="w-4 h-4" />
                  <span>Choisir un ou plusieurs fichiers...</span>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5 pt-4 border-t border-[#1C1C1F]">
                  <span className="text-[11px] text-gray-500 mr-1">Formats compatibles :</span>
                  {['.cho', '.pro', '.chopro', '.txt', '.crd'].map((ext) => (
                    <span
                      key={ext}
                      className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-[#161618] text-gray-300 border border-[#2A2A2E]"
                    >
                      {ext}
                    </span>
                  ))}
                </div>
              </div>

              {importedFileCount > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                  <Check className="w-5 h-5 shrink-0 text-emerald-400" />
                  <span>{importedFileCount} fichier(s) importé(s) avec succès dans votre répertoire !</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHORDPRO TEXT WRITING OR PASTING */}
          {activeTab === 'chordpro' && (
            <div className="space-y-4">
              {/* Informative Header / Guide */}
              <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl flex items-start gap-2.5 text-xs text-blue-200">
                <FileCode className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Collez ou écrivez directement vos paroles et accords. Les accords placés entre crochets <span className="font-mono text-blue-300 font-bold">[C] [G] [Am]</span> ou situés sur la ligne au-dessus des paroles sont automatiquement détectés et convertis.
                </p>
              </div>

              {/* Metadata fields */}
              <div className="p-3.5 bg-[#0D0D0F] border border-[#222225] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200">
                    Informations du chant
                  </span>
                  <span className="text-[11px] text-gray-500">
                    (Facultatif si déjà spécifié dans les balises &#123;title:...&#125;)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">Titre</label>
                    <input
                      type="text"
                      placeholder="ex: Dieu Tout-Puissant"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="w-full bg-[#18181A] border border-[#333] hover:border-[#444] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">Artiste / Auteur</label>
                    <input
                      type="text"
                      placeholder="ex: Dan Luiten / Hillsong"
                      value={manualArtist}
                      onChange={(e) => setManualArtist(e.target.value)}
                      className="w-full bg-[#18181A] border border-[#333] hover:border-[#444] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">Tonalité</label>
                    <select
                      value={manualKey}
                      onChange={(e) => setManualKey(e.target.value)}
                      className="w-full bg-[#18181A] border border-[#333] hover:border-[#444] rounded-lg px-2.5 py-1.5 text-xs text-blue-400 font-bold focus:outline-none focus:border-blue-500"
                    >
                      {['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'Am', 'Em', 'Dm', 'Bm'].map(k => (
                        <option key={k} value={k} className="bg-[#111112] text-gray-200">{k}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">Tempo (BPM)</label>
                    <input
                      type="number"
                      min={40}
                      max={240}
                      value={manualTempo}
                      onChange={(e) => setManualTempo(parseInt(e.target.value, 10) || 100)}
                      className="w-full bg-[#18181A] border border-[#333] hover:border-[#444] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* ChordPro Editor / Paste Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-bold text-gray-200">
                    Paroles &amp; Accords (ChordPro)
                  </label>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setManualText(`{title: Mon Chant}\n{artist: Louange}\n{key: G}\n{tempo: 105}\n\n[G]Voici le premier [C]accord du chant\n[D]Et voici la suite avec les [G]paroles\n\n[C]Que ton nom soit [D]élevé\n[Em]Pour l'éterni[C]té`);
                        if (!manualTitle) setManualTitle('Mon Chant');
                        if (!manualArtist) setManualArtist('Louange');
                        setManualKey('G');
                        setManualTempo(105);
                      }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Insérer un exemple
                    </button>
                    {manualText && (
                      <button
                        type="button"
                        onClick={() => setManualText('')}
                        className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={9}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={`Collez ou écrivez ici vos paroles et accords...\n\nExemple ChordPro :\n[G]Voici les paroles avec [C]accords entre crochets\n\nNote : les paroles avec accords situés sur la ligne au-dessus sont également converties automatiquement.`}
                  className="w-full bg-[#0A0A0B] font-mono text-xs text-gray-100 border border-[#333] hover:border-[#444] focus:border-blue-500 rounded-xl p-3.5 focus:outline-none leading-relaxed shadow-inner"
                />
              </div>

              {/* Execute Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-gray-500 text-center sm:text-left">
                  Accords entre crochets [G] [C] ou texte brut avec accords au-dessus acceptés
                </span>
                <button
                  type="button"
                  onClick={handleExecuteManualImport}
                  disabled={!manualText.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors shadow-lg cursor-pointer whitespace-nowrap"
                >
                  <FileUp className="w-4 h-4" />
                  <span>Importer ce chant</span>
                </button>
              </div>
            </div>
          )}

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
