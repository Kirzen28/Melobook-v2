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
  CornerDownLeft,
  Repeat,
  Scissors
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
import { 
  convertIntuitiveTextToVisualLines, 
  convertVisualLinesToIntuitiveText, 
  extractTextChordStats,
  classifyLine,
  isChordToken
} from '../../utils/intuitiveChordParser';
import { getVocalBadgeStyle } from '../../utils/chordUtils';
import { getSectionColor } from '../../utils/displayDefaults';
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
  onSplitSection?: (sectionId: string, headLines: VisualLine[], tailLines: VisualLine[]) => void;
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
  onOpenCustomSectionModal,
  onSplitSection
}) => {
  const { canManageSongs, displaySettings } = useApp();
  const sectionColor = useMemo(() => {
    return getSectionColor(section.type, displaySettings?.sectionColors || {});
  }, [section.type, displaySettings?.sectionColors]);
  const chordColor = displaySettings?.chordColor || '#60a5fa';
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
  const confirmDeleteTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (confirmDeleteTimerRef.current) {
        clearTimeout(confirmDeleteTimerRef.current);
      }
    };
  }, []);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      if (confirmDeleteTimerRef.current) clearTimeout(confirmDeleteTimerRef.current);
      setConfirmDelete(false);
      onDeleteSection(section.id);
    } else {
      setConfirmDelete(true);
      if (confirmDeleteTimerRef.current) clearTimeout(confirmDeleteTimerRef.current);
      confirmDeleteTimerRef.current = setTimeout(() => {
        setConfirmDelete(false);
      }, 3500);
    }
  };

  const handleDoubleClickDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteTimerRef.current) clearTimeout(confirmDeleteTimerRef.current);
    setConfirmDelete(false);
    onDeleteSection(section.id);
  };

  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [tempLineChordPro, setTempLineChordPro] = useState('');

  // Custom section types management
  const [customTypes, setCustomTypes] = useState<string[]>(() => getCustomSectionTypes());
  const [isCreatingCustomType, setIsCreatingCustomType] = useState(false);
  const [newCustomTypeName, setNewCustomTypeName] = useState('');

  const cardRef = useRef<HTMLDivElement>(null);

  // Intuitive unified text field state
  const [rawText, setRawText] = useState(() => convertVisualLinesToIntuitiveText(section.lines));
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Synchronize text when section changes externally and user is not actively typing
  useEffect(() => {
    if (!isTypingRef.current) {
      setRawText(convertVisualLinesToIntuitiveText(section.lines));
    }
  }, [section.id, section.lines]);

  // Mini popover state for splitting section at cursor
  const [splitPopover, setSplitPopover] = useState<{
    visible: boolean;
    charIndex: number;
    x: number;
    y: number;
  } | null>(null);

  // Close split popover on click outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (splitPopover?.visible) {
        const target = e.target as HTMLElement;
        if (!target.closest('.split-section-popover') && !target.closest('textarea')) {
          setSplitPopover(null);
        }
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [splitPopover]);

  // Detected chord stats
  const chordStats = useMemo(() => {
    return extractTextChordStats(rawText);
  }, [rawText]);

  // Renders syntax-highlighted lines differentiating chords (bold blue + soft tint) from lyrics (white)
  const renderHighlightedContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <>
        {lines.map((line, idx) => {
          const isLast = idx === lines.length - 1;
          const lineInfo = classifyLine(line);

          let renderedLine: React.ReactNode;

          if (lineInfo.type === 'empty') {
            renderedLine = <span>&nbsp;</span>;
          } else if (lineInfo.type === 'chordpro_line') {
            const parts = line.split(/(\[[^\]]+\])/g);
            renderedLine = parts.map((part, pIdx) => {
              if (part.startsWith('[') && part.endsWith(']')) {
                return (
                  <span key={pIdx} style={{ color: chordColor }} className="font-bold font-mono">
                    {part}
                  </span>
                );
              }
              return <span key={pIdx} className="text-[#E0E0E0]">{part}</span>;
            });
          } else if (lineInfo.type === 'chord_line') {
            const parts = line.split(/(\s+)/g);
            renderedLine = parts.map((part, pIdx) => {
              if (/\s+/.test(part)) {
                return <span key={pIdx}>{part}</span>;
              }
              const isChord = isChordToken(part);
              if (isChord) {
                return (
                  <span key={pIdx} style={{ color: chordColor }} className="font-bold font-mono">
                    {part}
                  </span>
                );
              }
              return (
                <span key={pIdx} style={{ color: chordColor }} className="font-semibold font-mono">
                  {part}
                </span>
              );
            });
          } else {
            // Lyrics line
            renderedLine = <span className="text-[#E0E0E0] font-normal">{line}</span>;
          }

          return (
            <React.Fragment key={idx}>
              {renderedLine}
              {!isLast && '\n'}
            </React.Fragment>
          );
        })}
        {text.endsWith('\n') && '\u00A0'}
      </>
    );
  };

  // Handle live text edits in the unified text field
  const handleTextChange = (newVal: string) => {
    isTypingRef.current = true;
    setRawText(newVal);
    const updatedLines = convertIntuitiveTextToVisualLines(newVal);
    onUpdateSection({
      ...section,
      lines: updatedLines
    });
    setTimeout(() => {
      isTypingRef.current = false;
    }, 200);
  };

  // Quick insertion of a chord at current caret position
  const handleInsertChord = (chord: string) => {
    const el = textareaRef.current;
    if (!el) {
      const nextText = rawText ? `${rawText}\n${chord} ` : `${chord} `;
      handleTextChange(nextText);
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const before = rawText.substring(0, start);
    const after = rawText.substring(end);
    const inserted = `${chord} `;
    const newText = before + inserted + after;
    handleTextChange(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + inserted.length, start + inserted.length);
    }, 10);
  };

  // Handle click in textarea to open mini split popover
  const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const caret = el.selectionStart;
    if (caret === null || caret === undefined) return;

    // Do not trigger if at the very beginning or very end of empty text
    if (!rawText.trim()) {
      setSplitPopover(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    // Relative coordinates within the textarea container
    const relativeX = Math.max(12, Math.min(rect.width - 150, e.clientX - rect.left));
    const relativeY = Math.max(8, e.clientY - rect.top);

    setSplitPopover({
      visible: true,
      charIndex: caret,
      x: relativeX,
      y: relativeY
    });
  };

  // Perform split at charIndex: divide rawText into two parts and create new section
  const handlePerformSplitSection = () => {
    if (!splitPopover) return;
    const { charIndex } = splitPopover;

    let headText = rawText.substring(0, charIndex);
    let tailText = rawText.substring(charIndex);

    // If caret was inside a line, split at nearest clean line break or cleanly cut
    const headLines = convertIntuitiveTextToVisualLines(headText);
    const tailLines = convertIntuitiveTextToVisualLines(tailText);

    if (onSplitSection) {
      onSplitSection(section.id, headLines, tailLines);
    } else {
      // Fallback: update this section with head, add section after with tail
      onUpdateSection({
        ...section,
        lines: headLines
      });
      if (onAddSection) {
        onAddSection(section.type, section.title, index);
      }
    }

    setSplitPopover(null);
  };

  // Floating "+" button above cursor position
  const [cursorTarget, setCursorTarget] = useState<{
    lineId: string;
    itemId: string;
    splitIndex: number;
    x: number;
    y: number;
  } | null>(null);


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
    const nextText = rawText ? `${rawText}\nNouvelle ligne de paroles` : 'Nouvelle ligne de paroles';
    handleTextChange(nextText);
  };

  // Add blank line (line with space)
  const handleAddBlankLine = () => {
    const nextText = rawText ? `${rawText}\n ` : ' ';
    handleTextChange(nextText);
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

  };

  return (
    <div 
      ref={cardRef}
      draggable
      onDragStart={() => onDragStart && onDragStart(index)}
      onDragOver={(e) => onDragOver && onDragOver(e, index)}
      onDrop={() => onDrop && onDrop(index)}
      style={{ 
        zIndex: totalSections - index,
        backgroundColor: `${sectionColor}0D`,
        borderColor: `${sectionColor}40`,
        borderLeftColor: sectionColor
      }}
      className={`group relative border-2 border-l-[6px] rounded-xl shadow-sm transition-all duration-200 ${
        isDragging 
          ? 'opacity-40 scale-[0.98] border-dashed ring-2 ring-blue-500/40' 
          : 'hover:shadow-md'
      }`}
    >
      
      {/* Section Header */}
      <div 
        style={{ 
          backgroundColor: `${sectionColor}15`,
          borderBottomColor: `${sectionColor}25`
        }}
        className={`px-3.5 sm:px-4 py-2.5 rounded-t-[10px] ${isSectionCollapsed ? '' : 'border-b'} flex flex-col gap-2`}
      >
        
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
                style={{ 
                  width: `${Math.max(10, selectedDisplayLabel.length + 6)}ch`,
                  color: sectionColor,
                  borderColor: `${sectionColor}50`,
                  backgroundColor: `${sectionColor}1C`
                }}
                className="min-w-0 max-w-full pl-2.5 pr-6 py-1 rounded-md text-xs font-bold uppercase tracking-wider border cursor-pointer focus:outline-none transition-all shadow-xs"
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

            {/* Section Repeat Selector (x1, x2, x3... avec boutons - et +) */}
            <div 
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-bold font-mono uppercase tracking-wider transition-all select-none shadow-xs ${
                (section.repeat || 1) > 1 
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300' 
                  : 'bg-[#18181C] hover:bg-[#202026] border-white/10 text-gray-400 hover:text-gray-200'
              }`}
              title={`Répétition de la section : x${section.repeat || 1}`}
            >
              <Repeat className={`w-3.5 h-3.5 shrink-0 ${(section.repeat || 1) > 1 ? 'text-emerald-400' : 'text-gray-400'}`} />
              <button
                type="button"
                onClick={() => {
                  const current = section.repeat || 1;
                  const nextRepeat = Math.max(1, current - 1);
                  onUpdateSection({
                    ...section,
                    repeat: nextRepeat
                  });
                }}
                disabled={(section.repeat || 1) <= 1}
                className="p-0.5 rounded hover:bg-white/10 disabled:opacity-20 text-gray-400 hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center"
                title="Diminuer les répétitions"
                aria-label="Diminuer les répétitions"
              >
                <Minus className="w-3 h-3 stroke-[2.5]" />
              </button>

              <span className="px-1 text-xs font-bold font-mono tracking-tight min-w-[2ch] text-center leading-none">
                x{section.repeat || 1}
              </span>

              <button
                type="button"
                onClick={() => {
                  const current = section.repeat || 1;
                  const nextRepeat = Math.min(20, current + 1);
                  onUpdateSection({
                    ...section,
                    repeat: nextRepeat
                  });
                }}
                className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                title="Augmenter les répétitions"
                aria-label="Augmenter les répétitions"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Section Header Right Controls: Vocal Arrangement */}
          <div className="relative z-30 flex items-center gap-1.5 shrink-0">
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
          </div>
        </div>
      </div>

      {/* Section Content: Direct editor field styled identically to SongReader */}
      {!isSectionCollapsed && (
        <div className="p-3 sm:p-4">
        {section.lines.length === 0 && !rawText.trim() ? (
          <div className="py-6 text-center text-gray-500 text-xs border border-dashed border-white/10 rounded-lg">
            <span>Cette section est vide.</span>
            <button
              type="button"
              onClick={handleAddLine}
              className="block mx-auto mt-2 text-blue-400 font-semibold hover:underline cursor-pointer"
            >
              + Commencer à écrire dans le champ de texte
            </button>
          </div>
        ) : (
          <div className="relative w-full rounded-lg transition-all focus-within:ring-1 focus-within:ring-white/15">
            {/* Backdrop avec mise en valeur des accords et paroles sans boîte imbriquée */}
            <div
              ref={backdropRef}
              aria-hidden="true"
              className="absolute inset-0 p-2 sm:p-3 font-chord text-sm sm:text-base leading-relaxed overflow-hidden pointer-events-none whitespace-pre-wrap break-words select-none"
            >
              {renderHighlightedContent(rawText)}
            </div>

            {/* Zone de saisie synchrone directe */}
            <textarea
              ref={textareaRef}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              onClick={handleTextareaClick}
              onKeyUp={handleTextareaClick}
              onScroll={handleScroll}
              rows={Math.max(6, Math.min(24, rawText.split('\n').length + 2))}
              placeholder={`Écrivez vos accords sur une ligne (ex: Sol   Do   Mim ou G   C   Em)\nEt vos paroles sur la ligne en dessous.\nPour faire une ligne vide, faites simplement un saut de ligne ou tapez un espace.`}
              className="relative w-full h-full min-h-[160px] bg-transparent p-2 sm:p-3 text-sm sm:text-base font-chord text-transparent caret-blue-400 placeholder-gray-500/60 leading-relaxed outline-none resize-y selection:bg-blue-600/35 selection:text-white"
              spellCheck={false}
            />

            {/* Mini Popover pour découper la section à partir d'ici : uniquement l'icône diviser */}
            {splitPopover?.visible && (
              <div
                style={{
                  top: `${Math.max(4, splitPopover.y - 32)}px`,
                  left: `${Math.max(8, splitPopover.x)}px`,
                }}
                className="split-section-popover absolute z-50 p-0.5 bg-[#141418]/95 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl animate-in fade-in zoom-in-95 pointer-events-auto select-none"
              >
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handlePerformSplitSection();
                  }}
                  className="p-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-all active:scale-90 cursor-pointer flex items-center justify-center"
                  title={`Découper et créer une nouvelle section « ${selectedDisplayLabel} »`}
                  aria-label={`Découper la section « ${selectedDisplayLabel} »`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bouton de suppression de section en bas et centré (double-clic au même endroit, uniquement icônes sans texte) */}
        <div className="flex justify-center pt-2.5">
          <button
            type="button"
            onClick={handleDeleteClick}
            onDoubleClick={handleDoubleClickDelete}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              confirmDelete
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/60 ring-2 ring-rose-500/50 scale-105'
                : 'bg-[#18181C]/75 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 border border-white/5 hover:border-rose-500/30'
            }`}
            title={confirmDelete ? "Cliquer à nouveau pour confirmer la suppression" : "Supprimer la section (double-cliquer)"}
            aria-label={confirmDelete ? "Confirmer la suppression de la section" : "Supprimer la section"}
          >
            {confirmDelete ? (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

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
