import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Song, Setlist } from '../types';
import { getSongDuration } from '../utils/chordUtils';
import { 
  DEFAULT_CATEGORY_SUGGESTIONS, 
  getCustomCategories, 
  saveCustomCategories, 
  getHiddenCategories, 
  saveHiddenCategories 
} from '../utils/categoryUtils';
import { PRESET_LANGUAGES, getLanguageMeta } from '../utils/languageUtils';
import { 
  Search, 
  Tag, 
  Music, 
  Globe, 
  SlidersHorizontal, 
  Check, 
  X, 
  Plus, 
  Clock, 
  Gauge,
  ListMusic,
  CheckSquare,
  Square,
  LayoutGrid,
  List,
  ArrowDownAZ
} from 'lucide-react';

interface SetlistAddSongsModalProps {
  isOpen: boolean;
  onClose: () => void;
  setlist: Setlist;
  songs: Song[];
  onToggleSong: (songId: string) => void;
  onAddMultipleSongs?: (songIds: string[]) => void;
  onRemoveMultipleSongs?: (songIds: string[]) => void;
}

const ALL_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'
];

export const SetlistAddSongsModal: React.FC<SetlistAddSongsModalProps> = ({
  isOpen,
  onClose,
  setlist,
  songs,
  onToggleSong,
  onAddMultipleSongs,
  onRemoveMultipleSongs
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'tempo' | 'duration' | 'recent'>('title');

  // Mode d'affichage : standard ou alphabétique
  const [viewMode, setViewMode] = useState<'standard' | 'alphabetical'>(() => {
    const saved = localStorage.getItem('setlist_add_songs_view_mode');
    return (saved === 'alphabetical' || saved === 'standard') ? saved : 'standard';
  });

  const handleSetViewMode = (mode: 'standard' | 'alphabetical') => {
    setViewMode(mode);
    localStorage.setItem('setlist_add_songs_view_mode', mode);
  };

  const modalScrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeLetter, setActiveLetter] = useState<string>('A');

  // Category filter state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [categoryFilterSearch, setCategoryFilterSearch] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>(() => getCustomCategories());
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => getHiddenCategories());
  
  const categoryFilterRef = useRef<HTMLDivElement>(null);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(e.target as Node)) {
        setIsCategoryFilterOpen(false);
      }
    };
    if (isCategoryFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryFilterOpen]);

  // Keys list for filtering
  const availableKeys = useMemo(() => {
    const keys = new Set<string>();
    songs.forEach(s => {
      if (s.key) keys.add(s.key.toUpperCase());
    });
    return Array.from(keys).sort();
  }, [songs]);

  // Languages list for filtering
  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    PRESET_LANGUAGES.forEach(l => set.add(l.name));
    songs.forEach(s => {
      if (s.language && s.language.trim()) set.add(s.language.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [songs]);

  // Unique categories with counts
  const allCategoriesWithCounts = useMemo(() => {
    const counts: Record<string, { count: number; isCustom: boolean; isDefault: boolean }> = {};
    
    DEFAULT_CATEGORY_SUGGESTIONS.forEach(c => {
      if (!hiddenCategories.includes(c)) {
        counts[c] = { count: 0, isCustom: false, isDefault: true };
      }
    });

    customCategories.forEach(c => {
      if (!counts[c]) {
        counts[c] = { count: 0, isCustom: true, isDefault: false };
      } else {
        counts[c].isCustom = true;
      }
    });

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

  const toggleCategoryFilter = (catName: string) => {
    setSelectedCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handleCreateCategory = (nameToCreate?: string) => {
    const trimmed = (nameToCreate || categoryFilterSearch).trim();
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
    if (!selectedCategories.includes(trimmed)) {
      setSelectedCategories(prev => [...prev, trimmed]);
    }
    setCategoryFilterSearch('');
  };

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      // Key filter
      if (selectedKey !== 'all' && song.key.toUpperCase() !== selectedKey) {
        return false;
      }
      // Language filter
      if (selectedLanguage !== 'all') {
        const songLang = (song.language || 'Français').toLowerCase();
        if (songLang !== selectedLanguage.toLowerCase()) {
          return false;
        }
      }
      // Categories filter
      if (selectedCategories.length > 0) {
        const songCats = (song.tags || []).map(t => t.trim().toLowerCase());
        const hasMatchingCat = selectedCategories.some(cat => songCats.includes(cat.toLowerCase()));
        if (!hasMatchingCat) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
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
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
      if (sortBy === 'tempo') return (b.tempo || 0) - (a.tempo || 0);
      if (sortBy === 'duration') {
        const durA = a.duration ? parseInt(a.duration.split(':')[0]) * 60 + parseInt(a.duration.split(':')[1] || '0') : 0;
        const durB = b.duration ? parseInt(b.duration.split(':')[0]) * 60 + parseInt(b.duration.split(':')[1] || '0') : 0;
        return durB - durA;
      }
      if (sortBy === 'recent') return (b.createdAt || '').localeCompare(a.createdAt || '');
      return 0;
    });
  }, [songs, selectedKey, selectedLanguage, selectedCategories, searchQuery, sortBy]);

  // Bulk actions for filtered items
  const allFilteredInSetlist = useMemo(() => {
    if (filteredSongs.length === 0) return false;
    return filteredSongs.every(s => setlist.songIds.includes(s.id));
  }, [filteredSongs, setlist.songIds]);

  const handleToggleAllFiltered = () => {
    if (allFilteredInSetlist) {
      if (onRemoveMultipleSongs) {
        onRemoveMultipleSongs(filteredSongs.map(s => s.id));
      } else {
        filteredSongs.forEach(s => {
          if (setlist.songIds.includes(s.id)) onToggleSong(s.id);
        });
      }
    } else {
      const idsToAdd = filteredSongs.filter(s => !setlist.songIds.includes(s.id)).map(s => s.id);
      if (onAddMultipleSongs) {
        onAddMultipleSongs(idsToAdd);
      } else {
        idsToAdd.forEach(id => onToggleSong(id));
      }
    }
  };

  // Group songs alphabetically for alphabetical view
  const alphabeticalGroups = useMemo(() => {
    const sorted = [...filteredSongs].sort((a, b) => 
      (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' })
    );

    const map = new Map<string, Song[]>();
    sorted.forEach(song => {
      const raw = (song.title || '').trim().charAt(0).toUpperCase();
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
  }, [filteredSongs]);

  const availableLettersSet = useMemo(() => {
    return new Set(alphabeticalGroups.map(g => g.letter));
  }, [alphabeticalGroups]);

  // Scroll to section inside the modal's scroll container
  const scrollToLetter = (letter: string) => {
    const target = document.getElementById(`modal-section-letter-${letter}`);
    if (target && modalScrollContainerRef.current) {
      const container = modalScrollContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const elemRect = target.getBoundingClientRect();
      const relativeTop = elemRect.top - containerRect.top + container.scrollTop - 8;
      container.scrollTo({ top: relativeTop, behavior: 'smooth' });
      setActiveLetter(letter);
    }
  };

  // Touch scrubber handler for mobile
  const handleScrubberTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const letter = target?.getAttribute('data-modal-letter');
    if (letter && availableLettersSet.has(letter)) {
      scrollToLetter(letter);
    }
  };

  // Track active letter on scroll inside modal
  useEffect(() => {
    if (viewMode !== 'alphabetical' || alphabeticalGroups.length === 0) return;
    const container = modalScrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const sections = container.querySelectorAll<HTMLElement>('[data-modal-letter-section]');
      let current = '';

      sections.forEach(sec => {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= containerRect.top + 50) {
          const l = sec.getAttribute('data-modal-letter-section');
          if (l) current = l;
        }
      });

      if (current) {
        setActiveLetter(current);
      } else if (sections.length > 0) {
        const first = sections[0].getAttribute('data-modal-letter-section');
        if (first) setActiveLetter(first);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [viewMode, alphabeticalGroups]);

  // Bulk toggle songs within a specific letter group
  const handleToggleGroup = (groupSongs: Song[]) => {
    const allIn = groupSongs.every(s => setlist.songIds.includes(s.id));
    if (allIn) {
      if (onRemoveMultipleSongs) {
        onRemoveMultipleSongs(groupSongs.map(s => s.id));
      } else {
        groupSongs.forEach(s => {
          if (setlist.songIds.includes(s.id)) onToggleSong(s.id);
        });
      }
    } else {
      const idsToAdd = groupSongs.filter(s => !setlist.songIds.includes(s.id)).map(s => s.id);
      if (onAddMultipleSongs) {
        onAddMultipleSongs(idsToAdd);
      } else {
        idsToAdd.forEach(id => onToggleSong(id));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#111112] border border-[#222224] rounded-xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-[#E0E0E0]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#222224] flex items-center justify-between gap-3 bg-[#151518]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              <ListMusic className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                Ajouter des chants à la setlist {setlist.name}
              </h2>
              <p className="text-[11px] text-gray-400">
                {setlist.songIds.length} chant{setlist.songIds.length > 1 ? 's' : ''} dans la setlist
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-400 hover:text-white border border-[#333] transition-colors shrink-0"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter and Search Bar Container */}
        <div className="p-4 sm:p-5 pb-3 border-b border-[#1E1E22] bg-[#0E0E10] space-y-3">
          
          {/* Main Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par titre, artiste, paroles ou catégories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#333] hover:border-[#444] focus:border-blue-500 rounded-lg pl-10 pr-9 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns and View Mode Switcher in a responsive row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            
            {/* 1. Category Filter Dropdown */}
            <div className="relative min-w-0" ref={categoryFilterRef}>
              <button
                type="button"
                onClick={() => setIsCategoryFilterOpen(prev => !prev)}
                className={`w-full h-[36px] flex items-center justify-between gap-1.5 text-xs rounded-md px-2.5 py-1 border transition-colors ${
                  selectedCategories.length > 0
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 font-semibold'
                    : 'bg-[#1C1C1E] border-[#333] hover:border-[#444] text-gray-300'
                }`}
                title="Filtrer par catégorie"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Tag className={`w-3.5 h-3.5 shrink-0 ${selectedCategories.length > 0 ? 'text-blue-400' : 'text-blue-400'}`} />
                  <span className="truncate">
                    {selectedCategories.length === 0
                      ? 'Catégories'
                      : selectedCategories.length === 1
                      ? selectedCategories[0]
                      : `${selectedCategories.length} catégories`}
                  </span>
                </div>
                {selectedCategories.length > 0 ? (
                  <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-full shrink-0">
                    {selectedCategories.length}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500">▼</span>
                )}
              </button>

              {/* Category Popover */}
              {isCategoryFilterOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-[#141416] border border-[#333] rounded-lg shadow-2xl p-2.5 z-50">
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
                              + Créer {categoryFilterSearch.trim()}
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

            {/* 2. Key Filter */}
            <div className="min-w-0 h-[36px] flex items-center gap-1.5 text-xs text-gray-400 bg-[#1C1C1E] border border-[#333] hover:border-[#444] rounded-md px-2.5 py-1 transition-colors">
              <Music className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="w-full bg-transparent text-gray-200 text-xs font-semibold focus:outline-none cursor-pointer truncate"
              >
                <option value="all" className="bg-[#111112]">Toutes tonalités</option>
                {availableKeys.map(k => (
                  <option key={k} value={k} className="bg-[#111112]">{k}</option>
                ))}
              </select>
            </div>

            {/* 3. Language Filter */}
            <div className="min-w-0 h-[36px] flex items-center gap-1.5 text-xs text-gray-400 bg-[#1C1C1E] border border-[#333] hover:border-[#444] rounded-md px-2.5 py-1 transition-colors">
              <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-transparent text-gray-200 text-xs font-semibold focus:outline-none cursor-pointer truncate"
              >
                <option value="all" className="bg-[#111112]">Toutes les langues</option>
                {availableLanguages.map(lang => (
                  <option key={lang} value={lang} className="bg-[#111112]">{lang}</option>
                ))}
              </select>
            </div>

            {/* 4. Sort Filter */}
            <div className="min-w-0 h-[36px] flex items-center gap-1.5 text-xs text-gray-400 bg-[#1C1C1E] border border-[#333] hover:border-[#444] rounded-md px-2.5 py-1 transition-colors">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-transparent text-gray-200 text-xs font-semibold focus:outline-none cursor-pointer truncate"
              >
                <option value="title" className="bg-[#111112]">Titre A-Z</option>
                <option value="artist" className="bg-[#111112]">Artiste</option>
                <option value="tempo" className="bg-[#111112]">Tempo BPM</option>
                <option value="duration" className="bg-[#111112]">Durée plus longs</option>
                <option value="recent" className="bg-[#111112]">Plus récents</option>
              </select>
            </div>

            {/* 5. Mode d'affichage */}
            <div className="col-span-2 sm:col-span-1 lg:col-span-1 flex items-center justify-center bg-[#1C1C1E] border border-[#333] rounded-md p-0.5 h-[36px] shrink-0">
              <button
                type="button"
                onClick={() => handleSetViewMode('standard')}
                className={`flex-1 h-full flex items-center justify-center rounded transition-all ${
                  viewMode === 'standard'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Liste standard"
                aria-label="Liste standard"
              >
                <List className="w-4 h-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('alphabetical')}
                className={`flex-1 h-full flex items-center justify-center rounded transition-all ${
                  viewMode === 'alphabetical'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Liste alphabétique"
                aria-label="Liste alphabétique"
              >
                <ArrowDownAZ className="w-4 h-4 shrink-0" />
              </button>
            </div>

          </div>

          {/* Active Filter Chips Bar */}
          {(selectedCategories.length > 0 || selectedLanguage !== 'all') && (
            <div className="flex items-center flex-wrap gap-1.5 pt-1">
              {selectedLanguage !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-medium">
                  <Globe className="w-3 h-3" />
                  <span>{selectedLanguage}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage('all')}
                    className="hover:text-white transition-colors"
                    title="Supprimer ce filtre de langue"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedCategories.length > 0 && (
                <>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1 mr-1">
                    <Tag className="w-3 h-3 text-blue-400" />
                    <span>Filtre catégories :</span>
                  </span>
                  {selectedCategories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-medium"
                    >
                      <span>{cat}</span>
                      <button
                        type="button"
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
              <button
                type="button"
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedLanguage('all');
                }}
                className="text-[11px] text-gray-400 hover:text-white ml-2 underline"
              >
                Tout effacer
              </button>
            </div>
          )}

        </div>

        {/* Quick selection status & action bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#121215] border-b border-[#222224] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">
              {filteredSongs.length} chant{filteredSongs.length > 1 ? 's' : ''} trouvé{filteredSongs.length > 1 ? 's' : ''}
            </span>
          </div>
          
          {filteredSongs.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAllFiltered}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 hover:text-white border border-[#333] transition-colors font-medium text-[11px]"
            >
              {allFilteredInSetlist ? (
                <>
                  <Square className="w-3.5 h-3.5 text-rose-400" />
                  <span>Tout retirer</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span>Tout ajouter</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Songs List */}
        <div 
          ref={modalScrollContainerRef}
          className="overflow-y-auto p-4 sm:p-5 space-y-2.5 flex-1 max-h-[55vh] relative"
        >
          {filteredSongs.length === 0 ? (
            <div className="py-12 text-center text-gray-500 bg-[#0A0A0B] rounded-lg border border-[#222224]">
              <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-400">Aucun chant ne correspond à vos critères de recherche</p>
              <p className="text-[11px] text-gray-600 mt-1">Essayez de modifier vos filtres ou termes de recherche</p>
            </div>
          ) : viewMode === 'standard' ? (
            /* Standard List View */
            <div className="space-y-2.5">
              {filteredSongs.map((song) => {
                const isChecked = setlist.songIds.includes(song.id);
                const langMeta = getLanguageMeta(song.language);
                const songDur = getSongDuration(song);

                return (
                  <div
                    key={song.id}
                    onClick={() => onToggleSong(song.id)}
                    className={`group flex items-start justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-blue-950/20 border-blue-500/50 shadow-sm'
                        : 'bg-[#0E0E10] hover:bg-[#151518] border-[#222224] hover:border-[#3a3a40]'
                    }`}
                  >
                    {/* Song Info */}
                    <div className="min-w-0 flex-1">
                      {/* Top Badges: Key, Lang, BPM, Duration */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="px-1.5 py-0.2 rounded bg-[#1C1C1E] border border-[#333] text-gray-200 text-[10px] font-bold">
                          {song.key}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${langMeta.badgeClass}`}>
                          {langMeta.code}
                        </span>
                        {song.tempo && (
                          <span className="px-1.5 py-0.2 rounded bg-[#1C1C1E] border border-[#222224] text-gray-400 text-[10px] font-medium flex items-center gap-1">
                            <Gauge className="w-2.5 h-2.5 text-blue-400" />
                            <span>{song.tempo} BPM</span>
                          </span>
                        )}
                        {songDur && (
                          <span className="px-1.5 py-0.2 rounded bg-[#1C1C1E] border border-[#222224] text-cyan-400 text-[10px] font-medium font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-cyan-400" />
                            <span>{songDur}</span>
                          </span>
                        )}
                      </div>

                      {/* Song Title & Artist */}
                      <h4 className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                        isChecked ? 'text-blue-300' : 'text-white group-hover:text-blue-400'
                      }`}>
                        {song.title}
                      </h4>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {song.artist || 'Auteur inconnu'}
                      </p>

                      {/* Tags / Categories Chips */}
                      {song.tags && song.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1.5">
                          {song.tags.slice(0, 4).map((t, idx) => (
                            <span 
                              key={idx}
                              className="text-[9px] px-1.5 py-0.2 rounded bg-[#16161A] text-gray-400 border border-[#26262B] flex items-center gap-0.5"
                            >
                              <Tag className="w-2 h-2 text-blue-400" />
                              <span>{t}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Top-Right Checkbox */}
                    <div className="shrink-0 pt-0.5">
                      <div 
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          isChecked
                            ? 'bg-blue-600 border-blue-500 text-white shadow-sm ring-2 ring-blue-500/20'
                            : 'border-[#444] bg-[#1C1C1E] group-hover:border-[#666]'
                        }`}
                        title={isChecked ? 'Retirer de la setlist' : 'Ajouter à la setlist'}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Alphabetical 1-Column List View */
            <div className="relative">
              {/* Top Quick Letters Ribbon */}
              <div className="sticky -top-4 sm:-top-5 z-20 -mx-4 sm:-mx-5 px-4 sm:px-5 py-2 bg-[#111112]/95 backdrop-blur-md border-b border-[#222224] flex items-center gap-1 overflow-x-auto scrollbar-none mb-3">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1.5 flex items-center gap-1">
                  <span>Lettres :</span>
                </span>
                {alphabeticalGroups.map((group) => {
                  const isActive = activeLetter === group.letter;
                  const selectedInGroup = group.songs.filter(s => setlist.songIds.includes(s.id)).length;
                  return (
                    <button
                      key={group.letter}
                      type="button"
                      onClick={() => scrollToLetter(group.letter)}
                      className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs scale-105'
                          : 'bg-[#18181A] text-gray-300 hover:text-white hover:bg-[#252528] border border-[#262629]'
                      }`}
                    >
                      <span>{group.letter}</span>
                      {selectedInGroup > 0 && (
                        <span className={`text-[9px] px-1 rounded-full ${
                          isActive ? 'bg-white text-blue-700 font-black' : 'bg-blue-600 text-white font-bold'
                        }`}>
                          {selectedInGroup}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Vertical Alphabet Jump Bar / Scrubber */}
              <div 
                className="absolute right-0 top-12 bottom-4 z-20 flex flex-col justify-center items-center select-none"
                aria-label="Barre alphabétique"
              >
                <div 
                  className="bg-[#141416]/95 backdrop-blur-md border border-[#2B2B30] rounded-full py-1.5 px-0.5 shadow-xl flex flex-col items-center justify-between h-full max-h-[42vh] overflow-hidden"
                  onTouchMove={handleScrubberTouch}
                >
                  {ALL_LETTERS.map((letter) => {
                    const hasSongs = availableLettersSet.has(letter);
                    const isActive = activeLetter === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        data-modal-letter={letter}
                        onClick={() => hasSongs && scrollToLetter(letter)}
                        disabled={!hasSongs}
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full text-[8px] sm:text-[9px] font-mono font-bold flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white scale-125 shadow-md z-10'
                            : hasSongs
                              ? 'text-gray-300 hover:text-white hover:bg-blue-600/30 cursor-pointer'
                              : 'text-gray-600 opacity-30 cursor-default'
                        }`}
                        title={hasSongs ? `Aller à la lettre ${letter}` : `Aucun chant commençant par ${letter}`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grouped Alphabetical List */}
              <div className="space-y-6 pr-6 sm:pr-8">
                {alphabeticalGroups.map((group) => {
                  const selectedCount = group.songs.filter(s => setlist.songIds.includes(s.id)).length;
                  const allInGroupSelected = group.songs.length > 0 && selectedCount === group.songs.length;

                  return (
                    <div
                      key={group.letter}
                      id={`modal-section-letter-${group.letter}`}
                      data-modal-letter-section={group.letter}
                      className="scroll-mt-16"
                    >
                      {/* Sticky Letter Header */}
                      <div className="sticky top-7 z-10 py-1.5 px-3 bg-[#0C0C0E]/95 backdrop-blur-md border-b border-[#222224] flex items-center justify-between mb-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                            {group.letter}
                          </span>
                          {selectedCount > 0 && (
                            <span className="text-[10px] bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold px-1.5 py-0.2 rounded-full">
                              {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleGroup(group.songs)}
                          className="text-[10px] font-medium text-gray-400 hover:text-white px-2 py-0.5 rounded bg-[#1C1C1E] hover:bg-[#252528] border border-[#2E2E32] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {allInGroupSelected ? (
                            <>
                              <Square className="w-2.5 h-2.5 text-rose-400" />
                              <span>Tout retirer</span>
                            </>
                          ) : (
                            <>
                              <CheckSquare className="w-2.5 h-2.5 text-blue-400" />
                              <span>Tout ajouter</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* 1-column list of songs for this letter */}
                      <div className="space-y-1.5">
                        {group.songs.map((song) => {
                          const isChecked = setlist.songIds.includes(song.id);
                          const langMeta = getLanguageMeta(song.language);
                          const songDur = getSongDuration(song);

                          return (
                            <div
                              key={song.id}
                              onClick={() => onToggleSong(song.id)}
                              className={`group flex items-start justify-between gap-3 p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-blue-950/20 border-blue-500/50 shadow-sm'
                                  : 'bg-[#0E0E10] hover:bg-[#151518] border-[#222224] hover:border-[#3a3a40]'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className="px-1.5 py-0.2 rounded bg-[#1C1C1E] border border-[#333] text-gray-200 text-[10px] font-bold">
                                    {song.key}
                                  </span>
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${langMeta.badgeClass}`}>
                                    {langMeta.code}
                                  </span>
                                  {song.tempo && (
                                    <span className="px-1.5 py-0.2 rounded bg-[#1C1C1E] border border-[#222224] text-gray-400 text-[10px] font-medium flex items-center gap-1">
                                      <Gauge className="w-2.5 h-2.5 text-blue-400" />
                                      <span>{song.tempo} BPM</span>
                                    </span>
                                  )}
                                  {songDur && (
                                    <span className="px-1.5 py-0.2 rounded bg-[#1C1C1E] border border-[#222224] text-cyan-400 text-[10px] font-medium font-mono flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5 text-cyan-400" />
                                      <span>{songDur}</span>
                                    </span>
                                  )}
                                </div>

                                <h4 className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                                  isChecked ? 'text-blue-300' : 'text-white group-hover:text-blue-400'
                                }`}>
                                  {song.title}
                                </h4>
                                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                  {song.artist || 'Auteur inconnu'}
                                </p>

                                {song.tags && song.tags.length > 0 && (
                                  <div className="flex items-center gap-1 flex-wrap mt-1.5">
                                    {song.tags.slice(0, 4).map((t, idx) => (
                                      <span 
                                        key={idx}
                                        className="text-[9px] px-1.5 py-0.2 rounded bg-[#16161A] text-gray-400 border border-[#26262B] flex items-center gap-0.5"
                                      >
                                        <Tag className="w-2 h-2 text-blue-400" />
                                        <span>{t}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="shrink-0 pt-0.5">
                                <div 
                                  className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                                    isChecked
                                      ? 'bg-blue-600 border-blue-500 text-white shadow-sm ring-2 ring-blue-500/20'
                                      : 'border-[#444] bg-[#1C1C1E] group-hover:border-[#666]'
                                  }`}
                                  title={isChecked ? 'Retirer de la setlist' : 'Ajouter à la setlist'}
                                >
                                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#222224] bg-[#151518] flex items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            <span className="font-semibold text-white">{setlist.songIds.length}</span> chant{setlist.songIds.length > 1 ? 's' : ''} dans la setlist
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            Terminer
          </button>
        </div>

      </div>
    </div>
  );
};
