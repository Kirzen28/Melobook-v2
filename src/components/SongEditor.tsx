import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { Song } from '../types';
import { NAV_SPRING } from '../utils/motionPresets';
import { 
  parseChordPro, 
  getVocalBadgeStyle,
  formatSecondsToMinutes, 
  parseDurationToSeconds,
  formatDurationToMMSS,
  calculateSongAutoDuration,
  fetchYouTubeDuration,
  getYouTubeVideoId,
  normalizeYouTubeUrl
} from '../utils/chordUtils';
import { 
  VisualSection, 
  VisualLine, 
  VisualItem,
  chordProToVisualSections, 
  visualSectionsToChordPro, 
  extractAllChordsFromSections,
  generateId,
  insertChordInLine,
  cleanUpLineItems,
  SECTION_TYPES_CONFIG,
  STANDARD_SECTION_TYPES,
  getSectionTypeConfig,
  getCustomSectionTypes,
  saveCustomSectionType,
  recomputeSectionTitles
} from '../utils/visualEditorUtils';
import { VisualSectionCard } from './editor/VisualSectionCard';
import { ChordPickerModal } from './editor/ChordPickerModal';
import { KeySelectorKeypad } from './KeySelectorKeypad';
import { LanguageVersionModal } from './LanguageVersionModal';
import { 
  PRESET_LANGUAGES, 
  getLanguageMeta, 
  getLinkedSongVersions, 
  detectSongLanguage, 
  detectSongLanguageWithConfidence 
} from '../utils/languageUtils';
import { 
  DEFAULT_ARTIST_SUGGESTIONS,
  parseArtistsString,
  formatArtistsArray,
  getCustomArtists,
  saveCustomArtists
} from '../utils/artistUtils';
import { includesIgnoreAccents } from '../utils/songSearchUtils';
import { 
  Save, 
  ChevronLeft, 
  Sparkles, 
  Music, 
  Music2,
  Eye, 
  FileEdit, 
  Plus, 
  Check, 
  Tag, 
  ChevronDown, 
  ChevronUp, 
  ChevronsDown, 
  ChevronsUp, 
  X, 
  Copy, 
  Trash2, 
  FileText, 
  Globe, 
  Link, 
  ArrowRight,
  Search,
  Users,
  User,
  Loader2,
  Shield,
  Copyright,
  Undo2,
  Disc
} from 'lucide-react';

const SAMPLE_TEMPLATE = `{title: Mon Nouveau Chant}
{artist: Auteur}
{key: G}
{tempo: 75}
{time: 4/4}

{c: Intro}
[G] [C] [G] [D]

{c: Couplet 1}
[G]Voici la première ligne de [C]paroles
Et [G]voici la suite avec un [D]accord
Dans la [Em]présence de mon [C]Dieu
Je [G]chanterai de tout mon [D]cœur

{soc: Refrain [Unisson]}
Ô [C]Seigneur, Tu es [G]grand
Ta [Em]bonté dure pour tou[D]jours
Tous les [C]peuples Te loue[G]ront
Dans la [D]joie et dans la [G]paix
{eoc}

{sob: Pont}
[C]Rien ne peut Te compa[G]rer
[Em]Tu es le Roi des [D]rois
{eob}`;

const DEFAULT_CATEGORY_SUGGESTIONS = [
  'Louange',
  'Adoration',
  'Célébration',
  'Action de grâce',
  'Prière',
  'Méditation',
  'Gospel',
  'Noël',
  'Pâques',
  'Jeunesse',
  'Communion'
];

export const SongEditor: React.FC = () => {
  const { 
    selectedSong, 
    setSelectedSong,
    songs, 
    createSong, 
    updateSong, 
    setActiveTab,
    editorSubTab,
    setEditorSubTab,
    selectedSetlist,
    editorReturnTarget,
    setEditorReturnTarget,
    setIsLiveSetlistOpen,
    showNotification,
    canManageSongs
  } = useApp();

  // Basic Song Metadata
  const [title, setTitle] = useState(selectedSong?.title || '');
  const [artist, setArtist] = useState(selectedSong?.artist || '');
  const [album, setAlbum] = useState(selectedSong?.album || '');
  const [isAlbumDropdownOpen, setIsAlbumDropdownOpen] = useState(false);
  const [albumSearchQuery, setAlbumSearchQuery] = useState('');
  const [customAlbums, setCustomAlbums] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('melobook_custom_albums');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const albumDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedArtists, setSelectedArtists] = useState<string[]>(() => parseArtistsString(selectedSong?.artist));
  const [isArtistDropdownOpen, setIsArtistDropdownOpen] = useState(false);
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [customArtists, setCustomArtists] = useState<string[]>(() => getCustomArtists());
  const artistDropdownRef = useRef<HTMLDivElement>(null);
  const keyPickerRef = useRef<HTMLDivElement>(null);
  const [key, setKey] = useState(selectedSong?.key || 'C');
  const [isKeyPickerOpen, setIsKeyPickerOpen] = useState(false);
  const [tempo, setTempo] = useState<number>(selectedSong?.bpm || selectedSong?.tempo || 100);

  // Parse current key into Root (C..B), Accidental (b, #, none), and Mode (Major, Minor)
  const parsedKey = useMemo(() => {
    const raw = (key || 'C').trim();
    const match = raw.match(/^([A-Ga-g])([#♯b♭]?)(m|min|maj|M)?/i);
    const root = match ? match[1].toUpperCase() : 'C';
    let accidental: '' | '#' | 'b' = '';
    if (match) {
      if (match[2] === '#' || match[2] === '♯') accidental = '#';
      else if (match[2] === 'b' || match[2] === '♭') accidental = 'b';
    }
    const isMinor = match ? (Boolean(match[3]) && match[3].toLowerCase().startsWith('m') && match[3] !== 'M') : false;
    return { root, accidental, isMinor };
  }, [key]);

  const handleKeyUpdate = (newRoot: string, newAccidental: '' | '#' | 'b', newIsMinor: boolean) => {
    const newKey = `${newRoot}${newAccidental}${newIsMinor ? 'm' : ''}`;
    setKey(newKey);
    setContentChordPro(visualSectionsToChordPro(visualSections, buildChordProMetadata({ key: newKey })));
  };

  const handleSelectRoot = (note: string) => {
    handleKeyUpdate(note, parsedKey.accidental, parsedKey.isMinor);
  };

  const handleToggleAccidental = (acc: '#' | 'b') => {
    const nextAcc = parsedKey.accidental === acc ? '' : acc;
    handleKeyUpdate(parsedKey.root, nextAcc, parsedKey.isMinor);
  };

  const handleSelectMode = (isMinor: boolean) => {
    handleKeyUpdate(parsedKey.root, parsedKey.accidental, isMinor);
  };
  const [bpm, setBpm] = useState<number>(selectedSong?.bpm || selectedSong?.tempo || 100);
  const [timeSignature, setTimeSignature] = useState(selectedSong?.timeSignature || '4/4');
  const [durationMode, setDurationMode] = useState<'auto' | 'custom'>(
    selectedSong?.durationMode === 'custom' && selectedSong?.duration ? 'custom' : 'auto'
  );
  const [duration, setDuration] = useState(() => {
    if (selectedSong?.duration && selectedSong.duration !== 'auto') {
      return formatDurationToMMSS(selectedSong.duration);
    }
    return calculateSongAutoDuration(
      selectedSong?.contentChordPro || SAMPLE_TEMPLATE,
      selectedSong?.bpm || selectedSong?.tempo || 100,
      selectedSong?.timeSignature || '4/4'
    ).formatted;
  });
  const ytDurationUrlRef = useRef<string>('');
  const [capo, setCapo] = useState<number>(selectedSong?.capo || 0);
  const [language, setLanguage] = useState<string>(() => {
    if (selectedSong?.language) return selectedSong.language;
    if (selectedSong) return detectSongLanguage(selectedSong.title, selectedSong.contentChordPro || selectedSong.content);
    return detectSongLanguage('', SAMPLE_TEMPLATE);
  });
  const [isLanguageManual, setIsLanguageManual] = useState<boolean>(Boolean(selectedSong?.language));
  const [detectedLangInfo, setDetectedLangInfo] = useState<{ language: string; confidence: number; detectedFrom: 'title' | 'content' | 'both' | 'default' } | null>(() => {
    if (selectedSong) return detectSongLanguageWithConfidence(selectedSong.title, selectedSong.contentChordPro || selectedSong.content);
    return detectSongLanguageWithConfidence('', SAMPLE_TEMPLATE);
  });
  const [linkedSongIds, setLinkedSongIds] = useState<string[]>(selectedSong?.linkedSongIds || []);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>(selectedSong?.tags || []);
  const [ccli, setCcli] = useState(selectedSong?.ccli || '');
  const [copyright, setCopyright] = useState(selectedSong?.copyright || '');
  const [youtubeUrl, setYoutubeUrl] = useState(selectedSong?.youtubeUrl || '');
  const [audioUrl, setAudioUrl] = useState(selectedSong?.audioUrl || '');
  const [spotifyUrl, setSpotifyUrl] = useState(selectedSong?.spotifyUrl || '');
  const [notes, setNotes] = useState(selectedSong?.notes || '');
  const [contentChordPro, setContentChordPro] = useState(selectedSong?.contentChordPro || SAMPLE_TEMPLATE);

  // Visual Structured Sections
  const [visualSections, setVisualSections] = useState<VisualSection[]>(() => {
    return chordProToVisualSections(selectedSong?.contentChordPro || SAMPLE_TEMPLATE);
  });

  // Undo history management
  const undoStackRef = useRef<VisualSection[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const lastTypingTimeRef = useRef<number>(0);

  const pushHistory = (sections: VisualSection[]) => {
    try {
      const snapshot: VisualSection[] = JSON.parse(JSON.stringify(sections));
      undoStackRef.current = [...undoStackRef.current.slice(-30), snapshot];
      setCanUndo(true);
    } catch (e) {
      console.error('Failed to create history snapshot', e);
    }
  };

  const buildChordProMetadata = (overrides?: Partial<{
    title: string;
    artist: string;
    album: string;
    key: string;
    tempo: number;
    bpm: number;
    timeSignature: string;
    duration: string;
    capo: number;
    ccli: string;
    copyright: string;
    youtubeUrl: string;
    audioUrl: string;
    spotifyUrl: string;
  }>) => ({
    title: title.trim(),
    artist: artist.trim(),
    album: album.trim(),
    key,
    tempo: Number(bpm || tempo) || 100,
    bpm: Number(bpm || tempo) || 100,
    timeSignature,
    duration,
    capo: Number(capo) || 0,
    ccli: ccli.trim(),
    copyright: copyright.trim(),
    youtubeUrl: youtubeUrl.trim(),
    audioUrl: audioUrl.trim(),
    spotifyUrl: spotifyUrl.trim(),
    ...overrides
  });

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return;
    const previous = undoStackRef.current.pop();
    setCanUndo(undoStackRef.current.length > 0);
    if (previous) {
      setVisualSections(previous);
      setContentChordPro(visualSectionsToChordPro(previous, buildChordProMetadata()));
      showNotification('Action annulée', 'info');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const active = document.activeElement;
        const isTextInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
        if (!isTextInput) {
          e.preventDefault();
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, artist, key, tempo, timeSignature, duration, capo]);

  // Collapsed Sections state for folding/unfolding section bodies in the editor
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(new Set());

  const handleToggleSectionCollapse = (secId: string) => {
    setCollapsedSectionIds(prev => {
      const next = new Set(prev);
      if (next.has(secId)) {
        next.delete(secId);
      } else {
        next.add(secId);
      }
      return next;
    });
  };

  const handleCollapseAllSections = () => {
    setCollapsedSectionIds(new Set(visualSections.map(s => s.id)));
  };

  const handleExpandAllSections = () => {
    setCollapsedSectionIds(new Set());
  };

  // Drag and Drop state
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);

  // Custom Section Modal state
  const [showCustomSectionModal, setShowCustomSectionModal] = useState(false);
  const [customSectionInput, setCustomSectionInput] = useState('');
  const [customSectionList, setCustomSectionList] = useState<string[]>(() => getCustomSectionTypes());

  // Chord Picker Modal state
  const [chordPickerState, setChordPickerState] = useState<{
    isOpen: boolean;
    sectionId: string;
    lineId: string;
    itemId?: string;
    charOffset?: number;
    currentChord: string;
    lyricsSnippet?: string;
    sectionTitle?: string;
  }>({
    isOpen: false,
    sectionId: '',
    lineId: '',
    currentChord: ''
  });

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Category multi-select popover
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('melobook_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Add section dropdown state
  const [isAddSectionDropdownOpen, setIsAddSectionDropdownOpen] = useState(false);
  const [activeInsertSectionIndex, setActiveInsertSectionIndex] = useState<number | null>(null);
  const addSectionDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (artistDropdownRef.current && !artistDropdownRef.current.contains(e.target as Node)) {
        setIsArtistDropdownOpen(false);
      }
      if (albumDropdownRef.current && !albumDropdownRef.current.contains(e.target as Node)) {
        setIsAlbumDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (keyPickerRef.current && !keyPickerRef.current.contains(e.target as Node)) {
        setIsKeyPickerOpen(false);
      }
      if (addSectionDropdownRef.current && !addSectionDropdownRef.current.contains(e.target as Node)) {
        setIsAddSectionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute all available artists across songs and custom additions
  const allAvailableArtists = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_ARTIST_SUGGESTIONS.forEach(a => set.add(a));
    songs.forEach(s => {
      if (s.artist) {
        parseArtistsString(s.artist).forEach(a => set.add(a));
      }
    });
    customArtists.forEach(a => set.add(a));
    selectedArtists.forEach(a => set.add(a));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [songs, customArtists, selectedArtists]);

  const filteredArtistsList = useMemo(() => {
    if (!artistSearchQuery.trim()) return allAvailableArtists;
    return allAvailableArtists.filter(a => includesIgnoreAccents(a, artistSearchQuery));
  }, [allAvailableArtists, artistSearchQuery]);

  const handleToggleArtist = (artistName: string) => {
    const trimmed = artistName.trim();
    if (!trimmed) return;
    setSelectedArtists(prev => {
      const exists = prev.some(a => a.toLowerCase() === trimmed.toLowerCase());
      const next = exists
        ? prev.filter(a => a.toLowerCase() !== trimmed.toLowerCase())
        : [...prev, trimmed];
      const joined = formatArtistsArray(next);
      setArtist(joined);
      return next;
    });
  };

  const handleRemoveArtist = (artistName: string) => {
    setSelectedArtists(prev => {
      const next = prev.filter(a => a.toLowerCase() !== artistName.toLowerCase());
      const joined = formatArtistsArray(next);
      setArtist(joined);
      return next;
    });
  };

  const handleCreateArtist = (rawInput?: string) => {
    const input = (rawInput !== undefined ? rawInput : artistSearchQuery).trim();
    if (!input) return;

    const parsedNew = parseArtistsString(input);
    if (parsedNew.length === 0) return;

    const newCustom: string[] = [];
    setSelectedArtists(prev => {
      const updated = [...prev];
      parsedNew.forEach(name => {
        if (!updated.some(a => a.toLowerCase() === name.toLowerCase())) {
          updated.push(name);
        }
        if (!customArtists.some(a => a.toLowerCase() === name.toLowerCase())) {
          newCustom.push(name);
        }
      });
      const joined = formatArtistsArray(updated);
      setArtist(joined);
      return updated;
    });

    if (newCustom.length > 0) {
      setCustomArtists(prev => {
        const next = [...prev, ...newCustom];
        saveCustomArtists(next);
        return next;
      });
    }

    setArtistSearchQuery('');
  };

  // Compute all available albums across songs and custom additions
  const allAvailableAlbums = useMemo(() => {
    const map = new Map<string, string>();
    const addAlbum = (val?: string) => {
      const trimmed = val?.trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      if (!map.has(lower)) map.set(lower, trimmed);
    };
    songs.forEach(s => addAlbum(s.album));
    customAlbums.forEach(addAlbum);
    addAlbum(album);
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [songs, customAlbums, album]);

  const filteredAlbumsList = useMemo(() => {
    if (!albumSearchQuery.trim()) return allAvailableAlbums;
    return allAvailableAlbums.filter(a => includesIgnoreAccents(a, albumSearchQuery));
  }, [allAvailableAlbums, albumSearchQuery]);

  const handleSelectAlbum = (albumName: string) => {
    const trimmed = albumName.trim();
    if (!trimmed) return;
    const isSame = album.trim().toLowerCase() === trimmed.toLowerCase();
    setAlbum(isSame ? '' : trimmed);
    setIsAlbumDropdownOpen(false);
    setAlbumSearchQuery('');
  };

  const handleCreateAlbum = (rawInput?: string) => {
    const trimmed = (rawInput !== undefined ? rawInput : albumSearchQuery).trim();
    if (!trimmed) return;
    const existing = allAvailableAlbums.find(a => a.toLowerCase() === trimmed.toLowerCase());
    const finalName = existing || trimmed;
    if (!existing && !customAlbums.some(a => a.toLowerCase() === finalName.toLowerCase())) {
      const updated = [...customAlbums, finalName];
      setCustomAlbums(updated);
      try {
        localStorage.setItem('melobook_custom_albums', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    setAlbum(finalName);
    setAlbumSearchQuery('');
    setIsAlbumDropdownOpen(false);
  };

  // Compute all available categories
  const allAvailableCategories = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_CATEGORY_SUGGESTIONS.forEach(c => set.add(c));
    songs.forEach(s => {
      s.tags?.forEach(t => {
        if (t && t.trim()) set.add(t.trim());
      });
    });
    customCategories.forEach(c => set.add(c));
    categories.forEach(c => set.add(c));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [songs, customCategories, categories]);

  const filteredCategoryList = useMemo(() => {
    if (!categorySearchQuery.trim()) return allAvailableCategories;
    return allAvailableCategories.filter(c => includesIgnoreAccents(c, categorySearchQuery));
  }, [allAvailableCategories, categorySearchQuery]);

  const handleToggleCategory = (catName: string) => {
    setCategories(prev => 
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handleCreateCategory = () => {
    const trimmed = categorySearchQuery.trim();
    if (!trimmed) return;
    if (!customCategories.includes(trimmed)) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      try {
        localStorage.setItem('melobook_custom_categories', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    if (!categories.includes(trimmed)) {
      setCategories(prev => [...prev, trimmed]);
    }
    setCategorySearchQuery('');
  };

  // Sync state on song load
  useEffect(() => {
    if (selectedSong) {
      setTitle(selectedSong.title);
      setArtist(selectedSong.artist || '');
      setSelectedArtists(parseArtistsString(selectedSong.artist));
      setKey(selectedSong.key || 'C');
      const songBpm = selectedSong.bpm || selectedSong.tempo || 100;
      setTempo(songBpm);
      setBpm(songBpm);
      setTimeSignature(selectedSong.timeSignature || '4/4');
      const songDurationMode: 'auto' | 'custom' = (selectedSong.durationMode === 'custom' && selectedSong.duration) ? 'custom' : 'auto';
      setDurationMode(songDurationMode);
      setDuration(
        selectedSong.duration && selectedSong.duration !== 'auto'
          ? formatDurationToMMSS(selectedSong.duration)
          : calculateSongAutoDuration(
              selectedSong.contentChordPro || selectedSong.content || '',
              songBpm,
              selectedSong.timeSignature || '4/4'
            ).formatted
      );
      setCapo(selectedSong.capo || 0);
      
      const detected = detectSongLanguageWithConfidence(selectedSong.title, selectedSong.contentChordPro || selectedSong.content);
      const initialLang = (selectedSong.language && selectedSong.language.trim()) ? selectedSong.language : detected.language;
      setLanguage(initialLang);
      setIsLanguageManual(Boolean(selectedSong.language && selectedSong.language.trim()));
      setDetectedLangInfo(detected);

      const parsedMeta = parseChordPro(selectedSong.contentChordPro || selectedSong.content || '');
      setAlbum(selectedSong.album || parsedMeta.album || '');
      setCcli(selectedSong.ccli || parsedMeta.ccli || '');
      setCopyright(selectedSong.copyright || parsedMeta.copyright || '');
      const initialYoutube = selectedSong.youtubeUrl || parsedMeta.youtubeUrl || '';
      setYoutubeUrl(initialYoutube);
      ytDurationUrlRef.current = (songDurationMode === 'auto' && selectedSong.duration && getYouTubeVideoId(initialYoutube))
        ? normalizeYouTubeUrl(initialYoutube)
        : '';
      setAudioUrl(selectedSong.audioUrl || parsedMeta.audioUrl || '');
      setSpotifyUrl(selectedSong.spotifyUrl || parsedMeta.spotifyUrl || '');

      setLinkedSongIds(selectedSong.linkedSongIds || []);
      setCategories(selectedSong.tags || []);
      setNotes(selectedSong.notes || '');
      setContentChordPro(selectedSong.contentChordPro);
      setVisualSections(chordProToVisualSections(selectedSong.contentChordPro));
    } else {
      setTitle('');
      setArtist('');
      setAlbum('');
      setSelectedArtists([]);
      setKey('C');
      setTempo(100);
      setBpm(100);
      setTimeSignature('4/4');
      setDurationMode('auto');
      setDuration(calculateSongAutoDuration(SAMPLE_TEMPLATE, 100, '4/4').formatted);
      ytDurationUrlRef.current = '';
      setCapo(0);
      setCcli('');
      setCopyright('');
      setYoutubeUrl('');
      setAudioUrl('');
      
      const initialDetected = detectSongLanguageWithConfidence('', SAMPLE_TEMPLATE);
      setLanguage(initialDetected.language);
      setDetectedLangInfo(initialDetected);
      setIsLanguageManual(false);

      setLinkedSongIds([]);
      setCategories([]);
      setNotes('');
      setContentChordPro(SAMPLE_TEMPLATE);
      setVisualSections(chordProToVisualSections(SAMPLE_TEMPLATE));
    }
  }, [selectedSong]);

  // Auto-resolve duration from YouTube link when present and in auto mode
  useEffect(() => {
    const cleanYt = normalizeYouTubeUrl(youtubeUrl);
    if (!cleanYt || !getYouTubeVideoId(cleanYt)) {
      ytDurationUrlRef.current = '';
      return;
    }
    if (durationMode !== 'auto') return;
    if (ytDurationUrlRef.current === cleanYt) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const ytDur = await fetchYouTubeDuration(cleanYt);
      if (cancelled) return;
      if (ytDur?.formatted) {
        ytDurationUrlRef.current = cleanYt;
        setDuration(ytDur.formatted);
      } else {
        ytDurationUrlRef.current = '';
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [youtubeUrl, durationMode]);

  // Auto-estimate duration from tempo & structure when no YouTube duration overrides it
  useEffect(() => {
    if (durationMode !== 'auto') return;
    const cleanYt = normalizeYouTubeUrl(youtubeUrl);
    if (cleanYt && getYouTubeVideoId(cleanYt) && ytDurationUrlRef.current === cleanYt) return;

    const previewChordPro = visualSectionsToChordPro(visualSections);
    const estimated = calculateSongAutoDuration(previewChordPro, Number(bpm || tempo) || 100, timeSignature).formatted;
    setDuration(prev => (prev === estimated ? prev : estimated));
  }, [durationMode, youtubeUrl, visualSections, bpm, tempo, timeSignature]);

  // Extract all chords present in the current visual sections
  const songChords = useMemo(() => {
    const fromVisual = extractAllChordsFromSections(visualSections);
    if (fromVisual.length > 0) return fromVisual;
    const fromCode = parseChordPro(contentChordPro);
    const set = new Set<string>();
    fromCode.sections.forEach(sec => {
      sec.lines.forEach(l => {
        l.items.forEach(it => {
          if (it.chord && it.chord.trim()) set.add(it.chord.trim());
        });
      });
    });
    return Array.from(set);
  }, [visualSections, contentChordPro]);

  // Handle title input with automatic language guessing if not manually set
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!isLanguageManual) {
      const currentChordPro = visualSectionsToChordPro(visualSections, { title: newTitle });
      const detected = detectSongLanguageWithConfidence(newTitle, currentChordPro);
      setLanguage(detected.language);
      setDetectedLangInfo(detected);
    }
  };

  // Explicit user trigger to auto-detect language from title & lyrics
  const handleAutoDetectLanguage = () => {
    const currentChordPro = visualSectionsToChordPro(visualSections, { title });
    const detected = detectSongLanguageWithConfidence(title, currentChordPro);
    setLanguage(detected.language);
    setDetectedLangInfo(detected);
    setIsLanguageManual(false);
  };

  // Update a section in Visual Mode and sync ChordPro text
  const handleUpdateSection = (updatedSection: VisualSection) => {
    const now = Date.now();
    if (now - lastTypingTimeRef.current > 1000) {
      pushHistory(visualSections);
    }
    lastTypingTimeRef.current = now;

    const updatedSections = visualSections.map(sec => 
      sec.id === updatedSection.id ? updatedSection : sec
    );
    const renumbered = recomputeSectionTitles(updatedSections);
    setVisualSections(renumbered);
    const newChordPro = visualSectionsToChordPro(renumbered, buildChordProMetadata());
    setContentChordPro(newChordPro);

    // If language has not been manually pinned, re-evaluate with updated lyrics
    if (!isLanguageManual) {
      const detected = detectSongLanguageWithConfidence(title, newChordPro);
      setLanguage(detected.language);
      setDetectedLangInfo(detected);
    }
  };

  // Add a new section
  const handleAddNewSection = (
    type: VisualSection['type'] = 'verse',
    customTitle?: string,
    afterIndex?: number,
    blockKind?: VisualSection['blockKind']
  ) => {
    pushHistory(visualSections);

    let newSection: VisualSection;
    if (blockKind === 'chorus_recall') {
      const targetChorus = visualSections.find(s => s.type === 'chorus' && !s.isChorusRecall && s.blockKind !== 'chorus_recall');
      const recallLabel = targetChorus?.title || 'Refrain';
      newSection = {
        id: generateId('sec'),
        type: 'chorus',
        title: recallLabel,
        blockKind: 'chorus_recall',
        isChorusRecall: true,
        recallLabel,
        vocals: [],
        repeat: 1,
        lines: []
      };
    } else if (type === 'grid' || blockKind === 'grid') {
      const c1 = songChords[0] || 'C';
      const c2 = songChords[1] || 'G';
      const c3 = songChords[2] || 'Am';
      const c4 = songChords[3] || 'F';
      newSection = {
        id: generateId('sec'),
        type: 'grid',
        title: customTitle || 'Grille',
        blockKind: 'grid',
        vocals: [],
        repeat: 1,
        lines: [
          {
            id: generateId('line'),
            type: 'grid_row',
            items: [],
            gridRaw: `|: ${c1} . ${c2} . | ${c3} . ${c4} . :|`
          }
        ]
      };
    } else if (type === 'tab' || blockKind === 'tab') {
      newSection = {
        id: generateId('sec'),
        type: 'tab',
        title: customTitle || 'Tablature',
        blockKind: 'tab',
        vocals: [],
        repeat: 1,
        lines: [
          'e|-----------0-----------|',
          'B|---------1---1---------|',
          'G|-------0-------0-------|',
          'D|-----2-----------2-----|',
          'A|---3---------------3---|',
          'E|-----------------------|'
        ].map(tabText => ({
          id: generateId('line'),
          type: 'tab_row',
          items: [],
          tabText
        }))
      };
    } else {
      newSection = {
        id: generateId('sec'),
        type,
        title: customTitle || '',
        blockKind: 'lyrics',
        vocals: [],
        lines: [
          {
            id: generateId('line'),
            type: 'lyrics',
            items: [{ id: generateId('it'), chord: songChords[0] || 'G', lyrics: 'Entrez les paroles ici' }]
          }
        ]
      };
    }

    const updated = [...visualSections];
    if (afterIndex !== undefined && afterIndex >= 0 && afterIndex < updated.length) {
      updated.splice(afterIndex + 1, 0, newSection);
    } else {
      updated.push(newSection);
    }
    const renumbered = recomputeSectionTitles(updated);
    setVisualSections(renumbered);
    setContentChordPro(visualSectionsToChordPro(renumbered, buildChordProMetadata()));
  };

  // Create custom section from modal
  const handleCreateCustomSection = () => {
    const trimmed = customSectionInput.trim();
    if (!trimmed) return;
    const updated = saveCustomSectionType(trimmed);
    setCustomSectionList(updated);
    handleAddNewSection(trimmed, trimmed);
    setCustomSectionInput('');
    setShowCustomSectionModal(false);
  };

  // Duplicate a section
  const handleDuplicateSection = (sectionId: string) => {
    const sourceIndex = visualSections.findIndex(s => s.id === sectionId);
    if (sourceIndex === -1) return;
    pushHistory(visualSections);
    const source = visualSections[sourceIndex];

    const duplicatedLines: VisualLine[] = source.lines.map(l => ({
      ...l,
      id: generateId('line'),
      items: l.items.map(it => ({
        ...it,
        id: generateId('it')
      }))
    }));

    const duplicatedSection: VisualSection = {
      ...source,
      id: generateId('sec'),
      vocals: [...source.vocals],
      repeat: source.repeat || 1,
      lines: duplicatedLines
    };

    const updated = [...visualSections];
    updated.splice(sourceIndex + 1, 0, duplicatedSection);
    const renumbered = recomputeSectionTitles(updated);
    setVisualSections(renumbered);
    setContentChordPro(visualSectionsToChordPro(renumbered, buildChordProMetadata()));
  };

  // Split section at cursor: keep head in current section, create new section with tail
  const handleSplitSection = (sectionId: string, headLines: VisualLine[], tailLines: VisualLine[]) => {
    const sourceIndex = visualSections.findIndex(s => s.id === sectionId);
    if (sourceIndex === -1) return;
    pushHistory(visualSections);
    const source = visualSections[sourceIndex];

    const updatedSource: VisualSection = {
      ...source,
      lines: headLines.length > 0 ? headLines : [{
        id: generateId('line'),
        type: 'lyrics',
        items: [{ id: generateId('it'), chord: '', lyrics: '' }]
      }]
    };

    const newSection: VisualSection = {
      id: generateId('sec'),
      type: source.type,
      title: source.title,
      blockKind: source.blockKind,
      vocals: [...(source.vocals || [])],
      repeat: 1,
      lines: tailLines.length > 0 ? tailLines : [{
        id: generateId('line'),
        type: 'lyrics',
        items: [{ id: generateId('it'), chord: '', lyrics: '' }]
      }]
    };

    const updated = [...visualSections];
    updated[sourceIndex] = updatedSource;
    updated.splice(sourceIndex + 1, 0, newSection);
    const renumbered = recomputeSectionTitles(updated);
    setVisualSections(renumbered);
    setContentChordPro(visualSectionsToChordPro(renumbered, buildChordProMetadata()));
    showNotification('Section scindée avec succès', 'success');
  };

  // Delete a section
  const handleDeleteSection = (sectionId: string) => {
    pushHistory(visualSections);
    const updated = visualSections.filter(s => s.id !== sectionId);
    const renumbered = recomputeSectionTitles(updated);
    setVisualSections(renumbered);
    setContentChordPro(visualSectionsToChordPro(renumbered, buildChordProMetadata()));
  };

  // Move section by index
  const handleMoveSection = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= visualSections.length) return;
    pushHistory(visualSections);
    const updated = [...visualSections];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    const renumbered = recomputeSectionTitles(updated);
    setVisualSections(renumbered);
    setContentChordPro(visualSectionsToChordPro(renumbered, buildChordProMetadata()));
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedSectionIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedSectionIndex === null || draggedSectionIndex === targetIndex) {
      setDraggedSectionIndex(null);
      return;
    }
    handleMoveSection(draggedSectionIndex, targetIndex);
    setDraggedSectionIndex(null);
  };

  // Open chord picker
  const handleOpenChordPicker = (context: {
    sectionId: string;
    lineId: string;
    itemId?: string;
    charOffset?: number;
    currentChord: string;
    lyricsSnippet?: string;
    sectionTitle?: string;
  }) => {
    setChordPickerState({
      isOpen: true,
      ...context
    });
  };

  // Save selected chord from picker modal
  const handleSaveChordFromPicker = (newChord: string) => {
    const { sectionId, lineId, itemId, charOffset } = chordPickerState;
    if (!sectionId || !lineId) return;
    pushHistory(visualSections);

    const updatedSections = visualSections.map(sec => {
      if (sec.id !== sectionId) return sec;

      const updatedLines = sec.lines.map(line => {
        if (line.id !== lineId) return line;

        if (itemId) {
          // Update existing item chord
          const updatedItems = line.items.map(it => {
            if (it.id === itemId) {
              return { ...it, chord: newChord };
            }
            return it;
          });
          return { ...line, items: updatedItems };
        } else if (charOffset !== undefined) {
          // Insert at character offset
          return insertChordInLine(line, charOffset, newChord);
        }
        return line;
      });

      return { ...sec, lines: updatedLines };
    });

    setVisualSections(updatedSections);
    setContentChordPro(visualSectionsToChordPro(updatedSections, buildChordProMetadata()));
  };

  // Delete chord from picker modal
  const handleDeleteChordFromPicker = () => {
    const { sectionId, lineId, itemId } = chordPickerState;
    if (!sectionId || !lineId || !itemId) return;
    pushHistory(visualSections);

    const updatedSections = visualSections.map(sec => {
      if (sec.id !== sectionId) return sec;

      const updatedLines = sec.lines.map(line => {
        if (line.id !== lineId) return line;

        const updatedItems = line.items.map(it => {
          if (it.id === itemId) {
            return { ...it, chord: '' };
          }
          return it;
        });

        return { ...line, items: cleanUpLineItems(updatedItems) };
      });

      return { ...sec, lines: updatedLines };
    });

    setVisualSections(updatedSections);
    setContentChordPro(visualSectionsToChordPro(updatedSections, buildChordProMetadata()));
  };

  // Save Song to Firebase or Local Repertoire
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      showNotification({
        title: 'Titre requis',
        type: 'warning'
      });
      return;
    }

    setIsSaving(true);
    const resolvedBpm = Number(bpm || tempo) || 100;
    const cleanYoutubeUrl = youtubeUrl.trim() ? normalizeYouTubeUrl(youtubeUrl) : '';

    const resolvedKey = key.trim().endsWith('m')
      ? key.trim().slice(0, -1).toUpperCase() + 'm'
      : key.trim().toUpperCase();

    const baseChordPro = visualSectionsToChordPro(visualSections, buildChordProMetadata({
      key: resolvedKey,
      tempo: resolvedBpm,
      bpm: resolvedBpm,
      youtubeUrl: cleanYoutubeUrl
    }));

    let resolvedDuration = formatDurationToMMSS(duration.trim() || '03:30');
    if (durationMode === 'auto') {
      if (cleanYoutubeUrl && getYouTubeVideoId(cleanYoutubeUrl)) {
        if (ytDurationUrlRef.current === cleanYoutubeUrl && duration.trim()) {
          resolvedDuration = formatDurationToMMSS(duration);
        } else {
          const ytDur = await fetchYouTubeDuration(cleanYoutubeUrl);
          if (ytDur?.formatted) {
            ytDurationUrlRef.current = cleanYoutubeUrl;
            resolvedDuration = ytDur.formatted;
          } else {
            resolvedDuration = calculateSongAutoDuration(baseChordPro, resolvedBpm, timeSignature).formatted;
          }
        }
      } else {
        resolvedDuration = calculateSongAutoDuration(baseChordPro, resolvedBpm, timeSignature).formatted;
      }
      setDuration(resolvedDuration);
    }

    // Ensure ChordPro content is up to date from visual sections
    const finalChordPro = visualSectionsToChordPro(visualSections, buildChordProMetadata({
      key: resolvedKey,
      tempo: resolvedBpm,
      bpm: resolvedBpm,
      duration: resolvedDuration,
      youtubeUrl: cleanYoutubeUrl
    }));

    const songData: Partial<Song> = {
      title: title.trim(),
      artist: artist.trim(),
      album: album.trim(),
      key: resolvedKey,
      tempo: resolvedBpm,
      bpm: resolvedBpm,
      timeSignature,
      duration: resolvedDuration,
      durationMode,
      capo: Number(capo) || 0,
      ccli: ccli.trim(),
      copyright: copyright.trim(),
      youtubeUrl: cleanYoutubeUrl,
      audioUrl: audioUrl.trim(),
      spotifyUrl: spotifyUrl.trim(),
      language: language || detectSongLanguage(title.trim(), finalChordPro),
      linkedSongIds: linkedSongIds || [],
      tags: categories,
      notes: notes.trim(),
      contentChordPro: finalChordPro
    };

    try {
      if (selectedSong?.id) {
        await updateSong(selectedSong.id, songData);
      } else {
        await createSong(songData);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving song:', err);
      showNotification({ title: 'Erreur', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!canManageSongs) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-900 dark:text-[#E0E0E0]">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <FileEdit className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Gestion réservée</h2>
        <p className="text-xs text-slate-600 dark:text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
          La modification et la création de chants sont réservées aux responsables et administrateurs de la bibliothèque.
          En tant que visiteur, vous pouvez consulter la bibliothèque, transposer les accords, changer la tonalité et consulter les différentes versions d'un chant.
        </p>
        <button
          type="button"
          onClick={() => {
            if (editorReturnTarget === 'setlistLive' && selectedSetlist) {
              setEditorReturnTarget(null);
              setIsLiveSetlistOpen(true);
              setActiveTab('setlists');
            } else {
              setEditorReturnTarget(null);
              setActiveTab('repertoire');
            }
          }}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm"
        >
          Retourner aux chants
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 pb-16 text-slate-900 dark:text-[#E0E0E0]">
      
      {/* Bandeau en haut : Mode Éditeur (Aligné à gauche, clair & bouton quitter intuitif) */}
      <div className="mb-4 flex items-center justify-between gap-3 px-3.5 sm:px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#141418] border border-amber-500/25 shadow-md shadow-black/40 flex-wrap">
        {/* Gauche : Statut Mode Éditeur & Titre du chant */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-inner">
            <FileEdit className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-xs sm:text-sm leading-none">
                Mode Éditeur
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold hidden xs:inline-block">
                {selectedSong ? 'Modification' : 'Nouveau chant'}
              </span>
            </div>
            {title && (
              <span className="text-[11px] text-slate-600 dark:text-gray-400 truncate max-w-[220px] sm:max-w-md mt-0.5 font-medium">
                {title} {artist ? `• ${artist}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Droite : Bouton Quitter intuitif */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => {
              const target = editorReturnTarget;
              setEditorReturnTarget(null);
              if (target === 'setlistLive' && selectedSetlist) {
                setIsLiveSetlistOpen(true);
                setActiveTab('setlists');
              } else if (selectedSong) {
                setActiveTab('stage');
              } else {
                setActiveTab('repertoire');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EDF1F5] dark:bg-[#1E1E24] hover:bg-slate-200 dark:hover:bg-[#282830] text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 hover:border-slate-200 dark:hover:border-white/20 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            title={
              editorReturnTarget === 'setlistLive' && selectedSetlist
                ? "Quitter le mode éditeur et revenir au chant dans la setlist"
                : selectedSong
                  ? "Quitter le mode éditeur et afficher le chant en direct"
                  : "Quitter le mode éditeur et retourner au répertoire"
            }
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white" />
            <span>Quitter l'éditeur</span>
          </button>
        </div>
      </div>

      {/* Navigation entre les 2 parties du mode Éditeur */}
      <div className="mb-5 p-1.5 rounded-2xl bg-slate-50 dark:bg-[#141418] border border-slate-300 dark:border-[#26262E] grid grid-cols-2 gap-2 shadow-lg">
        <button
          type="button"
          id="tab-editor-chords"
          onClick={() => setEditorSubTab('chords')}
          className={`relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer ${
            editorSubTab === 'chords'
              ? 'text-blue-700 dark:text-blue-300'
              : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-slate-200/70 dark:hover:bg-[#1B1B20]'
          }`}
        >
          {editorSubTab === 'chords' && (
            <motion.div
              layoutId="editor-subtab-pill"
              transition={NAV_SPRING}
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-50 dark:from-blue-500/25 via-indigo-50 dark:via-indigo-600/15 to-white dark:to-[#141620] border border-blue-500/50 shadow-md shadow-blue-950/40 ring-1 ring-blue-500/20"
            />
          )}
          <div className={`relative z-10 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            editorSubTab === 'chords' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-[#EDF1F5] dark:bg-[#222228] text-slate-600 dark:text-gray-400'
          }`}>
            <Music2 className="w-3.5 h-3.5" />
          </div>
          <span className="relative z-10 leading-tight">Éditer les accords</span>
        </button>

        <button
          type="button"
          id="tab-editor-data"
          onClick={() => setEditorSubTab('data')}
          className={`relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer ${
            editorSubTab === 'data'
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-slate-200/70 dark:hover:bg-[#1B1B20]'
          }`}
        >
          {editorSubTab === 'data' && (
            <motion.div
              layoutId="editor-subtab-pill"
              transition={NAV_SPRING}
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-50 dark:from-amber-500/25 via-amber-50 dark:via-amber-600/15 to-white dark:to-[#1C1814] border border-amber-500/50 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/20"
            />
          )}
          <div className={`relative z-10 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            editorSubTab === 'data' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-[#EDF1F5] dark:bg-[#222228] text-slate-600 dark:text-gray-400'
          }`}>
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span className="relative z-10 leading-tight">Éditer les données</span>
        </button>
      </div>

      {/* Accessible hidden select preserving exact selector compatibility */}
      <select
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        {['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'Am', 'Em', 'Dm', 'Bm', 'F#m'].map(k => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>

      {/* 1. PARTIE DONNÉES DU CHANT */}
      {editorSubTab === 'data' && (
        <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150">
          
          {/* Groupe 1 : Informations principales */}
          <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#222227] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="pb-2.5 border-b border-slate-200 dark:border-[#1E1E24]">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
                Informations principales
              </h3>
            </div>

            <div className="grid grid-cols-12 gap-3.5 sm:gap-4 items-start">
              {/* Titre */}
              <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Titre du chant <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Entrez le titre du chant"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full h-10 bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] hover:border-slate-400 dark:hover:border-[#4B4B55] focus:border-blue-500 rounded-xl px-3.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all shadow-2xs"
                  required
                />
              </div>

              {/* Artiste ou Auteur (Multi-sélection & création rapide) */}
              <div className="col-span-12 sm:col-span-6 lg:col-span-4 relative" ref={artistDropdownRef}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5 truncate">
                    <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Artiste(s) ou Auteur(s)</span>
                  </label>
                  {selectedArtists.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedArtists([]);
                        setArtist('');
                      }}
                      className="text-xs text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      title="Effacer tous les artistes"
                    >
                      Effacer tout
                    </button>
                  )}
                </div>

                <div
                  id="song-artist-select"
                  onClick={() => setIsArtistDropdownOpen(!isArtistDropdownOpen)}
                  className={`min-h-[40px] w-full bg-[#1A1A1E] border ${
                    isArtistDropdownOpen ? 'border-purple-500 ring-2 ring-purple-500/25' : 'border-slate-300 dark:border-[#33333A] hover:border-slate-400 dark:hover:border-[#4B4B55]'
                  } rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-1.5 cursor-pointer transition-all shadow-2xs`}
                >
                  {selectedArtists.length === 0 ? (
                    <span className="text-slate-600 dark:text-gray-400 text-sm truncate">Choisir ou créer un artiste...</span>
                  ) : (
                    selectedArtists.map((art) => (
                      <span
                        key={art}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-700 dark:text-purple-200 border border-purple-500/35 text-xs font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate max-w-[160px]">{art}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveArtist(art);
                          }}
                          className="hover:text-slate-900 dark:hover:text-white transition-colors p-0.5 rounded cursor-pointer"
                          title={`Retirer ${art}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-gray-400 ml-auto shrink-0 transition-transform duration-200 ${isArtistDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isArtistDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-50 dark:bg-[#141417] border border-slate-300 dark:border-[#2E2E36] rounded-xl shadow-2xl z-50 p-3 text-sm animate-in fade-in duration-100 min-w-[280px]">
                    {/* Champ de recherche & création rapide */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-600 dark:text-gray-400 absolute left-2.5 top-2.5" />
                        <input
                          id="artist-search-input"
                          type="text"
                          placeholder="Rechercher ou créer un artiste..."
                          value={artistSearchQuery}
                          onChange={(e) => setArtistSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateArtist(artistSearchQuery);
                            }
                          }}
                          className="w-full bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-purple-500"
                          autoFocus
                        />
                      </div>
                      {artistSearchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => handleCreateArtist(artistSearchQuery)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
                          title="Ajouter immédiatement cet artiste"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter</span>
                        </button>
                      )}
                    </div>

                    {/* Invitation d'ajout rapide si l'artiste n'existe pas */}
                    {artistSearchQuery.trim() && !allAvailableArtists.some(a => a.toLowerCase() === artistSearchQuery.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => handleCreateArtist(artistSearchQuery)}
                        className="w-full mb-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-800/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:border-purple-600/50 cursor-pointer flex items-center justify-between text-purple-700 dark:text-purple-200 transition-colors text-left"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                          <span className="truncate">Créer <strong className="text-slate-900 dark:text-white font-semibold">« {artistSearchQuery.trim()} »</strong></span>
                        </div>
                        <span className="text-[10px] bg-purple-500/20 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-mono ml-2 shrink-0">Entrée ↵</span>
                      </button>
                    )}

                    {/* Liste des artistes */}
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredArtistsList.length === 0 ? (
                        <div className="py-4 text-center text-gray-500 text-xs">
                          Aucun artiste existant ne correspond.
                        </div>
                      ) : (
                        filteredArtistsList.map((art) => {
                          const isSelected = selectedArtists.some(a => a.toLowerCase() === art.toLowerCase());
                          return (
                            <div
                              key={art}
                              onClick={() => handleToggleArtist(art)}
                              className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-purple-600/15 text-purple-700 dark:text-purple-200 font-medium'
                                  : 'hover:bg-slate-200/70 dark:hover:bg-[#1C1C1E] text-slate-700 dark:text-gray-300'
                              }`}
                            >
                              <span className="truncate">{art}</span>
                              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                isSelected 
                                  ? 'bg-purple-600 border-purple-500 text-white' 
                                  : 'border-slate-300 dark:border-[#444] bg-[#EDF1F5] dark:bg-[#1C1C1E]'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer résumé */}
                    <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-[#222] flex items-center justify-between text-xs text-gray-500">
                      <span>{filteredArtistsList.length} artiste(s) suggéré(s)</span>
                      <span className="text-purple-600 dark:text-purple-400 font-medium">{selectedArtists.length} sélectionné(s)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Album (Sélection & création rapide) */}
              <div className="col-span-12 lg:col-span-4 relative" ref={albumDropdownRef}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5 truncate">
                    <Disc className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Album</span>
                  </label>
                  {album.trim() && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAlbum('');
                      }}
                      className="text-xs text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      title="Effacer l'album"
                    >
                      Effacer
                    </button>
                  )}
                </div>

                <div
                  id="song-album-select"
                  onClick={() => setIsAlbumDropdownOpen(!isAlbumDropdownOpen)}
                  className={`min-h-[40px] w-full bg-[#1A1A1E] border ${
                    isAlbumDropdownOpen ? 'border-amber-500 ring-2 ring-amber-500/25' : 'border-slate-300 dark:border-[#33333A] hover:border-slate-400 dark:hover:border-[#4B4B55]'
                  } rounded-xl px-3 py-1.5 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs`}
                >
                  {!album.trim() ? (
                    <span className="text-slate-600 dark:text-gray-400 text-sm truncate">Choisir ou créer un album...</span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-200 border border-amber-500/35 text-xs font-medium min-w-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="truncate max-w-[200px]">{album}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAlbum('');
                        }}
                        className="hover:text-slate-900 dark:hover:text-white transition-colors p-0.5 rounded cursor-pointer shrink-0"
                        title={`Retirer ${album}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-gray-400 ml-auto shrink-0 transition-transform duration-200 ${isAlbumDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isAlbumDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-50 dark:bg-[#141417] border border-slate-300 dark:border-[#2E2E36] rounded-xl shadow-2xl z-50 p-3 text-sm animate-in fade-in duration-100 min-w-[260px]">
                    {/* Champ de recherche & création rapide */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-600 dark:text-gray-400 absolute left-2.5 top-2.5" />
                        <input
                          id="album-search-input"
                          type="text"
                          placeholder="Rechercher ou créer un album..."
                          value={albumSearchQuery}
                          onChange={(e) => setAlbumSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateAlbum(albumSearchQuery);
                            }
                          }}
                          className="w-full bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-500"
                          autoFocus
                        />
                      </div>
                      {albumSearchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => handleCreateAlbum(albumSearchQuery)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
                          title="Créer et sélectionner cet album"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Créer</span>
                        </button>
                      )}
                    </div>

                    {/* Invitation de création rapide si l'album n'existe pas */}
                    {albumSearchQuery.trim() && !allAvailableAlbums.some(a => a.toLowerCase() === albumSearchQuery.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => handleCreateAlbum(albumSearchQuery)}
                        className="w-full mb-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-600/50 cursor-pointer flex items-center justify-between text-amber-700 dark:text-amber-200 transition-colors text-left"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="truncate">Créer <strong className="text-slate-900 dark:text-white font-semibold">« {albumSearchQuery.trim()} »</strong></span>
                        </div>
                        <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono ml-2 shrink-0">Entrée ↵</span>
                      </button>
                    )}

                    {/* Liste des albums */}
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredAlbumsList.length === 0 ? (
                        <div className="py-4 text-center text-gray-500 text-xs">
                          Aucun album existant ne correspond.
                        </div>
                      ) : (
                        filteredAlbumsList.map((alb) => {
                          const isSelected = album.trim().toLowerCase() === alb.toLowerCase();
                          return (
                            <div
                              key={alb}
                              onClick={() => handleSelectAlbum(alb)}
                              className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-200 font-medium'
                                  : 'hover:bg-slate-200/70 dark:hover:bg-[#1C1C1E] text-slate-700 dark:text-gray-300'
                              }`}
                            >
                              <span className="truncate">{alb}</span>
                              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                                isSelected
                                  ? 'bg-amber-600 border-amber-500 text-white'
                                  : 'border-slate-300 dark:border-[#444] bg-[#EDF1F5] dark:bg-[#1C1C1E]'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer résumé */}
                    <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-[#222] flex items-center justify-between text-xs text-gray-500">
                      <span>{filteredAlbumsList.length} album(s) disponible(s)</span>
                      {album.trim() && <span className="text-amber-600 dark:text-amber-400 font-medium truncate max-w-[140px]">{album.trim()}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Groupe 2 : Paramètres musicaux */}
          <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#222227] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="pb-2.5 border-b border-slate-200 dark:border-[#1E1E24]">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
                Paramètres musicaux
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-start">
              {/* Tonalité */}
              <div className="relative" ref={keyPickerRef}>
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5 text-center">
                  Tonalité
                </label>
                <button
                  type="button"
                  onClick={() => setIsKeyPickerOpen(!isKeyPickerOpen)}
                  className={`w-full h-10 rounded-xl px-2 text-sm font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                    isKeyPickerOpen
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/30 ring-2 ring-blue-400/40'
                      : 'bg-[#EDF1F5] dark:bg-[#1A1A1E] text-blue-600 dark:text-blue-400 border-slate-300 dark:border-[#33333A] hover:border-blue-500/50 hover:bg-slate-200/70 dark:hover:bg-[#222228]'
                  }`}
                  title="Cliquer pour afficher ou modifier la tonalité"
                >
                  <span className="text-sm font-bold">{key || 'C'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isKeyPickerOpen ? 'rotate-180 text-slate-900 dark:text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                </button>

                {/* Popover / Clavier tonalités */}
                {isKeyPickerOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <KeySelectorKeypad
                      currentKey={key || 'C'}
                      onKeyChange={(newKey) => {
                        setKey(newKey);
                        setContentChordPro(visualSectionsToChordPro(visualSections, buildChordProMetadata({ key: newKey })));
                      }}
                      onClose={() => setIsKeyPickerOpen(false)}
                      modeLock="both"
                      title="Tonalité :"
                    />
                  </div>
                )}
              </div>

              {/* BPM */}
              <div>
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5 text-center">
                  BPM
                </label>
                <input
                  type="number"
                  min={30}
                  max={260}
                  value={bpm}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 100;
                    setBpm(val);
                    setTempo(val);
                  }}
                  className="w-full h-10 bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] hover:border-emerald-500/50 focus:border-emerald-500 rounded-xl px-2 text-sm text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-center font-mono font-bold transition-all shadow-2xs"
                  title="Battements par minute (BPM)"
                  placeholder="100"
                />
              </div>

              {/* Mesure */}
              <div>
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5 text-center">
                  Signature rythmique
                </label>
                <select
                  value={timeSignature}
                  onChange={(e) => setTimeSignature(e.target.value)}
                  className="w-full h-10 bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] hover:border-slate-400 dark:hover:border-[#4B4B55] focus:border-blue-500 rounded-xl px-2 text-sm text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30 cursor-pointer text-center transition-all shadow-2xs"
                >
                  {['4/4', '3/4', '6/8', '2/4', '12/8', '5/4'].map(ts => (
                    <option key={ts} value={ts} className="bg-white dark:bg-[#111112] text-slate-800 dark:text-gray-200">{ts}</option>
                  ))}
                </select>
              </div>

              {/* Durée */}
              <div>
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300">
                    Durée
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      setDurationMode('auto');
                      const cleanYt = normalizeYouTubeUrl(youtubeUrl);
                      if (cleanYt && getYouTubeVideoId(cleanYt)) {
                        const ytDur = await fetchYouTubeDuration(cleanYt);
                        if (ytDur?.formatted) {
                          ytDurationUrlRef.current = cleanYt;
                          setDuration(ytDur.formatted);
                          return;
                        }
                      }
                      ytDurationUrlRef.current = '';
                      setDuration(calculateSongAutoDuration(visualSectionsToChordPro(visualSections), Number(bpm || tempo) || 100, timeSignature).formatted);
                    }}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                      durationMode === 'auto'
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-700 dark:text-cyan-300'
                        : 'bg-[#EDF1F5] dark:bg-[#1A1A1E] border-slate-300 dark:border-[#33333A] text-slate-600 dark:text-gray-400 hover:text-cyan-800 dark:hover:text-cyan-300 hover:border-cyan-500/40'
                    }`}
                    title={durationMode === 'auto'
                      ? 'Durée calculée automatiquement (YouTube ou tempo + structure)'
                      : 'Recalculer automatiquement selon YouTube ou tempo + structure'}
                  >
                    Auto
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="03:30"
                  value={duration}
                  onChange={(e) => {
                    setDurationMode('custom');
                    setDuration(e.target.value);
                  }}
                  onBlur={() => {
                    if (duration.trim()) {
                      setDuration(formatDurationToMMSS(duration));
                    } else {
                      setDurationMode('auto');
                    }
                  }}
                  className="w-full h-10 bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] hover:border-slate-400 dark:hover:border-[#4B4B55] focus:border-cyan-400 rounded-xl px-2 text-sm text-cyan-700 dark:text-cyan-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400/30 text-center transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Groupe 3 : Classification & Langue */}
          <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#222227] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="pb-2.5 border-b border-slate-200 dark:border-[#1E1E24]">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
                Classification & Langue
              </h3>
            </div>

            <div className="grid grid-cols-12 gap-3.5 sm:gap-4 items-start">
              {/* Langue & Relations */}
              <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Langue du chant</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {selectedSong && (
                      <button
                        type="button"
                        onClick={() => setIsLanguageModalOpen(true)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        <Link className="w-3 h-3" />
                        <span>Relations</span>
                      </button>
                    )}
                  </div>
                </div>

                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    setIsLanguageManual(true);
                  }}
                  className="w-full h-10 bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] hover:border-slate-400 dark:hover:border-[#4B4B55] focus:border-blue-500 rounded-xl px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 cursor-pointer font-medium transition-all shadow-2xs"
                >
                  {PRESET_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.name} className="bg-white dark:bg-[#111112]">
                      {lang.name}
                    </option>
                  ))}
                </select>

                {!isLanguageManual && detectedLangInfo && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400/90 mt-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Devinée d'après {detectedLangInfo.detectedFrom === 'title' ? 'le titre' : detectedLangInfo.detectedFrom === 'content' ? 'les paroles' : 'le titre et les paroles'}</span>
                  </p>
                )}

                {/* Versions liées */}
                {selectedSong && (() => {
                  const linked = getLinkedSongVersions(selectedSong, songs);
                  if (linked.length === 0) return null;
                  return (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-gray-500">Versions liées :</span>
                      {linked.map(ls => {
                        const lMeta = getLanguageMeta(ls.language);
                        return (
                          <button
                            key={ls.id}
                            type="button"
                            onClick={() => setSelectedSong(ls)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-[#EDF1F5] dark:bg-[#1A1A1E] hover:bg-slate-200/70 dark:hover:bg-[#252528] text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-[#2E2E34] hover:border-blue-500/40 transition-colors cursor-pointer"
                            title={`Basculer sur ${ls.title} - ${lMeta.name}`}
                          >
                            <span className={`font-bold ${lMeta.badgeClass.split(' ')[0]}`}>{lMeta.code}</span>
                            <span className="truncate max-w-[120px]">{ls.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Multi-Catégories */}
              <div className="col-span-12 sm:col-span-6 lg:col-span-4 relative" ref={categoryDropdownRef}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Catégories & Thèmes</span>
                  </label>
                  {categories.length > 0 && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      {categories.length} sélectionnée{categories.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div 
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className={`w-full min-h-[40px] bg-[#1A1A1E] border ${
                    isCategoryDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/25' : 'border-slate-300 dark:border-[#33333A] hover:border-slate-400 dark:hover:border-[#4B4B55]'
                  } rounded-xl px-3 py-1.5 text-sm text-gray-200 cursor-pointer flex flex-wrap items-center gap-1.5 transition-all shadow-2xs`}
                >
                  {categories.length === 0 ? (
                    <span className="text-slate-600 dark:text-gray-400 text-sm">Ajouter des catégories...</span>
                  ) : (
                    categories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-xs font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCategory(cat);
                          }}
                          className="hover:text-slate-900 dark:hover:text-white transition-colors p-0.5 rounded cursor-pointer"
                          title="Retirer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-gray-400 ml-auto shrink-0 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isCategoryDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-50 dark:bg-[#141417] border border-slate-300 dark:border-[#2E2E36] rounded-xl shadow-2xl z-50 p-3 text-sm animate-in fade-in duration-100">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Rechercher ou créer une catégorie..."
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateCategory();
                          }
                        }}
                        className="flex-1 bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                      {categorySearchQuery.trim() && (
                        <button
                          type="button"
                          onClick={handleCreateCategory}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Créer</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredCategoryList.map((cat) => {
                        const isSelected = categories.includes(cat);
                        return (
                          <div
                            key={cat}
                            onClick={() => handleToggleCategory(cat)}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-600/15 text-blue-700 dark:text-blue-300 font-medium'
                                : 'hover:bg-slate-200/70 dark:hover:bg-[#1A1A1E] text-slate-700 dark:text-gray-300'
                            }`}
                          >
                            <span className="truncate">{cat}</span>
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                              isSelected 
                                ? 'bg-blue-600 border-blue-500 text-white' 
                                : 'border-slate-300 dark:border-[#444] bg-[#EDF1F5] dark:bg-[#1A1A1E]'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Note de scène */}
              <div className="col-span-12 lg:col-span-4">
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Note de scène</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: Solo de guitare après le pont, fin douce..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-10 bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] hover:border-slate-400 dark:hover:border-[#4B4B55] focus:border-blue-500 rounded-xl px-3.5 text-sm text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Groupe 4 : Droits & Références légales */}
          <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#222227] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="pb-2.5 border-b border-slate-200 dark:border-[#1E1E24]">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
                Droits & Références
              </h3>
            </div>

            <div className="grid grid-cols-12 gap-3.5 sm:gap-4 items-start">
              {/* CCLI */}
              <div className="col-span-12 sm:col-span-5 lg:col-span-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>N° CCLI (SongSelect)</span>
                  </label>
                  {ccli.trim() && (
                    <a
                      href={`https://songselect.ccli.com/Songs/${ccli.trim().replace(/\D/g, '') || ccli.trim()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium hover:underline flex items-center gap-0.5"
                      title="Consulter sur CCLI SongSelect"
                    >
                      <span>SongSelect ↗</span>
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="ex: 7117726"
                  value={ccli}
                  onChange={(e) => setCcli(e.target.value)}
                  className="w-full h-10 bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] hover:border-slate-400 dark:hover:border-[#4B4B55] focus:border-blue-500 rounded-xl px-3.5 text-sm text-blue-700 dark:text-blue-300 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all shadow-2xs"
                />
              </div>

              {/* Copyright */}
              <div className="col-span-12 sm:col-span-7 lg:col-span-8">
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Copyright className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Mentions Copyright & Droits d'auteur</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: © 2018 Bethel Music Publishing / Fellow Ships Music"
                  value={copyright}
                  onChange={(e) => setCopyright(e.target.value)}
                  className="w-full h-10 bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] hover:border-slate-400 dark:hover:border-[#4B4B55] focus:border-blue-500 rounded-xl px-3.5 text-sm text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Groupe 5 : Médias & Enregistrements externes */}
          <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#222227] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="pb-2.5 border-b border-slate-200 dark:border-[#1E1E24]">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
                Médias & Enregistrements externes
              </h3>
            </div>

            <div className="grid grid-cols-12 gap-3.5 sm:gap-4 items-start">
              {/* Lien YouTube */}
              <div className="col-span-12 sm:col-span-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-red-500 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <span>Lien YouTube</span>
                  </label>
                  {youtubeUrl.trim() && (
                    <a
                      href={youtubeUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium hover:underline flex items-center gap-0.5"
                      title="Tester le lien YouTube"
                    >
                      <span>Tester ↗</span>
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full h-10 bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] hover:border-slate-400 dark:hover:border-[#4B4B55] rounded-xl px-3.5 text-sm text-red-700 dark:text-red-300 placeholder-slate-400 dark:placeholder-gray-500 font-mono focus:outline-none focus:border-red-500 transition-all shadow-2xs"
                />
              </div>

              {/* Lien Spotify */}
              <div className="col-span-12 sm:col-span-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <span>Lien Spotify</span>
                  </label>
                  {spotifyUrl.trim() && (
                    <a
                      href={spotifyUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium hover:underline flex items-center gap-0.5"
                      title="Tester le lien Spotify"
                    >
                      <span>Tester ↗</span>
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="https://open.spotify.com/track/..."
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  className="w-full h-10 bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] hover:border-slate-400 dark:hover:border-[#4B4B55] rounded-xl px-3.5 text-sm text-emerald-700 dark:text-emerald-300 placeholder-slate-400 dark:placeholder-gray-500 font-mono focus:outline-none focus:border-emerald-500 transition-all shadow-2xs"
                />
              </div>

              {/* Lien Audio externe */}
              <div className="col-span-12 sm:col-span-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Fichier Audio (MP3 / flux)</span>
                  </label>
                  {audioUrl.trim() && (
                    <a
                      href={audioUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium hover:underline flex items-center gap-0.5"
                      title="Tester le lien audio"
                    >
                      <span>Tester ↗</span>
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="https://domaine.com/audio.mp3"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="w-full h-10 bg-[#EDF1F5] dark:bg-[#1A1A1E] border border-slate-300 dark:border-[#33333A] hover:border-slate-400 dark:hover:border-[#4B4B55] rounded-xl px-3.5 text-sm text-blue-700 dark:text-blue-300 placeholder-slate-400 dark:placeholder-gray-500 font-mono focus:outline-none focus:border-blue-500 transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 2. PARTIE ACCORDS ET PAROLES (MODE ÉDITEUR SEUL) */}
      {editorSubTab === 'chords' && (
        <div className="w-full space-y-4 animate-in fade-in duration-150">
          {/* VISUAL SECTIONS INTERACTIVE BUILDER */}
          <div className="space-y-4">
            {/* Si aucune section, afficher un bouton pour ajouter la première section */}
            {visualSections.length === 0 ? (
              <div className="py-12 px-4 rounded-2xl bg-white dark:bg-[#111113] border border-dashed border-slate-200 dark:border-white/10 text-center">
                <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Aucune section</h3>
                <p className="text-xs text-slate-600 dark:text-gray-400 max-w-sm mx-auto mb-4">
                  Ce chant ne contient encore aucune section de paroles ou d'accords.
                </p>
                <div className="relative inline-block" ref={addSectionDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsAddSectionDropdownOpen(!isAddSectionDropdownOpen)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Ajouter une première section</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAddSectionDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isAddSectionDropdownOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-64 bg-slate-50 dark:bg-[#18181C] border border-slate-300 dark:border-[#2E2E36] rounded-xl shadow-2xl p-1.5 backdrop-blur-md max-h-80 overflow-y-auto custom-scrollbar text-left">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider border-b border-slate-300 dark:border-[#282830] mb-1">
                        Choisir le type de section
                      </div>
                      <div className="space-y-0.5">
                        {STANDARD_SECTION_TYPES.map(({ key, label }) => {
                          const conf = SECTION_TYPES_CONFIG[key] || {
                            badgeBg: 'bg-gray-600/20',
                            badgeBorder: 'border-gray-500/30',
                            badgeText: 'text-slate-700 dark:text-gray-300'
                          };
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                handleAddNewSection(key as any);
                                setIsAddSectionDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-200/70 dark:hover:bg-[#232329] text-slate-800 dark:text-gray-200 transition-colors text-left group cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${conf.badgeBg.replace('/20', '')}`} />
                                <span className="font-medium group-hover:text-slate-900 dark:group-hover:text-white">{label}</span>
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${conf.badgeBg} ${conf.badgeBorder} ${conf.badgeText}`}>
                                + Ajouter
                              </span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            handleAddNewSection('chorus', 'Refrain', undefined, 'chorus_recall');
                            setIsAddSectionDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-200/70 dark:hover:bg-[#232329] text-amber-700 dark:text-amber-200 transition-colors text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="font-medium group-hover:text-slate-900 dark:group-hover:text-white">Rappel Refrain {'{chorus}'}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-600/20 border-amber-500/30 text-amber-700 dark:text-amber-300">
                            + Rappel
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Sections Cards List */}
            {visualSections.length > 0 && (
              <div className="space-y-3">
                {visualSections.map((sec, sIdx) => (
                  <React.Fragment key={sec.id}>
                    <VisualSectionCard
                      section={sec}
                      index={sIdx}
                      totalSections={visualSections.length}
                      allSections={visualSections}
                      onUpdateSection={handleUpdateSection}
                      onDuplicateSection={handleDuplicateSection}
                      onDeleteSection={handleDeleteSection}
                      onMoveSection={handleMoveSection}
                      onOpenChordPicker={handleOpenChordPicker}
                      availableSongChords={songChords}
                      isDragging={draggedSectionIndex === sIdx}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      isCollapsed={collapsedSectionIds.has(sec.id)}
                      onToggleCollapse={handleToggleSectionCollapse}
                      onAddSection={handleAddNewSection}
                      onOpenCustomSectionModal={() => setShowCustomSectionModal(true)}
                      onSplitSection={handleSplitSection}
                    />

                    {/* Bouton "+" en bas de chaque section pour insérer une section après */}
                    <div className="relative py-1 flex items-center justify-center group/add-section">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-dashed border-slate-200 dark:border-white/5 group-hover/add-section:border-blue-500/30 transition-colors" />
                      </div>
                      
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            if (activeInsertSectionIndex === sIdx) {
                              setActiveInsertSectionIndex(null);
                            } else {
                              setActiveInsertSectionIndex(sIdx);
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer ${
                            activeInsertSectionIndex === sIdx
                              ? 'bg-blue-600 text-white ring-2 ring-blue-500/40 shadow-blue-900/50'
                              : 'bg-slate-50 dark:bg-[#18181C] hover:bg-blue-600/20 text-slate-600 dark:text-gray-400 hover:text-blue-800 dark:hover:text-blue-300 border border-slate-200 dark:border-white/10 hover:border-blue-500/40'
                          }`}
                          title="Ajouter une section à cet endroit"
                          aria-label="Ajouter une section à cet endroit"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span className="text-[11px]">Section</span>
                        </button>

                        {/* Dropdown de choix du type de section pour ce point d'insertion */}
                        {activeInsertSectionIndex === sIdx && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-64 bg-slate-50 dark:bg-[#18181C] border border-slate-300 dark:border-[#2E2E36] rounded-xl shadow-2xl p-1.5 backdrop-blur-md max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95">
                            <div className="px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider border-b border-slate-300 dark:border-[#282830] mb-1 flex items-center justify-between">
                              <span>Insérer après cette section</span>
                              <button
                                type="button"
                                onClick={() => setActiveInsertSectionIndex(null)}
                                className="text-gray-500 hover:text-slate-900 dark:hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            
                            <div className="space-y-0.5">
                              {STANDARD_SECTION_TYPES.map(({ key, label }) => {
                                const conf = SECTION_TYPES_CONFIG[key] || {
                                  badgeBg: 'bg-gray-600/20',
                                  badgeBorder: 'border-gray-500/30',
                                  badgeText: 'text-slate-700 dark:text-gray-300'
                                };
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                      handleAddNewSection(key as any, undefined, sIdx);
                                      setActiveInsertSectionIndex(null);
                                    }}
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-200/70 dark:hover:bg-[#232329] text-slate-800 dark:text-gray-200 transition-colors text-left group cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${conf.badgeBg.replace('/20', '')}`} />
                                      <span className="font-medium group-hover:text-slate-900 dark:group-hover:text-white">{label}</span>
                                    </div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${conf.badgeBg} ${conf.badgeBorder} ${conf.badgeText}`}>
                                      + Ajouter
                                    </span>
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => {
                                  handleAddNewSection('chorus', 'Refrain', sIdx, 'chorus_recall');
                                  setActiveInsertSectionIndex(null);
                                }}
                                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-200/70 dark:hover:bg-[#232329] text-amber-700 dark:text-amber-200 transition-colors text-left group cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  <span className="font-medium group-hover:text-slate-900 dark:group-hover:text-white">Rappel Refrain {'{chorus}'}</span>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-600/20 border-amber-500/30 text-amber-700 dark:text-amber-300">
                                  + Rappel
                                </span>
                              </button>
                            </div>

                            {customSectionList.length > 0 && (
                              <div className="pt-2 mt-1 border-t border-slate-200 dark:border-[#25252D]">
                                <div className="px-2 py-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-1">
                                  Sections personnalisées
                                </div>
                                <div className="space-y-0.5">
                                  {customSectionList.map((customName) => (
                                    <button
                                      key={customName}
                                      type="button"
                                      onClick={() => {
                                        handleAddNewSection(customName, customName, sIdx);
                                        setActiveInsertSectionIndex(null);
                                      }}
                                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-200/70 dark:hover:bg-[#232329] text-teal-700 dark:text-teal-200 transition-colors text-left cursor-pointer"
                                    >
                                      <span className="font-medium">{customName}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-600/20 border border-teal-500/30 text-teal-700 dark:text-teal-300">
                                        + Ajouter
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="pt-1.5 mt-1 border-t border-slate-200 dark:border-[#25252D]">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveInsertSectionIndex(null);
                                  setShowCustomSectionModal(true);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-600/15 border border-dashed border-amber-500/30 transition-colors text-left cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>Créer une section personnalisée...</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Chord Picker Modal */}
      <ChordPickerModal
        isOpen={chordPickerState.isOpen}
        onClose={() => setChordPickerState(prev => ({ ...prev, isOpen: false }))}
        currentChord={chordPickerState.currentChord}
        onSaveChord={handleSaveChordFromPicker}
        onDeleteChord={handleDeleteChordFromPicker}
        availableSongChords={songChords}
        anchorContext={{
          lyricsSnippet: chordPickerState.lyricsSnippet,
          sectionTitle: chordPickerState.sectionTitle
        }}
      />

      {/* Language Version & Relations Modal */}
      {selectedSong && (
        <LanguageVersionModal
          song={selectedSong}
          isOpen={isLanguageModalOpen}
          onClose={() => setIsLanguageModalOpen(false)}
        />
      )}

      {/* Modal for creating custom section */}
      {showCustomSectionModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-50 dark:bg-[#18181C] border border-slate-300 dark:border-[#2B2B30] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#25252A]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Section personnalisée</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCustomSectionModal(false);
                  setCustomSectionInput('');
                }}
                className="p-1 rounded-lg text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#25252A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                Nom du type de section
              </label>
              <input
                type="text"
                value={customSectionInput}
                onChange={(e) => setCustomSectionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateCustomSection();
                  } else if (e.key === 'Escape') {
                    setShowCustomSectionModal(false);
                    setCustomSectionInput('');
                  }
                }}
                placeholder="Ex : Vamp, Descente, Transition, Coda..."
                className="w-full bg-white dark:bg-[#101012] border border-slate-300 dark:border-[#333338] focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
                autoFocus
              />

              {/* Suggestions */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-slate-600 dark:text-gray-400 font-medium">Suggestions :</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Vamp', 'Transition', 'Descente', 'Coda', 'Refrain 2', 'Montée', 'Chœur final'].map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setCustomSectionInput(sugg)}
                      className="px-2 py-0.5 rounded-md bg-[#EDF1F5] dark:bg-[#222226] hover:bg-slate-200 dark:hover:bg-[#2A2A30] text-slate-700 dark:text-gray-300 hover:text-teal-800 dark:hover:text-teal-300 text-xs border border-slate-300 dark:border-[#303036] transition-colors"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#25252A]">
              <button
                type="button"
                onClick={() => {
                  setShowCustomSectionModal(false);
                  setCustomSectionInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#25252A] transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateCustomSection}
                disabled={!customSectionInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter la section</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Boutons d'actions flottants (Annuler & Mettre à jour / Enregistrer - bas à droite, icônes uniquement) */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 flex items-center gap-2.5">
        {/* Bouton Annuler (icône uniquement) */}
        <button
          type="button"
          id="btn-editor-floating-undo"
          onClick={handleUndo}
          disabled={!canUndo}
          className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 shadow-2xl border-2 backdrop-blur-md ${
            canUndo
              ? 'bg-slate-50/90 dark:bg-[#18181C]/90 hover:bg-slate-200 dark:hover:bg-[#25252C] text-slate-800 dark:text-gray-200 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-white/20 hover:border-white/40 cursor-pointer hover:scale-105 ring-4 ring-white/5'
              : 'bg-slate-50/60 dark:bg-[#141417]/60 text-slate-500 dark:text-gray-600 border-slate-200 dark:border-white/5 cursor-not-allowed opacity-40'
          }`}
          title="Annuler la dernière action (Ctrl+Z)"
          aria-label="Annuler la dernière action (Ctrl+Z)"
        >
          <Undo2 className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
        </button>

        {/* Bouton d'action flottant (Mettre à jour / Enregistrer) */}
        <button
          type="button"
          id="btn-editor-floating-save"
          onClick={handleSave}
          disabled={isSaving}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shadow-2xl ${
            saveSuccess
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-300 ring-4 ring-emerald-500/25 scale-105 shadow-emerald-950/60'
              : isSaving
              ? 'bg-blue-600/80 text-slate-900 dark:text-white border-2 border-blue-300/40 ring-4 ring-blue-500/20 cursor-wait shadow-blue-950/50'
              : 'bg-blue-600 hover:bg-blue-500 text-white border-2 border-blue-400/50 hover:scale-110 shadow-blue-950/60 ring-4 ring-blue-500/20'
          } disabled:opacity-75`}
          title={saveSuccess ? "Enregistré avec succès !" : selectedSong ? "Mettre à jour" : "Enregistrer le chant"}
          aria-label={selectedSong ? "Mettre à jour le chant" : "Enregistrer le chant"}
        >
          {saveSuccess ? (
            <Check className="w-6 h-6 stroke-[3]" />
          ) : isSaving ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Save className="w-6 h-6" />
          )}
        </button>
      </div>

    </div>
  );
};
