import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown, 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  Trash2, 
  Plus, 
  Minus, 
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
  STANDARD_SECTION_TYPES, 
  getSectionTypeConfig, 
  getCustomSectionTypes, 
  saveCustomSectionType, 
  generateId, 
  cleanUpLineItems 
} from '../../utils/visualEditorUtils';
import { useApp } from '../../context/AppContext';
import { VocalArrangementSelector } from './VocalArrangementSelector';

interface VisualSectionCardProps {
  section: VisualSection;
  index: number;
  totalSections: number;
  onUpdateSection: (updated: VisualSection) => void;
  onDuplicateSection: (secId: string) => void;
  onDeleteSection: (secId: string) => void;
  onMoveSection: (fromIndex: number, toIndex: number) => void;
  onOpenChordPicker?: (context: {
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
  isCollapsed?: boolean;
  onToggleCollapse?: (secId: string) => void;
  onAddSection?: (type: string, customTitle?: string, afterIndex?: number) => void;
  onOpenCustomSectionModal?: () => void;
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
  onDrop,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
  onAddSection,
  onOpenCustomSectionModal
}) => {
  const { canManageSongs } = useApp();
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isSectionCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : localCollapsed;

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse(section.id);
    } else {
      setLocalCollapsed(prev => !prev);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [tempLineChordPro, setTempLineChordPro] = useState('');

  // Custom section types management
  const [customTypes, setCustomTypes] = useState<string[]>(() => getCustomSectionTypes());
  const [isCreatingCustomType, setIsCreatingCustomType] = useState(false);
  const [newCustomTypeName, setNewCustomTypeName] = useState('');

  const cardRef = useRef<HTMLDivElement>(null);

  // Floating "+" button above cursor position
  const [cursorTarget, setCursorTarget] = useState<{
    lineId: string;
    itemId: string;
    splitIndex: number;
    x: number;
    y: number;
  } | null>(null);

  // Bottom hover action dropdown state
  const [isBottomAddDropdownOpen, setIsBottomAddDropdownOpen] = useState(false);
  const bottomDropdownRef = useRef<HTMLDivElement>(null);

  // Manual inline chord editing (no popup modal)
  const [editingChord, setEditingChord] = useState<{
    lineId: string;
    itemId: string;
    value: string;
    isNew?: boolean;
  } | null>(null);

  // Track caret position inside lyrics spans to show floating "+" button
  const updateCursorTarget = () => {
    if (editingChord) {
      setCursorTarget(null);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !cardRef.current) {
      setCursorTarget(null);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!cardRef.current.contains(range.startContainer)) {
      setCursorTarget(null);
      return;
    }

    const targetNode = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as HTMLElement);

    const lyricsSpan = targetNode?.closest<HTMLElement>('[data-lyrics-item-id]');
    if (!lyricsSpan) {
      setCursorTarget(null);
      return;
    }

    const lineId = lyricsSpan.getAttribute('data-lyrics-line-id');
    const itemId = lyricsSpan.getAttribute('data-lyrics-item-id');
    if (!lineId || !itemId) {
      setCursorTarget(null);
      return;
    }

    let splitIndex = range.startOffset;
    if (range.startContainer === lyricsSpan) {
      splitIndex = range.startOffset === 0 ? 0 : (lyricsSpan.textContent?.length || 0);
    }

    let caretRect = range.getBoundingClientRect();
    if (caretRect.width === 0 && caretRect.height === 0) {
      const spanRect = lyricsSpan.getBoundingClientRect();
      const cloned = range.cloneRange();
      if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
        cloned.setStart(range.startContainer, range.startOffset - 1);
        const r = cloned.getBoundingClientRect();
        caretRect = new DOMRect(r.right, r.top, 1, r.height || spanRect.height || 18);
      } else if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset < (range.startContainer.textContent?.length || 0)) {
        cloned.setEnd(range.startContainer, range.startOffset + 1);
        const r = cloned.getBoundingClientRect();
        caretRect = new DOMRect(r.left, r.top, 1, r.height || spanRect.height || 18);
      } else {
        caretRect = new DOMRect(spanRect.left, spanRect.top, 1, spanRect.height || 18);
      }
    }

    const cardRect = cardRef.current.getBoundingClientRect();
    const rawX = caretRect.left - cardRect.left;
    const clampedX = Math.max(16, Math.min(cardRect.width - 16, rawX));
    const clampedY = Math.max(12, caretRect.top - cardRect.top - 14);

    setCursorTarget({
      lineId,
      itemId,
      splitIndex,
      x: clampedX,
      y: clampedY
    });
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      requestAnimationFrame(updateCursorTarget);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('resize', handleSelectionChange);
    window.addEventListener('scroll', handleSelectionChange, true);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('resize', handleSelectionChange);
      window.removeEventListener('scroll', handleSelectionChange, true);
    };
  }, [editingChord]);

  // Close bottom add section dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bottomDropdownRef.current && !bottomDropdownRef.current.contains(e.target as Node)) {
        setIsBottomAddDropdownOpen(false);
      }
    };
    if (isBottomAddDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isBottomAddDropdownOpen]);

  const typeConfig = getSectionTypeConfig(section.type, section.title);

  // Compute selected option label with automatic numbering if multiple sections of this type exist
  const selectedDisplayLabel = useMemo(() => {
    if (section.title && section.title.trim()) {
      return section.title;
    }
    const std = STANDARD_SECTION_TYPES.find(t => t.key === section.type);
    if (std) return std.label;
    if (section.type && section.type !== 'general') return section.type;
    return 'Autre';
  }, [section.title, section.type]);

  // Compute merged custom types including any existing custom type in this section
  const mergedCustomTypes = useMemo(() => {
    const list = [...customTypes];
    const standardKeys = new Set([
      'verse', 'chorus', 'pre_chorus', 'bridge', 'intro', 'outro', 
      'solo', 'interlude', 'instrumental', 'tag', 'finale', 'general'
    ]);
    if (section.type && !standardKeys.has(section.type) && !list.some(t => t.toLowerCase() === section.type.toLowerCase())) {
      list.push(section.type);
    }
    return list;
  }, [customTypes, section.type]);

  // Handle section type change
  const handleTypeChange = (newTypeVal: string) => {
    if (newTypeVal === '__custom__') {
      setIsCreatingCustomType(true);
      return;
    }

    onUpdateSection({
      ...section,
      type: newTypeVal
    });
  };

  // Handle custom section type confirmation
  const handleConfirmCustomType = () => {
    const trimmed = newCustomTypeName.trim();
    if (!trimmed) {
      setIsCreatingCustomType(false);
      return;
    }
    const updatedTypes = saveCustomSectionType(trimmed);
    setCustomTypes(updatedTypes);
    setIsCreatingCustomType(false);
    setNewCustomTypeName('');

    onUpdateSection({
      ...section,
      type: trimmed
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

  // Insert or edit chord directly at the cursor position
  const handleAddChordAtCursor = () => {
    if (!cursorTarget) return;
    const { lineId, itemId, splitIndex } = cursorTarget;

    const targetLine = section.lines.find(l => l.id === lineId);
    if (!targetLine) return;
    const targetItem = targetLine.items.find(it => it.id === itemId);
    if (!targetItem) return;

    // Get live text from the span if user was actively typing
    const spanElem = cardRef.current?.querySelector<HTMLElement>(`[data-lyrics-item-id="${itemId}"]`);
    const liveLyrics = spanElem ? (spanElem.textContent || '') : (targetItem.lyrics || '');

    const newItemId = generateId('it');
    const updatedItems: VisualItem[] = [];

    if (splitIndex === 0) {
      if (!targetItem.chord) {
        // Target item has no chord: directly activate inline editing on it
        setEditingChord({
          lineId,
          itemId: targetItem.id,
          value: '',
          isNew: true
        });
        setCursorTarget(null);
        return;
      } else {
        // Prepend an item with empty lyrics and new chord slot
        updatedItems.push({
          id: newItemId,
          chord: '',
          lyrics: ''
        });
        targetLine.items.forEach(it => {
          if (it.id === itemId) {
            updatedItems.push({ ...it, lyrics: liveLyrics });
          } else {
            updatedItems.push(it);
          }
        });
      }
    } else if (splitIndex >= liveLyrics.length) {
      // Append new chord item after targetItem
      targetLine.items.forEach(it => {
        if (it.id === itemId) {
          updatedItems.push({ ...it, lyrics: liveLyrics });
          updatedItems.push({
            id: newItemId,
            chord: '',
            lyrics: ''
          });
        } else {
          updatedItems.push(it);
        }
      });
    } else {
      // Split word at exact splitIndex
      const beforeText = liveLyrics.slice(0, splitIndex);
      const afterText = liveLyrics.slice(splitIndex);

      targetLine.items.forEach(it => {
        if (it.id === itemId) {
          updatedItems.push({
            id: it.id,
            chord: it.chord,
            lyrics: beforeText
          });
          updatedItems.push({
            id: newItemId,
            chord: '',
            lyrics: afterText
          });
        } else {
          updatedItems.push(it);
        }
      });
    }

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

    setCursorTarget(null);
    setEditingChord({
      lineId,
      itemId: newItemId,
      value: '',
      isNew: true
    });
  };

  // Save current manual inline chord
  const saveCurrentEditingChord = () => {
    if (!editingChord) return;
    const { lineId, itemId, value } = editingChord;
    const trimmed = value.trim();

    const updatedLines = section.lines.map(line => {
      if (line.id !== lineId) return line;

      if (!trimmed) {
        const updatedItems = line.items.map(it => {
          if (it.id === itemId) {
            return { ...it, chord: '' };
          }
          return it;
        });
        return { ...line, items: cleanUpLineItems(updatedItems) };
      } else {
        const updatedItems = line.items.map(it => {
          if (it.id === itemId) {
            return { ...it, chord: trimmed };
          }
          return it;
        });
        return { ...line, items: updatedItems };
      }
    });

    onUpdateSection({
      ...section,
      lines: updatedLines
    });

    setEditingChord(null);
  };

  // Cancel manual inline chord
  const cancelCurrentEditingChord = () => {
    if (!editingChord) return;
    const { lineId, itemId, isNew } = editingChord;

    if (isNew) {
      const updatedLines = section.lines.map(line => {
        if (line.id !== lineId) return line;
        const updatedItems = line.items.map(it => {
          if (it.id === itemId) {
            return { ...it, chord: '' };
          }
          return it;
        });
        return { ...line, items: cleanUpLineItems(updatedItems) };
      });
      onUpdateSection({
        ...section,
        lines: updatedLines
      });
    }

    setEditingChord(null);
  };

  // Render bottom section action buttons: Reorder, Duplicate, Delete, Add Section
  const renderBottomSectionActions = () => (
    <div
      ref={bottomDropdownRef}
      className="flex items-center gap-1.5 flex-wrap"
    >
      {/* Move Section Up / Down */}
      <div className="flex items-center bg-[#18181C] border border-[#2E2E34] rounded-lg p-0.5">
        <button
          type="button"
          onClick={() => onMoveSection(index, index - 1)}
          disabled={index === 0}
          className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-20 hover:bg-[#222228] transition-colors"
          title="Monter la section"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMoveSection(index, index + 1)}
          disabled={index === totalSections - 1}
          className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-20 hover:bg-[#222228] transition-colors"
          title="Descendre la section"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Duplicate Section Button */}
      <button
        type="button"
        onClick={() => onDuplicateSection(section.id)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#18181C] hover:bg-[#222228] text-gray-300 hover:text-blue-400 border border-[#2E2E34] hover:border-blue-500/40 text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
        title="Dupliquer cette section"
      >
        <Copy className="w-3.5 h-3.5 text-blue-400" />
        <span className="hidden sm:inline">Dupliquer</span>
      </button>

      {/* Add Section dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsBottomAddDropdownOpen(!isBottomAddDropdownOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#18181C] hover:bg-[#222228] text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/60 text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
          title="Ajouter une section après celle-ci"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          <span>Section</span>
          <ChevronDown className={`w-3.5 h-3.5 text-blue-400/80 transition-transform ${isBottomAddDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isBottomAddDropdownOpen && (
          <div className="absolute right-0 bottom-full mb-2 z-50 w-64 bg-[#18181C] border border-[#2E2E36] rounded-xl shadow-2xl p-1.5 backdrop-blur-md max-h-72 overflow-y-auto custom-scrollbar">
            <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-[#282830] mb-1">
              Insérer après cette section
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
                      if (onAddSection) {
                        onAddSection(key, undefined, index);
                      }
                      setIsBottomAddDropdownOpen(false);
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

            {customTypes.length > 0 && (
              <div className="pt-2 mt-1 border-t border-[#25252D]">
                <div className="px-2 py-1 text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1">
                  Sections personnalisées
                </div>
                <div className="space-y-0.5">
                  {customTypes.map((customName) => (
                    <button
                      key={customName}
                      type="button"
                      onClick={() => {
                        if (onAddSection) {
                          onAddSection(customName, customName, index);
                        }
                        setIsBottomAddDropdownOpen(false);
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

            {onOpenCustomSectionModal && (
              <div className="pt-1.5 mt-1 border-t border-[#25252D]">
                <button
                  type="button"
                  onClick={() => {
                    setIsBottomAddDropdownOpen(false);
                    onOpenCustomSectionModal();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-600/15 border border-dashed border-amber-500/30 transition-colors text-left"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Créer une section personnalisée...</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Section Button */}
      {confirmDelete ? (
        <button
          type="button"
          onClick={() => onDeleteSection(section.id)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 text-xs font-bold animate-pulse"
          title="Confirmer la suppression"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Confirmer</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
          }}
          className="p-1.5 rounded-lg bg-[#18181C] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-[#2E2E34] hover:border-rose-500/40 transition-colors"
          title="Supprimer la section"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
        </button>
      )}
    </div>
  );

  return (
    <div 
      ref={cardRef}
      draggable
      onDragStart={() => onDragStart && onDragStart(index)}
      onDragOver={(e) => onDragOver && onDragOver(e, index)}
      onDrop={() => onDrop && onDrop(index)}
      className={`group relative bg-[#111113] border rounded-xl overflow-visible shadow-sm transition-all duration-200 ${
        isDragging 
          ? 'opacity-40 scale-[0.98] border-2 border-blue-500 border-dashed bg-blue-950/20 ring-2 ring-blue-500/20' 
          : 'border-[#222225] hover:border-blue-500/40 hover:bg-[#141417]'
      }`}
    >
      
      {/* Section Header */}
      <div className={`px-3 sm:px-4 py-2.5 bg-[#161619] rounded-t-xl ${isSectionCollapsed ? 'rounded-b-xl' : 'border-b border-[#222225]'} flex flex-col gap-2 border-l-4 ${typeConfig.borderAccent}`}>
        
        {/* Line 1: Name and Label of the section */}
        <div className="flex items-center justify-between gap-2 w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {/* Drag Handle */}
            <div 
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-[#252528] text-gray-400 hover:text-white transition-colors"
              title="Glisser-déposer pour réordonner la section"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Section Type Selector or Custom Type Creator */}
            {isCreatingCustomType ? (
              <div className="flex items-center gap-1 bg-[#141416] border border-blue-500 rounded px-1.5 py-0.5 animate-in fade-in">
                <input
                  type="text"
                  value={newCustomTypeName}
                  onChange={(e) => setNewCustomTypeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmCustomType();
                    } else if (e.key === 'Escape') {
                      setIsCreatingCustomType(false);
                      setNewCustomTypeName('');
                    }
                  }}
                  placeholder="Nom ex: Vamp..."
                  className="bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none w-32 font-semibold"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleConfirmCustomType}
                  className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                  title="Valider la section personnalisée"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingCustomType(false);
                    setNewCustomTypeName('');
                  }}
                  className="p-1 rounded bg-[#2A2A2E] text-gray-400 hover:text-white transition-colors"
                  title="Annuler"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <select
                value={section.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                style={{ width: `${Math.max(10, selectedDisplayLabel.length + 6)}ch` }}
                className={`min-w-0 max-w-full pl-2.5 pr-6 py-1 rounded text-xs font-bold font-mono uppercase tracking-wider border cursor-pointer focus:outline-none transition-all ${typeConfig.badgeBg} ${typeConfig.badgeBorder} ${typeConfig.badgeText}`}
              >
                <optgroup label="Sections standards">
                  <option value="verse" className="bg-[#141416] text-blue-300">
                    {section.type === 'verse' ? selectedDisplayLabel : 'Couplet'}
                  </option>
                  <option value="chorus" className="bg-[#141416] text-amber-300">
                    {section.type === 'chorus' ? selectedDisplayLabel : 'Refrain'}
                  </option>
                  <option value="pre_chorus" className="bg-[#141416] text-pink-300">
                    {section.type === 'pre_chorus' ? selectedDisplayLabel : 'Pré refrain'}
                  </option>
                  <option value="bridge" className="bg-[#141416] text-purple-300">
                    {section.type === 'bridge' ? selectedDisplayLabel : 'Pont'}
                  </option>
                  <option value="intro" className="bg-[#141416] text-cyan-300">
                    {section.type === 'intro' ? selectedDisplayLabel : 'Intro'}
                  </option>
                  <option value="outro" className="bg-[#141416] text-rose-300">
                    {section.type === 'outro' ? selectedDisplayLabel : 'Outro'}
                  </option>
                  <option value="solo" className="bg-[#141416] text-orange-300">
                    {section.type === 'solo' ? selectedDisplayLabel : 'Solo'}
                  </option>
                  <option value="interlude" className="bg-[#141416] text-indigo-300">
                    {section.type === 'interlude' ? selectedDisplayLabel : 'Interlude'}
                  </option>
                  <option value="instrumental" className="bg-[#141416] text-emerald-300">
                    {section.type === 'instrumental' ? selectedDisplayLabel : 'Instrumental'}
                  </option>
                  <option value="tag" className="bg-[#141416] text-fuchsia-300">
                    {section.type === 'tag' ? selectedDisplayLabel : 'Tag'}
                  </option>
                  <option value="finale" className="bg-[#141416] text-red-300">
                    {section.type === 'finale' ? selectedDisplayLabel : 'Finale'}
                  </option>
                  <option value="general" className="bg-[#141416] text-gray-300">
                    {section.type === 'general' ? selectedDisplayLabel : 'Autre'}
                  </option>
                </optgroup>
                {mergedCustomTypes.length > 0 && (
                  <optgroup label="Sections personnalisées">
                    {mergedCustomTypes.map((ct) => (
                      <option key={ct} value={ct} className="bg-[#141416] text-teal-300">
                        {section.type === ct ? selectedDisplayLabel : ct}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Personnaliser">
                  <option value="__custom__" className="bg-[#141416] text-amber-400 font-bold">
                    + Section personnalisée...
                  </option>
                </optgroup>
              </select>
            )}
          </div>

          {/* Section Header Right Controls: Vocal Arrangement & Fold/Unfold */}
          <div className="flex items-center gap-1.5 shrink-0">
            <VocalArrangementSelector
              vocals={section.vocals || []}
              onChange={(newVocals) => {
                onUpdateSection({
                  ...section,
                  vocals: newVocals
                });
              }}
              canEdit={canManageSongs}
            />

            {/* Fold and Unfold Toggle Button */}
            <button
              type="button"
              onClick={handleToggleCollapse}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold transition-colors ${
                isSectionCollapsed
                  ? 'bg-blue-600/15 border-blue-500/40 text-blue-300 hover:bg-blue-600/25'
                  : 'bg-[#1C1C1E] border-[#333] text-gray-300 hover:text-white hover:bg-[#252528]'
              }`}
              title={isSectionCollapsed ? 'Déplier les paroles et accords' : 'Replier les paroles et accords'}
            >
              {isSectionCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline text-[11px]">Déplier</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  <span className="hidden sm:inline text-[11px]">Replier</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Section Content: Interactive Lines (rendered only when unfolded) */}
      {!isSectionCollapsed && (
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
          <div className="bg-[#0A0A0C] border border-[#1E1E22] rounded-xl p-3 sm:p-4 space-y-3.5">
            {section.lines.map((line, lIdx) => {
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
                  className="group/line relative py-1.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.025] transition-colors"
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
                      <div className="flex flex-wrap items-end gap-x-1 gap-y-2 pt-0.5 font-mono leading-relaxed">
                        {line.items.map((item, itIdx) => (
                          <div key={item.id} className="relative inline-flex flex-col group/item">
                            
                            {/* Chord Slot: Inline Editing OR Badge */}
                            <div className="h-6 flex items-center">
                              {editingChord && editingChord.lineId === line.id && editingChord.itemId === item.id ? (
                                <div className="relative inline-flex items-center">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editingChord.value}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const formatted = val.length === 1 && /^[a-g]$/i.test(val) ? val.toUpperCase() : val;
                                      setEditingChord(prev => prev ? { ...prev, value: formatted } : null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        saveCurrentEditingChord();
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        cancelCurrentEditingChord();
                                      }
                                    }}
                                    onBlur={saveCurrentEditingChord}
                                    placeholder="Accord"
                                    className="h-6 w-16 px-1.5 py-0.5 rounded bg-[#101014] border-2 border-blue-500 text-blue-300 font-mono font-bold text-xs text-center focus:outline-none shadow-lg z-20"
                                  />
                                </div>
                              ) : item.chord ? (
                                <div className="relative group/badge inline-flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingChord({
                                        lineId: line.id,
                                        itemId: item.id,
                                        value: item.chord,
                                        isNew: false
                                      });
                                    }}
                                    className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 border border-blue-500/40 hover:border-blue-400 text-xs font-bold font-mono transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                    title="Cliquer pour modifier cet accord manuellement"
                                  >
                                    <span>{item.chord}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteChordFromItem(line.id, item.id);
                                    }}
                                    className="opacity-0 group-hover/badge:opacity-100 p-0.5 text-gray-400 hover:text-rose-400 transition-opacity cursor-pointer ml-0.5"
                                    title="Supprimer cet accord"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : null}
                            </div>

                            {/* Lyrics chunk */}
                            <div className="relative flex items-center">
                              <span 
                                className="text-gray-100 font-sans text-sm tracking-wide select-text py-0.5 focus:outline-none focus:bg-blue-950/20 rounded px-0.5 cursor-text"
                                contentEditable
                                suppressContentEditableWarning
                                data-lyrics-line-id={line.id}
                                data-lyrics-item-id={item.id}
                                onBlur={(e) => {
                                  const newText = e.currentTarget.textContent || '';
                                  if (newText !== item.lyrics) {
                                    handleItemLyricsChange(line.id, item.id, newText);
                                  }
                                }}
                                onKeyUp={updateCursorTarget}
                                onClick={updateCursorTarget}
                              >
                                {item.lyrics || (line.items.length === 1 && !item.chord ? 'Cliquez pour écrire les paroles...' : '\u00A0')}
                              </span>
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
            })}
          </div>
        )}

        {/* Section Bottom Add Line Actions & Section Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1C1C20] flex-wrap">
          <div className="flex items-center gap-2">
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

          {renderBottomSectionActions()}
        </div>

      </div>
      )}

      {/* If section is collapsed, show bottom action bar */}
      {isSectionCollapsed && (
        <div className="px-3 sm:px-4 py-2 bg-[#141416] rounded-b-xl border-t border-[#202024] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{section.lines.length} ligne{section.lines.length > 1 ? 's' : ''}</span>
            {Boolean(section.repeat && section.repeat > 1) && (
              <span className="text-emerald-400 font-mono font-semibold">x{section.repeat}</span>
            )}
            {Boolean(section.vocals && section.vocals.length > 0) && (
              <span className="text-purple-400 text-[11px]">{section.vocals.join(', ')}</span>
            )}
          </div>
          {renderBottomSectionActions()}
        </div>
      )}

      {/* Floating "+" button right above the cursor position */}
      {cursorTarget && !editingChord && !isSectionCollapsed && (
        <div
          style={{
            position: 'absolute',
            left: `${cursorTarget.x}px`,
            top: `${cursorTarget.y}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 40
          }}
          className="pointer-events-auto"
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleAddChordAtCursor();
            }}
            className="w-5 h-5 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg border border-blue-400/60 hover:scale-115 active:scale-95 transition-all duration-150 animate-in fade-in zoom-in-75 cursor-pointer ring-2 ring-blue-500/25"
            title="Placer un accord au dessus du curseur"
            aria-label="Placer un accord au dessus du curseur"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      )}

    </div>
  );
};
