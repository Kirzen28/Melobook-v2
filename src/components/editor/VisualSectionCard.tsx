import React, { useState } from 'react';
import { 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Copy, 
  Trash2, 
  Plus, 
  Mic, 
  Music, 
  Edit3, 
  Check, 
  X, 
  FileText,
  CornerDownLeft
} from 'lucide-react';
import { 
  VisualSection, 
  VisualLine, 
  VisualItem, 
  SECTION_TYPES_CONFIG, 
  COMMON_VOCAL_PRESETS,
  generateId,
  cleanUpLineItems 
} from '../../utils/visualEditorUtils';
import { getVocalBadgeStyle } from '../../utils/chordUtils';

interface VisualSectionCardProps {
  section: VisualSection;
  index: number;
  totalSections: number;
  onUpdateSection: (updated: VisualSection) => void;
  onDuplicateSection: (secId: string) => void;
  onDeleteSection: (secId: string) => void;
  onMoveSection: (fromIndex: number, toIndex: number) => void;
  onOpenChordPicker: (context: {
    sectionId: string;
    lineId: string;
    itemId?: string;
    charOffset?: number;
    currentChord: string;
    lyricsSnippet?: string;
    sectionTitle?: string;
  }) => void;
  availableSongChords: string[];
  isDragging?: boolean;
  onDragStart?: (index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (index: number) => void;
}

export const VisualSectionCard: React.FC<VisualSectionCardProps> = ({
  section,
  index,
  totalSections,
  onUpdateSection,
  onDuplicateSection,
  onDeleteSection,
  onMoveSection,
  onOpenChordPicker,
  availableSongChords,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(section.title);
  const [showVocalsPicker, setShowVocalsPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [tempLineChordPro, setTempLineChordPro] = useState('');

  const typeConfig = SECTION_TYPES_CONFIG[section.type] || SECTION_TYPES_CONFIG.general;

  // Handle section type change
  const handleTypeChange = (newType: VisualSection['type']) => {
    let newTitle = section.title;
    const oldConfig = SECTION_TYPES_CONFIG[section.type];
    if (section.title === oldConfig?.label || !section.title) {
      newTitle = SECTION_TYPES_CONFIG[newType].label;
      if (newType === 'verse') newTitle = `Couplet ${index + 1}`;
    }
    onUpdateSection({
      ...section,
      type: newType,
      title: newTitle
    });
  };

  // Save Title
  const handleSaveTitle = () => {
    onUpdateSection({
      ...section,
      title: tempTitle.trim() || 'Section'
    });
    setIsEditingTitle(false);
  };

  // Toggle Vocal badge
  const handleToggleVocal = (voc: string) => {
    const current = section.vocals || [];
    const updated = current.includes(voc)
      ? current.filter(v => v !== voc)
      : [...current, voc];
    onUpdateSection({
      ...section,
      vocals: updated
    });
  };

  // Add line to section
  const handleAddLine = () => {
    const newLine: VisualLine = {
      id: generateId('line'),
      type: 'lyrics',
      items: [{ id: generateId('it'), chord: '', lyrics: 'Nouvelle ligne de paroles' }]
    };
    onUpdateSection({
      ...section,
      lines: [...section.lines, newLine]
    });
  };

  // Add blank line
  const handleAddBlankLine = () => {
    const newLine: VisualLine = {
      id: generateId('line'),
      type: 'empty',
      items: []
    };
    onUpdateSection({
      ...section,
      lines: [...section.lines, newLine]
    });
  };

  // Delete line
  const handleDeleteLine = (lineId: string) => {
    onUpdateSection({
      ...section,
      lines: section.lines.filter(l => l.id !== lineId)
    });
  };

  // Move line up/down
  const handleMoveLine = (lineIdx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? lineIdx - 1 : lineIdx + 1;
    if (targetIdx < 0 || targetIdx >= section.lines.length) return;
    const newLines = [...section.lines];
    const [moved] = newLines.splice(lineIdx, 1);
    newLines.splice(targetIdx, 0, moved);
    onUpdateSection({
      ...section,
      lines: newLines
    });
  };

  // Start fast raw text edit for a line
  const handleStartLineRawEdit = (line: VisualLine) => {
    setEditingLineId(line.id);
    let str = '';
    line.items.forEach(it => {
      if (it.chord && it.chord.trim()) str += `[${it.chord.trim()}]`;
      str += it.lyrics || '';
    });
    setTempLineChordPro(str);
  };

  // Save fast raw text edit for a line
  const handleSaveLineRawEdit = (lineId: string) => {
    const raw = tempLineChordPro;
    const items: VisualItem[] = [];
    const chordRegex = /\[(.*?)\]([^\[]*)/g;
    let match;

    const firstBracket = raw.indexOf('[');
    if (firstBracket > 0) {
      items.push({
        id: generateId('it'),
        chord: '',
        lyrics: raw.slice(0, firstBracket)
      });
    } else if (firstBracket === -1) {
      items.push({
        id: generateId('it'),
        chord: '',
        lyrics: raw
      });
    }

    while ((match = chordRegex.exec(raw)) !== null) {
      items.push({
        id: generateId('it'),
        chord: match[1].trim(),
        lyrics: match[2]
      });
    }

    if (items.length === 0) {
      items.push({ id: generateId('it'), chord: '', lyrics: '' });
    }

    const updatedLines = section.lines.map(l => {
      if (l.id === lineId) {
        return {
          ...l,
          type: 'lyrics' as const,
          items
        };
      }
      return l;
    });

    onUpdateSection({
      ...section,
      lines: updatedLines
    });
    setEditingLineId(null);
  };

  // Update lyrics text of a specific item
  const handleItemLyricsChange = (lineId: string, itemId: string, newLyrics: string) => {
    const updatedLines = section.lines.map(line => {
      if (line.id === lineId) {
        const updatedItems = line.items.map(it => {
          if (it.id === itemId) {
            return { ...it, lyrics: newLyrics };
          }
          return it;
        });
        return { ...line, items: updatedItems };
      }
      return line;
    });
    onUpdateSection({
      ...section,
      lines: updatedLines
    });
  };

  // Delete chord from item
  const handleDeleteChordFromItem = (lineId: string, itemId: string) => {
    const updatedLines = section.lines.map(line => {
      if (line.id === lineId) {
        const updatedItems = line.items.map(it => {
          if (it.id === itemId) {
            return { ...it, chord: '' };
          }
          return it;
        });
        return { ...line, items: cleanUpLineItems(updatedItems) };
      }
      return line;
    });
    onUpdateSection({
      ...section,
      lines: updatedLines
    });
  };

  // Insert a new syllable / split item to drop a chord
  const handleSplitItemAndAddChord = (lineId: string, itemId: string, splitIndex: number) => {
    const targetLine = section.lines.find(l => l.id === lineId);
    if (!targetLine) return;
    const targetItem = targetLine.items.find(it => it.id === itemId);
    if (!targetItem) return;

    const lyrics = targetItem.lyrics || '';
    const beforeText = lyrics.slice(0, splitIndex);
    const afterText = lyrics.slice(splitIndex);

    const defaultChord = availableSongChords[0] || 'C';
    const newItemId = generateId('it');

    const updatedItems: VisualItem[] = [];
    targetLine.items.forEach(it => {
      if (it.id === itemId) {
        if (splitIndex === 0) {
          updatedItems.push({
            id: newItemId,
            chord: defaultChord,
            lyrics: ''
          });
          updatedItems.push(it);
        } else {
          updatedItems.push({
            id: it.id,
            chord: it.chord,
            lyrics: beforeText
          });
          updatedItems.push({
            id: newItemId,
            chord: defaultChord,
            lyrics: afterText
          });
        }
      } else {
        updatedItems.push(it);
      }
    });

    const updatedLines = section.lines.map(l => {
      if (l.id === lineId) {
        return { ...l, items: updatedItems };
      }
      return l;
    });

    onUpdateSection({
      ...section,
      lines: updatedLines
    });

    // Directly open chord picker for the newly created chord
    onOpenChordPicker({
      sectionId: section.id,
      lineId,
      itemId: newItemId,
      currentChord: defaultChord,
      lyricsSnippet: afterText.slice(0, 15) || beforeText.slice(-15) || '',
      sectionTitle: section.title
    });
  };

  return (
    <div 
      draggable
      onDragStart={() => onDragStart && onDragStart(index)}
      onDragOver={(e) => onDragOver && onDragOver(e, index)}
      onDrop={() => onDrop && onDrop(index)}
      className={`group relative bg-[#111113] border border-[#222225] hover:border-[#333338] rounded-xl overflow-hidden shadow-sm transition-all duration-150 ${
        isDragging ? 'opacity-40 scale-[0.98] border-blue-500 border-dashed' : ''
      }`}
    >
      
      {/* Section Header */}
      <div className={`px-3 sm:px-4 py-2.5 bg-[#161619] border-b border-[#222225] flex flex-wrap items-center justify-between gap-2 border-l-4 ${typeConfig.borderAccent}`}>
        
        {/* Left: Drag Handle, Type & Title */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          
          {/* Drag Handle */}
          <div 
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-[#252528] text-gray-400 hover:text-white transition-colors"
            title="Glisser-déposer pour réordonner la section"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Section Type Selector */}
          <select
            value={section.type}
            onChange={(e) => handleTypeChange(e.target.value as VisualSection['type'])}
            className={`px-2 py-1 rounded text-xs font-bold font-mono uppercase tracking-wider border cursor-pointer focus:outline-none transition-colors ${typeConfig.badgeBg} ${typeConfig.badgeBorder} ${typeConfig.badgeText}`}
          >
            <option value="verse" className="bg-[#141416] text-blue-300">Couplet</option>
            <option value="chorus" className="bg-[#141416] text-amber-300">Refrain</option>
            <option value="bridge" className="bg-[#141416] text-purple-300">Pont</option>
            <option value="intro" className="bg-[#141416] text-cyan-300">Intro</option>
            <option value="outro" className="bg-[#141416] text-rose-300">Outro</option>
            <option value="instrumental" className="bg-[#141416] text-emerald-300">Instrumental</option>
            <option value="tag" className="bg-[#141416] text-pink-300">Tag</option>
            <option value="general" className="bg-[#141416] text-gray-300">Autre</option>
          </select>

          {/* Title Editor */}
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="bg-[#1C1C1E] border border-blue-500 rounded px-2 py-0.5 text-xs text-white font-semibold focus:outline-none w-32"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                title="Valider"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTempTitle(section.title);
                setIsEditingTitle(true);
              }}
              className="text-xs font-bold text-gray-200 hover:text-blue-400 flex items-center gap-1 group/title px-1.5 py-0.5 rounded hover:bg-[#202024] transition-colors"
              title="Cliquer pour renommer la section"
            >
              <span>{section.title}</span>
              <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover/title:opacity-100 text-gray-400" />
            </button>
          )}

          {/* Vocal Arrangements Badges */}
          {section.vocals && section.vocals.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {section.vocals.map((voc) => {
                const vStyle = getVocalBadgeStyle(voc);
                return (
                  <span
                    key={voc}
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${vStyle.bg} ${vStyle.border} ${vStyle.text}`}
                  >
                    <Mic className={`w-2.5 h-2.5 ${vStyle.icon}`} />
                    <span>{voc}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleVocal(voc)}
                      className="hover:text-white ml-0.5"
                      title="Retirer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Add vocal tag button */}
          <button
            type="button"
            onClick={() => setShowVocalsPicker(!showVocalsPicker)}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-purple-300 px-1.5 py-0.5 rounded hover:bg-[#202024] transition-colors"
            title="Ajouter une consigne vocale"
          >
            <Mic className="w-3 h-3 text-purple-400" />
            <span>+ Voix</span>
          </button>

        </div>

        {/* Right: Section Actions (Move, Duplicate, Delete) */}
        <div className="flex items-center gap-1">
          
          {/* Move Up / Down Buttons */}
          <button
            type="button"
            onClick={() => onMoveSection(index, index - 1)}
            disabled={index === 0}
            className="p-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2E] text-gray-300 disabled:opacity-30 disabled:hover:bg-[#1C1C1E] border border-[#333] transition-colors"
            title="Monter la section"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onMoveSection(index, index + 1)}
            disabled={index === totalSections - 1}
            className="p-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2E] text-gray-300 disabled:opacity-30 disabled:hover:bg-[#1C1C1E] border border-[#333] transition-colors"
            title="Descendre la section"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Duplicate Section Button */}
          <button
            type="button"
            onClick={() => onDuplicateSection(section.id)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2E] text-gray-300 hover:text-blue-400 border border-[#333] hover:border-blue-500/40 text-xs font-semibold transition-colors"
            title="Dupliquer cette section"
          >
            <Copy className="w-3 h-3 text-blue-400" />
            <span className="hidden sm:inline">Dupliquer</span>
          </button>

          {/* Delete Section Button */}
          {confirmDelete ? (
            <button
              type="button"
              onClick={() => onDeleteSection(section.id)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 text-xs font-bold animate-pulse"
              title="Confirmer la suppression"
            >
              <Check className="w-3 h-3" />
              <span>Confirmer</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 3000);
              }}
              className="p-1 rounded bg-[#1C1C1E] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-[#333] hover:border-rose-500/40 transition-colors"
              title="Supprimer la section"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            </button>
          )}

        </div>

      </div>

      {/* Vocal Arrangement Picker Popover */}
      {showVocalsPicker && (
        <div className="px-4 py-2 bg-[#141417] border-b border-[#222225] flex flex-wrap items-center gap-1.5 animate-in fade-in duration-100">
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mr-1">
            Arrangements :
          </span>
          {COMMON_VOCAL_PRESETS.map((voc) => {
            const isSelected = section.vocals?.includes(voc);
            return (
              <button
                key={voc}
                type="button"
                onClick={() => handleToggleVocal(voc)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-400'
                    : 'bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border-[#333]'
                }`}
              >
                {voc}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowVocalsPicker(false)}
            className="text-[10px] text-gray-400 hover:text-white ml-auto underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Section Content: Interactive Lines */}
      <div className="p-3 sm:p-4 space-y-3">
        {section.lines.length === 0 ? (
          <div className="py-6 text-center text-gray-500 text-xs border border-dashed border-[#222225] rounded-lg">
            <span>Cette section est vide.</span>
            <button
              type="button"
              onClick={handleAddLine}
              className="block mx-auto mt-2 text-blue-400 font-semibold hover:underline"
            >
              + Ajouter une ligne de paroles
            </button>
          </div>
        ) : (
          section.lines.map((line, lIdx) => {
            if (line.type === 'empty') {
              return (
                <div 
                  key={line.id}
                  className="py-1 px-2 border-b border-dashed border-[#222225] flex items-center justify-between text-[11px] text-gray-600 font-mono"
                >
                  <span>— Ligne vide —</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteLine(line.id)}
                    className="text-gray-500 hover:text-rose-400"
                    title="Supprimer la ligne vide"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            }

            const isEditingRaw = editingLineId === line.id;

            return (
              <div 
                key={line.id}
                className="group/line relative p-2.5 rounded-lg bg-[#0A0A0C] border border-[#1E1E22] hover:border-[#2C2C32] transition-colors"
              >
                {isEditingRaw ? (
                  /* Fast raw line ChordPro editor */
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempLineChordPro}
                      onChange={(e) => setTempLineChordPro(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveLineRawEdit(line.id);
                        if (e.key === 'Escape') setEditingLineId(null);
                      }}
                      className="flex-1 bg-[#141416] border border-blue-500 rounded px-2.5 py-1 text-xs font-mono text-gray-100 focus:outline-none"
                      placeholder="ex: [G]Voici les [C]paroles de la ligne"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveLineRawEdit(line.id)}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Valider</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingLineId(null)}
                      className="p-1 rounded bg-[#222226] text-gray-400 hover:text-white text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Visual Interactive Line Display */
                  <div>
                    <div className="flex flex-wrap items-end gap-x-1 gap-y-2 pt-1 font-mono leading-relaxed">
                      {line.items.map((item, itIdx) => (
                        <div key={item.id} className="relative inline-flex flex-col group/item">
                          
                          {/* Chord Badge */}
                          <div className="h-6 flex items-center">
                            {item.chord ? (
                              <button
                                type="button"
                                onClick={() => onOpenChordPicker({
                                  sectionId: section.id,
                                  lineId: line.id,
                                  itemId: item.id,
                                  currentChord: item.chord,
                                  lyricsSnippet: item.lyrics.slice(0, 15),
                                  sectionTitle: section.title
                                })}
                                className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 border border-blue-500/40 hover:border-blue-400 text-xs font-bold font-mono transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                title="Cliquer pour changer cet accord"
                              >
                                <span>{item.chord}</span>
                              </button>
                            ) : (
                              /* Empty chord spot: quick button to drop a chord at start of item */
                              <button
                                type="button"
                                onClick={() => onOpenChordPicker({
                                  sectionId: section.id,
                                  lineId: line.id,
                                  itemId: item.id,
                                  currentChord: availableSongChords[0] || 'C',
                                  lyricsSnippet: item.lyrics.slice(0, 15),
                                  sectionTitle: section.title
                                })}
                                className="opacity-0 group-hover/item:opacity-80 hover:opacity-100! text-[10px] px-1.5 py-0.5 rounded bg-[#1C1C1E] text-gray-400 hover:text-blue-400 border border-[#333] hover:border-blue-500/40 transition-all"
                                title="Ajouter un accord ici"
                              >
                                + Accord
                              </button>
                            )}
                          </div>

                          {/* Lyrics chunk with clickable syllable insert points */}
                          <div className="relative flex items-center">
                            <span 
                              className="text-gray-100 font-sans text-sm tracking-wide select-text py-0.5"
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const newText = e.currentTarget.textContent || '';
                                if (newText !== item.lyrics) {
                                  handleItemLyricsChange(line.id, item.id, newText);
                                }
                              }}
                            >
                              {item.lyrics || (line.items.length === 1 && !item.chord ? 'Cliquez pour écrire les paroles...' : '\u00A0')}
                            </span>

                            {/* Split word / insert chord in syllable button (visible on hover) */}
                            {item.lyrics && item.lyrics.trim().length > 3 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const mid = Math.floor(item.lyrics.length / 2);
                                  handleSplitItemAndAddChord(line.id, item.id, mid);
                                }}
                                className="opacity-0 group-hover/item:opacity-60 hover:opacity-100! ml-1 p-0.5 rounded text-[10px] text-blue-400 hover:bg-blue-600/20"
                                title="Placer un accord au milieu de ce mot"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                        </div>
                      ))}
                    </div>

                    {/* Quick Line Hover Controls */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover/line:opacity-100 transition-opacity flex items-center gap-1 bg-[#141416]/90 backdrop-blur-xs p-1 rounded-md border border-[#2A2A2D]">
                      <button
                        type="button"
                        onClick={() => handleStartLineRawEdit(line)}
                        className="p-1 rounded text-gray-400 hover:text-blue-400 hover:bg-[#202024] transition-colors"
                        title="Éditer la ligne en texte"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveLine(lIdx, 'up')}
                        disabled={lIdx === 0}
                        className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-20 hover:bg-[#202024]"
                        title="Monter la ligne"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveLine(lIdx, 'down')}
                        disabled={lIdx === section.lines.length - 1}
                        className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-20 hover:bg-[#202024]"
                        title="Descendre la ligne"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteLine(line.id)}
                        className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-[#202024]"
                        title="Supprimer cette ligne"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Section Bottom Add Line Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleAddLine}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#161619] hover:bg-[#1E1E22] text-gray-300 hover:text-blue-400 border border-[#2A2A2E] hover:border-blue-500/40 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>Ajouter une ligne</span>
          </button>

          <button
            type="button"
            onClick={handleAddBlankLine}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#161619] hover:bg-[#1E1E22] text-gray-400 hover:text-gray-200 border border-[#2A2A2E] text-xs transition-colors"
            title="Insérer un saut de ligne visuel"
          >
            <CornerDownLeft className="w-3 h-3" />
            <span>Ligne vide</span>
          </button>
        </div>

      </div>

    </div>
  );
};
