import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Song } from '../types';
import { parseChordPro, transposeChord } from '../utils/chordUtils';
import { 
  Save, 
  ChevronLeft, 
  Sparkles, 
  Music, 
  Gauge, 
  Eye, 
  Code2, 
  Plus, 
  Check, 
  HelpCircle,
  FileText,
  Tag,
  ChevronDown,
  X,
  Mic
} from 'lucide-react';

const COMMON_CHORDS = ['C', 'G', 'Am', 'F', 'D', 'Em', 'A', 'Dm', 'E', 'B7', 'Bb', 'Gsus4', 'C#m', 'F#m'];

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

const SAMPLE_TEMPLATE = `{title: Mon Nouveau Chant}
{artist: Auteur / Compositeur}
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

{c: Refrain}
Ô [C]Seigneur, Tu es [G]grand
Ta [Em]bonté dure pour tou[D]jours
Tous les [C]peuples Te loue[G]ront
Dans la [D]joie et dans la [G]paix

{c: Pont}
[C]Rien ne peut Te compa[G]rer
[Em]Tu es le Roi des [D]rois`;

export const SongEditor: React.FC = () => {
  const { 
    selectedSong, 
    setSelectedSong, 
    songs,
    createSong, 
    updateSong, 
    setActiveTab 
  } = useApp();

  const [title, setTitle] = useState(selectedSong?.title || '');
  const [artist, setArtist] = useState(selectedSong?.artist || '');
  const [key, setKey] = useState(selectedSong?.key || 'C');
  const [tempo, setTempo] = useState<number>(selectedSong?.tempo || 100);
  const [timeSignature, setTimeSignature] = useState(selectedSong?.timeSignature || '4/4');
  const [capo, setCapo] = useState<number>(selectedSong?.capo || 0);
  const [categories, setCategories] = useState<string[]>(selectedSong?.tags || []);
  const [notes, setNotes] = useState(selectedSong?.notes || '');
  const [contentChordPro, setContentChordPro] = useState(selectedSong?.contentChordPro || SAMPLE_TEMPLATE);

  const [activePane, setActivePane] = useState<'editor' | 'preview' | 'split'>('split');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [customChordInput, setCustomChordInput] = useState('');
  const [showCustomChordPrompt, setShowCustomChordPrompt] = useState(false);

  // Category dropdown & quick-creation state
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

  // Compute all available categories from all songs in library + presets + custom additions
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

  // Filtered categories in dropdown based on search
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

  // Sync state if selectedSong changes
  useEffect(() => {
    if (selectedSong) {
      setTitle(selectedSong.title);
      setArtist(selectedSong.artist);
      setKey(selectedSong.key || 'C');
      setTempo(selectedSong.tempo || 100);
      setTimeSignature(selectedSong.timeSignature || '4/4');
      setCapo(selectedSong.capo || 0);
      setCategories(selectedSong.tags || []);
      setNotes(selectedSong.notes || '');
      setContentChordPro(selectedSong.contentChordPro);
    } else {
      setTitle('');
      setArtist('');
      setKey('C');
      setTempo(100);
      setTimeSignature('4/4');
      setCapo(0);
      setCategories([]);
      setNotes('');
      setContentChordPro(SAMPLE_TEMPLATE);
    }
  }, [selectedSong]);

  // Insert Chord at cursor
  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const currentVal = textarea.value;

    const updated = currentVal.substring(0, startPos) + textToInsert + currentVal.substring(endPos);
    setContentChordPro(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + textToInsert.length, startPos + textToInsert.length);
    }, 10);
  };

  const handleInsertChord = (ch: string) => {
    insertTextAtCursor(`[${ch}]`);
  };

  const handleInsertDirective = (directive: string) => {
    insertTextAtCursor(`\n{${directive}}\n`);
  };

  const handleAddCustomChord = () => {
    if (customChordInput.trim()) {
      handleInsertChord(customChordInput.trim());
      setCustomChordInput('');
      setShowCustomChordPrompt(false);
    }
  };

  // Auto-sync title & artist from ChordPro if entered in text
  const handleAutoExtractMetadata = () => {
    const parsed = parseChordPro(contentChordPro);
    if (parsed.title && parsed.title !== 'Sans Titre') setTitle(parsed.title);
    if (parsed.artist) setArtist(parsed.artist);
    if (parsed.key) setKey(parsed.key);
    if (parsed.tempo) setTempo(parsed.tempo);
    if (parsed.timeSignature) setTimeSignature(parsed.timeSignature);
    if (parsed.capo) setCapo(parsed.capo);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert('Veuillez spécifier un titre pour le chant.');
      return;
    }

    setIsSaving(true);

    const songData = {
      title: title.trim(),
      artist: artist.trim(),
      key: key.trim().toUpperCase(),
      tempo: Number(tempo) || 100,
      timeSignature,
      capo: Number(capo) || 0,
      tags: categories,
      notes: notes.trim(),
      contentChordPro
    };

    try {
      if (selectedSong?.id) {
        await updateSong(selectedSong.id, songData);
      } else {
        const newId = await createSong(songData);
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
  const previewData = parseChordPro(contentChordPro);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-12 text-[#E0E0E0]">
      
      {/* Top Header & Save Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('repertoire')}
            className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] transition-colors"
            title="Retour au répertoire"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {selectedSong ? `Édition : ${selectedSong.title}` : 'Créer un nouveau chant'}
            </h1>
            <p className="text-xs text-gray-400">
              Format standard ChordPro avec accords <code className="text-blue-400 font-mono">[C]</code> et sections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile view toggle */}
          <div className="md:hidden flex items-center bg-[#111112] border border-[#222224] rounded-md p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActivePane('editor')}
              className={`px-3 py-1 rounded font-medium ${
                activePane === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-400'
              }`}
            >
              Éditeur
            </button>
            <button
              type="button"
              onClick={() => setActivePane('preview')}
              className={`px-3 py-1 rounded font-medium ${
                activePane === 'preview' ? 'bg-blue-600 text-white' : 'text-gray-400'
              }`}
            >
              Aperçu
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Enregistré !</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{selectedSong ? 'Mettre à jour' : 'Enregistrer le chant'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metadata Form Grid */}
      <div className="bg-[#111112] border border-[#222224] rounded-lg p-4 sm:p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          
          {/* Titre */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Titre du chant *
            </label>
            <input
              type="text"
              placeholder="ex: Jésus tu es bon"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
              required
            />
          </div>

          {/* Artiste */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Artiste / Auteur
            </label>
            <input
              type="text"
              placeholder="ex: Bethel Music"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Tonalité, Tempo & Capo */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Tonalité
              </label>
              <select
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-2 py-1.5 text-xs text-blue-400 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'Am', 'Em', 'Dm', 'Bm', 'F#m'].map(k => (
                  <option key={k} value={k} className="bg-[#111112] text-gray-200">{k}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Tempo (BPM)
              </label>
              <input
                type="number"
                min={30}
                max={260}
                value={tempo}
                onChange={(e) => setTempo(parseInt(e.target.value, 10) || 100)}
                className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Capo
              </label>
              <select
                value={capo}
                onChange={(e) => setCapo(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-2 py-1.5 text-xs text-purple-400 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7].map(c => (
                  <option key={c} value={c} className="bg-[#111112] text-gray-200">
                    {c === 0 ? '0' : `${c}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Catégories & Stage Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3 pt-3 border-t border-[#222224]">
          {/* Catégories Multi-Select Dropdown */}
          <div className="relative" ref={categoryDropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                <span>Catégorie{categories.length > 1 ? 's' : ''}</span>
              </label>
              {categories.length > 0 && (
                <span className="text-[10px] text-blue-400 font-semibold">
                  {categories.length} sélectionnée{categories.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Dropdown Trigger Box */}
            <div 
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="w-full min-h-[34px] bg-[#1C1C1E] border border-[#333] hover:border-[#444] rounded-md px-2.5 py-1.5 text-xs text-gray-200 cursor-pointer flex flex-wrap items-center gap-1.5 transition-colors"
            >
              {categories.length === 0 ? (
                <span className="text-gray-500 text-xs">Sélectionner ou créer des catégories...</span>
              ) : (
                categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[11px] font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
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

            {/* Dropdown Menu Popover */}
            {isCategoryDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#141416] border border-[#2A2A2D] rounded-lg shadow-2xl z-50 p-2.5 text-xs">
                
                {/* Search & Quick Creation Field */}
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
                    className="flex-1 bg-[#1C1C1E] border border-[#333] rounded px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  {categorySearchQuery.trim() && (
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap transition-colors"
                      title="Créer cette nouvelle catégorie"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Créer</span>
                    </button>
                  )}
                </div>

                {/* Categories List */}
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {filteredCategoryList.length === 0 ? (
                    <div className="py-3 text-center text-gray-500 text-xs">
                      {categorySearchQuery.trim() ? (
                        <div>
                          <span>Aucune catégorie correspondante.</span>
                          <button
                            type="button"
                            onClick={handleCreateCategory}
                            className="block mx-auto mt-1 text-blue-400 font-semibold hover:underline"
                          >
                            + Créer &quot;{categorySearchQuery.trim()}&quot;
                          </button>
                        </div>
                      ) : (
                        'Aucune catégorie disponible'
                      )}
                    </div>
                  ) : (
                    filteredCategoryList.map((cat) => {
                      const isSelected = categories.includes(cat);
                      return (
                        <div
                          key={cat}
                          onClick={() => handleToggleCategory(cat)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
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
                    })
                  )}
                </div>

                {/* Footer bar */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#222224]">
                  {categories.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setCategories([])}
                      className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors"
                    >
                      Tout désélectionner
                    </button>
                  ) : <span />}
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(false)}
                    className="px-2.5 py-0.5 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-[11px] font-medium border border-[#333] transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Note de scène */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Note de Scène / Consignes pour le groupe
            </label>
            <input
              type="text"
              placeholder="ex: Solo de guitare après le pont, fin a cappella"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-3 py-1.5 text-xs text-blue-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Split-Screen Editor & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Left: ChordPro Code Editor & Quick Toolbar */}
        <div className={`flex flex-col bg-[#111112] border border-[#222224] rounded-lg overflow-hidden shadow-sm ${
          activePane === 'preview' ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {/* Quick Insertion Toolbar */}
          <div className="bg-[#0A0A0B] border-b border-[#222224] p-2.5">
            
            {/* Chord Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-[10px] uppercase font-semibold text-gray-500 whitespace-nowrap mr-1">
                Accords :
              </span>
              {COMMON_CHORDS.map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => handleInsertChord(ch)}
                  className="px-2 py-0.5 rounded bg-[#1C1C1E] hover:bg-blue-600 hover:text-white text-blue-400 font-mono font-semibold text-xs border border-[#333] hover:border-blue-500 transition-colors shrink-0 active:scale-95"
                >
                  [{ch}]
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowCustomChordPrompt(!showCustomChordPrompt)}
                className="px-2 py-0.5 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-xs font-semibold border border-[#333] shrink-0"
                title="Autre accord"
              >
                + Accord
              </button>
            </div>

            {/* Custom Chord Prompt Bar */}
            {showCustomChordPrompt && (
              <div className="flex items-center gap-2 pt-2 border-t border-[#222224] mt-2">
                <input
                  type="text"
                  placeholder="ex: F#m7b5 ou Dsus2/F#"
                  value={customChordInput}
                  onChange={(e) => setCustomChordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomChord())}
                  className="bg-[#1C1C1E] border border-[#333] rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCustomChord}
                  className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs font-semibold"
                >
                  Insérer
                </button>
              </div>
            )}

            {/* Section Directives Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[#222224] scrollbar-none">
              <span className="text-[10px] uppercase font-semibold text-gray-500 whitespace-nowrap mr-1">
                Sections :
              </span>
              {[
                { label: 'Refrain', tag: 'c: Refrain' },
                { label: 'Couplet 1', tag: 'c: Couplet 1' },
                { label: 'Couplet 2', tag: 'c: Couplet 2' },
                { label: 'Pont', tag: 'c: Pont' },
                { label: 'Intro', tag: 'c: Intro' },
                { label: 'Fin', tag: 'c: Fin' }
              ].map(sec => (
                <button
                  key={sec.label}
                  type="button"
                  onClick={() => handleInsertDirective(sec.tag)}
                  className="px-2 py-0.5 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-[11px] font-medium border border-[#333] shrink-0"
                >
                  &#123;{sec.label}&#125;
                </button>
              ))}

              <button
                type="button"
                onClick={handleAutoExtractMetadata}
                className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded bg-[#1C1C1E] text-blue-400 hover:bg-[#2A2A2D] text-[11px] font-medium border border-[#333] shrink-0"
                title="Synchroniser le titre et les métadonnées depuis le texte"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-sync tags</span>
              </button>
            </div>

            {/* Vocal Arrangement Directives Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[#222224] scrollbar-none">
              <span className="text-[10px] uppercase font-semibold text-purple-400 flex items-center gap-1 whitespace-nowrap mr-1">
                <Mic className="w-3 h-3" /> Voix :
              </span>
              {[
                { label: 'Unisson', directive: 'vocal: Unisson', style: 'text-cyan-400 border-cyan-500/30 hover:bg-cyan-950/40' },
                { label: 'Lead', directive: 'vocal: Lead', style: 'text-amber-400 border-amber-500/30 hover:bg-amber-950/40' },
                { label: '2e voix', directive: 'vocal: 2e voix', style: 'text-purple-400 border-purple-500/30 hover:bg-purple-950/40' },
                { label: '3e voix', directive: 'vocal: 3e voix', style: 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/40' }
              ].map(voc => (
                <button
                  key={voc.label}
                  type="button"
                  onClick={() => handleInsertDirective(voc.directive)}
                  className={`px-2 py-0.5 rounded bg-[#1C1C1E] text-[11px] font-semibold border ${voc.style} transition-colors shrink-0`}
                  title={`Insérer la pastille d'arrangement {${voc.directive}}`}
                >
                  + {voc.label}
                </button>
              ))}
            </div>

          </div>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            rows={18}
            value={contentChordPro}
            onChange={(e) => setContentChordPro(e.target.value)}
            className="w-full flex-1 bg-[#0A0A0B] text-gray-100 font-mono text-xs sm:text-sm p-4 leading-relaxed focus:outline-none resize-none"
            placeholder="Collez ou écrivez ici votre chant au format ChordPro..."
          />
        </div>

        {/* Right: Live Stage Preview */}
        <div className={`flex flex-col bg-[#111112] border border-[#222224] rounded-lg overflow-hidden shadow-sm ${
          activePane === 'editor' ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="bg-[#0A0A0B] border-b border-[#222224] px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Aperçu Vue Scène en direct</span>
            </span>
            <span className="text-[11px] text-gray-400">
              Tonalité : <strong className="text-blue-400">{key}</strong> • {tempo} BPM
            </span>
          </div>

          <div className="p-4 overflow-y-auto max-h-[580px] space-y-4">
            {previewData.sections.map((sec, sIdx) => (
              <div 
                key={sIdx}
                className={`p-3 rounded-md ${
                  sec.type === 'chorus' ? 'bg-[#1C1C1E] border-l-2 border-blue-500' : 'bg-[#0A0A0B]'
                }`}
              >
                {(sec.title || sec.vocal) && (
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {sec.title ? (
                      <span className="inline-block text-[10px] uppercase font-bold text-blue-400 px-1.5 py-0.5 rounded bg-[#1C1C1E] border border-[#333]">
                        {sec.title}
                      </span>
                    ) : <div />}

                    {sec.vocal && (
                      <span 
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          sec.vocal.toLowerCase().includes('lead')
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                            : sec.vocal.toLowerCase().includes('unisson')
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                            : sec.vocal.toLowerCase().includes('2')
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                            : sec.vocal.toLowerCase().includes('3')
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                            : 'bg-[#1F1F23] text-gray-300 border-[#3A3A3E]'
                        }`}
                      >
                        <Mic className="w-2.5 h-2.5" />
                        <span>{sec.vocal}</span>
                      </span>
                    )}
                  </div>
                )}
                <div className="space-y-2 font-mono text-xs leading-relaxed">
                  {sec.lines.map((line, lIdx) => (
                    <div key={lIdx} className="flex flex-wrap items-end gap-x-0.5">
                      {line.items.map((it, iIdx) => (
                        <div key={iIdx} className="inline-flex flex-col">
                          {it.chord && (
                            <span className="text-blue-400 font-bold leading-none mb-1 text-[0.9em]">
                              {it.chord}
                            </span>
                          )}
                          <span className="text-gray-200 font-sans">{it.lyrics || ' '}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
