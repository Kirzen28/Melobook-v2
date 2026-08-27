import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Song, Folder } from '../types';
import { 
  Search, 
  Plus, 
  FolderPlus, 
  PlayCircle, 
  FileEdit, 
  Trash2, 
  ListPlus, 
  Music, 
  Tag, 
  Folder as FolderIcon, 
  Flame, 
  Heart, 
  Sparkles, 
  SlidersHorizontal, 
  FileUp, 
  FileDown, 
  Check, 
  X,
  Gauge,
  ChevronDown,
  Globe,
  Upload,
  FileCode,
  ExternalLink,
  BookOpen,
  ArrowRight
} from 'lucide-react';

export const SongList: React.FC = () => {
  const { 
    songs, 
    folders, 
    setlists, 
    setSelectedSong, 
    setActiveTab, 
    currentUser, 
    deleteSong, 
    createFolder, 
    deleteFolder,
    updateSetlist,
    createSong
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all');
  const [selectedKey, setSelectedKey] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'tempo' | 'recent'>('title');
  
  // Folder modal state
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#38bdf8');

  // Modals state
  const [addToSetlistSong, setAddToSetlistSong] = useState<Song | null>(null);
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>('');
  
  // Importer state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const [importSource, setImportSource] = useState<'chordpro' | 'shir' | 'webchords'>('chordpro');
  
  const [importTitle, setImportTitle] = useState('');
  const [importArtist, setImportArtist] = useState('');
  const [importKey, setImportKey] = useState('C');
  const [importTempo, setImportTempo] = useState(100);
  const [importText, setImportText] = useState('');
  const [importedFileCount, setImportedFileCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Key list for filtering
  const availableKeys = useMemo(() => {
    const keys = new Set<string>();
    songs.forEach(s => {
      if (s.key) keys.add(s.key.toUpperCase());
    });
    return Array.from(keys).sort();
  }, [songs]);

  // Filtered & Sorted Songs
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      // Folder filter
      if (selectedFolderId !== 'all' && song.folderId !== selectedFolderId) {
        return false;
      }
      // Key filter
      if (selectedKey !== 'all' && song.key.toUpperCase() !== selectedKey) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = song.title.toLowerCase().includes(q);
        const matchArtist = song.artist.toLowerCase().includes(q);
        const matchLyrics = song.contentChordPro.toLowerCase().includes(q);
        const matchTags = song.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchArtist && !matchLyrics && !matchTags) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
      if (sortBy === 'tempo') return (a.tempo || 0) - (b.tempo || 0);
      if (sortBy === 'recent') return (b.createdAt || '').localeCompare(a.createdAt || '');
      return 0;
    });
  }, [songs, selectedFolderId, selectedKey, searchQuery, sortBy]);

  const handleOpenStage = (song: Song) => {
    setSelectedSong(song);
    setActiveTab('stage');
  };

  const handleEditSong = (song: Song) => {
    setSelectedSong(song);
    setActiveTab('editor');
  };

  const handleCreateNewSong = () => {
    setSelectedSong(null);
    setActiveTab('editor');
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim(), newFolderColor);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
  };

  const handleConfirmAddToSetlist = async () => {
    if (!addToSetlistSong || !selectedSetlistId) return;
    const targetSetlist = setlists.find(st => st.id === selectedSetlistId);
    if (targetSetlist) {
      if (!targetSetlist.songIds.includes(addToSetlistSong.id)) {
        await updateSetlist(targetSetlist.id, {
          songIds: [...targetSetlist.songIds, addToSetlistSong.id]
        });
      }
    }
    setAddToSetlistSong(null);
  };

  // Open import modal for specific option
  const handleOpenImport = (source: 'chordpro' | 'shir' | 'webchords') => {
    setImportSource(source);
    setIsImportDropdownOpen(false);
    setIsImportModalOpen(true);
    setImportedFileCount(0);
  };

  // Convert Chords-Over-Lyrics text (Ultimate-Guitar, LaCuerda, WorshipTogether, E-Chords, Shir.fr) to ChordPro
  const convertPlainTextToChordPro = (rawText: string): string => {
    const lines = rawText.split('\n');
    const chordRegex = /^[A-G][b#]?(?:m|min|maj|dim|aug|sus[24]?|[0-9]+|\+[0-9]*)*(?:\/[A-G][b#]?)?$/i;

    const isChordOnlyToken = (tok: string) => {
      const clean = tok.replace(/[()[\],]/g, '');
      return chordRegex.test(clean);
    };

    const isLineOfChords = (line: string): boolean => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      const tokens = trimmed.split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return false;
      
      let chordMatches = 0;
      for (const tok of tokens) {
        if (isChordOnlyToken(tok)) {
          chordMatches++;
        }
      }
      return chordMatches / tokens.length >= 0.5;
    };

    const isSectionHeader = (line: string): string | null => {
      const trimmed = line.trim();
      const match = trimmed.match(/^\[?(Couplet|Verse|Refrain|Chorus|Pont|Bridge|Intro|Outro|Solo|Pre-Chorus|Pré-Refrain|Instrumental|Fin|Ending|Strophe)\s*([0-9A-Za-z]*)\]?:?$/i);
      if (match) {
        const secName = `${match[1]} ${match[2]}`.trim();
        return secName;
      }
      return null;
    };

    const outputLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      const sectionName = isSectionHeader(currentLine);

      if (sectionName) {
        const isChorus = /refrain|chorus/i.test(sectionName);
        if (isChorus) {
          outputLines.push(`{soc: ${sectionName}}`);
        } else {
          outputLines.push(`{comment: ${sectionName}}`);
        }
        continue;
      }

      if (isLineOfChords(currentLine)) {
        const nextLine = lines[i + 1];
        if (nextLine !== undefined && !isLineOfChords(nextLine) && !isSectionHeader(nextLine)) {
          // Merge chords from currentLine into nextLine
          const chordPositions: { col: number; chord: string }[] = [];
          const regex = /\S+/g;
          let match;
          while ((match = regex.exec(currentLine)) !== null) {
            chordPositions.push({
              col: match.index,
              chord: match[0].replace(/[()]/g, '')
            });
          }

          let merged = '';
          let lyricIndex = 0;

          chordPositions.forEach((cp, idx) => {
            const nextCp = chordPositions[idx + 1];
            // lyrics up to this chord's column
            if (cp.col > lyricIndex && lyricIndex < nextLine.length) {
              merged += nextLine.slice(lyricIndex, Math.min(cp.col, nextLine.length));
              lyricIndex = Math.min(cp.col, nextLine.length);
            }
            merged += `[${cp.chord}]`;
          });

          if (lyricIndex < nextLine.length) {
            merged += nextLine.slice(lyricIndex);
          }

          outputLines.push(merged);
          i++; // Skip the next line since we merged it
        } else {
          // Chords only on this line (like intro or instrumental)
          const chordsFormatted = currentLine.trim().split(/\s+/).map(c => `[${c.replace(/[()]/g, '')}]`).join(' ');
          outputLines.push(chordsFormatted);
        }
      } else {
        outputLines.push(currentLine);
      }
    }

    return outputLines.join('\n');
  };

  // Handle file uploads (.pro, .cho, .txt, .chopro)
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

      // Check if text is already chordpro or plain text
      if (!text.includes('[') && !text.includes('{')) {
        finalChordPro = convertPlainTextToChordPro(text);
      }

      // Parse directives
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

      await createSong({
        title,
        artist,
        key,
        tempo,
        contentChordPro: finalChordPro,
        folderId: selectedFolderId !== 'all' ? selectedFolderId : null
      });
      count++;
    }

    setImportedFileCount(count);
    if (count === 1 && files[0]) {
      // Just preview
    } else {
      setTimeout(() => {
        setIsImportModalOpen(false);
      }, 1000);
    }
  };

  // Execute manual import from text area
  const handleExecuteImport = async () => {
    if (!importText.trim()) return;

    let finalContent = importText;
    let detectedTitle = importTitle.trim() || 'Nouveau Chant';
    let detectedArtist = importArtist.trim() || '';
    let detectedKey = importKey || 'C';
    let detectedTempo = importTempo || 100;

    // If source is webchords or shir.fr or plain text, convert to ChordPro
    if (importSource === 'webchords' || importSource === 'shir' || (!importText.includes('[') && !importText.includes('{'))) {
      finalContent = convertPlainTextToChordPro(importText);
    }

    // Extract directives if present in text
    const lines = finalContent.split('\n');
    lines.forEach(l => {
      const match = l.match(/\{([a-zA-Z_]+)\s*:\s*(.+)\}/);
      if (match) {
        const tag = match[1].toLowerCase();
        const val = match[2].trim();
        if ((tag === 'title' || tag === 't') && !importTitle.trim()) detectedTitle = val;
        if ((tag === 'artist' || tag === 'a' || tag === 'subtitle' || tag === 'st') && !importArtist.trim()) detectedArtist = val;
        if ((tag === 'key' || tag === 'k') && !importKey) detectedKey = val;
        if ((tag === 'tempo' || tag === 'bpm') && !importTempo) detectedTempo = parseInt(val, 10) || 100;
      }
    });

    await createSong({
      title: detectedTitle,
      artist: detectedArtist,
      key: detectedKey,
      tempo: detectedTempo,
      contentChordPro: finalContent,
      folderId: selectedFolderId !== 'all' ? selectedFolderId : null
    });

    setImportText('');
    setImportTitle('');
    setImportArtist('');
    setIsImportModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-12 text-[#E0E0E0]">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Bibliothèque de Chants
          </h1>
        </div>

        {/* Action Buttons: Importer Dropdown & Nouveau Chant */}
        <div className="flex items-center gap-2">
          
          {/* Importer Button with 3 Options */}
          <div className="relative">
            <button
              onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 border border-[#333] text-xs font-semibold transition-colors shadow-sm"
              title="Importer des chants depuis des fichiers ou des sites d'accords"
            >
              <FileUp className="w-3.5 h-3.5 text-blue-400" />
              <span>Importer</span>
              <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
            </button>

            {/* Importer Dropdown Menu */}
            {isImportDropdownOpen && (
              <div 
                className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-[#111112] border border-[#333] rounded-lg shadow-2xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setIsImportDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#222224]">
                  Sources d'importation
                </div>

                {/* Option 1: ChordPro Files */}
                <button
                  onClick={() => handleOpenImport('chordpro')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#1C1C1E] flex items-start gap-2.5 transition-colors group"
                >
                  <div className="p-1.5 rounded bg-[#1C1C1E] border border-[#333] text-blue-400 mt-0.5 group-hover:border-blue-500">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-blue-400">
                      1. Fichiers ChordPro (.pro, .cho, .txt)
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Glisser-déposer ou code ChordPro avec balises <code className="text-blue-400">[C]</code>
                    </p>
                  </div>
                </button>

                {/* Option 2: Shir.fr */}
                <button
                  onClick={() => handleOpenImport('shir')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#1C1C1E] flex items-start gap-2.5 transition-colors group"
                >
                  <div className="p-1.5 rounded bg-[#1C1C1E] border border-[#333] text-blue-400 mt-0.5 group-hover:border-blue-500">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-blue-400">
                      2. Depuis Shir.fr
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Chants de louange chrétiens francophones & hébreux avec auto-formatage
                    </p>
                  </div>
                </button>

                {/* Option 3: Web Chords Sites (LaCuerda, Ultimate-Guitar, WorshipTogether, E-Chords) */}
                <button
                  onClick={() => handleOpenImport('webchords')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#1C1C1E] flex items-start gap-2.5 transition-colors group"
                >
                  <div className="p-1.5 rounded bg-[#1C1C1E] border border-[#333] text-blue-400 mt-0.5 group-hover:border-blue-500">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-blue-400">
                      3. Depuis Lacuerda, Ultimate Guitar, Worship Together, E-Chords
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Convertit automatiquement les accords superposés au-dessus des paroles
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Nouveau Chant */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={handleCreateNewSong}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Chant</span>
            </button>
          )}
        </div>
      </div>

      {/* Folder Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-4">
        <button
          onClick={() => setSelectedFolderId('all')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
            selectedFolderId === 'all'
              ? 'bg-[#1C1C1E] text-white border border-[#333]'
              : 'bg-[#111112] hover:bg-[#1C1C1E] text-gray-400 border border-[#222224]'
          }`}
        >
          <FolderIcon className="w-3.5 h-3.5 text-blue-400" />
          <span>Tous les chants</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0A0A0B] text-gray-400 border border-[#222224]">
            {songs.length}
          </span>
        </button>

        {folders.map(folder => {
          const folderSongsCount = songs.filter(s => s.folderId === folder.id).length;
          const isSelected = selectedFolderId === folder.id;
          return (
            <div key={folder.id} className="flex items-center">
              <button
                onClick={() => setSelectedFolderId(folder.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#1C1C1E] text-white border border-[#333]'
                    : 'bg-[#111112] hover:bg-[#1C1C1E] text-gray-400 border border-[#222224]'
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: folder.color || '#3B82F6' }}
                />
                <span>{folder.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0A0A0B] text-gray-400 border border-[#222224]">
                  {folderSongsCount}
                </span>
              </button>
            </div>
          );
        })}

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setIsNewFolderModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111112] hover:bg-[#1C1C1E] text-gray-400 hover:text-white border border-dashed border-[#333] text-xs font-medium whitespace-nowrap transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
            <span>Nouveau dossier</span>
          </button>
        )}
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="bg-[#111112] border border-[#222224] rounded-lg p-2.5 mb-5 flex flex-col md:flex-row items-center gap-2.5">
        
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par titre, artiste, paroles ou tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1C1C1E] border border-[#333] rounded-md pl-9 pr-8 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Key Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-[#1C1C1E] border border-[#333] rounded-md px-2.5 py-1.5">
            <Music className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Tonalité:</span>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="bg-transparent text-gray-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#111112]">Toutes</option>
              {availableKeys.map(k => (
                <option key={k} value={k} className="bg-[#111112]">{k}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-[#1C1C1E] border border-[#333] rounded-md px-2.5 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Trier:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-gray-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="title" className="bg-[#111112]">Titre (A-Z)</option>
              <option value="artist" className="bg-[#111112]">Artiste</option>
              <option value="tempo" className="bg-[#111112]">Tempo (BPM)</option>
              <option value="recent" className="bg-[#111112]">Plus récents</option>
            </select>
          </div>
        </div>
      </div>

      {/* Song List Cards */}
      {filteredSongs.length === 0 ? (
        <div className="text-center py-16 bg-[#111112] rounded-lg border border-[#222224] p-6">
          <Music className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-300">Aucun chant trouvé</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedFolderId !== 'all' || selectedKey !== 'all'
              ? "Essayez de modifier vos critères de recherche ou vos filtres."
              : "Commencez par ajouter votre premier chant ou charger les chants de démonstration."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSongs.map((song) => {
            const folder = folders.find(f => f.id === song.folderId);
            return (
              <div
                key={song.id}
                className="group relative bg-[#111112] hover:bg-[#141416] border border-[#222224] hover:border-[#333] rounded-lg p-4 transition-colors flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Folder Badge + Key / BPM / Capo */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {folder ? (
                      <span 
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#1C1C1E] border border-[#333]"
                        style={{ color: folder.color || '#3B82F6' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: folder.color || '#3B82F6' }} />
                        <span className="truncate max-w-[120px]">{folder.name}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500">Sans dossier</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-[#1C1C1E] border border-[#333] text-gray-200 text-[11px] font-bold">
                        {song.key || 'C'}
                      </span>
                      {song.tempo && (
                        <span className="px-1.5 py-0.5 rounded bg-[#1C1C1E] border border-[#222224] text-gray-400 text-[10px] font-medium flex items-center gap-1">
                          <Gauge className="w-2.5 h-2.5 text-blue-400" />
                          {song.tempo}
                        </span>
                      )}
                      {song.capo ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#1C1C1E] text-blue-400 text-[10px] font-semibold border border-[#333]">
                          Capo {song.capo}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Title & Artist */}
                  <h3 
                    onClick={() => handleOpenStage(song)}
                    className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors cursor-pointer line-clamp-1"
                  >
                    {song.title}
                  </h3>
                  <p className="text-xs text-gray-400 font-medium line-clamp-1 mt-0.5">
                    {song.artist || 'Auteur inconnu'}
                  </p>

                  {/* Tags */}
                  {song.tags && song.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {song.tags.slice(0, 3).map((t, idx) => (
                        <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1C1C1E] border border-[#222224] text-gray-400">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-[#222224] flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenStage(song)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white border border-transparent text-xs font-semibold transition-all shadow-sm active:scale-95"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Mode Scène</span>
                  </button>

                  <button
                    onClick={() => {
                      setAddToSetlistSong(song);
                      setSelectedSetlistId(setlists[0]?.id || '');
                    }}
                    className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] transition-colors"
                    title="Ajouter à une setlist"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                  </button>

                  {currentUser?.role === 'admin' && (
                    <>
                      <button
                        onClick={() => handleEditSong(song)}
                        className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] transition-colors"
                        title="Éditer le chant"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Supprimer le chant "${song.title}" ?`)) {
                            deleteSong(song.id);
                          }
                        }}
                        className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-[#333] transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add to Setlist */}
      {addToSetlistSong && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111112] border border-[#222224] rounded-lg w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ListPlus className="w-4 h-4 text-blue-400" />
                <span>Ajouter à une Setlist</span>
              </h3>
              <button 
                onClick={() => setAddToSetlistSong(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Chant: <strong className="text-white">{addToSetlistSong.title}</strong>
            </p>

            {setlists.length === 0 ? (
              <div className="text-center py-6 bg-[#0A0A0B] border border-[#222224] rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-400">Aucune setlist créée pour le moment.</p>
                <button
                  onClick={() => {
                    setAddToSetlistSong(null);
                    setActiveTab('setlists');
                  }}
                  className="mt-2 text-xs font-bold text-blue-400 hover:underline"
                >
                  Créer une setlist maintenant
                </button>
              </div>
            ) : (
              <div className="space-y-2 mb-5 max-h-56 overflow-y-auto">
                <label className="block text-xs font-semibold text-gray-300">
                  Choisir la setlist :
                </label>
                {setlists.map(st => {
                  const alreadyIn = st.songIds.includes(addToSetlistSong.id);
                  return (
                    <label
                      key={st.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedSetlistId === st.id
                          ? 'bg-[#1C1C1E] border-blue-500/60 text-white'
                          : 'bg-[#0A0A0B] border-[#222224] text-gray-300 hover:bg-[#1C1C1E]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="setlist_select"
                          value={st.id}
                          checked={selectedSetlistId === st.id}
                          onChange={() => setSelectedSetlistId(st.id)}
                          className="text-blue-600 focus:ring-0"
                        />
                        <div>
                          <p className="text-xs font-bold">{st.name}</p>
                          <p className="text-[10px] text-gray-400">{st.songIds.length} chants • {st.date}</p>
                        </div>
                      </div>
                      {alreadyIn && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#1C1C1E] text-blue-400 border border-[#333]">
                          Déjà présent
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222224]">
              <button
                type="button"
                onClick={() => setAddToSetlistSong(null)}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:bg-[#1C1C1E]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmAddToSetlist}
                disabled={!selectedSetlistId}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
              >
                Confirmer l'ajout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Universal Multi-Source Importer */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#111112] border border-[#222224] rounded-lg w-full max-w-2xl p-5 shadow-2xl my-auto text-[#E0E0E0]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#222224]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <FileUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Importer des Chants & Partitions
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Importation directe depuis des fichiers ou conversion intelligente de sites d'accords
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#1C1C1E] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Source Selection Tabs (The 3 Options) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              
              {/* Option 1: ChordPro */}
              <button
                type="button"
                onClick={() => setImportSource('chordpro')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  importSource === 'chordpro'
                    ? 'bg-[#1C1C1E] border-blue-500 text-white shadow-sm'
                    : 'bg-[#0A0A0B] border-[#222224] text-gray-400 hover:text-gray-200 hover:bg-[#1C1C1E]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-400 mb-0.5">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>1. Fichiers ChordPro</span>
                </div>
                <div className="text-[10px] text-gray-400">
                  Fichiers .pro, .cho, .txt ou balises [C]
                </div>
              </button>

              {/* Option 2: Shir.fr */}
              <button
                type="button"
                onClick={() => setImportSource('shir')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  importSource === 'shir'
                    ? 'bg-[#1C1C1E] border-blue-500 text-white shadow-sm'
                    : 'bg-[#0A0A0B] border-[#222224] text-gray-400 hover:text-gray-200 hover:bg-[#1C1C1E]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-400 mb-0.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>2. Depuis Shir.fr</span>
                </div>
                <div className="text-[10px] text-gray-400">
                  Louange chrétienne francophone & hébreu
                </div>
              </button>

              {/* Option 3: Web Chords Sites */}
              <button
                type="button"
                onClick={() => setImportSource('webchords')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  importSource === 'webchords'
                    ? 'bg-[#1C1C1E] border-blue-500 text-white shadow-sm'
                    : 'bg-[#0A0A0B] border-[#222224] text-gray-400 hover:text-gray-200 hover:bg-[#1C1C1E]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-400 mb-0.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>3. Sites d'Accords Web</span>
                </div>
                <div className="text-[10px] text-gray-400 truncate">
                  LaCuerda, Ultimate, Worship, E-Chords
                </div>
              </button>
            </div>

            {/* Hidden native file input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              multiple 
              accept=".cho,.pro,.chopro,.txt,.crd"
              className="hidden" 
            />

            {/* Tab 1 Content: ChordPro */}
            {importSource === 'chordpro' && (
              <div className="space-y-3 mb-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-[#0A0A0B] border border-[#222224] rounded-lg">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Téléverser des fichiers locaux (.cho, .pro, .txt)
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Importez un ou plusieurs fichiers de chants simultanément
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-white border border-[#333] text-xs font-medium transition-colors whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Choisir fichier(s)...</span>
                  </button>
                </div>

                {importedFileCount > 0 && (
                  <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{importedFileCount} fichier(s) importé(s) avec succès dans votre bibliothèque !</span>
                  </div>
                )}

                <div className="text-center text-[11px] text-gray-500 font-medium my-1">
                  — OU COLLER DU TEXTE AU FORMAT CHORDPRO —
                </div>
              </div>
            )}

            {/* Tab 2 Content: Shir.fr */}
            {importSource === 'shir' && (
              <div className="space-y-3 mb-4">
                <div className="p-3 bg-[#0A0A0B] border border-[#222224] rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <span>Importation depuis le recueil Shir.fr</span>
                    </span>
                    <a 
                      href="https://shir.fr" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400 hover:underline text-[11px]"
                    >
                      <span>Ouvrir Shir.fr</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Copiez les paroles et accords depuis la fiche de chant sur <strong className="text-gray-200">shir.fr</strong> (ou un recueil chrétien / cantique) et collez-les ci-dessous. Le convertisseur détectera automatiquement les strophes, refrains et accords.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3 Content: Web Chords (LaCuerda, Ultimate-Guitar, WorshipTogether, E-Chords) */}
            {importSource === 'webchords' && (
              <div className="space-y-3 mb-4">
                <div className="p-3 bg-[#0A0A0B] border border-[#222224] rounded-lg text-xs space-y-2">
                  <span className="font-semibold text-white block">
                    Convertisseur Universel d'Accords Web
                  </span>
                  <p className="text-[11px] text-gray-400">
                    Collez la tablature ou grille d'accords textuelle où les accords sont disposés au-dessus des paroles. Notre moteur fusionne automatiquement les lignes d'accords en balises <code className="text-blue-400 font-mono">[C]Paroles</code>.
                  </p>
                  
                  {/* Supported Sites Quick Links */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">Sites compatibles :</span>
                    {[
                      { name: 'LaCuerda.net', url: 'https://lacuerda.net' },
                      { name: 'Ultimate-Guitar.com', url: 'https://www.ultimate-guitar.com' },
                      { name: 'WorshipTogether.com', url: 'https://www.worshiptogether.com' },
                      { name: 'E-Chords.com', url: 'https://www.e-chords.com' }
                    ].map(site => (
                      <a
                        key={site.name}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-blue-400 border border-[#333] text-[10px] font-medium transition-colors"
                      >
                        <span>{site.name}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Optional Metadata Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-300 mb-1">Titre (optionnel)</label>
                <input
                  type="text"
                  placeholder="ex: Dieu Tout-Puissant"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-300 mb-1">Artiste / Auteur</label>
                <input
                  type="text"
                  placeholder="ex: Hillsong / Paul Baloche"
                  value={importArtist}
                  onChange={(e) => setImportArtist(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-300 mb-1">Tonalité</label>
                <select
                  value={importKey}
                  onChange={(e) => setImportKey(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-2.5 py-1.5 text-xs text-blue-400 font-bold focus:outline-none focus:border-blue-500"
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
                  value={importTempo}
                  onChange={(e) => setImportTempo(parseInt(e.target.value, 10) || 100)}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Textarea for paste input */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                <span>
                  {importSource === 'chordpro' && 'Contenu ChordPro (avec balises [C] ou {title}) :'}
                  {importSource === 'shir' && 'Collez les paroles & accords copiés depuis Shir.fr :'}
                  {importSource === 'webchords' && 'Collez la tablature / accords 2 lignes (LaCuerda, Ultimate-Guitar, etc.) :'}
                </span>
                <span className="text-[10px] text-blue-400 font-normal">
                  Conversion automatique
                </span>
              </label>
              <textarea
                rows={9}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={
                  importSource === 'chordpro'
                    ? "{title: Mon Chant}\n{artist: Louange}\n{key: G}\n\n[G]Voici le premier [C]accord..."
                    : (importSource === 'shir'
                      ? "Couplet 1:\n  G           C\nDans ta présence Seigneur\n  D           G\nJe trouve la paix..."
                      : "  C          G        Am         F\nAmazing grace how sweet the sound that saved a wretch like me\n  C          G        F          C\nI once was lost but now am found was blind but now I see")
                }
                className="w-full bg-[#0A0A0B] font-mono text-xs text-gray-100 border border-[#333] rounded-md p-3 focus:outline-none focus:border-blue-500 leading-relaxed"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#222224]">
              <div className="text-[11px] text-gray-400">
                {selectedFolderId !== 'all' && (
                  <span>Sera ajouté dans : <strong className="text-white">{folders.find(f => f.id === selectedFolderId)?.name}</strong></span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:bg-[#1C1C1E] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={!importText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 shadow-sm"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Importer dans la bibliothèque</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: New Folder */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111112] border border-[#222224] rounded-lg w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-blue-400" />
                <span>Nouveau Dossier</span>
              </h3>
              <button 
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Nom du dossier
                </label>
                <input
                  type="text"
                  placeholder="ex: Louange Rythmée, Spécial Pâques..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-3.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Couleur d'étiquette
                </label>
                <div className="flex items-center gap-2.5">
                  {['#2563eb', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewFolderColor(color)}
                      className={`w-7 h-7 rounded-md transition-transform ${
                        newFolderColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#111112]' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222224]">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:bg-[#1C1C1E] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                >
                  Créer le dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
