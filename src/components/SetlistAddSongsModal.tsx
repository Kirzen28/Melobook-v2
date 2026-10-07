import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Song, Setlist } from '../types';
import { getSongDuration, stripParentheses } from '../utils/chordUtils';
import { 
  DEFAULT_CATEGORY_SUGGESTIONS, 
  getCustomCategories, 
  saveCustomCategories, 
  getHiddenCategories, 
  saveHiddenCategories 
} from '../utils/categoryUtils';
import { parseArtistsString } from '../utils/artistUtils';
import { PRESET_LANGUAGES } from '../utils/languageUtils';
import { VoiceSearchControl } from './VoiceSearchControl';
import { 
  Search, 
  Tag, 
  User,
  Music, 
  Globe, 
  ChevronDown,
  Check, 
  X, 
  Plus, 
  Clock, 
  Gauge,
  ListMusic,
  CheckSquare,
  Square
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

  // Category filter state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [categoryFilterSearch, setCategoryFilterSearch] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>(() => getCustomCategories());
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => getHiddenCategories());

  // Author filter state
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [isAuthorFilterOpen, setIsAuthorFilterOpen] = useState(false);
  const [authorFilterSearch, setAuthorFilterSearch] = useState('');

  // Key filter state
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isKeyFilterOpen, setIsKeyFilterOpen] = useState(false);
  const [keyFilterSearch, setKeyFilterSearch] = useState('');

  // Language filter state
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isLanguageFilterOpen, setIsLanguageFilterOpen] = useState(false);
  const [languageFilterSearch, setLanguageFilterSearch] = useState('');

  const categoryFilterRef = useRef<HTMLDivElement>(null);
  const authorFilterRef = useRef<HTMLDivElement>(null);
  const keyFilterRef = useRef<HTMLDivElement>(null);
  const languageFilterRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or escape
  useEffect(() => {
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
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
  }, []);

  // Aggregate unique categories with counts
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

  // Author filter counts
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

  // Key filter counts
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

  // Language filter counts
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

  // Filter songs and sort cleanly by title (no alphabetical sort toggle, pure list mode)
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      // Key filter
      if (selectedKeys.length > 0) {
        const songKey = (song.key || '').trim().toUpperCase();
        const hasKey = selectedKeys.includes(songKey || 'Sans tonalité');
        if (!hasKey) return false;
      }

      // Language filter
      if (selectedLanguages.length > 0) {
        const songLang = (song.language || 'Français').trim();
        const hasLang = selectedLanguages.some(l => l.toLowerCase() === songLang.toLowerCase());
        if (!hasLang) return false;
      }

      // Category filter
      if (selectedCategories.length > 0) {
        const songCats = (song.tags || []).map(t => t.trim().toLowerCase());
        const hasCat = selectedCategories.some(cat => songCats.includes(cat.toLowerCase()));
        if (!hasCat) return false;
      }

      // Author filter
      if (selectedAuthors.length > 0) {
        const songAuthors = parseArtistsString(song.artist);
        if (songAuthors.length === 0) {
          if (!selectedAuthors.includes('Sans auteur')) return false;
        } else {
          const hasAuthor = songAuthors.some(author => selectedAuthors.includes(author));
          if (!hasAuthor) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = song.title.toLowerCase().includes(q);
        const matchArtist = (song.artist || '').toLowerCase().includes(q);
        const matchLyrics = (song.contentChordPro || '').toLowerCase().includes(q);
        const matchLanguage = (song.language || '').toLowerCase().includes(q);
        const matchTags = song.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchArtist && !matchLyrics && !matchTags && !matchLanguage) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }));
  }, [songs, selectedKeys, selectedLanguages, selectedCategories, selectedAuthors, searchQuery]);

  // Bulk actions for filtered items
  const allFilteredInSetlist = useMemo(() => {
    if (filteredSongs.length === 0) return false;
    return filteredSongs.every(s => setlist.songIds.includes(s.id));
  }, [filteredSongs, setlist.songIds]);

  const handleToggleAllFiltered = () => {
    if (allFilteredInSetlist) {
      const idsToRemove = filteredSongs.map(s => s.id);
      if (onRemoveMultipleSongs) {
        onRemoveMultipleSongs(idsToRemove);
      } else {
        idsToRemove.forEach(id => {
          if (setlist.songIds.includes(id)) onToggleSong(id);
        });
      }
    } else {
      const idsToAdd = filteredSongs
        .filter(s => !setlist.songIds.includes(s.id))
        .map(s => s.id);
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
                Ajouter des chants à la setlist « {setlist.name} »
              </h2>
              <p className="text-[11px] text-gray-400">
                {setlist.songIds.length} chant{setlist.songIds.length > 1 ? 's' : ''} dans la setlist
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-400 hover:text-white border border-[#333] transition-colors shrink-0 cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Controls Bar - Même agencement et style que l'onglet Chants */}
        <div className="p-3 sm:p-4 pb-2 border-b border-[#1E1E22] bg-[#0E0E10] space-y-2.5">
          
          <div className="bg-[#111112] border border-[#222224] rounded-lg p-2.5 flex flex-col md:flex-row items-center gap-2.5">
            {/* Search Input with Clear Button and Voice Search */}
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
                  onSelectSong={(song) => onToggleSong(song.id)}
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

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto md:flex md:items-center md:gap-2 md:justify-end">
              
              {/* 1. Catégories Dropdown */}
              <div className="relative w-full md:w-auto min-w-0" ref={categoryFilterRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
                  className={`h-[34px] w-full bg-[#1C1C1E] border hover:border-[#444] rounded-md px-2 sm:px-2.5 py-1 text-xs text-gray-200 cursor-pointer flex items-center justify-between gap-1 sm:gap-1.5 transition-colors ${
                    selectedCategories.length > 0
                      ? 'border-blue-500/50 bg-blue-950/20'
                      : 'border-[#333]'
                  }`}
                  title="Filtrer par catégorie"
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
                </button>

                {isCategoryFilterOpen && (
                  <div className="absolute left-0 mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-[#141416] border border-[#2A2A2D] rounded-lg shadow-2xl p-2.5 z-50 text-xs">
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

                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
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

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#222224]">
                      {selectedCategories.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedCategories([])}
                          className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          Tout désélectionner
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => setIsCategoryFilterOpen(false)}
                        className="px-3 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-[11px] font-medium border border-[#333] transition-colors cursor-pointer"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Auteurs Dropdown */}
              <div className="relative w-full md:w-auto min-w-0" ref={authorFilterRef}>
                <button
                  type="button"
                  onClick={() => setIsAuthorFilterOpen(!isAuthorFilterOpen)}
                  className={`h-[34px] w-full bg-[#1C1C1E] border hover:border-[#444] rounded-md px-2 sm:px-2.5 py-1 text-xs text-gray-200 cursor-pointer flex items-center justify-between gap-1 sm:gap-1.5 transition-colors ${
                    selectedAuthors.length > 0
                      ? 'border-blue-500/50 bg-blue-950/20'
                      : 'border-[#333]'
                  }`}
                  title="Filtrer par auteur"
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
                </button>

                {isAuthorFilterOpen && (
                  <div className="absolute left-0 mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-[#141416] border border-[#2A2A2D] rounded-lg shadow-2xl p-2.5 z-50 text-xs">
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

                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
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

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#222224]">
                      {selectedAuthors.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedAuthors([])}
                          className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          Tout désélectionner
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => setIsAuthorFilterOpen(false)}
                        className="px-3 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-[11px] font-medium border border-[#333] transition-colors cursor-pointer"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Tonalités Dropdown */}
              <div className="relative w-full md:w-auto min-w-0" ref={keyFilterRef}>
                <button
                  type="button"
                  onClick={() => setIsKeyFilterOpen(!isKeyFilterOpen)}
                  className={`h-[34px] w-full bg-[#1C1C1E] border hover:border-[#444] rounded-md px-2 sm:px-2.5 py-1 text-xs text-gray-200 cursor-pointer flex items-center justify-between gap-1 sm:gap-1.5 transition-colors ${
                    selectedKeys.length > 0
                      ? 'border-amber-500/50 bg-amber-950/20'
                      : 'border-[#333]'
                  }`}
                  title="Filtrer par tonalité"
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
                </button>

                {isKeyFilterOpen && (
                  <div className="absolute left-0 mt-1.5 w-64 sm:w-72 max-w-[calc(100vw-2rem)] bg-[#141416] border border-[#2A2A2D] rounded-lg shadow-2xl p-2.5 z-50 text-xs">
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

                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
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

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#222224]">
                      {selectedKeys.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedKeys([])}
                          className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          Tout désélectionner
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => setIsKeyFilterOpen(false)}
                        className="px-3 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-[11px] font-medium border border-[#333] transition-colors cursor-pointer"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Langues Dropdown */}
              <div className="relative w-full md:w-auto min-w-0" ref={languageFilterRef}>
                <button
                  type="button"
                  onClick={() => setIsLanguageFilterOpen(!isLanguageFilterOpen)}
                  className={`h-[34px] w-full bg-[#1C1C1E] border hover:border-[#444] rounded-md px-2 sm:px-2.5 py-1 text-xs text-gray-200 cursor-pointer flex items-center justify-between gap-1 sm:gap-1.5 transition-colors ${
                    selectedLanguages.length > 0
                      ? 'border-indigo-500/50 bg-indigo-950/20'
                      : 'border-[#333]'
                  }`}
                  title="Filtrer par langue"
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
                </button>

                {isLanguageFilterOpen && (
                  <div className="absolute left-0 mt-1.5 w-64 sm:w-72 max-w-[calc(100vw-2rem)] bg-[#141416] border border-[#2A2A2D] rounded-lg shadow-2xl p-2.5 z-50 text-xs">
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

                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
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

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#222224]">
                      {selectedLanguages.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedLanguages([])}
                          className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          Tout désélectionner
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => setIsLanguageFilterOpen(false)}
                        className="px-3 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-[11px] font-medium border border-[#333] transition-colors cursor-pointer"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Active Filter Chips Bar */}
          {(selectedCategories.length > 0 || selectedAuthors.length > 0 || selectedKeys.length > 0 || selectedLanguages.length > 0) && (
            <div className="flex items-center flex-wrap gap-1.5 px-1 pt-0.5">
              {selectedKeys.length > 0 && (
                <>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1 mr-1">
                    <Music className="w-3 h-3 text-amber-400" />
                    <span>Tonalité{selectedKeys.length > 1 ? 's' : ''} :</span>
                  </span>
                  {selectedKeys.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold"
                    >
                      <span>{k}</span>
                      <button
                        type="button"
                        onClick={() => toggleKeyFilter(k)}
                        className="hover:text-white transition-colors cursor-pointer"
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
                        type="button"
                        onClick={() => toggleLanguageFilter(lang)}
                        className="hover:text-white transition-colors cursor-pointer"
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
                        type="button"
                        onClick={() => toggleCategoryFilter(cat)}
                        className="hover:text-white transition-colors cursor-pointer"
                        title="Supprimer ce filtre de catégorie"
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
                        type="button"
                        onClick={() => toggleAuthorFilter(author)}
                        className="hover:text-white transition-colors cursor-pointer"
                        title="Supprimer ce filtre d'auteur"
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
                  setSelectedAuthors([]);
                  setSelectedKeys([]);
                  setSelectedLanguages([]);
                }}
                className="text-[11px] text-gray-400 hover:text-white ml-2 underline cursor-pointer"
              >
                Tout effacer
              </button>
            </div>
          )}

        </div>

        {/* Quick selection status & action bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#121215] border-b border-[#222224] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 font-medium">
              {filteredSongs.length} chant{filteredSongs.length > 1 ? 's' : ''} trouvé{filteredSongs.length > 1 ? 's' : ''}
            </span>
          </div>
          
          {filteredSongs.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAllFiltered}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 hover:text-white border border-[#333] transition-colors font-medium text-[11px] cursor-pointer"
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

        {/* Pure Single-Column List of Songs - Agencement identique à l'onglet Chants */}
        <div className="overflow-y-auto p-3 sm:p-5 flex-1 max-h-[55vh] custom-scrollbar">
          {filteredSongs.length === 0 ? (
            <div className="py-12 text-center text-gray-500 bg-[#0A0A0B] rounded-lg border border-[#222224]">
              <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-400">Aucun chant ne correspond à vos critères de recherche</p>
              <p className="text-[11px] text-gray-600 mt-1">Essayez de modifier vos filtres ou termes de recherche</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 w-full">
              {filteredSongs.map((song) => {
                const isInSetlist = setlist.songIds.includes(song.id);
                const songDur = getSongDuration(song);

                return (
                  <div
                    key={song.id}
                    onClick={() => onToggleSong(song.id)}
                    className={`group relative border rounded-lg p-2.5 sm:p-3 transition-all flex items-center gap-2.5 sm:gap-3 cursor-pointer shadow-xs hover:shadow-md select-none w-full ${
                      isInSetlist
                        ? 'bg-blue-950/25 border-blue-500/60 ring-1 ring-blue-500/30'
                        : 'bg-[#111112] hover:bg-[#151518] border-[#222224] hover:border-blue-500/40'
                    }`}
                  >
                    {/* Checkbox on the left */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSong(song.id);
                      }}
                      className={`w-5 h-5 rounded flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                        isInSetlist
                          ? 'bg-blue-600 border-blue-500 text-white shadow-xs ring-2 ring-blue-500/30'
                          : 'bg-[#1C1C1E] border-[#444] text-transparent hover:border-blue-400 hover:bg-[#252528]'
                      }`}
                      title={isInSetlist ? "Retirer de la setlist" : "Ajouter à la setlist"}
                      aria-label={isInSetlist ? "Retirer de la setlist" : "Ajouter à la setlist"}
                    >
                      <Check className={`w-3.5 h-3.5 stroke-[2.5] ${isInSetlist ? 'opacity-100' : 'opacity-0 hover:opacity-40 text-blue-400'}`} />
                    </button>

                    {/* Single unified row aligning title, artist, categories, badges, and quick button */}
                    <div className="flex items-center justify-between gap-2.5 sm:gap-3 min-w-0 flex-1">
                      
                      {/* Title & Artist & Categories */}
                      <div className="min-w-0 flex-1 flex flex-col md:flex-row md:items-center gap-0.5 md:gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 
                            className={`text-xs sm:text-sm font-bold truncate leading-snug transition-colors ${
                              isInSetlist ? 'text-blue-300' : 'text-white group-hover:text-blue-400'
                            }`}
                            title={stripParentheses(song.title)}
                          >
                            {stripParentheses(song.title)}
                          </h4>
                          <p 
                            className={`text-[11px] sm:text-xs font-medium truncate mt-0.5 ${
                              selectedAuthors.includes(song.artist) ? 'text-blue-400 font-semibold' : 'text-gray-400'
                            }`}
                            title={song.artist || 'Auteur inconnu'}
                          >
                            {song.artist || 'Auteur inconnu'}
                          </p>
                        </div>

                        {/* Category Tags */}
                        {song.tags && song.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1 md:mt-0">
                            {song.tags.slice(0, 3).map((cat, idx) => {
                              const isFiltered = selectedCategories.includes(cat);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCategoryFilter(cat);
                                  }}
                                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 max-w-full truncate cursor-pointer ${
                                    isFiltered
                                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 font-semibold'
                                      : 'bg-[#1C1C1E] border-[#222224] text-gray-400 hover:text-gray-200 hover:border-[#333]'
                                  }`}
                                  title={`Filtrer par la catégorie ${cat}`}
                                >
                                  <Tag className="w-2 h-2 text-blue-400 shrink-0" />
                                  <span className="truncate">{cat}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Badges and Action button */}
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Key Badge */}
                        {song.key && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleKeyFilter(song.key.toUpperCase());
                            }}
                            title={`Filtrer par la tonalité ${song.key.toUpperCase()}`}
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-bold transition-colors cursor-pointer ${
                              selectedKeys.includes(song.key.toUpperCase())
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                : 'bg-[#1C1C1E] border-[#333] text-gray-200 hover:border-amber-500/40 hover:text-amber-300'
                            }`}
                          >
                            {song.key}
                          </span>
                        )}

                        {/* Tempo Badge */}
                        {song.tempo && (
                          <span className="px-1.5 py-0.5 rounded bg-[#1C1C1E] border border-[#222224] text-gray-400 text-[9px] font-medium hidden sm:flex items-center gap-1">
                            <Gauge className="w-2.5 h-2.5 text-blue-400" />
                            <span>{song.tempo}</span>
                          </span>
                        )}

                        {/* Duration Badge */}
                        {songDur && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[9px] font-medium font-mono hidden sm:flex items-center gap-1 shadow-xs">
                            <Clock className="w-2.5 h-2.5 text-cyan-400" />
                            <span>{songDur}</span>
                          </span>
                        )}

                        {/* Quick '+' / 'Check' button matching SongList style */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSong(song.id);
                          }}
                          className={`p-1 sm:p-1.5 rounded text-xs font-semibold border transition-all flex items-center justify-center cursor-pointer ${
                            isInSetlist
                              ? 'bg-emerald-600/25 border-emerald-500/50 text-emerald-300 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                              : 'bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 hover:text-white border-blue-500/30 hover:border-blue-500/60'
                          }`}
                          title={
                            isInSetlist
                              ? `Présent dans « ${setlist.name} » (cliquer pour retirer)`
                              : `Ajouter à « ${setlist.name} »`
                          }
                          aria-label={isInSetlist ? "Retirer de la setlist" : "Ajouter à la setlist"}
                        >
                          {isInSetlist ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-blue-400 stroke-[2.5]" />
                          )}
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
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
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            Terminer
          </button>
        </div>

      </div>
    </div>
  );
};
