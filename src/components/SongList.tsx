import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Song, Setlist } from '../types';
import { parseDurationToSeconds, formatSetlistDuration, getSongDuration, stripParentheses } from '../utils/chordUtils';
import { generateSetlistPdf, DEFAULT_PDF_OPTIONS } from '../utils/pdfExport';
import { SongImportModal } from './SongImportModal';
import { LanguageVersionModal } from './LanguageVersionModal';
import { VoiceSearchControl } from './VoiceSearchControl';
import { PRESET_LANGUAGES, getLanguageMeta, detectSongLanguage } from '../utils/languageUtils';
import { 
  DEFAULT_CATEGORY_SUGGESTIONS, 
  getCustomCategories, 
  saveCustomCategories, 
  getHiddenCategories, 
  saveHiddenCategories 
} from '../utils/categoryUtils';
import { parseArtistsString } from '../utils/artistUtils';
import { 
  Search, 
  Plus, 
  PlayCircle, 
  FileEdit, 
  Trash2, 
  ListPlus, 
  Music, 
  Tag, 
  User, 
  Check, 
  X,
  Gauge,
  ChevronDown,
  Globe,
  Upload,
  FileCode,
  FileUp,
  Calendar,
  ArrowUpDown,
  CheckSquare,
  Square,
  Clock,
  Sparkles,
  RotateCcw,
  Pen,
  LayoutGrid,
  List,
  FileDown,
  FileText,
  Share2,
  Download,
  Loader2
} from 'lucide-react';

export const SongList: React.FC = () => {
  const { 
    songs, 
    setlists, 
    setSelectedSong, 
    setActiveTab, 
    currentUser, 
    deleteSong, 
    updateSong,
    updateSetlist,
    createSetlist,
    createSong,
    importSong,
    songCardMetadata,
    autoDetectSongLanguages
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'tempo' | 'duration' | 'recent'>('title');

  // Key filter state (multi-select dropdown with checkboxes)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isKeyFilterOpen, setIsKeyFilterOpen] = useState(false);
  const [keyFilterSearch, setKeyFilterSearch] = useState('');

  // Language filter state (multi-select dropdown with checkboxes)
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isLanguageFilterOpen, setIsLanguageFilterOpen] = useState(false);
  const [languageFilterSearch, setLanguageFilterSearch] = useState('');

  // Mode affichage: grille ou alphabetique avec alphabetique par defaut
  const [viewMode, setViewMode] = useState<'grid' | 'alphabetical'>(() => {
    const saved = localStorage.getItem('songbook_view_mode');
    if (saved === 'grid' || saved === 'alphabetical') {
      return saved;
    }
    return 'alphabetical';
  });

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveViewMode: 'grid' | 'alphabetical' = isMobile ? 'alphabetical' : viewMode;

  const handleSetViewMode = (mode: 'grid' | 'alphabetical') => {
    if (isMobile && mode === 'grid') return;
    setViewMode(mode);
    localStorage.setItem('songbook_view_mode', mode);
  };

  // Active letter indicator for scroll tracking in alphabetical view
  const [activeLetter, setActiveLetter] = useState<string>('A');

  // Alphabet letters
  const ALL_LETTERS = useMemo(() => [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'
  ], []);

  // Category filter state & custom categories synced via localStorage
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [categoryFilterSearch, setCategoryFilterSearch] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>(() => getCustomCategories());
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => getHiddenCategories());

  // Author filter state (multi-select dropdown with checkboxes)
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [isAuthorFilterOpen, setIsAuthorFilterOpen] = useState(false);
  const [authorFilterSearch, setAuthorFilterSearch] = useState('');
  
  // Language modal state
  const [languageModalSong, setLanguageModalSong] = useState<Song | null>(null);

  // Quick category management bubble state (per song)
  const [openCategorySongId, setOpenCategorySongId] = useState<string | null>(null);
  const [quickCatInput, setQuickCatInput] = useState('');
  const [quickCatSearch, setQuickCatSearch] = useState('');
  const [deletingCatName, setDeletingCatName] = useState<string | null>(null);

  // Multi-select mode state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);

  // Multi-select modal states for Category assignment
  const [isAssignCategoryModalOpen, setIsAssignCategoryModalOpen] = useState(false);
  const [selectedBatchCategories, setSelectedBatchCategories] = useState<string[]>([]);
  const [initialBatchCategories, setInitialBatchCategories] = useState<string[]>([]);
  const [multiCategoryInput, setMultiCategoryInput] = useState('');
  const [multiCategorySearch, setMultiCategorySearch] = useState('');
  const [isSavingBatchCategories, setIsSavingBatchCategories] = useState(false);
  const [batchDeletingCatName, setBatchDeletingCatName] = useState<string | null>(null);

  // Multi-select modal states for Language assignment
  const [isAssignLanguageModalOpen, setIsAssignLanguageModalOpen] = useState(false);
  const [selectedBatchLanguage, setSelectedBatchLanguage] = useState<string>('');
  const [customBatchLanguageInput, setCustomBatchLanguageInput] = useState<string>('');
  const [batchLanguageSearch, setBatchLanguageSearch] = useState<string>('');
  const [isSavingBatchLanguages, setIsSavingBatchLanguages] = useState(false);

  // Multi-select modal states for Setlist assignment
  const [isAssignSetlistModalOpen, setIsAssignSetlistModalOpen] = useState(false);
  const [selectedBatchSetlistIds, setSelectedBatchSetlistIds] = useState<string[]>([]);
  const [initialBatchSetlistIds, setInitialBatchSetlistIds] = useState<string[]>([]);
  const [multiSetlistNameInput, setMultiSetlistNameInput] = useState('');
  const [multiSetlistDateInput, setMultiSetlistDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [multiSetlistSearch, setMultiSetlistSearch] = useState('');
  const [batchSetlistSortBy, setBatchSetlistSortBy] = useState<'recent' | 'name' | 'count'>('recent');
  const [isBatchCreatingSetlist, setIsBatchCreatingSetlist] = useState(false);
  const [isSavingBatchSetlists, setIsSavingBatchSetlists] = useState(false);

  // Multi-delete confirmation modal
  const [isMultiDeleteModalOpen, setIsMultiDeleteModalOpen] = useState(false);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

  // Multi-export modal & generation state
  const [isMultiExportModalOpen, setIsMultiExportModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportNotification, setExportNotification] = useState<string | null>(null);

  const categoryFilterRef = useRef<HTMLDivElement>(null);
  const authorFilterRef = useRef<HTMLDivElement>(null);
  const keyFilterRef = useRef<HTMLDivElement>(null);
  const languageFilterRef = useRef<HTMLDivElement>(null);
  const importDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(target)) {
        setIsCategoryFilterOpen(false);
      }
      if (authorFilterRef.current && !authorFilterRef.current.contains(target)) {
        setIsAuthorFilterOpen(false);
      }
      if (keyFilterRef.current && !keyFilterRef.current.contains(target)) {
        setIsKeyFilterOpen(false);
      }
      if (languageFilterRef.current && !languageFilterRef.current.contains(target)) {
        setIsLanguageFilterOpen(false);
      }
      if (importDropdownRef.current && !importDropdownRef.current.contains(target)) {
        setIsImportDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openCategorySongId) {
          setOpenCategorySongId(null);
          setDeletingCatName(null);
        }
        if (isAssignCategoryModalOpen) {
          setIsAssignCategoryModalOpen(false);
          setMultiCategoryInput('');
          setMultiCategorySearch('');
        }
        if (isAssignLanguageModalOpen) {
          setIsAssignLanguageModalOpen(false);
          setCustomBatchLanguageInput('');
          setBatchLanguageSearch('');
        }
        if (isAssignSetlistModalOpen) {
          setIsAssignSetlistModalOpen(false);
          setMultiSetlistNameInput('');
          setMultiSetlistSearch('');
        }
        if (isMultiSelectMode) {
          setIsMultiSelectMode(false);
          setSelectedSongIds([]);
        }
        setIsCategoryFilterOpen(false);
        setIsAuthorFilterOpen(false);
        setIsKeyFilterOpen(false);
        setIsLanguageFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openCategorySongId, isAssignCategoryModalOpen, isAssignLanguageModalOpen, isAssignSetlistModalOpen, isMultiSelectMode]);
  
  // Setlist modal state (Search, Sort, Multi-select, Quick-create)
  const [addToSetlistSong, setAddToSetlistSong] = useState<Song | null>(null);
  const [selectedSetlistIds, setSelectedSetlistIds] = useState<string[]>([]);
  const [setlistSearchQuery, setSetlistSearchQuery] = useState<string>('');
  const [setlistSortBy, setSetlistSortBy] = useState<'recent' | 'name' | 'count'>('recent');
  const [isCreatingNewSetlist, setIsCreatingNewSetlist] = useState<boolean>(false);
  const [newSetlistName, setNewSetlistName] = useState<string>('');
  const [newSetlistDate, setNewSetlistDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSavingSetlists, setIsSavingSetlists] = useState<boolean>(false);
  
  // Delete confirm state
  const [confirmDeleteSongId, setConfirmDeleteSongId] = useState<string | null>(null);

  // Auto-reset delete confirmation after 4 seconds
  React.useEffect(() => {
    if (confirmDeleteSongId) {
      const timer = setTimeout(() => {
        setConfirmDeleteSongId(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [confirmDeleteSongId]);
  
  // Importer state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const [importSource, setImportSource] = useState<'search' | 'file' | 'chordpro' | 'shir' | 'webchords'>('search');

  // Key filter counts and filtering logic
  const allKeysWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    songs.forEach(s => {
      const k = (s.key || '').trim().toUpperCase();
      const keyName = k || 'Sans tonalité';
      counts.set(keyName, (counts.get(keyName) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (a.name === 'Sans tonalité') return 1;
        if (b.name === 'Sans tonalité') return -1;
        return a.name.localeCompare(b.name);
      });
  }, [songs]);

  const filteredKeysInDropdown = useMemo(() => {
    if (!keyFilterSearch.trim()) return allKeysWithCounts;
    const q = keyFilterSearch.toLowerCase().trim();
    return allKeysWithCounts.filter(k => k.name.toLowerCase().includes(q));
  }, [allKeysWithCounts, keyFilterSearch]);

  const toggleKeyFilter = (keyName: string) => {
    setSelectedKeys(prev =>
      prev.includes(keyName) ? prev.filter(k => k !== keyName) : [...prev, keyName]
    );
  };

  // Language filter counts and filtering logic
  const allLanguagesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    songs.forEach(s => {
      const l = (s.language || '').trim();
      const langName = l || 'Français';
      counts.set(langName, (counts.get(langName) || 0) + 1);
    });

    PRESET_LANGUAGES.forEach(pl => {
      if (!counts.has(pl.name)) {
        counts.set(pl.name, 0);
      }
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (a.name === 'Non spécifiée') return 1;
        if (b.name === 'Non spécifiée') return -1;
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      });
  }, [songs]);

  const filteredLanguagesInDropdown = useMemo(() => {
    if (!languageFilterSearch.trim()) return allLanguagesWithCounts;
    const q = languageFilterSearch.toLowerCase().trim();
    return allLanguagesWithCounts.filter(l => l.name.toLowerCase().includes(q));
  }, [allLanguagesWithCounts, languageFilterSearch]);

  const toggleLanguageFilter = (langName: string) => {
    setSelectedLanguages(prev =>
      prev.includes(langName) ? prev.filter(l => l !== langName) : [...prev, langName]
    );
  };

  // Aggregate all unique categories and their song counts
  const allCategoriesWithCounts = useMemo(() => {
    const counts: Record<string, { count: number; isCustom: boolean; isDefault: boolean }> = {};
    
    // Preset suggestions not hidden
    DEFAULT_CATEGORY_SUGGESTIONS.forEach(c => {
      if (!hiddenCategories.includes(c)) {
        counts[c] = { count: 0, isCustom: false, isDefault: true };
      }
    });

    // Custom added categories
    customCategories.forEach(c => {
      if (!counts[c]) {
        counts[c] = { count: 0, isCustom: true, isDefault: false };
      } else {
        counts[c].isCustom = true;
      }
    });

    // Song categories
    songs.forEach(s => {
      s.tags?.forEach(t => {
        const trimmed = t?.trim();
        if (trimmed) {
          if (!counts[trimmed]) {
            counts[trimmed] = { count: 1, isCustom: false, isDefault: false };
          } else {
            counts[trimmed].count += 1;
          }
        }
      });
    });

    return Object.entries(counts)
      .map(([name, meta]) => ({ 
        name, 
        count: meta.count,
        isCustom: meta.isCustom,
        isDefault: meta.isDefault
      }))
      .sort((a, b) => {
        if (b.count !== a.count && (a.count === 0 || b.count === 0)) {
          return b.count - a.count;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
  }, [songs, customCategories, hiddenCategories]);

  const filteredCategoriesInDropdown = useMemo(() => {
    if (!categoryFilterSearch.trim()) return allCategoriesWithCounts;
    const q = categoryFilterSearch.toLowerCase().trim();
    return allCategoriesWithCounts.filter(c => c.name.toLowerCase().includes(q));
  }, [allCategoriesWithCounts, categoryFilterSearch]);

  const filteredQuickCategories = useMemo(() => {
    if (!quickCatSearch.trim()) return allCategoriesWithCounts;
    const q = quickCatSearch.toLowerCase().trim();
    return allCategoriesWithCounts.filter(c => c.name.toLowerCase().includes(q));
  }, [allCategoriesWithCounts, quickCatSearch]);

  const toggleCategoryFilter = (catName: string) => {
    setSelectedCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  // Author filter counts and filtering logic
  const allAuthorsWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    songs.forEach(s => {
      const raw = (s.artist || '').trim();
      const parsed = parseArtistsString(raw);
      if (parsed.length === 0) {
        counts.set('Sans auteur', (counts.get('Sans auteur') || 0) + 1);
      } else {
        parsed.forEach(art => {
          counts.set(art, (counts.get(art) || 0) + 1);
        });
      }
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (a.name === 'Sans auteur') return 1;
        if (b.name === 'Sans auteur') return -1;
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      });
  }, [songs]);

  const filteredAuthorsInDropdown = useMemo(() => {
    if (!authorFilterSearch.trim()) return allAuthorsWithCounts;
    const q = authorFilterSearch.toLowerCase().trim();
    return allAuthorsWithCounts.filter(a => a.name.toLowerCase().includes(q));
  }, [allAuthorsWithCounts, authorFilterSearch]);

  const toggleAuthorFilter = (authorName: string) => {
    setSelectedAuthors(prev =>
      prev.includes(authorName) ? prev.filter(a => a !== authorName) : [...prev, authorName]
    );
  };

  const toggleTagOnSong = async (songId: string, tag: string) => {
    const targetSong = songs.find(s => s.id === songId);
    if (!targetSong) return;
    const currentTags = targetSong.tags || [];
    const exists = currentTags.some(t => t.trim().toLowerCase() === tag.trim().toLowerCase());
    const updatedTags = exists
      ? currentTags.filter(t => t.trim().toLowerCase() !== tag.trim().toLowerCase())
      : [...currentTags, tag.trim()];
    await updateSong(songId, { tags: updatedTags });
  };

  const handleCreateCategory = (nameToCreate?: string) => {
    const trimmed = (nameToCreate || categoryFilterSearch).trim();
    if (!trimmed) return;
    
    // Unhide if was hidden
    if (hiddenCategories.includes(trimmed)) {
      const updatedHidden = hiddenCategories.filter(c => c !== trimmed);
      setHiddenCategories(updatedHidden);
      saveHiddenCategories(updatedHidden);
    }

    if (!customCategories.includes(trimmed)) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      saveCustomCategories(updated);
    }
    if (!selectedCategories.includes(trimmed)) {
      setSelectedCategories(prev => [...prev, trimmed]);
    }
    setCategoryFilterSearch('');
  };

  const handleQuickCreateCategoryForSong = async (songId: string, nameToCreate?: string) => {
    const trimmed = (nameToCreate || quickCatInput).trim();
    if (!trimmed) return;

    // Unhide if was hidden
    if (hiddenCategories.includes(trimmed)) {
      const updatedHidden = hiddenCategories.filter(c => c !== trimmed);
      setHiddenCategories(updatedHidden);
      saveHiddenCategories(updatedHidden);
    }

    if (!customCategories.includes(trimmed)) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      saveCustomCategories(updated);
    }

    const targetSong = songs.find(s => s.id === songId);
    if (targetSong) {
      const currentTags = targetSong.tags || [];
      if (!currentTags.some(t => t.trim().toLowerCase() === trimmed.toLowerCase())) {
        await updateSong(songId, { tags: [...currentTags, trimmed] });
      }
    }

    setQuickCatInput('');
  };

  const handleQuickDeleteCategory = async (catName: string) => {
    // 1. Remove from custom categories
    if (customCategories.includes(catName)) {
      const updatedCustom = customCategories.filter(c => c !== catName);
      setCustomCategories(updatedCustom);
      saveCustomCategories(updatedCustom);
    }

    // 2. If default category, hide it
    if (DEFAULT_CATEGORY_SUGGESTIONS.includes(catName)) {
      const updatedHidden = Array.from(new Set([...hiddenCategories, catName]));
      setHiddenCategories(updatedHidden);
      saveHiddenCategories(updatedHidden);
    }

    // 3. Remove tag from any song that has it
    const songsWithTag = songs.filter(s => s.tags?.some(t => t.trim().toLowerCase() === catName.toLowerCase()));
    for (const s of songsWithTag) {
      const updatedTags = (s.tags || []).filter(t => t.trim().toLowerCase() !== catName.toLowerCase());
      await updateSong(s.id, { tags: updatedTags });
    }

    // 4. Remove from selected categories
    setSelectedCategories(prev => prev.filter(c => c.toLowerCase() !== catName.toLowerCase()));
    setDeletingCatName(null);
  };

  const handleResetDefaultCategories = () => {
    setHiddenCategories([]);
    saveHiddenCategories([]);
  };

  // Filtered & Sorted Songs
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      // Key filter (support single or multiple selection with checkboxes)
      if (selectedKeys.length > 0) {
        const songKey = (song.key || '').trim().toUpperCase();
        const effectiveKey = songKey || 'Sans tonalité';
        const hasMatch = selectedKeys.some(k => effectiveKey.toUpperCase() === k.toUpperCase());
        if (!hasMatch) return false;
      }
      // Language filter (support single or multiple selection with checkboxes)
      if (selectedLanguages.length > 0) {
        const songLang = (song.language || 'Français').trim();
        const effectiveLang = songLang || 'Non spécifiée';
        const hasMatch = selectedLanguages.some(l => effectiveLang.toLowerCase() === l.toLowerCase());
        if (!hasMatch) return false;
      }
      // Categories filter (support single or multiple selection - union match)
      if (selectedCategories.length > 0) {
        const songCats = (song.tags || []).map(t => t.trim().toLowerCase());
        const hasMatch = selectedCategories.some(cat => songCats.includes(cat.trim().toLowerCase()));
        if (!hasMatch) return false;
      }
      // Authors filter (support single or multiple selection with checkboxes)
      if (selectedAuthors.length > 0) {
        const rawArtist = (song.artist || '').trim();
        const artists = rawArtist ? parseArtistsString(rawArtist) : ['Sans auteur'];
        const hasMatch = selectedAuthors.some(author => 
          artists.some(a => a.toLowerCase() === author.toLowerCase())
        );
        if (!hasMatch) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = song.title.toLowerCase().includes(q);
        const matchArtist = song.artist.toLowerCase().includes(q);
        const matchLyrics = song.contentChordPro.toLowerCase().includes(q);
        const matchLanguage = (song.language || '').toLowerCase().includes(q);
        const matchTags = song.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchArtist && !matchLyrics && !matchTags && !matchLanguage) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
      if (sortBy === 'artist') {
        const artistA = (a.artist || '').trim();
        const artistB = (b.artist || '').trim();
        const comp = artistA.localeCompare(artistB, 'fr', { sensitivity: 'base' });
        if (comp !== 0) return comp;
        return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
      }
      if (sortBy === 'tempo') return (a.tempo || 0) - (b.tempo || 0);
      if (sortBy === 'duration') return parseDurationToSeconds(b) - parseDurationToSeconds(a);
      if (sortBy === 'recent') return (b.createdAt || '').localeCompare(a.createdAt || '');
      return 0;
    });
  }, [songs, selectedKeys, selectedLanguages, selectedCategories, selectedAuthors, searchQuery, sortBy]);

  // Group songs alphabetically by first letter of title or author
  const alphabeticalGroups = useMemo(() => {
    const isArtistSort = sortBy === 'artist';
    const sorted = [...filteredSongs].sort((a, b) => {
      if (isArtistSort) {
        const artistA = (a.artist || '').trim();
        const artistB = (b.artist || '').trim();
        const comp = artistA.localeCompare(artistB, 'fr', { sensitivity: 'base' });
        if (comp !== 0) return comp;
        return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
      }
      return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
    });

    const map = new Map<string, Song[]>();
    sorted.forEach(song => {
      const sourceStr = isArtistSort ? ((song.artist || '').trim() || 'Sans auteur') : (song.title || '');
      const raw = sourceStr.trim().charAt(0).toUpperCase();
      const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const letter = /[A-Z]/.test(normalized) ? normalized : '#';
      if (!map.has(letter)) {
        map.set(letter, []);
      }
      map.get(letter)!.push(song);
    });

    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map(letter => ({
      letter,
      songs: map.get(letter)!
    }));
  }, [filteredSongs, sortBy]);

  const availableLettersSet = useMemo(() => {
    return new Set(alphabeticalGroups.map(g => g.letter));
  }, [alphabeticalGroups]);

  // Scroll listener to update active letter when scrolling in alphabetical view
  useEffect(() => {
    if (effectiveViewMode !== 'alphabetical' || alphabeticalGroups.length === 0) return;

    const handleScroll = () => {
      const headerOffset = 140;
      const sections = document.querySelectorAll<HTMLElement>('[data-letter-section]');
      let current = '';

      sections.forEach(sec => {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= headerOffset) {
          const l = sec.getAttribute('data-letter-section');
          if (l) current = l;
        }
      });

      if (current) {
        setActiveLetter(current);
      } else if (sections.length > 0) {
        const first = sections[0].getAttribute('data-letter-section');
        if (first) setActiveLetter(first);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [effectiveViewMode, alphabeticalGroups]);

  // Scroll smoothly to a target letter
  const scrollToLetter = (letter: string) => {
    const elem = document.getElementById(`section-letter-${letter}`);
    if (elem) {
      const yOffset = -90;
      const y = elem.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveLetter(letter);
    }
  };

  // Touch scrubber handler for mobile
  const handleScrubberTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const letter = target?.getAttribute('data-letter');
    if (letter && availableLettersSet.has(letter)) {
      scrollToLetter(letter);
    }
  };

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

  // Filter & Sort Setlists inside the Add-to-Setlist Modal
  const filteredAndSortedSetlists = useMemo(() => {
    if (!addToSetlistSong) return [];
    return setlists
      .filter(st => {
        if (!setlistSearchQuery.trim()) return true;
        const q = setlistSearchQuery.toLowerCase();
        const matchName = st.name.toLowerCase().includes(q);
        const matchDate = st.date?.toLowerCase().includes(q);
        const matchNotes = st.notes?.toLowerCase().includes(q);
        return matchName || matchDate || matchNotes;
      })
      .sort((a, b) => {
        if (setlistSortBy === 'recent') {
          const dateA = a.date || a.createdAt || '';
          const dateB = b.date || b.createdAt || '';
          return dateB.localeCompare(dateA);
        }
        if (setlistSortBy === 'name') {
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        }
        if (setlistSortBy === 'count') {
          return (b.songIds?.length || 0) - (a.songIds?.length || 0);
        }
        return 0;
      });
  }, [setlists, addToSetlistSong, setlistSearchQuery, setlistSortBy]);

  const handleToggleSetlistSelection = (setlistId: string) => {
    setSelectedSetlistIds(prev => 
      prev.includes(setlistId)
        ? prev.filter(id => id !== setlistId)
        : [...prev, setlistId]
    );
  };

  const handleQuickCreateSetlist = async () => {
    if (!newSetlistName.trim() || !addToSetlistSong) return;
    try {
      const createdId = await createSetlist({
        name: newSetlistName.trim(),
        date: newSetlistDate || new Date().toISOString().split('T')[0],
        songIds: [addToSetlistSong.id],
        notes: '',
        targetDuration: 25
      });
      setSelectedSetlistIds(prev => [...prev, createdId]);
      setNewSetlistName('');
      setIsCreatingNewSetlist(false);
    } catch (e) {
      console.error('Error creating setlist:', e);
    }
  };

  const handleSaveSetlistSelection = async () => {
    if (!addToSetlistSong) return;
    setIsSavingSetlists(true);
    const songId = addToSetlistSong.id;

    try {
      for (const st of setlists) {
        const isSelected = selectedSetlistIds.includes(st.id);
        const hasSong = st.songIds.includes(songId);

        if (isSelected && !hasSong) {
          await updateSetlist(st.id, {
            songIds: [...st.songIds, songId]
          });
        } else if (!isSelected && hasSong) {
          await updateSetlist(st.id, {
            songIds: st.songIds.filter(id => id !== songId)
          });
        }
      }
    } catch (e) {
      console.error('Error updating setlists:', e);
    } finally {
      setIsSavingSetlists(false);
      setAddToSetlistSong(null);
    }
  };

  // Multi-Select and Long Press State & Handlers
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchTimeRef = useRef(0);

  const startLongPress = (songId: string, clientX: number, clientY: number) => {
    if (isMultiSelectMode) return;
    isLongPressTriggeredRef.current = false;
    touchStartPosRef.current = { x: clientX, y: clientY };
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setIsMultiSelectMode(true);
      setSelectedSongIds(prev => prev.includes(songId) ? prev : [...prev, songId]);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch {
          // ignore
        }
      }
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = (songId: string, e: React.TouchEvent) => {
    lastTouchTimeRef.current = Date.now();
    if (e.touches.length > 0) {
      startLongPress(songId, e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!longPressTimerRef.current || !touchStartPosRef.current || e.touches.length === 0) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      cancelLongPress();
    }
  };

  const handleMouseDown = (songId: string, e: React.MouseEvent) => {
    // Avoid double trigger if mouse event immediately follows touch
    if (Date.now() - lastTouchTimeRef.current < 800) return;
    startLongPress(songId, e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!longPressTimerRef.current || !touchStartPosRef.current) return;
    const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      cancelLongPress();
    }
  };

  const toggleSongSelection = (songId: string) => {
    setSelectedSongIds(prev => {
      const next = prev.includes(songId) ? prev.filter(id => id !== songId) : [...prev, songId];
      setIsMultiSelectMode(next.length > 0);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSongIds.length === filteredSongs.length && filteredSongs.length > 0) {
      setSelectedSongIds([]);
      setIsMultiSelectMode(false);
    } else {
      setSelectedSongIds(filteredSongs.map(s => s.id));
      setIsMultiSelectMode(true);
    }
  };

  const handleCardClick = (song: Song, e: React.MouseEvent) => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (isMultiSelectMode) {
      e.preventDefault();
      e.stopPropagation();
      toggleSongSelection(song.id);
      return;
    }
    handleOpenStage(song);
  };

  // Filter categories for the multi-assign category modal
  const filteredMultiCategories = useMemo(() => {
    if (!multiCategorySearch.trim()) return allCategoriesWithCounts;
    const q = multiCategorySearch.toLowerCase().trim();
    return allCategoriesWithCounts.filter(c => c.name.toLowerCase().includes(q));
  }, [allCategoriesWithCounts, multiCategorySearch]);

  // Filter and sort setlists for the multi-assign setlist modal
  const filteredAndSortedMultiSetlists = useMemo(() => {
    return setlists
      .filter(st => {
        if (!multiSetlistSearch.trim()) return true;
        const q = multiSetlistSearch.toLowerCase().trim();
        const matchName = st.name.toLowerCase().includes(q);
        const matchDate = st.date?.toLowerCase().includes(q);
        const matchNotes = st.notes?.toLowerCase().includes(q);
        return matchName || matchDate || matchNotes;
      })
      .sort((a, b) => {
        if (batchSetlistSortBy === 'recent') {
          const dateA = a.date || a.createdAt || '';
          const dateB = b.date || b.createdAt || '';
          return dateB.localeCompare(dateA);
        }
        if (batchSetlistSortBy === 'name') {
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        }
        if (batchSetlistSortBy === 'count') {
          return (b.songIds?.length || 0) - (a.songIds?.length || 0);
        }
        return 0;
      });
  }, [setlists, multiSetlistSearch, batchSetlistSortBy]);

  // Open the batch category assignment modal
  const handleOpenBatchCategoryModal = () => {
    if (selectedSongIds.length === 0) return;
    const selectedSongsList = songs.filter(s => selectedSongIds.includes(s.id));
    let initialCats: string[] = [];

    if (selectedSongIds.length === 1) {
      initialCats = [...(selectedSongsList[0]?.tags || [])];
    } else {
      initialCats = Array.from(
        new Set(selectedSongsList.flatMap(s => s.tags || []).map(t => t.trim()).filter(Boolean))
      );
    }

    setSelectedBatchCategories(initialCats);
    setInitialBatchCategories(initialCats);
    setMultiCategoryInput('');
    setMultiCategorySearch('');
    setBatchDeletingCatName(null);
    setIsAssignCategoryModalOpen(true);
  };

  // Toggle a category in batch mode
  const toggleBatchCategory = (catName: string) => {
    const trimmed = catName.trim();
    setSelectedBatchCategories(prev => {
      const exists = prev.some(c => c.toLowerCase() === trimmed.toLowerCase());
      if (exists) {
        return prev.filter(c => c.toLowerCase() !== trimmed.toLowerCase());
      } else {
        return [...prev, trimmed];
      }
    });
  };

  // Quick create category in batch modal
  const handleQuickCreateBatchCategory = (catNameToCreate?: string) => {
    const trimmed = (catNameToCreate || multiCategoryInput).trim();
    if (!trimmed) return;

    if (hiddenCategories.includes(trimmed)) {
      const updatedHidden = hiddenCategories.filter(c => c !== trimmed);
      setHiddenCategories(updatedHidden);
      saveHiddenCategories(updatedHidden);
    }

    if (!customCategories.includes(trimmed)) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      saveCustomCategories(updated);
    }

    if (!selectedBatchCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedBatchCategories(prev => [...prev, trimmed]);
    }
    setMultiCategoryInput('');
  };

  // Save batch category selections
  const handleSaveBatchCategories = async () => {
    if (selectedSongIds.length === 0) return;
    setIsSavingBatchCategories(true);
    try {
      if (selectedSongIds.length === 1) {
        // Single song: set tags directly to selectedBatchCategories
        await updateSong(selectedSongIds[0], { tags: selectedBatchCategories });
      } else {
        // Multiple songs:
        // Checked categories get added to all selected songs
        // Categories that were in initialBatchCategories but are now unchecked get removed from all selected songs
        const categoriesToRemove = initialBatchCategories.filter(
          initCat => !selectedBatchCategories.some(c => c.toLowerCase() === initCat.toLowerCase())
        );

        for (const songId of selectedSongIds) {
          const targetSong = songs.find(s => s.id === songId);
          if (!targetSong) continue;
          let currentTags = targetSong.tags || [];

          if (categoriesToRemove.length > 0) {
            currentTags = currentTags.filter(
              t => !categoriesToRemove.some(rem => rem.toLowerCase() === t.trim().toLowerCase())
            );
          }

          for (const newCat of selectedBatchCategories) {
            if (!currentTags.some(t => t.trim().toLowerCase() === newCat.trim().toLowerCase())) {
              currentTags = [...currentTags, newCat.trim()];
            }
          }

          await updateSong(songId, { tags: currentTags });
        }
      }

      setExportNotification(
        selectedSongIds.length === 1
          ? `Catégories mises à jour pour "${songs.find(s => s.id === selectedSongIds[0])?.title || 'le chant'}"`
          : `Catégories mises à jour pour ${selectedSongIds.length} chants`
      );
      setTimeout(() => setExportNotification(null), 2500);
      setIsAssignCategoryModalOpen(false);
    } catch (e) {
      console.error('Error saving batch categories:', e);
    } finally {
      setIsSavingBatchCategories(false);
    }
  };

  // Available languages list for batch selection
  const allBatchAvailableLanguages = useMemo(() => {
    const list: { name: string; code: string; badgeClass: string }[] = [];
    const addedNames = new Set<string>();

    PRESET_LANGUAGES.forEach(pl => {
      if (pl.code !== 'OTHER') {
        list.push({ name: pl.name, code: pl.code, badgeClass: pl.badgeClass });
        addedNames.add(pl.name.toLowerCase());
      }
    });

    songs.forEach(s => {
      const l = (s.language || '').trim();
      if (l && !addedNames.has(l.toLowerCase())) {
        const meta = getLanguageMeta(l);
        list.push({ name: l, code: meta.code, badgeClass: meta.badgeClass });
        addedNames.add(l.toLowerCase());
      }
    });

    return list;
  }, [songs]);

  // Filtered languages for batch modal search
  const filteredBatchLanguages = useMemo(() => {
    const q = batchLanguageSearch.toLowerCase().trim();
    if (!q) return allBatchAvailableLanguages;
    return allBatchAvailableLanguages.filter(l => 
      l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
    );
  }, [allBatchAvailableLanguages, batchLanguageSearch]);

  // Open the batch language assignment modal
  const handleOpenBatchLanguageModal = () => {
    if (selectedSongIds.length === 0) return;
    const selectedSongsList = songs.filter(s => selectedSongIds.includes(s.id));

    const firstLang = selectedSongsList[0]?.language?.trim() || '';
    const allSame = firstLang && selectedSongsList.every(
      s => (s.language || '').trim().toLowerCase() === firstLang.toLowerCase()
    );

    setSelectedBatchLanguage(allSame ? firstLang : '');
    setCustomBatchLanguageInput('');
    setBatchLanguageSearch('');
    setIsAssignLanguageModalOpen(true);
  };

  // Save batch language selection
  const handleSaveBatchLanguage = async (explicitLanguage?: string) => {
    if (selectedSongIds.length === 0) return;
    const targetLang = (explicitLanguage !== undefined 
      ? explicitLanguage 
      : (customBatchLanguageInput.trim() || selectedBatchLanguage)
    ).trim();

    setIsSavingBatchLanguages(true);
    try {
      if (targetLang === '__AUTO_DETECT__') {
        let count = 0;
        for (const songId of selectedSongIds) {
          const s = songs.find(x => x.id === songId);
          if (s) {
            const detected = detectSongLanguage(s.title, s.contentChordPro || s.content);
            await updateSong(songId, { language: detected });
            count++;
          }
        }
        setExportNotification(
          selectedSongIds.length === 1
            ? `Langue devinée et assignée pour 1 chant`
            : `Langues devinées et assignées pour ${count} chants`
        );
      } else {
        for (const songId of selectedSongIds) {
          await updateSong(songId, { language: targetLang === '__NONE__' ? undefined : (targetLang || undefined) });
        }

        const msg = targetLang && targetLang !== '__NONE__'
          ? `Langue définie sur ${targetLang}`
          : 'Langue retirée';

        setExportNotification(
          selectedSongIds.length === 1
            ? `${msg} pour 1 chant`
            : `${msg} pour ${selectedSongIds.length} chants`
        );
      }
      setTimeout(() => setExportNotification(null), 2500);
      setIsAssignLanguageModalOpen(false);
      setCustomBatchLanguageInput('');
      setBatchLanguageSearch('');
    } catch (e) {
      console.error('Error saving batch language:', e);
    } finally {
      setIsSavingBatchLanguages(false);
    }
  };

  // Open the batch setlist assignment modal
  const handleOpenBatchSetlistModal = () => {
    if (selectedSongIds.length === 0) return;
    let initialIds: string[] = [];

    if (selectedSongIds.length === 1) {
      initialIds = setlists.filter(st => st.songIds.includes(selectedSongIds[0])).map(st => st.id);
    } else {
      initialIds = setlists.filter(st => selectedSongIds.some(songId => st.songIds.includes(songId))).map(st => st.id);
    }

    setSelectedBatchSetlistIds(initialIds);
    setInitialBatchSetlistIds(initialIds);
    setIsBatchCreatingSetlist(false);
    setMultiSetlistNameInput('');
    setMultiSetlistDateInput(new Date().toISOString().split('T')[0]);
    setMultiSetlistSearch('');
    setBatchSetlistSortBy('recent');
    setIsAssignSetlistModalOpen(true);
  };

  // Toggle a setlist selection in batch mode
  const toggleBatchSetlistSelection = (setlistId: string) => {
    setSelectedBatchSetlistIds(prev =>
      prev.includes(setlistId) ? prev.filter(id => id !== setlistId) : [...prev, setlistId]
    );
  };

  // Quick create setlist in batch modal
  const handleQuickCreateBatchSetlist = async () => {
    const trimmed = multiSetlistNameInput.trim();
    if (!trimmed || selectedSongIds.length === 0) return;

    try {
      const createdId = await createSetlist({
        name: trimmed,
        date: multiSetlistDateInput || new Date().toISOString().split('T')[0],
        songIds: selectedSongIds,
        notes: '',
        targetDuration: 25
      });

      setSelectedBatchSetlistIds(prev => [...prev, createdId]);
      setInitialBatchSetlistIds(prev => [...prev, createdId]);
      setMultiSetlistNameInput('');
      setMultiSetlistDateInput(new Date().toISOString().split('T')[0]);
      setIsBatchCreatingSetlist(false);
    } catch (e) {
      console.error('Error creating setlist in batch modal:', e);
    }
  };

  // Save batch setlist assignments
  const handleSaveBatchSetlists = async () => {
    if (selectedSongIds.length === 0) return;
    setIsSavingBatchSetlists(true);
    try {
      if (selectedSongIds.length === 1) {
        const songId = selectedSongIds[0];
        for (const st of setlists) {
          const isSelected = selectedBatchSetlistIds.includes(st.id);
          const hasSong = st.songIds.includes(songId);

          if (isSelected && !hasSong) {
            await updateSetlist(st.id, {
              songIds: [...st.songIds, songId]
            });
          } else if (!isSelected && hasSong) {
            await updateSetlist(st.id, {
              songIds: st.songIds.filter(id => id !== songId)
            });
          }
        }
      } else {
        for (const st of setlists) {
          const isSelected = selectedBatchSetlistIds.includes(st.id);
          const hadSomeSongs = initialBatchSetlistIds.includes(st.id) || selectedSongIds.some(id => st.songIds.includes(id));

          if (isSelected) {
            const songsToAdd = selectedSongIds.filter(id => !st.songIds.includes(id));
            if (songsToAdd.length > 0) {
              await updateSetlist(st.id, {
                songIds: [...st.songIds, ...songsToAdd]
              });
            }
          } else if (!isSelected && hadSomeSongs) {
            const newSongIds = st.songIds.filter(id => !selectedSongIds.includes(id));
            if (newSongIds.length !== st.songIds.length) {
              await updateSetlist(st.id, {
                songIds: newSongIds
              });
            }
          }
        }
      }

      setExportNotification(
        selectedSongIds.length === 1
          ? `Setlists mises à jour pour "${songs.find(s => s.id === selectedSongIds[0])?.title || 'le chant'}"`
          : `Setlists mises à jour pour ${selectedSongIds.length} chants`
      );
      setTimeout(() => setExportNotification(null), 2500);
      setIsAssignSetlistModalOpen(false);
    } catch (e) {
      console.error('Error saving batch setlists:', e);
    } finally {
      setIsSavingBatchSetlists(false);
    }
  };

  // Delete all selected songs
  const handleBatchDelete = async () => {
    if (selectedSongIds.length === 0) return;
    setIsDeletingMultiple(true);
    try {
      for (const songId of selectedSongIds) {
        await deleteSong(songId);
      }
      setSelectedSongIds([]);
      setIsMultiSelectMode(false);
      setIsMultiDeleteModalOpen(false);
    } catch (e) {
      console.error('Error deleting selected songs:', e);
    } finally {
      setIsDeletingMultiple(false);
    }
  };

  // Export selected songs as unified PDF
  const handleExportSelectedPdf = async () => {
    if (selectedSongIds.length === 0) return;
    const selectedSongsList = selectedSongIds
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is Song => s !== undefined);

    if (selectedSongsList.length === 0) return;

    setIsExportingPdf(true);
    setExportNotification('Génération du livret PDF des chansons sélectionnées...');
    try {
      const virtualSetlist: Setlist = {
        id: `export-${Date.now()}`,
        groupId: '',
        name: `Sélection ${selectedSongsList.length} chants`,
        date: new Date().toISOString().split('T')[0],
        songIds: selectedSongIds
      };

      const { doc, fileName } = await generateSetlistPdf(virtualSetlist, selectedSongsList, DEFAULT_PDF_OPTIONS);
      doc.save(fileName || `selection-${selectedSongsList.length}-chants.pdf`);
      setExportNotification(`PDF téléchargé avec succès pour ${selectedSongsList.length} chants`);
      setTimeout(() => {
        setExportNotification(null);
        setIsMultiExportModalOpen(false);
      }, 2500);
    } catch (err) {
      console.error('Error exporting songs to PDF:', err);
      setExportNotification('Erreur lors de la création du PDF.');
      setTimeout(() => setExportNotification(null), 3500);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export selected songs as ChordPro / Text file
  const handleExportSelectedChordPro = () => {
    if (selectedSongIds.length === 0) return;
    const selectedSongsList = selectedSongIds
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is Song => s !== undefined);

    if (selectedSongsList.length === 0) return;

    const content = selectedSongsList.map(song => {
      const header = `{title: ${song.title}}\n` +
        (song.artist ? `{artist: ${song.artist}}\n` : '') +
        (song.key ? `{key: ${song.key}}\n` : '') +
        (song.tempo ? `{tempo: ${song.tempo}}\n` : '') +
        (song.tags && song.tags.length > 0 ? `{comment: Catégories: ${song.tags.join(', ')}}\n` : '');
      return `${header}\n${song.contentChordPro || ''}\n`;
    }).join('\n========================================\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `selection-${selectedSongsList.length}-chants-chordpro.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotification(`Fichier ChordPro téléchargé pour ${selectedSongsList.length} chants`);
    setTimeout(() => {
      setExportNotification(null);
      setIsMultiExportModalOpen(false);
    }, 2000);
  };

  // Export selected songs as JSON
  const handleExportSelectedJson = () => {
    if (selectedSongIds.length === 0) return;
    const selectedSongsList = selectedSongIds
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is Song => s !== undefined);

    if (selectedSongsList.length === 0) return;

    const exportData = {
      exportDate: new Date().toISOString(),
      count: selectedSongsList.length,
      songs: selectedSongsList
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `selection-${selectedSongsList.length}-chants.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotification(`Export JSON téléchargé pour ${selectedSongsList.length} chants`);
    setTimeout(() => {
      setExportNotification(null);
      setIsMultiExportModalOpen(false);
    }, 2000);
  };

  // Reusable unified Song Card Renderer
  const renderSongCard = (song: Song) => {
    const isSelected = selectedSongIds.includes(song.id);
    const isConfirming = confirmDeleteSongId === song.id;

    return (
      <div
        key={song.id}
        id={`song-card-${song.id}`}
        onTouchStart={(e) => handleTouchStart(song.id, e)}
        onTouchMove={handleTouchMove}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
        onMouseDown={(e) => handleMouseDown(song.id, e)}
        onMouseMove={handleMouseMove}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onClick={(e) => handleCardClick(song, e)}
        className={`group relative border rounded-lg p-3 transition-all flex flex-col justify-between cursor-pointer shadow-sm hover:shadow-md select-none ${
          isSelected
            ? 'bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/40 shadow-blue-900/20'
            : 'bg-[#111112] hover:bg-[#151518] border-[#222224] hover:border-blue-500/40'
        }`}
      >
        <div>
          {/* Top: Checkbox and Title next to each other, with Artist below Title, and buttons in the right corner */}
          <div className="flex items-start gap-2 mb-1">
            {/* Checkbox permanently visible on laptop, tablet and mobile */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSongSelection(song.id);
              }}
              className={`w-5 h-5 rounded flex items-center justify-center border transition-all cursor-pointer shrink-0 mt-0.5 ${
                isSelected
                  ? 'bg-blue-600 border-blue-500 text-white shadow-xs ring-2 ring-blue-500/30'
                  : 'bg-[#1C1C1E] border-[#444] text-transparent hover:border-blue-400 hover:bg-[#252528]'
              }`}
              title={isSelected ? "Désélectionner ce chant" : "Sélectionner ce chant"}
              aria-label={isSelected ? "Désélectionner ce chant" : "Sélectionner ce chant"}
            >
              <Check className={`w-3.5 h-3.5 stroke-[2.5] ${isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-40 text-blue-400'}`} />
            </button>

            {/* Title and Artist next to checkbox */}
            <div className="min-w-0 flex-1">
              <h3 
                className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate leading-snug"
                title={stripParentheses(song.title)}
              >
                {stripParentheses(song.title)}
              </h3>
              <p 
                className={`text-[11px] sm:text-xs font-medium truncate mt-0.5 select-text ${
                  selectedAuthors.includes(song.artist) || sortBy === 'artist' 
                    ? 'text-blue-400 font-semibold' 
                    : 'text-gray-400'
                }`}
                title={song.artist || 'Auteur inconnu'}
              >
                {song.artist || 'Auteur inconnu'}
              </p>
            </div>

            {/* Buttons in the right corner */}
            {currentUser?.role === 'admin' && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    if (isMultiSelectMode) return;
                    e.stopPropagation();
                    handleEditSong(song);
                  }}
                  className="p-1 sm:p-1.5 rounded bg-[#1C1C1E] hover:bg-amber-500/15 text-gray-300 hover:text-amber-300 border border-[#333] hover:border-amber-500/50 transition-colors flex items-center justify-center cursor-pointer group"
                  title={isMultiSelectMode ? undefined : "Éditer le chant"}
                  aria-label="Éditer le chant"
                >
                  <FileEdit className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    if (isMultiSelectMode) return;
                    e.stopPropagation();
                    if (isConfirming) {
                      deleteSong(song.id);
                      setConfirmDeleteSongId(null);
                    } else {
                      setConfirmDeleteSongId(song.id);
                    }
                  }}
                  className={`p-1 sm:p-1.5 rounded transition-all flex items-center justify-center cursor-pointer ${
                    isConfirming
                      ? 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 shadow-sm animate-pulse'
                      : 'bg-[#1C1C1E] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-[#333] hover:border-rose-500/40'
                  }`}
                  title={isMultiSelectMode ? undefined : (isConfirming ? "Confirmer la suppression" : "Supprimer le chant")}
                  aria-label={isConfirming ? "Confirmer la suppression" : "Supprimer"}
                >
                  {isConfirming ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Categories */}
          {songCardMetadata?.showCategories && song.tags && song.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1.5 pl-7 relative">
              {song.tags.map((cat, idx) => {
                const isFiltered = selectedCategories.includes(cat);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      if (isMultiSelectMode) return;
                      e.stopPropagation();
                      toggleCategoryFilter(cat);
                    }}
                    className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 max-w-full truncate ${
                      isFiltered
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 font-semibold'
                        : 'bg-[#1C1C1E] border-[#222224] text-gray-400 hover:text-gray-200 hover:border-[#333]'
                    }`}
                    title={isMultiSelectMode ? undefined : `Filtrer par la catégorie ${cat}`}
                  >
                    <Tag className="w-2 h-2 text-blue-400 shrink-0" />
                    <span className="truncate">{cat}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Metadata badges if enabled */}
          {((songCardMetadata?.showKey) || (songCardMetadata?.showTempo && song.tempo) || (songCardMetadata?.showDuration && getSongDuration(song))) && (
            <div className="flex items-center gap-1 flex-wrap mt-2 pt-1.5 border-t border-[#1C1C1F]">
              {songCardMetadata?.showKey && (
                <span
                  onClick={(e) => {
                    if (isMultiSelectMode) return;
                    e.stopPropagation();
                    toggleKeyFilter((song.key || 'C').toUpperCase());
                  }}
                  title={isMultiSelectMode ? undefined : `Filtrer par la tonalité ${(song.key || 'C').toUpperCase()}`}
                  className={`px-1.5 py-0.5 rounded border text-[10px] font-bold transition-colors ${
                    isMultiSelectMode ? 'cursor-pointer' : 'cursor-pointer'
                  } ${
                    selectedKeys.includes((song.key || 'C').toUpperCase())
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-[#1C1C1E] border-[#333] text-gray-200 hover:border-amber-500/40 hover:text-amber-300'
                  }`}
                >
                  {song.key || 'C'}
                </span>
              )}
              {songCardMetadata?.showTempo && song.tempo && (
                <span className="px-1.5 py-0.5 rounded bg-[#1C1C1E] border border-[#222224] text-gray-400 text-[9px] font-medium flex items-center gap-1">
                  <Gauge className="w-2.5 h-2.5 text-blue-400" />
                  {song.tempo}
                </span>
              )}
              {songCardMetadata?.showDuration && getSongDuration(song) ? (
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[9px] font-medium flex items-center gap-1 font-mono shadow-sm">
                  <Clock className="w-2.5 h-2.5 text-cyan-400" />
                  {getSongDuration(song)}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Open import modal for specific option
  const handleOpenImport = (source: 'search' | 'file' | 'chordpro' | 'shir' | 'webchords' = 'search') => {
    setImportSource(source);
    setIsImportDropdownOpen(false);
    setIsImportModalOpen(true);
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
          
          {/* Importer Button with Dropdown Options */}
          <div className="relative" ref={importDropdownRef}>
            <div className="flex items-center rounded-md bg-[#1C1C1E] border border-[#333] shadow-sm">
              <button
                onClick={() => handleOpenImport('search')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-200 hover:bg-[#2A2A2D] text-xs font-semibold rounded-l-md transition-colors"
                title="Rechercher des chants sur les sites externes et importer"
              >
                <FileUp className="w-3.5 h-3.5 text-blue-400" />
                <span>Importer</span>
              </button>
              <button
                onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
                className="px-1.5 py-1.5 text-gray-400 hover:text-white hover:bg-[#2A2A2D] rounded-r-md border-l border-[#333] transition-colors"
                title="Options d'importation"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isImportDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Importer Dropdown Menu */}
            {isImportDropdownOpen && (
              <div 
                className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-80 max-w-[calc(100vw-2rem)] bg-[#111112] border border-[#333] rounded-lg shadow-2xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#222224]">
                  Mode d'importation
                </div>

                {/* Option 1: Online Search */}
                <button
                  onClick={() => handleOpenImport('search')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#1C1C1E] flex items-start gap-2.5 transition-colors group bg-blue-950/20 border-b border-[#222224]"
                >
                  <div className="p-1.5 rounded bg-blue-600/20 border border-blue-500/30 text-blue-400 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-blue-400 flex items-center gap-1.5">
                      <span>Recherche en ligne</span>
                      <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Nouveau</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Cherchez parmi des milliers de chants chrétiens comme Shir.fr ou WorshipTogether et importez en 1 clic
                    </p>
                  </div>
                </button>

                {/* Option 2: File upload */}
                <button
                  onClick={() => handleOpenImport('file')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#1C1C1E] flex items-start gap-2.5 transition-colors group border-b border-[#222224]"
                >
                  <div className="p-1.5 rounded bg-[#1C1C1E] border border-[#333] text-blue-400 mt-0.5 group-hover:border-blue-500">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-blue-400">
                      Importer un fichier
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Fichiers locaux (.cho, .pro, .txt, .crd) par glisser-déposer
                    </p>
                  </div>
                </button>

                {/* Option 3: ChordPro Text */}
                <button
                  onClick={() => handleOpenImport('chordpro')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#1C1C1E] flex items-start gap-2.5 transition-colors group"
                >
                  <div className="p-1.5 rounded bg-[#1C1C1E] border border-[#333] text-blue-400 mt-0.5 group-hover:border-blue-500">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-blue-400">
                      Écrire / Coller ChordPro
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Saisie directe de paroles et accords ou texte brut
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

      {/* Search & Filter Controls Bar */}
      <div className="bg-[#111112] border border-[#222224] rounded-lg p-2.5 mb-3 flex flex-col md:flex-row items-center gap-2.5">
        
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par titre, artiste, paroles ou catégorie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1C1C1E] border border-[#333] rounded-md pl-9 pr-16 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <VoiceSearchControl
              songs={songs}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectSong={handleOpenStage}
              onClearFilters={() => {
                setSearchQuery('');
                setSelectedCategories([]);
                setSelectedAuthors([]);
                setSelectedKeys([]);
                setSelectedLanguages([]);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full md:flex md:items-center md:gap-2 md:w-auto md:justify-end">
          {/* Category Filter Dropdown */}
          <div className="relative w-full md:w-auto min-w-0" ref={categoryFilterRef}>
            <div
              onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
              className={`h-[34px] w-full bg-[#1C1C1E] border hover:border-[#444] rounded-md px-2 sm:px-2.5 py-1 text-xs text-gray-200 cursor-pointer flex items-center justify-between gap-1 sm:gap-1.5 transition-colors ${
                selectedCategories.length > 0
                  ? 'border-blue-500/50 bg-blue-950/20'
                  : 'border-[#333]'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
                <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                {selectedCategories.length === 0 ? (
                  <span className="text-gray-300 truncate text-[11px] sm:text-xs">Catégories</span>
                ) : (
                  <span className="text-blue-300 font-semibold truncate text-[11px] sm:text-xs">
                    {selectedCategories.length === 1 ? selectedCategories[0] : `${selectedCategories.length} cat.`}
                  </span>
                )}
              </div>
              
              <ChevronDown className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ml-0.5 ${isCategoryFilterOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Popover */}
            {isCategoryFilterOpen && (
              <div className="absolute left-0 mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-[#141416] border border-[#2A2A2D] rounded-lg shadow-2xl p-2.5 z-50 text-xs">
                
                {/* Header with Title & Selection Counter */}
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div className="flex items-center gap-1.5 font-semibold text-white text-xs">
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    <span>Catégories</span>
                  </div>
                  {selectedCategories.length > 0 ? (
                    <span className="text-[11px] text-blue-400 font-semibold">
                      {selectedCategories.length} sélectionnée{selectedCategories.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-500">Toutes</span>
                  )}
                </div>

                {/* Search & Quick Creation Field */}
                <div className="flex items-center gap-1.5 mb-2">
                  <input
                    type="text"
                    placeholder="Rechercher ou créer une catégorie..."
                    value={categoryFilterSearch}
                    onChange={(e) => setCategoryFilterSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategory();
                      }
                    }}
                    className="flex-1 bg-[#1C1C1E] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  {categoryFilterSearch.trim() && (
                    <button
                      type="button"
                      onClick={() => handleCreateCategory()}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap transition-colors"
                      title="Créer cette nouvelle catégorie"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Créer</span>
                    </button>
                  )}
                </div>

                {/* Category List */}
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  {filteredCategoriesInDropdown.length === 0 ? (
                    <div className="py-3 text-center text-gray-500 text-xs">
                      {categoryFilterSearch.trim() ? (
                        <div>
                          <span>Aucune catégorie correspondante.</span>
                          <button
                            type="button"
                            onClick={() => handleCreateCategory()}
                            className="block mx-auto mt-1 text-blue-400 font-semibold hover:underline"
                          >
                            + Créer &quot;{categoryFilterSearch.trim()}&quot;
                          </button>
                        </div>
                      ) : (
                        'Aucune catégorie disponible'
                      )}
                    </div>
                  ) : (
                    filteredCategoriesInDropdown.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.name);
                      return (
                        <div
                          key={cat.name}
                          onClick={() => toggleCategoryFilter(cat.name)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-600/15 text-blue-300 font-medium'
                              : 'hover:bg-[#1C1C1E] text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="truncate">{cat.name}</span>
                            {cat.count > 0 && (
                              <span className="text-[10px] text-gray-400 bg-[#0A0A0B] px-1.5 py-0.2 rounded border border-[#222224]">
                                {cat.count}
                              </span>
                            )}
                          </div>
                          <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors ${
                            isSelected 
                              ? 'bg-blue-600 border-blue-500 text-white' 
                              : 'border-[#444] bg-[#1C1C1E]'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer bar */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#222224]">
                  {selectedCategories.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSelectedCategories([])}
                      className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors"
                    >
                      Tout désélectionner
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCategoryFilterOpen(false)}
                    className="px-3 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-[11px] font-medium border border-[#333] transition-colors"
                  >
                    Fermer
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Author Filter Dropdown */}
          <div className="relative w-full md:w-auto min-w-0" ref={authorFilterRef}>
            <div
              onClick={() => setIsAuthorFilterOpen(!isAuthorFilterOpen)}
              className={`h-[34px] w-full bg-[#1C1C1E] border hover:border-[#444] rounded-md px-2 sm:px-2.5 py-1 text-xs text-gray-200 cursor-pointer flex items-center justify-between gap-1 sm:gap-1.5 transition-colors ${
                selectedAuthors.length > 0
                  ? 'border-blue-500/50 bg-blue-950/20'
                  : 'border-[#333]'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
                <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                {selectedAuthors.length === 0 ? (
                  <span className="text-gray-300 truncate text-[11px] sm:text-xs">Auteurs</span>
                ) : (
                  <span className="text-blue-300 font-semibold truncate text-[11px] sm:text-xs">
                    {selectedAuthors.length === 1 ? selectedAuthors[0] : `${selectedAuthors.length} aut.`}
                  </span>
                )}
              </div>
              
              <ChevronDown className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ml-0.5 ${isAuthorFilterOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Popover */}
            {isAuthorFilterOpen && (
              <div className="absolute left-0 mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-[#141416] border border-[#2A2A2D] rounded-lg shadow-2xl p-2.5 z-50 text-xs">
                
                {/* Header with Title & Selection Counter */}
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div className="flex items-center gap-1.5 font-semibold text-white text-xs">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Auteurs</span>
                  </div>
                  {selectedAuthors.length > 0 ? (
                    <span className="text-[11px] text-blue-400 font-semibold">
                      {selectedAuthors.length} sélectionné{selectedAuthors.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-500">Tous</span>
                  )}
                </div>

                {/* Search Field */}
                <div className="flex items-center gap-1.5 mb-2">
                  <input
                    type="text"
                    placeholder="Rechercher un auteur..."
                    value={authorFilterSearch}
                    onChange={(e) => setAuthorFilterSearch(e.target.value)}
                    className="flex-1 bg-[#1C1C1E] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  {authorFilterSearch && (
                    <button
                      type="button"
                      onClick={() => setAuthorFilterSearch('')}
                      className="text-gray-400 hover:text-white p-1"
                      title="Effacer la recherche"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Author List with checkboxes */}
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  {filteredAuthorsInDropdown.length === 0 ? (
                    <div className="py-3 text-center text-gray-500 text-xs">
                      Aucun auteur trouvé
                    </div>
                  ) : (
                    filteredAuthorsInDropdown.map((authorItem) => {
                      const isSelected = selectedAuthors.includes(authorItem.name);
                      return (
                        <div
                          key={authorItem.name}
                          onClick={() => toggleAuthorFilter(authorItem.name)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-600/15 text-blue-300 font-medium'
                              : 'hover:bg-[#1C1C1E] text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="truncate">{authorItem.name}</span>
                            {authorItem.count > 0 && (
                              <span className="text-[10px] text-gray-400 bg-[#0A0A0B] px-1.5 py-0.2 rounded border border-[#222224]">
                                {authorItem.count}
                              </span>
                            )}
                          </div>
                          <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors ${
                            isSelected 
                              ? 'bg-blue-600 border-blue-500 text-white' 
                              : 'border-[#444] bg-[#1C1C1E]'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer bar */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#222224]">
                  {selectedAuthors.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSelectedAuthors([])}
                      className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors"
                    >
                      Tout désélectionner
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAuthorFilterOpen(false)}
                    className="px-3 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-[11px] font-medium border border-[#333] transition-colors"
                  >
                    Fermer
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Key Filter Dropdown with Checkboxes */}
          <div className="relative w-full md:w-auto min-w-0" ref={keyFilterRef}>
            <div
              onClick={() => setIsKeyFilterOpen(!isKeyFilterOpen)}
              className={`h-[34px] w-full bg-[#1C1C1E] border hover:border-[#444] rounded-md px-2 sm:px-2.5 py-1 text-xs text-gray-200 cursor-pointer flex items-center justify-between gap-1 sm:gap-1.5 transition-colors ${
                selectedKeys.length > 0
                  ? 'border-amber-500/50 bg-amber-950/20'
                  : 'border-[#333]'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
                <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {selectedKeys.length === 0 ? (
                  <span className="text-gray-300 truncate text-[11px] sm:text-xs">Tonalités</span>
                ) : (
                  <span className="text-amber-300 font-semibold truncate text-[11px] sm:text-xs">
                    {selectedKeys.length === 1 ? selectedKeys[0] : `${selectedKeys.length} ton.`}
                  </span>
                )}
              </div>
              
              <ChevronDown className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ml-0.5 ${isKeyFilterOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Popover */}
            {isKeyFilterOpen && (
              <div className="absolute left-0 mt-1.5 w-64 sm:w-72 max-w-[calc(100vw-2rem)] bg-[#141416] border border-[#2A2A2D] rounded-lg shadow-2xl p-2.5 z-50 text-xs">
                
                {/* Header with Title & Selection Counter */}
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div className="flex items-center gap-1.5 font-semibold text-white text-xs">
                    <Music className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tonalités</span>
                  </div>
                  {selectedKeys.length > 0 ? (
                    <span className="text-[11px] text-amber-400 font-semibold">
                      {selectedKeys.length} sélectionnée{selectedKeys.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-500">Toutes</span>
                  )}
                </div>

                {/* Search Field */}
                <div className="flex items-center gap-1.5 mb-2">
                  <input
                    type="text"
                    placeholder="Rechercher une tonalité..."
                    value={keyFilterSearch}
                    onChange={(e) => setKeyFilterSearch(e.target.value)}
                    className="flex-1 bg-[#1C1C1E] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                  {keyFilterSearch && (
                    <button
                      type="button"
                      onClick={() => setKeyFilterSearch('')}
                      className="text-gray-400 hover:text-white p-1"
                      title="Effacer la recherche"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Keys List with checkboxes */}
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  {filteredKeysInDropdown.length === 0 ? (
                    <div className="py-3 text-center text-gray-500 text-xs">
                      Aucune tonalité trouvée
                    </div>
                  ) : (
                    filteredKeysInDropdown.map((keyItem) => {
                      const isSelected = selectedKeys.includes(keyItem.name);
                      return (
                        <div
                          key={keyItem.name}
                          onClick={() => toggleKeyFilter(keyItem.name)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-amber-500/15 text-amber-300 font-medium'
                              : 'hover:bg-[#1C1C1E] text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="truncate font-semibold">{keyItem.name}</span>
                            {keyItem.count > 0 && (
                              <span className="text-[10px] text-gray-400 bg-[#0A0A0B] px-1.5 py-0.2 rounded border border-[#222224]">
                                {keyItem.count}
                              </span>
                            )}
                          </div>
                          <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors ${
                            isSelected 
                              ? 'bg-amber-500 border-amber-400 text-black font-bold' 
                              : 'border-[#444] bg-[#1C1C1E]'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer bar */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#222224]">
                  {selectedKeys.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSelectedKeys([])}
                      className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors"
                    >
                      Tout désélectionner
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsKeyFilterOpen(false)}
                    className="px-3 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-[11px] font-medium border border-[#333] transition-colors"
                  >
                    Fermer
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Language Filter Dropdown with Checkboxes */}
          <div className="relative w-full md:w-auto min-w-0" ref={languageFilterRef}>
            <div
              onClick={() => setIsLanguageFilterOpen(!isLanguageFilterOpen)}
              className={`h-[34px] w-full bg-[#1C1C1E] border hover:border-[#444] rounded-md px-2 sm:px-2.5 py-1 text-xs text-gray-200 cursor-pointer flex items-center justify-between gap-1 sm:gap-1.5 transition-colors ${
                selectedLanguages.length > 0
                  ? 'border-indigo-500/50 bg-indigo-950/20'
                  : 'border-[#333]'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
                <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                {selectedLanguages.length === 0 ? (
                  <span className="text-gray-300 truncate text-[11px] sm:text-xs">Langues</span>
                ) : (
                  <span className="text-indigo-300 font-semibold truncate text-[11px] sm:text-xs">
                    {selectedLanguages.length === 1 ? selectedLanguages[0] : `${selectedLanguages.length} lang.`}
                  </span>
                )}
              </div>
              
              <ChevronDown className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ml-0.5 ${isLanguageFilterOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Popover */}
            {isLanguageFilterOpen && (
              <div className="absolute left-0 mt-1.5 w-64 sm:w-72 max-w-[calc(100vw-2rem)] bg-[#141416] border border-[#2A2A2D] rounded-lg shadow-2xl p-2.5 z-50 text-xs">
                
                {/* Header with Title & Selection Counter */}
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div className="flex items-center gap-1.5 font-semibold text-white text-xs">
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Langues</span>
                  </div>
                  {selectedLanguages.length > 0 ? (
                    <span className="text-[11px] text-indigo-400 font-semibold">
                      {selectedLanguages.length} sélectionnée{selectedLanguages.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-500">Toutes</span>
                  )}
                </div>

                {/* Search Field */}
                <div className="flex items-center gap-1.5 mb-2">
                  <input
                    type="text"
                    placeholder="Rechercher une langue..."
                    value={languageFilterSearch}
                    onChange={(e) => setLanguageFilterSearch(e.target.value)}
                    className="flex-1 bg-[#1C1C1E] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  {languageFilterSearch && (
                    <button
                      type="button"
                      onClick={() => setLanguageFilterSearch('')}
                      className="text-gray-400 hover:text-white p-1"
                      title="Effacer la recherche"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Languages List with checkboxes */}
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  {filteredLanguagesInDropdown.length === 0 ? (
                    <div className="py-3 text-center text-gray-500 text-xs">
                      Aucune langue trouvée
                    </div>
                  ) : (
                    filteredLanguagesInDropdown.map((langItem) => {
                      const isSelected = selectedLanguages.includes(langItem.name);
                      return (
                        <div
                          key={langItem.name}
                          onClick={() => toggleLanguageFilter(langItem.name)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-600/15 text-indigo-300 font-medium'
                              : 'hover:bg-[#1C1C1E] text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="truncate">{langItem.name}</span>
                            {langItem.count > 0 && (
                              <span className="text-[10px] text-gray-400 bg-[#0A0A0B] px-1.5 py-0.2 rounded border border-[#222224]">
                                {langItem.count}
                              </span>
                            )}
                          </div>
                          <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-500 text-white' 
                              : 'border-[#444] bg-[#1C1C1E]'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer bar */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#222224] gap-2">
                  <div className="flex items-center gap-2">
                    {selectedLanguages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedLanguages([])}
                        className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors"
                      >
                        Tout désélectionner
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = await autoDetectSongLanguages();
                        setExportNotification(
                          updated > 0 
                            ? `Langues devinées et mises à jour pour ${updated} chant${updated > 1 ? 's' : ''}`
                            : 'Toutes les langues sont déjà synchronisées'
                        );
                        setTimeout(() => setExportNotification(null), 3000);
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
                      title="Deviner et actualiser automatiquement la langue de tous les chants du répertoire"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Tout deviner</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLanguageFilterOpen(false)}
                    className="px-3 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-[11px] font-medium border border-[#333] transition-colors"
                  >
                    Fermer
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Mode affichage: Grille ou Liste Alphabetique sur grand ecran */}
          <div className="hidden md:flex items-center justify-center bg-[#1C1C1E] border border-[#333] rounded-md p-0.5 h-[34px] shrink-0">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`px-2.5 h-full flex items-center justify-center rounded text-xs font-semibold transition-all ${
                effectiveViewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Affichage en grille"
              aria-label="Affichage en grille"
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('alphabetical')}
              className={`px-2.5 h-full flex items-center justify-center rounded text-xs font-semibold transition-all ${
                effectiveViewMode === 'alphabetical'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Affichage en liste alphabétique"
              aria-label="Affichage en liste alphabétique"
            >
              <List className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {(selectedCategories.length > 0 || selectedAuthors.length > 0 || selectedKeys.length > 0 || selectedLanguages.length > 0) && (
        <div className="flex items-center flex-wrap gap-1.5 mb-4 px-1">
          {selectedKeys.length > 0 && (
            <>
              <span className="text-[11px] text-gray-400 flex items-center gap-1 mr-1">
                <Music className="w-3 h-3 text-amber-400" />
                <span>Tonalité{selectedKeys.length > 1 ? 's' : ''} :</span>
              </span>
              {selectedKeys.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium"
                >
                  <span>{k}</span>
                  <button
                    onClick={() => toggleKeyFilter(k)}
                    className="hover:text-white transition-colors"
                    title="Supprimer ce filtre de tonalité"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </>
          )}
          {selectedLanguages.length > 0 && (
            <>
              <span className="text-[11px] text-gray-400 flex items-center gap-1 mr-1 ml-1">
                <Globe className="w-3 h-3 text-indigo-400" />
                <span>Langue{selectedLanguages.length > 1 ? 's' : ''} :</span>
              </span>
              {selectedLanguages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-medium"
                >
                  <span>{lang}</span>
                  <button
                    onClick={() => toggleLanguageFilter(lang)}
                    className="hover:text-white transition-colors"
                    title="Supprimer ce filtre de langue"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </>
          )}
          {selectedCategories.length > 0 && (
            <>
              <span className="text-[11px] text-gray-400 flex items-center gap-1 mr-1 ml-1">
                <Tag className="w-3 h-3 text-blue-400" />
                <span>Catégorie{selectedCategories.length > 1 ? 's' : ''} :</span>
              </span>
              {selectedCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-medium"
                >
                  <span>{cat}</span>
                  <button
                    onClick={() => toggleCategoryFilter(cat)}
                    className="hover:text-white transition-colors"
                    title="Supprimer ce filtre"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </>
          )}
          {selectedAuthors.length > 0 && (
            <>
              <span className="text-[11px] text-gray-400 flex items-center gap-1 mr-1 ml-1">
                <User className="w-3 h-3 text-blue-400" />
                <span>Auteur{selectedAuthors.length > 1 ? 's' : ''} :</span>
              </span>
              {selectedAuthors.map((author) => (
                <span
                  key={author}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-medium"
                >
                  <span>{author}</span>
                  <button
                    onClick={() => toggleAuthorFilter(author)}
                    className="hover:text-white transition-colors"
                    title="Supprimer ce filtre d'auteur"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </>
          )}
          <button
            onClick={() => {
              setSelectedCategories([]);
              setSelectedAuthors([]);
              setSelectedKeys([]);
              setSelectedLanguages([]);
            }}
            className="text-[11px] text-gray-400 hover:text-white ml-2 underline"
          >
            Tout effacer
          </button>
        </div>
      )}

      {/* Song List Cards or Alphabetical List */}
      {filteredSongs.length === 0 ? (
        <div className="text-center py-16 bg-[#111112] rounded-lg border border-[#222224] p-6">
          <Music className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-300">Aucun chant trouvé</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedKeys.length > 0 || selectedLanguages.length > 0 || selectedCategories.length > 0 || selectedAuthors.length > 0
              ? "Essayez de modifier vos critères de recherche ou vos filtres."
              : "Commencez par ajouter votre premier chant ou charger les chants de démonstration."}
          </p>
        </div>
      ) : effectiveViewMode === 'grid' ? (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3">
          {filteredSongs.map((song) => renderSongCard(song))}
        </div>
      ) : (
        /* Alphabetical 1-Column List View */
        <div className="relative">
          {/* Top Quick Letters Ribbon */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-4 scrollbar-none border-b border-[#222224]">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1.5 flex items-center gap-1">
              <span>Lettres :</span>
            </span>
            {alphabeticalGroups.map((group) => {
              const isActive = activeLetter === group.letter;
              return (
                <button
                  key={group.letter}
                  type="button"
                  onClick={() => scrollToLetter(group.letter)}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs scale-105'
                      : 'bg-[#18181A] text-gray-300 hover:text-white hover:bg-[#252528] border border-[#262629]'
                  }`}
                >
                  {group.letter}
                </button>
              );
            })}
          </div>

          {/* Vertical Alphabet Jump Bar */}
          <div 
            className="fixed right-1 sm:right-2 top-24 bottom-16 z-30 flex flex-col justify-center items-center select-none pointer-events-auto"
            aria-label="Barre alphabétique"
          >
            <div 
              className="bg-[#111112]/95 backdrop-blur-md border border-[#2B2B30] rounded-full py-1.5 px-0.5 sm:px-1 shadow-2xl flex flex-col items-center justify-between h-full max-h-[75vh] overflow-hidden"
              onTouchMove={handleScrubberTouch}
            >
              {ALL_LETTERS.map((letter) => {
                const hasSongs = availableLettersSet.has(letter);
                const isActive = activeLetter === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    data-letter={letter}
                    onClick={() => hasSongs && scrollToLetter(letter)}
                    disabled={!hasSongs}
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white scale-125 shadow-md z-10'
                        : hasSongs
                          ? 'text-gray-300 hover:text-white hover:bg-blue-600/30 cursor-pointer'
                          : 'text-gray-600 opacity-40 cursor-default'
                    }`}
                    title={hasSongs ? `Aller à la lettre ${letter}` : `Aucun chant commençant par ${letter}`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Single-Column List of Chants */}
          <div className="space-y-6 pr-6 sm:pr-8">
            {alphabeticalGroups.map((group) => (
              <div
                key={group.letter}
                id={`section-letter-${group.letter}`}
                data-letter-section={group.letter}
                className="scroll-mt-24"
              >
                {/* Sticky Letter Header */}
                <div className="sticky top-16 z-20 py-1.5 px-3 bg-[#0A0A0B]/95 backdrop-blur-md border-b border-[#222224] flex items-center justify-between mb-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-md bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                      {group.letter}
                    </span>
                    {sortBy === 'artist' && (
                      <span className="text-xs text-gray-400 font-medium">
                        Auteurs commençant par {group.letter}
                      </span>
                    )}
                  </div>
                </div>

                {/* List of songs */}
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3">
                  {group.songs.map((song) => renderSongCard(song))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Gérer les catégories du chant */}
      {(() => {
        const currentSongForCategories = openCategorySongId ? songs.find(s => s.id === openCategorySongId) : null;
        if (!currentSongForCategories) return null;

        return (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
            onClick={() => {
              setOpenCategorySongId(null);
              setDeletingCatName(null);
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#141416] border border-[#2A2A2D] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-100"
            >
              {/* Modal Header */}
              <div className="p-3.5 sm:p-4 border-b border-[#222224] bg-[#171719] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white tracking-tight truncate">
                      Catégories du chant
                    </h3>
                    <p className="text-xs text-gray-400 truncate">
                      {currentSongForCategories.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpenCategorySongId(null);
                    setDeletingCatName(null);
                  }}
                  className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#222225] transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto">
                {/* Add/Create Input Row */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nouvelle catégorie..."
                    value={quickCatInput}
                    onChange={(e) => setQuickCatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickCreateCategoryForSong(currentSongForCategories.id);
                      }
                    }}
                    className="flex-1 bg-[#1C1C1E] border border-[#333] rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickCreateCategoryForSong(currentSongForCategories.id)}
                    disabled={!quickCatInput.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Créer</span>
                  </button>
                </div>

                {/* Quick Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrer les catégories..."
                    value={quickCatSearch}
                    onChange={(e) => setQuickCatSearch(e.target.value)}
                    className="w-full bg-[#1A1A1D] border border-[#2A2A2D] rounded-lg pl-8 pr-7 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  {quickCatSearch && (
                    <button
                      type="button"
                      onClick={() => setQuickCatSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Category List with Checkbox for this song & Delete Action */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                  {filteredQuickCategories.length === 0 ? (
                    <div className="py-6 text-center text-gray-500 text-xs bg-[#1A1A1D]/40 rounded-lg border border-[#222224]">
                      {quickCatSearch.trim() ? (
                        <div>
                          <span>Aucune catégorie trouvée</span>
                          <button
                            type="button"
                            onClick={() => handleQuickCreateCategoryForSong(currentSongForCategories.id, quickCatSearch)}
                            className="block mx-auto mt-1.5 text-blue-400 font-semibold hover:underline"
                          >
                            + Créer &quot;{quickCatSearch.trim()}&quot;
                          </button>
                        </div>
                      ) : (
                        'Aucune catégorie disponible'
                      )}
                    </div>
                  ) : (
                    filteredQuickCategories.map((cat) => {
                      const isAssigned = (currentSongForCategories.tags || []).some(
                        t => t.trim().toLowerCase() === cat.name.toLowerCase()
                      );
                      const isDeleting = deletingCatName === cat.name;

                      return (
                        <div
                          key={cat.name}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg border transition-colors ${
                            isAssigned
                              ? 'bg-blue-950/30 border-blue-500/50 text-blue-200'
                              : 'bg-[#18181B] border-[#262629] text-gray-300 hover:border-[#38383C]'
                          }`}
                        >
                          <div 
                            onClick={() => toggleTagOnSong(currentSongForCategories.id, cat.name)}
                            className="flex items-center gap-2.5 truncate pr-1 cursor-pointer flex-1 min-w-0"
                            title={isAssigned ? "Retirer ce tag du chant" : "Ajouter ce tag au chant"}
                          >
                            <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors ${
                              isAssigned 
                                ? 'bg-blue-600 border-blue-500 text-white' 
                                : 'border-[#444] bg-[#1C1C1E]'
                            }`}>
                              {isAssigned && <Check className="w-3 h-3 stroke-[2.5]" />}
                            </div>

                            <span className="truncate text-xs sm:text-sm font-medium">{cat.name}</span>

                            {cat.count > 0 ? (
                              <span className="text-[10px] text-gray-400 bg-[#0E0E10] px-1.5 py-0.5 rounded border border-[#222224] shrink-0">
                                {cat.count} {cat.count > 1 ? 'chants' : 'chant'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-500 shrink-0 italic">
                                0 chant
                              </span>
                            )}
                          </div>

                          {/* Delete action with confirmation */}
                          <div className="flex items-center gap-1 shrink-0 ml-1.5">
                            {isDeleting ? (
                              <div className="flex items-center gap-1 bg-rose-950/70 p-1 rounded-md border border-rose-800/50 animate-in fade-in">
                                <button
                                  type="button"
                                  onClick={() => handleQuickDeleteCategory(cat.name)}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition-colors"
                                >
                                  Supprimer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingCatName(null)}
                                  className="px-1.5 py-0.5 rounded bg-[#222] hover:bg-[#333] text-gray-300 text-[10px] transition-colors"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingCatName(cat.name)}
                                className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                                title={`Supprimer définitivement la catégorie ${cat.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:p-3.5 border-t border-[#222224] bg-[#171719] flex items-center justify-between">
                {hiddenCategories.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleResetDefaultCategories}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurer par défaut</span>
                  </button>
                ) : (
                  <span className="text-xs text-gray-500">
                    {allCategoriesWithCounts.length} catégories
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setOpenCategorySongId(null);
                    setDeletingCatName(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#222226] hover:bg-[#2E2E32] text-gray-200 text-xs font-semibold border border-[#333] transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Add / Manage Song in Setlists (Multi-select, Search, Sort & Quick Create) */}
      {addToSetlistSong && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-[#111112] border border-[#222224] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#222224] bg-[#141416] flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <ListPlus className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Ajouter aux Setlists
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-semibold text-white truncate">{addToSetlistSong.title}</span>
                  {addToSetlistSong.artist && (
                    <>
                      <span>•</span>
                      <span className="truncate">{addToSetlistSong.artist}</span>
                    </>
                  )}
                  {addToSetlistSong.key && (
                    <span className="px-1.5 py-0.2 bg-[#222] text-amber-300 rounded text-[10px] font-bold border border-[#333]">
                      {addToSetlistSong.key}
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setAddToSetlistSong(null)}
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#222] transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toolbar: Search, Sort & Quick Create Toggle */}
            <div className="p-3 sm:p-4 border-b border-[#222224] bg-[#0D0D0E] space-y-3">
              {/* Search Bar & Quick Create Button */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={setlistSearchQuery}
                    onChange={(e) => setSetlistSearchQuery(e.target.value)}
                    placeholder="Rechercher une setlist (nom, date)..."
                    className="w-full bg-[#171719] border border-[#2A2A2D] focus:border-blue-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                  />
                  {setlistSearchQuery && (
                    <button
                      onClick={() => setSetlistSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreatingNewSetlist(!isCreatingNewSetlist)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${
                    isCreatingNewSetlist
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-sm'
                      : 'bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 border-[#333] hover:border-[#444]'
                  }`}
                >
                  <Plus className={`w-3.5 h-3.5 transition-transform ${isCreatingNewSetlist ? 'rotate-45' : ''}`} />
                  <span>Nouvelle</span>
                </button>
              </div>

              {/* Quick Create Inline Panel */}
              {isCreatingNewSetlist && (
                <div className="p-3 bg-[#151518] border border-blue-500/30 rounded-lg space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Créer &amp; Ajouter directement</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewSetlist(false)}
                      className="text-[10px] text-gray-400 hover:text-white"
                    >
                      Annuler
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newSetlistName}
                      onChange={(e) => setNewSetlistName(e.target.value)}
                      placeholder="Nom (ex: Culte Dimanche)"
                      className="sm:col-span-2 bg-[#1C1C1E] border border-[#333] focus:border-blue-500 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickCreateSetlist();
                        }
                      }}
                    />
                    <input
                      type="date"
                      value={newSetlistDate}
                      onChange={(e) => setNewSetlistDate(e.target.value)}
                      className="bg-[#1C1C1E] border border-[#333] focus:border-blue-500 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleQuickCreateSetlist}
                      disabled={!newSetlistName.trim()}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors shadow-sm"
                    >
                      Créer &amp; Sélectionner
                    </button>
                  </div>
                </div>
              )}

              {/* Sorting Filter Pills */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <ArrowUpDown className="w-3 h-3 text-gray-500" />
                  <span>Trier par :</span>
                </div>
                <div className="flex items-center gap-1 bg-[#141416] p-0.5 rounded-lg border border-[#222]">
                  <button
                    type="button"
                    onClick={() => setSetlistSortBy('recent')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      setlistSortBy === 'recent'
                        ? 'bg-[#252528] text-white shadow-sm font-semibold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Récent
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetlistSortBy('name')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      setlistSortBy === 'name'
                        ? 'bg-[#252528] text-white shadow-sm font-semibold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    A-Z
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetlistSortBy('count')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      setlistSortBy === 'count'
                        ? 'bg-[#252528] text-white shadow-sm font-semibold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Nb Chants
                  </button>
                </div>
              </div>
            </div>

            {/* Setlists Multi-select List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 min-h-[220px] max-h-[380px]">
              {setlists.length === 0 ? (
                <div className="text-center py-8 bg-[#0A0A0B] border border-[#222224] rounded-xl p-4">
                  <ListPlus className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-300 font-semibold">Aucune setlist disponible</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Créez votre première setlist pour y inclure ce chant.</p>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewSetlist(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer une setlist</span>
                  </button>
                </div>
              ) : filteredAndSortedSetlists.length === 0 ? (
                <div className="text-center py-8 bg-[#0A0A0B] border border-[#222224] rounded-xl p-4">
                  <p className="text-xs text-gray-400">
                    Aucune setlist ne correspond à « <strong className="text-white">{setlistSearchQuery}</strong> »
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSetlistName(setlistSearchQuery.trim());
                      setIsCreatingNewSetlist(true);
                    }}
                    className="mt-2.5 text-xs text-blue-400 hover:text-blue-300 font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Créer la setlist « {setlistSearchQuery.trim()} »</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 pb-1">
                    <span>Sélectionnez les setlists ({filteredAndSortedSetlists.length} disponible{filteredAndSortedSetlists.length > 1 ? 's' : ''})</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = filteredAndSortedSetlists.map(s => s.id);
                          setSelectedSetlistIds(prev => Array.from(new Set([...prev, ...allIds])));
                        }}
                        className="text-blue-400 hover:underline"
                      >
                        Tout cocher
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          const visibleIds = new Set(filteredAndSortedSetlists.map(s => s.id));
                          setSelectedSetlistIds(prev => prev.filter(id => !visibleIds.has(id)));
                        }}
                        className="text-gray-400 hover:text-white hover:underline"
                      >
                        Décocher
                      </button>
                    </div>
                  </div>

                  {filteredAndSortedSetlists.map(st => {
                    const isSelected = selectedSetlistIds.includes(st.id);
                    const wasAlreadyIn = st.songIds.includes(addToSetlistSong.id);

                    return (
                      <div
                        key={st.id}
                        onClick={() => handleToggleSetlistSelection(st.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#181C28] border-blue-500/60 shadow-sm text-white'
                            : 'bg-[#0E0E10] border-[#222224] text-gray-300 hover:bg-[#151518] hover:border-[#333]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0 text-blue-400">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 fill-blue-500/20 text-blue-400" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                {st.name}
                              </p>
                              {wasAlreadyIn && (
                                <span className="shrink-0 text-[9px] px-1.5 py-0.2 rounded bg-[#1F1F23] text-gray-400 border border-[#333]">
                                  Déjà présent
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Music className="w-2.5 h-2.5 text-gray-500" />
                                <span>{st.songIds.length} chant{st.songIds.length > 1 ? 's' : ''}</span>
                              </span>
                              {(() => {
                                const totalSecs = st.songIds.reduce((tot, sId) => {
                                  const targetSong = songs.find(s => s.id === sId);
                                  return tot + parseDurationToSeconds(targetSong?.duration);
                                }, 0);
                                return totalSecs > 0 ? (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-cyan-400 font-mono">
                                      <Clock className="w-2.5 h-2.5 text-cyan-400" />
                                      <span>{formatSetlistDuration(totalSecs)}</span>
                                    </span>
                                  </>
                                ) : null;
                              })()}
                              {st.date && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-2.5 h-2.5 text-gray-500" />
                                    <span>{st.date}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 pl-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-[#1A1A1D] text-gray-500 border-[#2A2A2D]'
                          }`}>
                            {isSelected ? 'Inclus' : 'Non inclus'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-[#222224] bg-[#141416] flex items-center justify-between gap-3">
              <div className="text-xs text-gray-400">
                <span className="font-bold text-white">{selectedSetlistIds.length}</span> setlist{selectedSetlistIds.length > 1 ? 's' : ''} sélectionnée{selectedSetlistIds.length > 1 ? 's' : ''}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddToSetlistSong(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-[#222] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveSetlistSelection}
                  disabled={isSavingSetlists}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-all shadow-sm active:scale-95"
                >
                  {isSavingSetlists ? (
                    <span>Enregistrement...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Enregistrer</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Universal In-App Song Importer & External Search */}
      <SongImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSong={async (songData) => {
          const newId = await importSong(songData);
          setSearchQuery('');
          setSelectedCategories([]);
          setSelectedAuthors([]);
          setSelectedKeys([]);
          setSelectedLanguages([]);
          return newId;
        }}
        onImportAndEdit={async (songData) => {
          const newId = await importSong(songData);
          const createdSong: Song = {
            ...songData,
            id: newId,
            groupId: currentUser?.currentGroupId || 'default-group',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setSearchQuery('');
          setSelectedCategories([]);
          setSelectedAuthors([]);
          setSelectedKeys([]);
          setSelectedLanguages([]);
          setSelectedSong(createdSong);
          setActiveTab('editor');
        }}
        initialSource={importSource}
      />

      {/* Modal: Language Versions & Relations */}
      {languageModalSong && (
        <LanguageVersionModal
          song={languageModalSong}
          isOpen={!!languageModalSong}
          onClose={() => setLanguageModalSong(null)}
        />
      )}

      {/* Floating Multi-Select Action Bar - Appears only when at least one song is selected */}
      {selectedSongIds.length > 0 && (
        <div 
          id="floating-selection-toolbar"
          className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#161618]/95 backdrop-blur-md border border-[#333] shadow-2xl rounded-2xl px-2 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2.5 text-white max-w-[calc(100vw-16px)] sm:max-w-fit flex-nowrap overflow-x-auto scrollbar-none animate-in slide-in-from-bottom-5 duration-200 select-none"
        >
          {/* Badge count */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 shrink-0">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
            <span className="text-xs font-bold font-mono whitespace-nowrap">
              {selectedSongIds.length}
            </span>
            <span className="hidden sm:inline text-[11px] font-medium text-blue-200/90 whitespace-nowrap">
              {selectedSongIds.length > 1 ? 'sélectionnés' : 'sélectionné'}
            </span>
          </div>

          <div className="h-5 w-px bg-white/10 shrink-0" />

          {/* Action Buttons - strictly single line (flex-nowrap) */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
            {/* Setlist Button */}
            <button
              type="button"
              id="toolbar-assign-setlist-btn"
              onClick={handleOpenBatchSetlistModal}
              className="h-8 sm:h-8.5 px-2 sm:px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-sm border border-indigo-500/60 cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
              title="Ajouter à une setlist"
              aria-label="Ajouter à une setlist"
            >
              <ListPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Setlist</span>
            </button>

            {/* Category Button */}
            <button
              type="button"
              id="toolbar-assign-category-btn"
              onClick={handleOpenBatchCategoryModal}
              className="h-8 sm:h-8.5 px-2 sm:px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-sm border border-blue-500/60 cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
              title="Assigner à une catégorie"
              aria-label="Assigner à une catégorie"
            >
              <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Catégorie</span>
            </button>

            {/* Language Button */}
            <button
              type="button"
              id="toolbar-assign-language-btn"
              onClick={handleOpenBatchLanguageModal}
              className="h-8 sm:h-8.5 px-2 sm:px-3 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 active:scale-95 text-white shadow-sm border border-violet-500/60 cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
              title="Déterminer la langue des chants sélectionnés"
              aria-label="Déterminer la langue des chants sélectionnés"
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Langue</span>
            </button>

            {/* Export Button */}
            <button
              type="button"
              id="toolbar-export-btn"
              onClick={() => setIsMultiExportModalOpen(true)}
              className="h-8 sm:h-8.5 px-2 sm:px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-sm border border-emerald-500/60 cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
              title="Exporter les chants sélectionnés"
              aria-label="Exporter les chants sélectionnés"
            >
              <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Exporter</span>
            </button>

            {/* Delete Button */}
            <button
              type="button"
              id="toolbar-delete-btn"
              onClick={() => setIsMultiDeleteModalOpen(true)}
              className="h-8 sm:h-8.5 px-2 sm:px-3 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-sm border border-rose-500/60 cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
              title="Supprimer les chants sélectionnés"
              aria-label="Supprimer les chants sélectionnés"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Supprimer</span>
            </button>
          </div>

          <div className="h-5 w-px bg-white/10 shrink-0" />

          {/* Utility Buttons: Toggle Select All & Close */}
          <div className="flex items-center gap-1 flex-nowrap shrink-0">
            {/* Toggle Select All */}
            <button
              type="button"
              id="toolbar-toggle-all-btn"
              onClick={toggleSelectAll}
              className="h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-lg bg-[#222226] hover:bg-[#2C2C32] active:scale-95 text-xs font-semibold text-gray-200 border border-[#3A3A40] transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              title={selectedSongIds.length === filteredSongs.length && filteredSongs.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
              aria-label={selectedSongIds.length === filteredSongs.length && filteredSongs.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
            >
              <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
              <span className="hidden md:inline">
                {selectedSongIds.length === filteredSongs.length && filteredSongs.length > 0
                  ? 'Tout désélectionner'
                  : 'Tout sélectionner'}
              </span>
            </button>

            {/* Close / Deselect */}
            <button
              type="button"
              id="toolbar-close-selection-btn"
              onClick={() => {
                setIsMultiSelectMode(false);
                setSelectedSongIds([]);
              }}
              className="h-8 sm:h-8.5 w-8 sm:w-8.5 rounded-lg bg-[#222226] hover:bg-[#2C2C32] active:scale-95 text-gray-400 hover:text-white border border-[#3A3A40] transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Désélectionner et fermer"
              aria-label="Désélectionner et fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal: Assigner à une catégorie (Multi-sélection) */}
      {isAssignCategoryModalOpen && (
        <div
          id="batch-assign-category-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-assign-category-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isSavingBatchCategories) {
              setIsAssignCategoryModalOpen(false);
              setMultiCategoryInput('');
              setMultiCategorySearch('');
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#141416] border border-[#2A2A2D] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-100"
          >
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-[#222224] bg-[#171719] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 id="batch-assign-category-title" className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    Catégories • {selectedSongIds.length} chant{selectedSongIds.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-xs text-gray-400 truncate">
                    {selectedSongIds.length === 1
                      ? songs.find(s => s.id === selectedSongIds[0])?.title || 'Chant sélectionné'
                      : `${selectedSongIds.length} chants à catégoriser`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="batch-category-close-btn"
                disabled={isSavingBatchCategories}
                onClick={() => {
                  setIsAssignCategoryModalOpen(false);
                  setMultiCategoryInput('');
                  setMultiCategorySearch('');
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#252528] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1">
              {/* Quick create category form */}
              <div className="bg-[#19191C] border border-[#262629] p-2.5 rounded-lg">
                <label className="block text-[11px] font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                  Nouvelle catégorie
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    id="batch-category-new-input"
                    value={multiCategoryInput}
                    onChange={(e) => setMultiCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickCreateBatchCategory();
                      }
                    }}
                    placeholder="Nom de la nouvelle catégorie..."
                    className="flex-1 bg-[#141416] border border-[#333] focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    id="batch-category-create-btn"
                    disabled={!multiCategoryInput.trim() || isSavingBatchCategories}
                    onClick={() => handleQuickCreateBatchCategory()}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer</span>
                  </button>
                </div>
              </div>

              {/* Search & Actions Bar */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      id="batch-category-search-input"
                      value={multiCategorySearch}
                      onChange={(e) => setMultiCategorySearch(e.target.value)}
                      placeholder="Filtrer les catégories..."
                      className="w-full bg-[#18181A] border border-[#2E2E32] focus:border-blue-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
                    />
                    {multiCategorySearch && (
                      <button
                        type="button"
                        onClick={() => setMultiCategorySearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      id="batch-category-select-all-btn"
                      onClick={() => {
                        const namesToAdd = filteredMultiCategories.map(c => c.name);
                        setSelectedBatchCategories(prev => Array.from(new Set([...prev, ...namesToAdd])));
                      }}
                      className="px-2 py-1 rounded text-[11px] font-medium bg-[#222226] hover:bg-[#2C2C32] text-gray-300 hover:text-white border border-[#333] transition-colors"
                    >
                      Tout cocher
                    </button>
                    <button
                      type="button"
                      id="batch-category-deselect-all-btn"
                      onClick={() => {
                        const namesToRemove = new Set(filteredMultiCategories.map(c => c.name.toLowerCase()));
                        setSelectedBatchCategories(prev => prev.filter(c => !namesToRemove.has(c.toLowerCase())));
                      }}
                      className="px-2 py-1 rounded text-[11px] font-medium bg-[#222226] hover:bg-[#2C2C32] text-gray-300 hover:text-white border border-[#333] transition-colors"
                    >
                      Décocher
                    </button>
                  </div>
                </div>

                {/* Selected count info */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 px-0.5">
                  <span>
                    {selectedBatchCategories.length} catégorie{selectedBatchCategories.length > 1 ? 's' : ''} cochée{selectedBatchCategories.length > 1 ? 's' : ''}
                  </span>
                  <span>{filteredMultiCategories.length} disponible{filteredMultiCategories.length > 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Categories list with checkboxes */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {filteredMultiCategories.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-xs">
                    Aucune catégorie trouvée
                  </div>
                ) : (
                  filteredMultiCategories.map((cat) => {
                    const isChecked = selectedBatchCategories.some(c => c.toLowerCase() === cat.name.toLowerCase());
                    const inSelectedCount = selectedSongIds.filter(id => {
                      const s = songs.find(x => x.id === id);
                      return (s?.tags || []).some(t => t.toLowerCase() === cat.name.toLowerCase());
                    }).length;

                    return (
                      <div
                        key={cat.name}
                        id={`batch-category-item-${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => toggleBatchCategory(cat.name)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-blue-950/30 border-blue-500/50 text-blue-100 shadow-sm'
                            : 'bg-[#18181A] hover:bg-[#1E1E22] border-[#26262A] text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Checkbox */}
                          <div
                            className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-all ${
                              isChecked
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'border-[#444] bg-[#161618]'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <Tag className={`w-3.5 h-3.5 shrink-0 ${isChecked ? 'text-blue-400' : 'text-gray-500'}`} />
                          <span className={`text-xs font-medium truncate ${isChecked ? 'text-white' : 'text-gray-200'}`}>
                            {cat.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {selectedSongIds.length > 1 && inSelectedCount > 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                inSelectedCount === selectedSongIds.length
                                  ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                                  : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                              }`}
                            >
                              {inSelectedCount === selectedSongIds.length ? 'Sur tous' : `${inSelectedCount}/${selectedSongIds.length}`}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-gray-400 bg-[#222226] px-1.5 py-0.5 rounded border border-[#2D2D32]">
                            {cat.count}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-3.5 border-t border-[#222224] bg-[#171719] flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400 truncate hidden xs:inline">
                {selectedBatchCategories.length} sélectionnée{selectedBatchCategories.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  id="batch-category-cancel-btn"
                  disabled={isSavingBatchCategories}
                  onClick={() => {
                    setIsAssignCategoryModalOpen(false);
                    setMultiCategoryInput('');
                    setMultiCategorySearch('');
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-[#252528] border border-[#333] transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  id="batch-category-save-btn"
                  disabled={isSavingBatchCategories}
                  onClick={handleSaveBatchCategories}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-sm border border-blue-500 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingBatchCategories ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Enregistrer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Déterminer la langue (Multi-sélection) */}
      {isAssignLanguageModalOpen && (
        <div
          id="batch-assign-language-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-assign-language-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isSavingBatchLanguages) {
              setIsAssignLanguageModalOpen(false);
              setCustomBatchLanguageInput('');
              setBatchLanguageSearch('');
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#141416] border border-[#2A2A2D] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-100"
          >
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-[#222224] bg-[#171719] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 id="batch-assign-language-title" className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    Langue • {selectedSongIds.length} chant{selectedSongIds.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-xs text-gray-400 truncate">
                    {selectedSongIds.length === 1
                      ? songs.find(s => s.id === selectedSongIds[0])?.title || 'Chant sélectionné'
                      : `Attribuer une langue aux ${selectedSongIds.length} chants sélectionnés`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="batch-language-close-btn"
                disabled={isSavingBatchLanguages}
                onClick={() => {
                  setIsAssignLanguageModalOpen(false);
                  setCustomBatchLanguageInput('');
                  setBatchLanguageSearch('');
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#252528] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1">
              {/* Quick Custom Language Input */}
              <div className="bg-[#19191C] border border-[#262629] p-2.5 rounded-lg">
                <label className="block text-[11px] font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                  Autre langue personnalisée
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    id="batch-language-custom-input"
                    value={customBatchLanguageInput}
                    onChange={(e) => {
                      setCustomBatchLanguageInput(e.target.value);
                      if (e.target.value.trim()) {
                        setSelectedBatchLanguage('');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customBatchLanguageInput.trim()) {
                          handleSaveBatchLanguage(customBatchLanguageInput.trim());
                        }
                      }
                    }}
                    placeholder="Exemple : Malgache, Latin, Néerlandais..."
                    className="flex-1 bg-[#141416] border border-[#333] focus:border-violet-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    id="batch-language-apply-custom-btn"
                    disabled={!customBatchLanguageInput.trim() || isSavingBatchLanguages}
                    onClick={() => handleSaveBatchLanguage(customBatchLanguageInput.trim())}
                    className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Appliquer</span>
                  </button>
                </div>
              </div>

              {/* Search Filter */}
              <div className="space-y-2 pt-1">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="batch-language-search-input"
                    value={batchLanguageSearch}
                    onChange={(e) => setBatchLanguageSearch(e.target.value)}
                    placeholder="Filtrer les langues..."
                    className="w-full bg-[#18181A] border border-[#2E2E32] focus:border-violet-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
                  />
                  {batchLanguageSearch && (
                    <button
                      type="button"
                      onClick={() => setBatchLanguageSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400 px-0.5">
                  <span>Sélectionnez une langue à attribuer</span>
                  <span>{filteredBatchLanguages.length} disponibles</span>
                </div>
              </div>

              {/* Language Options List */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {/* Option to Auto-Detect Language automatically */}
                <div
                  id="batch-lang-item-autodetect"
                  onClick={() => {
                    setSelectedBatchLanguage('__AUTO_DETECT__');
                    setCustomBatchLanguageInput('');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none mb-1.5 ${
                    selectedBatchLanguage === '__AUTO_DETECT__' && !customBatchLanguageInput.trim()
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-100 shadow-sm'
                      : 'bg-[#18181A] hover:bg-[#1E1E22] border-[#26262A] text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center border transition-all ${
                        selectedBatchLanguage === '__AUTO_DETECT__' && !customBatchLanguageInput.trim()
                          ? 'border-emerald-500 bg-emerald-600 text-white'
                          : 'border-[#444] bg-[#161618]'
                      }`}
                    >
                      {selectedBatchLanguage === '__AUTO_DETECT__' && !customBatchLanguageInput.trim() && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-white">
                        Deviner automatiquement la langue
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Analyse individuelle du titre et des paroles pour chaque chant
                      </span>
                    </div>
                  </div>
                </div>

                {filteredBatchLanguages.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-xs">
                    Aucune langue correspondante
                  </div>
                ) : (
                  filteredBatchLanguages.map((langItem) => {
                    const isSelected = !customBatchLanguageInput.trim() && selectedBatchLanguage.toLowerCase() === langItem.name.toLowerCase();
                    const inSelectedCount = selectedSongIds.filter(id => {
                      const s = songs.find(x => x.id === id);
                      return (s?.language || '').trim().toLowerCase() === langItem.name.toLowerCase();
                    }).length;

                    return (
                      <div
                        key={langItem.name}
                        id={`batch-lang-item-${langItem.code.toLowerCase()}`}
                        onClick={() => {
                          setSelectedBatchLanguage(langItem.name);
                          setCustomBatchLanguageInput('');
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-violet-950/30 border-violet-500/50 text-violet-100 shadow-sm'
                            : 'bg-[#18181A] hover:bg-[#1E1E22] border-[#26262A] text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Radio circle indicator */}
                          <div
                            className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'border-violet-500 bg-violet-600 text-white'
                                : 'border-[#444] bg-[#161618]'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>

                          {/* Language Code Badge */}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${langItem.badgeClass}`}>
                            {langItem.code}
                          </span>

                          <span className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                            {langItem.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {inSelectedCount > 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                inSelectedCount === selectedSongIds.length
                                  ? 'bg-violet-900/60 text-violet-300 border border-violet-700/50'
                                  : 'bg-[#222226] text-gray-300 border border-[#333]'
                              }`}
                            >
                              {inSelectedCount === selectedSongIds.length
                                ? 'Sur tous'
                                : `${inSelectedCount} sur ${selectedSongIds.length}`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Option to clear language */}
                <div
                  id="batch-lang-item-clear"
                  onClick={() => {
                    setSelectedBatchLanguage('__NONE__');
                    setCustomBatchLanguageInput('');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none mt-2 ${
                    selectedBatchLanguage === '__NONE__' && !customBatchLanguageInput.trim()
                      ? 'bg-rose-950/20 border-rose-500/40 text-rose-200 shadow-sm'
                      : 'bg-[#18181A] hover:bg-[#1E1E22] border-[#26262A] text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center border transition-all ${
                        selectedBatchLanguage === '__NONE__' && !customBatchLanguageInput.trim()
                          ? 'border-rose-500 bg-rose-600 text-white'
                          : 'border-[#444] bg-[#161618]'
                      }`}
                    >
                      {selectedBatchLanguage === '__NONE__' && !customBatchLanguageInput.trim() && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-xs font-medium">
                      Sans langue • Effacer la langue assignée
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-3.5 border-t border-[#222224] bg-[#171719] flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400 truncate hidden xs:inline">
                {customBatchLanguageInput.trim()
                  ? `Langue : ${customBatchLanguageInput.trim()}`
                  : selectedBatchLanguage === '__AUTO_DETECT__'
                  ? 'Deviner selon titre & paroles'
                  : selectedBatchLanguage === '__NONE__'
                  ? 'Effacement de la langue'
                  : selectedBatchLanguage
                  ? `Langue : ${selectedBatchLanguage}`
                  : 'Aucune langue choisie'}
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  id="batch-language-cancel-btn"
                  disabled={isSavingBatchLanguages}
                  onClick={() => {
                    setIsAssignLanguageModalOpen(false);
                    setCustomBatchLanguageInput('');
                    setBatchLanguageSearch('');
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-[#252528] border border-[#333] transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  id="batch-language-save-btn"
                  disabled={
                    isSavingBatchLanguages ||
                    (!selectedBatchLanguage && !customBatchLanguageInput.trim())
                  }
                  onClick={() => {
                    if (customBatchLanguageInput.trim()) {
                      handleSaveBatchLanguage(customBatchLanguageInput.trim());
                    } else if (selectedBatchLanguage === '__AUTO_DETECT__') {
                      handleSaveBatchLanguage('__AUTO_DETECT__');
                    } else if (selectedBatchLanguage === '__NONE__') {
                      handleSaveBatchLanguage('');
                    } else {
                      handleSaveBatchLanguage();
                    }
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white shadow-sm border border-violet-500 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingBatchLanguages ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Appliquer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isAssignSetlistModalOpen && (
        <div
          id="batch-assign-setlist-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-assign-setlist-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isSavingBatchSetlists) {
              setIsAssignSetlistModalOpen(false);
              setMultiSetlistNameInput('');
              setMultiSetlistSearch('');
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#141416] border border-[#2A2A2D] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-100"
          >
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-[#222224] bg-[#171719] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  <ListPlus className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 id="batch-assign-setlist-title" className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    Ajouter aux Setlists
                  </h3>
                  <p className="text-xs text-gray-400 truncate">
                    {selectedSongIds.length === 1
                      ? songs.find(s => s.id === selectedSongIds[0])?.title || 'Chant sélectionné'
                      : `${selectedSongIds.length} chants sélectionnés`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="batch-setlist-close-btn"
                disabled={isSavingBatchSetlists}
                onClick={() => {
                  setIsAssignSetlistModalOpen(false);
                  setMultiSetlistNameInput('');
                  setMultiSetlistSearch('');
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#252528] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1">
              {/* Search & New Setlist Row */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="batch-setlist-search-input"
                    value={multiSetlistSearch}
                    onChange={(e) => setMultiSetlistSearch(e.target.value)}
                    placeholder="Rechercher une setlist par nom ou date..."
                    className="w-full bg-[#18181A] border border-[#2E2E32] focus:border-indigo-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
                  />
                  {multiSetlistSearch && (
                    <button
                      type="button"
                      onClick={() => setMultiSetlistSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  id="batch-setlist-toggle-new-btn"
                  onClick={() => setIsBatchCreatingSetlist(!isBatchCreatingSetlist)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                    isBatchCreatingSetlist
                      ? 'bg-indigo-700 border-indigo-500 text-white'
                      : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouvelle</span>
                </button>
              </div>

              {/* Inline Quick Create Setlist */}
              {isBatchCreatingSetlist && (
                <div className="p-3 rounded-lg bg-[#19191D] border border-indigo-500/30 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-200">Créer une nouvelle setlist</span>
                    <button
                      type="button"
                      onClick={() => setIsBatchCreatingSetlist(false)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      Fermer
                    </button>
                  </div>
                  <input
                    type="text"
                    id="batch-setlist-new-name-input"
                    value={multiSetlistNameInput}
                    onChange={(e) => setMultiSetlistNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickCreateBatchSetlist();
                      }
                    }}
                    placeholder="Nom (ex: Culte Dimanche, Répétition...)"
                    className="w-full bg-[#141416] border border-[#333] focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        id="batch-setlist-new-date-input"
                        value={multiSetlistDateInput}
                        onChange={(e) => setMultiSetlistDateInput(e.target.value)}
                        className="w-full bg-[#141416] border border-[#333] focus:border-indigo-500 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white outline-none transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      id="batch-setlist-create-save-btn"
                      disabled={!multiSetlistNameInput.trim()}
                      onClick={handleQuickCreateBatchSetlist}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Créer & Cocher</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sort Tabs & Select All / Deselect All */}
              <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                {/* Sort tabs */}
                <div className="flex items-center gap-1 bg-[#18181A] p-0.5 rounded-lg border border-[#2E2E32]">
                  <span className="text-[10px] text-gray-500 px-1.5 flex items-center gap-0.5">
                    <ArrowUpDown className="w-2.5 h-2.5" /> Tri :
                  </span>
                  <button
                    type="button"
                    id="batch-setlist-sort-recent"
                    onClick={() => setBatchSetlistSortBy('recent')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      batchSetlistSortBy === 'recent'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Récent
                  </button>
                  <button
                    type="button"
                    id="batch-setlist-sort-name"
                    onClick={() => setBatchSetlistSortBy('name')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      batchSetlistSortBy === 'name'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    A-Z
                  </button>
                  <button
                    type="button"
                    id="batch-setlist-sort-count"
                    onClick={() => setBatchSetlistSortBy('count')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      batchSetlistSortBy === 'count'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Nb Chants
                  </button>
                </div>

                {/* Select / Deselect All */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    id="batch-setlist-select-all-btn"
                    onClick={() => {
                      const idsToAdd = filteredAndSortedMultiSetlists.map(s => s.id);
                      setSelectedBatchSetlistIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
                    }}
                    className="px-2 py-1 rounded text-[11px] font-medium bg-[#222226] hover:bg-[#2C2C32] text-gray-300 hover:text-white border border-[#333] transition-colors"
                  >
                    Tout cocher
                  </button>
                  <button
                    type="button"
                    id="batch-setlist-deselect-all-btn"
                    onClick={() => {
                      const idsToRemove = new Set(filteredAndSortedMultiSetlists.map(s => s.id));
                      setSelectedBatchSetlistIds(prev => prev.filter(id => !idsToRemove.has(id)));
                    }}
                    className="px-2 py-1 rounded text-[11px] font-medium bg-[#222226] hover:bg-[#2C2C32] text-gray-300 hover:text-white border border-[#333] transition-colors"
                  >
                    Décocher
                  </button>
                </div>
              </div>

              {/* Setlists count info */}
              <div className="flex items-center justify-between text-[11px] text-gray-400 px-0.5">
                <span>
                  {selectedBatchSetlistIds.length} setlist{selectedBatchSetlistIds.length > 1 ? 's' : ''} cochée{selectedBatchSetlistIds.length > 1 ? 's' : ''}
                </span>
                <span>{filteredAndSortedMultiSetlists.length} disponible{filteredAndSortedMultiSetlists.length > 1 ? 's' : ''}</span>
              </div>

              {/* Scrollable Setlist list with checkboxes */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {filteredAndSortedMultiSetlists.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-xs">
                    Aucune setlist trouvée
                  </div>
                ) : (
                  filteredAndSortedMultiSetlists.map((st) => {
                    const isChecked = selectedBatchSetlistIds.includes(st.id);
                    const inCount = selectedSongIds.filter(id => st.songIds.includes(id)).length;
                    const isSingleSong = selectedSongIds.length === 1;

                    return (
                      <div
                        key={st.id}
                        id={`batch-setlist-item-${st.id}`}
                        onClick={() => toggleBatchSetlistSelection(st.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-indigo-950/30 border-indigo-500/50 text-indigo-100 shadow-sm'
                            : 'bg-[#18181A] hover:bg-[#1E1E22] border-[#26262A] text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Checkbox */}
                          <div className="shrink-0">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 fill-indigo-500/20 text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-500" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium truncate ${isChecked ? 'text-white' : 'text-gray-200'}`}>
                                {st.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Music className="w-2.5 h-2.5 text-gray-500" />
                                <span>{st.songIds?.length || 0} chant{((st.songIds?.length || 0) > 1) ? 's' : ''}</span>
                              </span>
                              {(() => {
                                const totalSecs = (st.songIds || []).reduce((tot, sId) => {
                                  const targetSong = songs.find(s => s.id === sId);
                                  return tot + parseDurationToSeconds(targetSong?.duration);
                                }, 0);
                                return totalSecs > 0 ? (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-cyan-400 font-mono">
                                      <Clock className="w-2.5 h-2.5 text-cyan-400" />
                                      <span>{formatSetlistDuration(totalSecs)}</span>
                                    </span>
                                  </>
                                ) : null;
                              })()}
                              {st.date && (
                                <>
                                  <span>•</span>
                                  <span>{st.date}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Status badge */}
                          {isSingleSong ? (
                            st.songIds.includes(selectedSongIds[0]) ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#202024] text-gray-300 border border-[#333]">
                                Déjà présent
                              </span>
                            ) : null
                          ) : inCount === selectedSongIds.length ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                              Tous présents
                            </span>
                          ) : inCount > 0 ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                              {inCount}/{selectedSongIds.length} présents
                            </span>
                          ) : null}

                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                              isChecked
                                ? 'bg-indigo-950/60 border-indigo-700/50 text-indigo-300'
                                : 'bg-[#1D1D20] border-[#2A2A2E] text-gray-500'
                            }`}
                          >
                            {isChecked ? 'Inclus' : 'Non inclus'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-3.5 border-t border-[#222224] bg-[#171719] flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400 truncate hidden xs:inline">
                {selectedBatchSetlistIds.length} sélectionnée{selectedBatchSetlistIds.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  id="batch-setlist-cancel-btn"
                  disabled={isSavingBatchSetlists}
                  onClick={() => {
                    setIsAssignSetlistModalOpen(false);
                    setMultiSetlistNameInput('');
                    setMultiSetlistSearch('');
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-[#252528] border border-[#333] transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  id="batch-setlist-save-btn"
                  disabled={isSavingBatchSetlists}
                  onClick={handleSaveBatchSetlists}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-sm border border-indigo-500 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingBatchSetlists ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Enregistrer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmation de suppression multiple */}
      {isMultiDeleteModalOpen && (
        <div
          id="bulk-delete-confirmation-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-dialog-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isDeletingMultiple) setIsMultiDeleteModalOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !isDeletingMultiple) {
              setIsMultiDeleteModalOpen(false);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#141416] border border-[#3A2226] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-100"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#2A1C1E] bg-[#1A1214] flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 id="bulk-delete-dialog-title" className="text-sm font-bold text-white tracking-tight">
                  Supprimer les chants sélectionnés
                </h3>
                <p className="text-xs text-rose-300/80 font-medium">
                  Attention : cette action est irréversible
                </p>
              </div>
            </div>

            {/* Body content */}
            <div className="p-4 space-y-3.5 text-sm text-gray-300">
              <div className="p-3 rounded-lg bg-rose-950/25 border border-rose-900/40 text-xs text-rose-200/90 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer définitivement <strong className="text-white font-bold">{selectedSongIds.length} chant{selectedSongIds.length > 1 ? 's' : ''}</strong> ? Ils seront retirés de votre bibliothèque et de toutes les setlists.
              </div>

              {/* List of songs being deleted */}
              <div>
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Chants concernés</span>
                  <span className="text-gray-400 font-mono text-[11px]">{selectedSongIds.length} sélectionné{selectedSongIds.length > 1 ? 's' : ''}</span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-[#1A1A1D] border border-[#28282B] rounded-lg p-2.5 divide-y divide-[#242428]">
                  {selectedSongIds.map(id => {
                    const s = songs.find(item => item.id === id);
                    if (!s) return null;
                    return (
                      <div key={id} className="text-xs text-gray-300 flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                        <span className="font-medium text-white truncate max-w-[240px]">{s.title}</span>
                        {s.artist && <span className="text-gray-400 text-[11px] truncate max-w-[130px]">{s.artist}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer with confirmation actions */}
            <div className="p-3.5 border-t border-[#222224] bg-[#171719] flex items-center justify-end gap-2.5">
              <button
                type="button"
                id="cancel-bulk-delete-btn"
                disabled={isDeletingMultiple}
                onClick={() => setIsMultiDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#252528] border border-[#333] transition-colors cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                id="confirm-bulk-delete-btn"
                disabled={isDeletingMultiple}
                onClick={handleBatchDelete}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm border border-rose-500 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isDeletingMultiple ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Suppression en cours...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer définitivement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Exporter les chansons sélectionnées */}
      {isMultiExportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isExportingPdf) setIsMultiExportModalOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#141416] border border-[#2A2A2D] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-100"
          >
            <div className="p-4 border-b border-[#222224] bg-[#171719] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Exporter la sélection
                  </h3>
                  <p className="text-xs text-gray-400">
                    {selectedSongIds.length} chant{selectedSongIds.length > 1 ? 's' : ''} sélectionné{selectedSongIds.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMultiExportModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#252528] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-300">
                Choisissez le format d'export souhaité pour vos chants sélectionnés :
              </p>

              {/* Export Option 1: PDF */}
              <button
                type="button"
                disabled={isExportingPdf}
                onClick={handleExportSelectedPdf}
                className="w-full p-3 rounded-xl bg-[#1A1A1D] hover:bg-[#222226] border border-[#2D2D32] hover:border-emerald-500/50 transition-all text-left flex items-start gap-3 cursor-pointer group disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
                  {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    <span>Livret PDF imprimable</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded">Recommandé</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    Mise en page A4 élégante avec accords transposés, structure et grille soignée.
                  </p>
                </div>
              </button>

              {/* Export Option 2: ChordPro / TXT */}
              <button
                type="button"
                onClick={handleExportSelectedChordPro}
                className="w-full p-3 rounded-xl bg-[#1A1A1D] hover:bg-[#222226] border border-[#2D2D32] hover:border-blue-500/50 transition-all text-left flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">
                  <FileCode className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">
                    Format ChordPro texte brut
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    Fichier .txt standard avec métadonnées et balises ChordPro, compatible avec d'autres applications.
                  </p>
                </div>
              </button>

              {/* Export Option 3: JSON */}
              <button
                type="button"
                onClick={handleExportSelectedJson}
                className="w-full p-3 rounded-xl bg-[#1A1A1D] hover:bg-[#222226] border border-[#2D2D32] hover:border-amber-500/50 transition-all text-left flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">
                    Sauvegarde JSON structurée
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    Données complètes pour sauvegarde ou réimportation directe dans SongBook.
                  </p>
                </div>
              </button>
            </div>

            <div className="p-3 border-t border-[#222224] bg-[#171719] flex justify-end">
              <button
                type="button"
                onClick={() => setIsMultiExportModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-[#252528] border border-[#333] transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification for Export */}
      {exportNotification && (
        <div className="fixed top-6 left-6 z-50 bg-[#18181B] text-white border border-[#333] shadow-2xl rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-3 duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportNotification}</span>
        </div>
      )}

    </div>
  );
};
