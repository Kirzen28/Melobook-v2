import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Song } from '../types';
import { 
  parseChordPro, 
  getVocalBadgeStyle,
  formatSecondsToMinutes, 
  parseDurationToSeconds,
  formatDurationToMMSS
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
import { 
  Save, 
  ChevronLeft, 
  Sparkles, 
  Music, 
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
  Mic, 
  Copy, 
  Trash2, 
  FileText, 
  Globe, 
  Link, 
  ArrowRight,
  Search,
  Users,
  User
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
    setActiveTab 
  } = useApp();

  // Basic Song Metadata
  const [title, setTitle] = useState(selectedSong?.title || '');
  const [artist, setArtist] = useState(selectedSong?.artist || '');
  const [selectedArtists, setSelectedArtists] = useState<string[]>(() => parseArtistsString(selectedSong?.artist));
  const [isArtistDropdownOpen, setIsArtistDropdownOpen] = useState(false);
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [customArtists, setCustomArtists] = useState<string[]>(() => getCustomArtists());
  const artistDropdownRef = useRef<HTMLDivElement>(null);
  const [key, setKey] = useState(selectedSong?.key || 'C');
  const [tempo, setTempo] = useState<number>(selectedSong?.tempo || 100);
  const [timeSignature, setTimeSignature] = useState(selectedSong?.timeSignature || '4/4');
  const [duration, setDuration] = useState(selectedSong?.duration ? formatDurationToMMSS(selectedSong.duration) : '03:30');
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
  const [notes, setNotes] = useState(selectedSong?.notes || '');
  const [contentChordPro, setContentChordPro] = useState(selectedSong?.contentChordPro || SAMPLE_TEMPLATE);
  const [showPreviewPane, setShowPreviewPane] = useState(true);

  // Visual Structured Sections
  const [visualSections, setVisualSections] = useState<VisualSection[]>(() => {
    return chordProToVisualSections(selectedSong?.contentChordPro || SAMPLE_TEMPLATE);
  });

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
  const addSectionDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (artistDropdownRef.current && !artistDropdownRef.current.contains(e.target as Node)) {
        setIsArtistDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
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
    const q = artistSearchQuery.toLowerCase().trim();
    return allAvailableArtists.filter(a => a.toLowerCase().includes(q));
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
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [songs, customCategories, categories]);

  const filteredCategoryList = useMemo(() => {
    if (!categorySearchQuery.trim()) return allAvailableCategories;
    const q = categorySearchQuery.toLowerCase().trim();
    return allAvailableCategories.filter(c => c.toLowerCase().includes(q));
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
      setTempo(selectedSong.tempo || 100);
      setTimeSignature(selectedSong.timeSignature || '4/4');
      setDuration(selectedSong.duration && selectedSong.duration !== 'auto' ? formatDurationToMMSS(selectedSong.duration) : '03:30');
      setCapo(selectedSong.capo || 0);
      
      const detected = detectSongLanguageWithConfidence(selectedSong.title, selectedSong.contentChordPro || selectedSong.content);
      const initialLang = (selectedSong.language && selectedSong.language.trim()) ? selectedSong.language : detected.language;
      setLanguage(initialLang);
      setIsLanguageManual(Boolean(selectedSong.language && selectedSong.language.trim()));
      setDetectedLangInfo(detected);

      setLinkedSongIds(selectedSong.linkedSongIds || []);
      setCategories(selectedSong.tags || []);
      setNotes(selectedSong.notes || '');
      setContentChordPro(selectedSong.contentChordPro);
      setVisualSections(chordProToVisualSections(selectedSong.contentChordPro));
    } else {
      setTitle('');
      setArtist('');
      setSelectedArtists([]);
      setKey('C');
      setTempo(100);
      setTimeSignature('4/4');
      setDuration('3:30');
      setCapo(0);
      
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
    const updatedSections = visualSections.map(sec => 
      sec.id === updatedSection.id ? updatedSection : sec
    );
    const renumbered = recomputeSectionTitles(updatedSections);
    setVisualSections(renumbered);
    const newChordPro = visualSectionsToChordPro(renumbered, {
      title,
      artist,
      key,
      tempo,
      timeSignature,
      duration,
      capo
    });
    setContentChordPro(newChordPro);

    // If language has not been manually pinned, re-evaluate with updated lyrics
    if (!isLanguageManual) {
      const detected = detectSongLanguageWithConfidence(title, newChordPro);
      setLanguage(detected.language);
      setDetectedLangInfo(detected);
    }
  };

  // Add a new section
  const handleAddNewSection = (type: VisualSection['type'] = 'verse', customTitle?: string, afterIndex?: number) => {
    const newSection: VisualSection = {
      id: generateId('sec'),
      type,
      title: '',
      vocals: [],
      lines: [
        {
          id: generateId('line'),
          type: 'lyrics',
          items: [{ id: generateId('it'), chord: songChords[0] || 'G', lyrics: 'Entrez les paroles ici' }]
        }
      ]
    };

    const updated = [...visualSections];
    if (afterIndex !== undefined && afterIndex >= 0 && afterIndex < updated.length) {
      updated.splice(afterIndex + 1, 0, newSection);
    } else {
      updated.push(newSection);
    }
    const renumbered = recomputeSectionTitles(updated);
    setVisualSections(renumbered);
    setContentChordPro(visualSectionsToChordPro(renumbered, { title, artist, key, tempo, timeSignature, duration, capo }));
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
    const source = visualSections[sourceIndex];

    const duplicatedLines: VisualLine[] = source.lines.map(l => ({
      id: generateId('line'),
      type: l.type,
      items: l.items.map(it => ({
        id: generateId('it'),
        chord: it.chord,
        lyrics: it.lyrics
      }))
    }));

    const duplicatedSection: VisualSection = {
      id: generateId('sec'),
      type: source.type,
      title: source.title,
      vocals: [...source.vocals],
      lines: duplicatedLines
    };

    const updated = [...visualSections];
    updated.splice(sourceIndex + 1, 0, duplicatedSection);
    const renumbered = recomputeSectionTitles(updated);
    setVisualSections(renumbered);
    setContentChordPro(visualSectionsToChordPro(renumbered, { title, artist, key, tempo, timeSignature, duration, capo }));
  };

  // Delete a section
  const handleDeleteSection = (sectionId: string) => {
    const updated = visualSections.filter(s => s.id !== sectionId);
    const renumbered = recomputeSectionTitles(updated);
    setVisualSections(renumbered);
    setContentChordPro(visualSectionsToChordPro(renumbered, { title, artist, key, tempo, timeSignature, duration, capo }));
  };

  // Move section by index
  const handleMoveSection = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= visualSections.length) return;
    const updated = [...visualSections];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    const renumbered = recomputeSectionTitles(updated);
    setVisualSections(renumbered);
    setContentChordPro(visualSectionsToChordPro(renumbered, { title, artist, key, tempo, timeSignature, duration, capo }));
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
    setContentChordPro(visualSectionsToChordPro(updatedSections, { title, artist, key, tempo, timeSignature, duration, capo }));
  };

  // Delete chord from picker modal
  const handleDeleteChordFromPicker = () => {
    const { sectionId, lineId, itemId } = chordPickerState;
    if (!sectionId || !lineId || !itemId) return;

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
    setContentChordPro(visualSectionsToChordPro(updatedSections, { title, artist, key, tempo, timeSignature, duration, capo }));
  };

  // Save Song to Firebase or Local Repertoire
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert('Veuillez spécifier un titre pour le chant.');
      return;
    }

    setIsSaving(true);
    const resolvedDuration = formatDurationToMMSS(duration.trim() || '03:30');

    // Ensure ChordPro content is up to date from visual sections
    const finalChordPro = visualSectionsToChordPro(visualSections, {
      title: title.trim(),
      artist: artist.trim(),
      key: key.trim().toUpperCase(),
      tempo: Number(tempo) || 100,
      timeSignature,
      duration: resolvedDuration,
      capo: Number(capo) || 0
    });

    const songData: Partial<Song> = {
      title: title.trim(),
      artist: artist.trim(),
      key: key.trim().toUpperCase(),
      tempo: Number(tempo) || 100,
      timeSignature,
      duration: resolvedDuration,
      durationMode: 'custom',
      capo: Number(capo) || 0,
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
    } finally {
      setIsSaving(false);
    }
  };

  // Live parsed preview
  const livePreviewData = parseChordPro(
    visualSectionsToChordPro(visualSections, { title, artist, key, tempo, timeSignature, duration, capo })
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-16 text-[#E0E0E0]">
      
      {/* Bandeau en haut : Mode Éditeur */}
      <div className="mb-4 flex items-center justify-between px-3.5 sm:px-4 py-2.5 rounded-xl bg-[#18181C] border border-amber-500/30 text-xs shadow-xs">
        <button
          type="button"
          onClick={() => {
            if (selectedSong) {
              setActiveTab('stage');
            } else {
              setActiveTab('repertoire');
            }
          }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer px-2.5 py-1 rounded-md hover:bg-[#25252A]"
          title={selectedSong ? "Quitter le mode éditeur et afficher le chant en direct" : "Quitter le mode éditeur et retourner au répertoire"}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Quitter l'éditeur</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <FileEdit className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-amber-400 uppercase tracking-wider text-xs">
            Mode Éditeur
          </span>
        </div>
      </div>

      {/* Top Header & Save Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-white break-words">
            {selectedSong ? selectedSong.title : 'Nouveau Chant'}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle Live Preview pane */}
          <button
            type="button"
            onClick={() => setShowPreviewPane(!showPreviewPane)}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              showPreviewPane
                ? 'bg-[#1C1C1E] text-blue-400 border-blue-500/40'
                : 'bg-[#111113] text-gray-400 border-[#222225] hover:text-gray-200'
            }`}
            title="Afficher ou masquer l'aperçu scène"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Aperçu</span>
          </button>

          {/* Save / Update Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Enregistré !</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{selectedSong ? 'Mettre à jour' : 'Enregistrer le chant'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metadata Form Grid */}
      <div className="bg-[#111113] border border-[#222225] rounded-xl p-3 sm:p-3.5 mb-4 shadow-sm space-y-2.5">
        {/* Row 1: Titre, Artiste & Paramètres musicaux */}
        <div className="grid grid-cols-12 gap-2.5 items-start">
          
          {/* Titre */}
          <div className="col-span-12 sm:col-span-7 lg:col-span-4">
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
              Titre du chant *
            </label>
            <input
              type="text"
              placeholder="Entrez le titre du chant"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full h-8 bg-[#1C1C1E] border border-[#333] hover:border-[#444] rounded-lg px-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold transition-colors"
              required
            />
          </div>

          {/* Artiste ou Auteur (Multi-sélection & création rapide) */}
          <div className="col-span-12 sm:col-span-5 lg:col-span-4 relative" ref={artistDropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5 truncate">
                <Users className="w-3 h-3 text-purple-400" />
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
                  className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                  title="Effacer les artistes"
                >
                  Effacer
                </button>
              )}
            </div>

            <div
              id="song-artist-select"
              onClick={() => setIsArtistDropdownOpen(!isArtistDropdownOpen)}
              className={`min-h-[32px] w-full bg-[#1C1C1E] border ${
                isArtistDropdownOpen ? 'border-purple-500 ring-1 ring-purple-500/30' : 'border-[#333] hover:border-[#444]'
              } rounded-lg px-2 py-1 flex flex-wrap items-center gap-1 cursor-pointer transition-colors`}
            >
              {selectedArtists.length === 0 ? (
                <span className="text-gray-500 text-xs truncate">Choisir ou créer un artiste...</span>
              ) : (
                selectedArtists.map((art) => (
                  <span
                    key={art}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-300 border border-purple-500/30 text-[10px] font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="truncate max-w-[130px]">{art}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveArtist(art);
                      }}
                      className="hover:text-white transition-colors"
                      title={`Retirer ${art}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto shrink-0 transition-transform duration-200 ${isArtistDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {isArtistDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#141416] border border-[#2A2A2D] rounded-xl shadow-2xl z-50 p-2.5 text-xs animate-in fade-in duration-100 min-w-[260px]">
                {/* Search & Quick Creation Field */}
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="relative flex-1">
                    <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2" />
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
                      className="w-full bg-[#1C1C1E] border border-[#333] rounded-md pl-7 pr-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      autoFocus
                    />
                  </div>
                  {artistSearchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => handleCreateArtist(artistSearchQuery)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
                      title="Ajouter immédiatement cet artiste"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ajouter</span>
                    </button>
                  )}
                </div>

                {/* Quick Add Prompt if current search query isn't in existing artists */}
                {artistSearchQuery.trim() && !allAvailableArtists.some(a => a.toLowerCase() === artistSearchQuery.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => handleCreateArtist(artistSearchQuery)}
                    className="w-full mb-1.5 p-2 rounded-lg bg-purple-950/40 border border-purple-800/40 hover:bg-purple-900/50 hover:border-purple-600/50 cursor-pointer flex items-center justify-between text-purple-200 transition-colors text-left"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Plus className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">Créer <strong className="text-white font-semibold">« {artistSearchQuery.trim()} »</strong></span>
                    </div>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono ml-2 shrink-0">Entrée ↵</span>
                  </button>
                )}

                {/* List of Artists */}
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
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-600/15 text-purple-200 font-medium'
                              : 'hover:bg-[#1C1C1E] text-gray-300'
                          }`}
                        >
                          <span className="truncate">{art}</span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isSelected 
                              ? 'bg-purple-600 border-purple-500 text-white' 
                              : 'border-[#444] bg-[#1C1C1E]'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Count & Summary */}
                <div className="mt-2 pt-1.5 border-t border-[#222] flex items-center justify-between text-[10px] text-gray-500">
                  <span>{filteredArtistsList.length} artiste(s) suggéré(s)</span>
                  <span className="text-purple-400 font-medium">{selectedArtists.length} sélectionné(s)</span>
                </div>
              </div>
            )}
          </div>

          {/* Paramètres musicaux : Tonalité, BPM, Mesure & Durée */}
          <div className="col-span-12 lg:col-span-4 grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1 truncate text-center">
                Tonalité
              </label>
              <select
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full h-8 bg-[#1C1C1E] border border-[#333] hover:border-[#444] rounded-lg px-1 text-xs text-blue-400 font-bold focus:outline-none focus:border-blue-500 cursor-pointer text-center transition-colors"
              >
                {['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'Am', 'Em', 'Dm', 'Bm', 'F#m'].map(k => (
                  <option key={k} value={k} className="bg-[#111112] text-gray-200">{k}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1 truncate text-center">
                Tempo
              </label>
              <input
                type="number"
                min={30}
                max={260}
                value={tempo}
                onChange={(e) => setTempo(parseInt(e.target.value, 10) || 100)}
                className="w-full h-8 bg-[#1C1C1E] border border-[#333] hover:border-[#444] rounded-lg px-1 text-xs text-white focus:outline-none focus:border-blue-500 text-center font-bold transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1 truncate text-center">
                Mesure
              </label>
              <select
                value={timeSignature}
                onChange={(e) => setTimeSignature(e.target.value)}
                className="w-full h-8 bg-[#1C1C1E] border border-[#333] hover:border-[#444] rounded-lg px-1 text-xs text-emerald-400 font-bold focus:outline-none focus:border-blue-500 cursor-pointer text-center transition-colors"
              >
                {['4/4', '3/4', '6/8', '2/4', '12/8', '5/4'].map(ts => (
                  <option key={ts} value={ts} className="bg-[#111112] text-gray-200">{ts}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1 truncate text-center">
                Durée
              </label>
              <input
                type="text"
                placeholder="03:30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                onBlur={() => {
                  if (duration.trim()) {
                    setDuration(formatDurationToMMSS(duration));
                  }
                }}
                className="w-full h-8 bg-[#1C1C1E] border border-[#333] hover:border-[#444] focus:border-cyan-400 rounded-lg px-1 text-xs text-cyan-300 font-mono font-bold focus:outline-none text-center transition-colors"
              />
            </div>
          </div>

        </div>

        {/* Row 2: Langue, Catégories & Notes de scène */}
        <div className="grid grid-cols-12 gap-2.5 items-start pt-2 border-t border-[#1F1F23]">
          
          {/* Langue & Relations */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-blue-400" />
                <span>Langue & Versions</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAutoDetectLanguage}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 cursor-pointer"
                  title="Deviner la langue automatiquement grâce au titre et aux paroles"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Deviner</span>
                </button>
                {selectedSong && (
                  <button
                    type="button"
                    onClick={() => setIsLanguageModalOpen(true)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Link className="w-2.5 h-2.5" />
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
              className="w-full h-8 bg-[#1C1C1E] border border-[#333] hover:border-[#444] rounded-lg px-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer font-medium transition-colors"
            >
              {PRESET_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.name} className="bg-[#111112]">
                  {lang.name}
                </option>
              ))}
            </select>

            {!isLanguageManual && detectedLangInfo && (
              <p className="text-[10px] text-emerald-400/80 mt-1 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 shrink-0 text-emerald-400" />
                <span>Devinée d'après {detectedLangInfo.detectedFrom === 'title' ? 'le titre' : detectedLangInfo.detectedFrom === 'content' ? 'les paroles' : 'le titre et les paroles'}</span>
              </p>
            )}

            {/* Inline linked versions shortcuts if song exists */}
            {selectedSong && (() => {
              const linked = getLinkedSongVersions(selectedSong, songs);
              if (linked.length === 0) return null;
              return (
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-gray-500">Liées :</span>
                  {linked.map(ls => {
                    const lMeta = getLanguageMeta(ls.language);
                    return (
                      <button
                        key={ls.id}
                        type="button"
                        onClick={() => setSelectedSong(ls)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#18181C] hover:bg-[#252528] text-gray-300 border border-[#2E2E34] hover:border-blue-500/40 transition-colors"
                        title={`Basculer sur ${ls.title} - ${lMeta.name}`}
                      >
                        <span className={`font-bold ${lMeta.badgeClass.split(' ')[0]}`}>{lMeta.code}</span>
                        <span className="truncate max-w-[90px]">{ls.title}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Multi-Categories Dropdown */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-4 relative" ref={categoryDropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-blue-400" />
                <span>Catégories</span>
              </label>
              {categories.length > 0 && (
                <span className="text-[10px] text-blue-400 font-semibold">
                  {categories.length} sélectionnée{categories.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div 
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="w-full min-h-[32px] bg-[#1C1C1E] border border-[#333] hover:border-[#444] rounded-lg px-2 py-1 text-xs text-gray-200 cursor-pointer flex flex-wrap items-center gap-1 transition-colors"
            >
              {categories.length === 0 ? (
                <span className="text-gray-500 text-xs">Ajouter des catégories...</span>
              ) : (
                categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[10px] font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCategory(cat);
                      }}
                      className="hover:text-white transition-colors"
                      title="Retirer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto shrink-0 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {isCategoryDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#141416] border border-[#2A2A2D] rounded-xl shadow-2xl z-50 p-2.5 text-xs animate-in fade-in duration-100">
                <div className="flex items-center gap-1.5 mb-2">
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
                    className="flex-1 bg-[#1C1C1E] border border-[#333] rounded-md px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  {categorySearchQuery.trim() && (
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap transition-colors"
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
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-600/15 text-blue-300 font-medium'
                            : 'hover:bg-[#1C1C1E] text-gray-300'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                          isSelected 
                            ? 'bg-blue-600 border-blue-500 text-white' 
                            : 'border-[#444] bg-[#1C1C1E]'
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
          <div className="col-span-12 lg:col-span-5">
            <div className="flex items-center gap-1 mb-1">
              <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                <Music className="w-3 h-3 text-amber-400" />
                <span>Note de scène</span>
              </label>
            </div>
            <input
              type="text"
              placeholder="ex: Solo de guitare après le pont, fin douce..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-8 bg-[#1C1C1E] border border-[#333] hover:border-[#444] rounded-lg px-2.5 text-xs text-blue-300 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

        </div>
      </div>

      {/* Main Workspace: Visual Editor / ChordPro Code + Live Preview */}
      <div className={`grid grid-cols-1 ${showPreviewPane ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6`}>
        
        {/* Left Column: Visual Sections List */}
        <div className={`${showPreviewPane ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-5`}>
          
          {/* VISUAL SECTIONS INTERACTIVE BUILDER */}
          <div className="space-y-4">
            
            {/* Quick Add Section Dropdown & Global Folding Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#111113] border border-[#222225] gap-3 flex-wrap">
                <div className="flex items-center gap-2" ref={addSectionDropdownRef}>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Ajouter :
                    </span>
                    
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsAddSectionDropdownOpen(!isAddSectionDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-all shadow-sm active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-400" />
                        <span>Choisir une section...</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-blue-400/80 transition-transform ${isAddSectionDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isAddSectionDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 z-40 w-64 bg-[#18181C] border border-[#2E2E36] rounded-xl shadow-2xl p-1.5 backdrop-blur-md max-h-80 overflow-y-auto custom-scrollbar">
                          <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-[#282830] mb-1">
                            Types de section
                          </div>
                          
                          <div className="space-y-0.5">
                            {STANDARD_SECTION_TYPES.map(({ key, label }) => {
                              const conf = SECTION_TYPES_CONFIG[key] || {
                                badgeBg: 'bg-gray-600/20',
                                badgeBorder: 'border-gray-500/30',
                                badgeText: 'text-gray-300'
                              };
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => {
                                    handleAddNewSection(key as any);
                                    setIsAddSectionDropdownOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#232329] text-gray-200 transition-colors text-left group"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${conf.badgeBg.replace('/20', '')}`} />
                                    <span className="font-medium group-hover:text-white">{label}</span>
                                  </div>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${conf.badgeBg} ${conf.badgeBorder} ${conf.badgeText}`}>
                                    + Ajouter
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Custom Sections Saved */}
                          {customSectionList.length > 0 && (
                            <div className="pt-2 mt-1 border-t border-[#25252D]">
                              <div className="px-2 py-1 text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1">
                                Sections personnalisées
                              </div>
                              <div className="space-y-0.5">
                                {customSectionList.map((customName) => (
                                  <button
                                    key={customName}
                                    type="button"
                                    onClick={() => {
                                      handleAddNewSection(customName, customName);
                                      setIsAddSectionDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#232329] text-teal-200 transition-colors text-left"
                                  >
                                    <span className="font-medium">{customName}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-600/20 border border-teal-500/30 text-teal-300">
                                      + Ajouter
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Option to create a new custom section */}
                          <div className="pt-1.5 mt-1 border-t border-[#25252D]">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddSectionDropdownOpen(false);
                                setShowCustomSectionModal(true);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-600/15 border border-dashed border-amber-500/30 transition-colors text-left"
                            >
                              <Plus className="w-3.5 h-3.5 text-amber-400" />
                              <span>Créer une section personnalisée...</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                {/* Global Fold / Unfold Actions & Section Count */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#18181C] border border-[#2B2B30] rounded-lg p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={handleCollapseAllSections}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        collapsedSectionIds.size === visualSections.length && visualSections.length > 0
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-[#252528]'
                      }`}
                      title="Replier toutes les sections pour réorganiser ou dupliquer facilement"
                    >
                      <ChevronsUp className="w-3.5 h-3.5" />
                      <span>Tout replier</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExpandAllSections}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        collapsedSectionIds.size === 0
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-[#252528]'
                      }`}
                      title="Déplier toutes les sections pour voir paroles et accords"
                    >
                      <ChevronsDown className="w-3.5 h-3.5" />
                      <span>Tout déplier</span>
                    </button>
                  </div>

                  <div className="text-[11px] font-mono text-gray-400 bg-[#161619] px-2 py-1 rounded-md border border-[#222226]">
                    {visualSections.length} section{visualSections.length > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Sections Cards List */}
              <div className="space-y-3">
                {visualSections.map((sec, sIdx) => (
                  <VisualSectionCard
                    key={sec.id}
                    section={sec}
                    index={sIdx}
                    totalSections={visualSections.length}
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
                  />
                ))}
              </div>
            </div>

        </div>

        {/* Right Column: Live Stage Preview */}
        {showPreviewPane && (
          <div className="lg:col-span-5 flex flex-col bg-[#111113] border border-[#222225] rounded-xl overflow-hidden shadow-sm sticky top-6 self-start max-h-[85vh]">
            
            <div className="bg-[#161619] px-4 py-3 border-b border-[#222225] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Eye className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Aperçu Scène en Direct
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/30">
                {key} • {tempo} BPM
              </span>
            </div>

            {/* Stage Preview Content */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div className="border-b border-[#222225] pb-3 mb-2">
                <h2 className="text-lg font-bold text-white">{title || 'Titre du chant'}</h2>
                {artist && <p className="text-xs text-gray-400">{artist}</p>}
              </div>

              {livePreviewData.sections.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs">
                  Aucun contenu à afficher pour l&apos;instant
                </div>
              ) : (
                livePreviewData.sections.map((sec, sIdx) => (
                  <div 
                    key={sIdx}
                    className={`p-3 rounded-lg ${
                      sec.type === 'chorus' ? 'bg-[#18181C] border-l-4 border-amber-500' :
                      sec.type === 'bridge' ? 'bg-[#18181C] border-l-4 border-purple-500' :
                      sec.type === 'intro' ? 'bg-[#18181C] border-l-4 border-cyan-500' :
                      'bg-[#141416] border-l-4 border-blue-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <span className="text-[11px] uppercase font-bold text-gray-300">
                        {sec.title || 'Section'}
                      </span>

                      {sec.vocals && sec.vocals.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {sec.vocals.map((voc, vIdx) => {
                            const vStyle = getVocalBadgeStyle(voc);
                            return (
                              <span 
                                key={vIdx}
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${vStyle.bg} ${vStyle.border} ${vStyle.text}`}
                              >
                                <Mic className={`w-2.5 h-2.5 ${vStyle.icon}`} />
                                <span>{voc}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 font-mono text-xs leading-relaxed">
                      {sec.lines.map((line, lIdx) => {
                        if (line.type === 'empty') {
                          return <div key={lIdx} className="h-2" />;
                        }
                        return (
                          <div key={lIdx} className="flex flex-wrap items-end gap-x-1">
                            {line.items.map((it, iIdx) => (
                              <div key={iIdx} className="inline-flex flex-col">
                                {it.chord && (
                                  <span className="text-blue-400 font-bold leading-none mb-1 text-[0.95em]">
                                    {it.chord}
                                  </span>
                                )}
                                <span className="text-gray-200 font-sans text-sm">{it.lyrics || '\u00A0'}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>

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
          <div className="bg-[#18181C] border border-[#2B2B30] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#25252A]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Section personnalisée</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCustomSectionModal(false);
                  setCustomSectionInput('');
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-300">
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
                className="w-full bg-[#101012] border border-[#333338] focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
                autoFocus
              />

              {/* Suggestions */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-gray-400 font-medium">Suggestions :</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Vamp', 'Transition', 'Descente', 'Coda', 'Refrain 2', 'Montée', 'Chœur final'].map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setCustomSectionInput(sugg)}
                      className="px-2 py-0.5 rounded-md bg-[#222226] hover:bg-[#2A2A30] text-gray-300 hover:text-teal-300 text-xs border border-[#303036] transition-colors"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#25252A]">
              <button
                type="button"
                onClick={() => {
                  setShowCustomSectionModal(false);
                  setCustomSectionInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#25252A] transition-colors"
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

    </div>
  );
};
