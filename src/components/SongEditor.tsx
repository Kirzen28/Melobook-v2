import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Song } from '../types';
import { 
  parseChordPro, 
  getVocalBadgeStyle,
  formatSecondsToMinutes, 
  parseDurationToSeconds
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
  SECTION_TYPES_CONFIG
} from '../utils/visualEditorUtils';
import { VisualSectionCard } from './editor/VisualSectionCard';
import { ChordPickerModal } from './editor/ChordPickerModal';
import { 
  Save, 
  ChevronLeft, 
  Sparkles, 
  Music, 
  Eye, 
  Code2, 
  Plus, 
  Check, 
  Tag, 
  ChevronDown, 
  X, 
  Mic, 
  Layers, 
  Copy, 
  Trash2,
  FileText
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
    songs,
    createSong, 
    updateSong, 
    setActiveTab 
  } = useApp();

  // Basic Song Metadata
  const [title, setTitle] = useState(selectedSong?.title || '');
  const [artist, setArtist] = useState(selectedSong?.artist || '');
  const [key, setKey] = useState(selectedSong?.key || 'C');
  const [tempo, setTempo] = useState<number>(selectedSong?.tempo || 100);
  const [timeSignature, setTimeSignature] = useState(selectedSong?.timeSignature || '4/4');
  const [duration, setDuration] = useState(selectedSong?.duration || '3:30');
  const [capo, setCapo] = useState<number>(selectedSong?.capo || 0);
  const [categories, setCategories] = useState<string[]>(selectedSong?.tags || []);
  const [notes, setNotes] = useState(selectedSong?.notes || '');
  const [contentChordPro, setContentChordPro] = useState(selectedSong?.contentChordPro || SAMPLE_TEMPLATE);

  // Editor View Modes: 'visual' (Interactive Cards) vs 'code' (Raw ChordPro Text)
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [showPreviewPane, setShowPreviewPane] = useState(true);

  // Visual Structured Sections
  const [visualSections, setVisualSections] = useState<VisualSection[]>(() => {
    return chordProToVisualSections(selectedSong?.contentChordPro || SAMPLE_TEMPLATE);
  });

  // Drag and Drop state
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      setArtist(selectedSong.artist);
      setKey(selectedSong.key || 'C');
      setTempo(selectedSong.tempo || 100);
      setTimeSignature(selectedSong.timeSignature || '4/4');
      setDuration(selectedSong.duration && selectedSong.duration !== 'auto' ? selectedSong.duration : '3:30');
      setCapo(selectedSong.capo || 0);
      setCategories(selectedSong.tags || []);
      setNotes(selectedSong.notes || '');
      setContentChordPro(selectedSong.contentChordPro);
      setVisualSections(chordProToVisualSections(selectedSong.contentChordPro));
    } else {
      setTitle('');
      setArtist('');
      setKey('C');
      setTempo(100);
      setTimeSignature('4/4');
      setDuration('3:30');
      setCapo(0);
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

  // Switch to Code Mode: Sync current visual sections into ChordPro text
  const handleSwitchToCodeMode = () => {
    const serialized = visualSectionsToChordPro(visualSections, {
      title,
      artist,
      key,
      tempo,
      timeSignature,
      duration,
      capo
    });
    setContentChordPro(serialized);
    setEditorMode('code');
  };

  // Switch to Visual Mode: Parse ChordPro text into visual sections
  const handleSwitchToVisualMode = () => {
    const parsed = chordProToVisualSections(contentChordPro);
    setVisualSections(parsed);
    setEditorMode('visual');
  };

  // Update a section in Visual Mode and sync ChordPro text
  const handleUpdateSection = (updatedSection: VisualSection) => {
    const updatedSections = visualSections.map(sec => 
      sec.id === updatedSection.id ? updatedSection : sec
    );
    setVisualSections(updatedSections);
    const newChordPro = visualSectionsToChordPro(updatedSections, {
      title,
      artist,
      key,
      tempo,
      timeSignature,
      duration,
      capo
    });
    setContentChordPro(newChordPro);
  };

  // Add a new section
  const handleAddNewSection = (type: VisualSection['type'] = 'verse') => {
    const typeLabel = SECTION_TYPES_CONFIG[type]?.label || 'Section';
    let countOfType = 1;
    visualSections.forEach(s => {
      if (s.type === type) countOfType++;
    });

    let newTitle = typeLabel;
    if (type === 'verse') {
      newTitle = `Couplet ${countOfType}`;
    }

    const newSection: VisualSection = {
      id: generateId('sec'),
      type,
      title: newTitle,
      vocals: [],
      lines: [
        {
          id: generateId('line'),
          type: 'lyrics',
          items: [{ id: generateId('it'), chord: songChords[0] || 'G', lyrics: 'Entrez les paroles ici' }]
        }
      ]
    };

    const updated = [...visualSections, newSection];
    setVisualSections(updated);
    setContentChordPro(visualSectionsToChordPro(updated, { title, artist, key, tempo, timeSignature, duration, capo }));
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
      title: `${source.title} Bis`,
      vocals: [...source.vocals],
      lines: duplicatedLines
    };

    const updated = [...visualSections];
    updated.splice(sourceIndex + 1, 0, duplicatedSection);
    setVisualSections(updated);
    setContentChordPro(visualSectionsToChordPro(updated, { title, artist, key, tempo, timeSignature, duration, capo }));
  };

  // Delete a section
  const handleDeleteSection = (sectionId: string) => {
    const updated = visualSections.filter(s => s.id !== sectionId);
    setVisualSections(updated);
    setContentChordPro(visualSectionsToChordPro(updated, { title, artist, key, tempo, timeSignature, duration, capo }));
  };

  // Move section by index
  const handleMoveSection = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= visualSections.length) return;
    const updated = [...visualSections];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setVisualSections(updated);
    setContentChordPro(visualSectionsToChordPro(updated, { title, artist, key, tempo, timeSignature, duration, capo }));
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

  // Auto-sync metadata from ChordPro text
  const handleAutoExtractMetadata = () => {
    const parsed = parseChordPro(contentChordPro);
    if (parsed.title && parsed.title !== 'Sans Titre') setTitle(parsed.title);
    if (parsed.artist) setArtist(parsed.artist);
    if (parsed.key) setKey(parsed.key);
    if (parsed.tempo) setTempo(parsed.tempo);
    if (parsed.timeSignature) setTimeSignature(parsed.timeSignature);
    if (parsed.duration) setDuration(parsed.duration);
    if (parsed.capo) setCapo(parsed.capo);
  };

  // Save Song to Firebase or Local Repertoire
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert('Veuillez spécifier un titre pour le chant.');
      return;
    }

    setIsSaving(true);
    const resolvedDuration = duration.trim() || '3:30';

    // Ensure ChordPro content is up to date
    const finalChordPro = editorMode === 'visual'
      ? visualSectionsToChordPro(visualSections, {
          title: title.trim(),
          artist: artist.trim(),
          key: key.trim().toUpperCase(),
          tempo: Number(tempo) || 100,
          timeSignature,
          duration: resolvedDuration,
          capo: Number(capo) || 0
        })
      : contentChordPro;

    const songData: Partial<Song> = {
      title: title.trim(),
      artist: artist.trim(),
      key: key.trim().toUpperCase(),
      tempo: Number(tempo) || 100,
      timeSignature,
      duration: resolvedDuration,
      durationMode: 'custom',
      capo: Number(capo) || 0,
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
    editorMode === 'visual'
      ? visualSectionsToChordPro(visualSections, { title, artist, key, tempo, timeSignature, duration, capo })
      : contentChordPro
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-16 text-[#E0E0E0]">
      
      {/* Top Header & Save Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('repertoire')}
            className="p-2 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] transition-colors"
            title="Retour au répertoire"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <span>{selectedSong ? selectedSong.title : 'Nouveau Chant'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-medium">
                Éditeur Visuel
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              Glissez et déposez les sections, modifiez les accords en un clic
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-[#111113] border border-[#222225] rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={handleSwitchToVisualMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                editorMode === 'visual'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mode Visuel</span>
            </button>
            <button
              type="button"
              onClick={handleSwitchToCodeMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                editorMode === 'code'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code ChordPro</span>
            </button>
          </div>

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
      <div className="bg-[#111113] border border-[#222225] rounded-xl p-4 sm:p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          
          {/* Titre */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Titre du chant *
            </label>
            <input
              type="text"
              placeholder="Entrez le titre du chant"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
              required
            />
          </div>

          {/* Artiste */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Artiste ou Auteur
            </label>
            <input
              type="text"
              placeholder="ex: Bethel Music, Chris Tomlin"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Tonalité, Tempo, Mesure & Durée */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1 truncate">
                Tonalité
              </label>
              <select
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-[#1C1C1E] border border-[#333] rounded-lg px-1.5 py-2 text-xs text-blue-400 font-bold focus:outline-none focus:border-blue-500 cursor-pointer text-center"
              >
                {['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'Am', 'Em', 'Dm', 'Bm', 'F#m'].map(k => (
                  <option key={k} value={k} className="bg-[#111112] text-gray-200">{k}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1 truncate">
                Tempo BPM
              </label>
              <input
                type="number"
                min={30}
                max={260}
                value={tempo}
                onChange={(e) => setTempo(parseInt(e.target.value, 10) || 100)}
                className="w-full bg-[#1C1C1E] border border-[#333] rounded-lg px-1 sm:px-2 py-2 text-xs text-white focus:outline-none focus:border-blue-500 text-center font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1 truncate">
                Mesure
              </label>
              <select
                value={timeSignature}
                onChange={(e) => setTimeSignature(e.target.value)}
                className="w-full bg-[#1C1C1E] border border-[#333] rounded-lg px-1 sm:px-2 py-2 text-xs text-emerald-400 font-medium focus:outline-none focus:border-blue-500 cursor-pointer text-center"
              >
                {['4/4', '3/4', '6/8', '2/4', '12/8', '5/4'].map(ts => (
                  <option key={ts} value={ts} className="bg-[#111112] text-gray-200">{ts}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1 truncate">
                Durée
              </label>
              <input
                type="text"
                placeholder="3:30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-[#1C1C1E] border border-[#333] focus:border-cyan-400 rounded-lg px-1 sm:px-2 py-2 text-xs text-cyan-300 font-mono font-bold focus:outline-none text-center"
              />
            </div>
          </div>

        </div>

        {/* Catégories & Notes de scène */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3 pt-3 border-t border-[#222225]">
          
          {/* Multi-Categories Dropdown */}
          <div className="relative" ref={categoryDropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
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
              className="w-full min-h-[38px] bg-[#1C1C1E] border border-[#333] hover:border-[#444] rounded-lg px-3 py-1.5 text-xs text-gray-200 cursor-pointer flex flex-wrap items-center gap-1.5 transition-colors"
            >
              {categories.length === 0 ? (
                <span className="text-gray-500 text-xs">Sélectionner ou créer des catégories</span>
              ) : (
                categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[11px] font-medium"
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
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {isCategoryDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#141416] border border-[#2A2A2D] rounded-xl shadow-2xl z-50 p-3 text-xs animate-in fade-in duration-100">
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
                    className="flex-1 bg-[#1C1C1E] border border-[#333] rounded-md px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  {categorySearchQuery.trim() && (
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Créer</span>
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
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
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Note de Scène pour les musiciens
            </label>
            <input
              type="text"
              placeholder="ex: Solo de guitare après le pont, fin douce"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#333] rounded-lg px-3 py-2 text-xs text-blue-400 focus:outline-none focus:border-blue-500"
            />
          </div>

        </div>
      </div>

      {/* Main Workspace: Visual Editor / ChordPro Code + Live Preview */}
      <div className={`grid grid-cols-1 ${showPreviewPane ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6`}>
        
        {/* Left Column: Visual Sections List or Code Area */}
        <div className={`${showPreviewPane ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-5`}>
          
          {editorMode === 'visual' ? (
            /* VISUAL SECTIONS INTERACTIVE BUILDER */
            <div className="space-y-4">
              
              {/* Quick Add Section Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#111113] border border-[#222225] gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
                    Ajouter une section :
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => handleAddNewSection('verse')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Couplet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNewSection('chorus')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600/15 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Refrain</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNewSection('bridge')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/15 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Pont</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNewSection('intro')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/15 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Intro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNewSection('outro')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/15 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Outro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNewSection('instrumental')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Instru</span>
                  </button>
                </div>

                <div className="text-[11px] text-gray-500">
                  {visualSections.length} section{visualSections.length > 1 ? 's' : ''}
                </div>
              </div>

              {/* Sections Cards List */}
              <div className="space-y-4">
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
                  />
                ))}
              </div>

              {/* Bottom Add Section Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleAddNewSection('verse')}
                  className="w-full py-3 rounded-xl border border-dashed border-[#333] hover:border-blue-500 text-gray-400 hover:text-blue-400 hover:bg-blue-600/5 transition-all text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter une nouvelle section au chant</span>
                </button>
              </div>

            </div>
          ) : (
            /* CODE CHORDPRO TEXT EDITOR */
            <div className="bg-[#111113] border border-[#222225] rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-[#161619] px-4 py-2.5 border-b border-[#222225] flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 font-mono flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-blue-400" />
                  <span>Fichier source ChordPro</span>
                </span>
                <button
                  type="button"
                  onClick={handleAutoExtractMetadata}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#202024] hover:bg-[#2A2A2E] text-blue-400 text-xs font-medium transition-colors"
                  title="Synchroniser les métadonnées depuis le texte"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-sync tags</span>
                </button>
              </div>

              <textarea
                ref={textareaRef}
                rows={22}
                value={contentChordPro}
                onChange={(e) => setContentChordPro(e.target.value)}
                className="w-full bg-[#0B0B0D] text-gray-100 font-mono text-xs sm:text-sm p-4 leading-relaxed focus:outline-none resize-y min-h-[420px]"
                placeholder="Écrivez ou collez votre chant au format ChordPro..."
              />
            </div>
          )}

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

    </div>
  );
};
