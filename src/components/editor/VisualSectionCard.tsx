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
  Scissors,
  SlidersHorizontal,
  MessageSquare,
  Italic,
  Square,
  Highlighter,
  EyeOff
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
import { getVocalBadgeStyle, isChordGridToken } from '../../utils/chordUtils';
import { getSectionColor } from '../../utils/displayDefaults';
import { useApp } from '../../context/AppContext';
import { VocalArrangementSelector } from './VocalArrangementSelector';

interface VisualSectionCardProps {
  section: VisualSection;
  index: number;
  totalSections: number;
  allSections?: VisualSection[];
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

const DEFAULT_TAB_LINES = [
  'e|-----------0-----------|',
  'B|---------1---1---------|',
  'G|-------0-------0-------|',
  'D|-----2-----------2-----|',
  'A|---3---------------3---|',
  'E|-----------------------|'
];

const DEFAULT_GRID_TEXT = '|: C . G . | Am . F . :|';

export const VisualSectionCard: React.FC<VisualSectionCardProps> = ({
  section,
  index,
  totalSections,
  allSections,
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

  const effectiveBlockKind: 'lyrics' | 'grid' | 'tab' | 'chorus_recall' = section.isChorusRecall
    ? 'chorus_recall'
    : section.blockKind || (section.type === 'grid' ? 'grid' : section.type === 'tab' ? 'tab' : 'lyrics');

  const hasSectionModulation = Boolean(
    (section.key && section.key.trim()) ||
    (typeof section.transposeOffset === 'number' && section.transposeOffset !== 0) ||
    (section.tempo && section.tempo > 0) ||
    (section.timeSignature && section.timeSignature.trim())
  );
  const [showModulationBar, setShowModulationBar] = useState(false);

  const handleClearModulation = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateSection({
      ...section,
      key: undefined,
      transposeOffset: undefined,
      tempo: undefined,
      timeSignature: undefined
    });
    setShowModulationBar(false);
  };

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

  const getLinesAsRawText = (sec: VisualSection): string => {
    if (sec.blockKind === 'grid' || sec.type === 'grid') {
      return sec.lines
        .map(l => (l.type === 'grid_row' ? (l.gridRaw || '') : convertVisualLinesToIntuitiveText([l])))
        .join('\n');
    }
    if (sec.blockKind === 'tab' || sec.type === 'tab') {
      return sec.lines
        .map(l => (l.type === 'tab_row' ? (l.tabText ?? '') : convertVisualLinesToIntuitiveText([l])))
        .join('\n');
    }
    return convertVisualLinesToIntuitiveText(sec.lines);
  };

  // Intuitive unified text field state
  const [rawText, setRawText] = useState(() => getLinesAsRawText(section));
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  type QuickNoteKind = 'comment' | 'comment_italic' | 'comment_box' | 'annotation' | 'hash_comment';
  const [activeNoteType, setActiveNoteType] = useState<QuickNoteKind | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const captureTextareaSelection = (el?: HTMLTextAreaElement | null) => {
    const target = el || textareaRef.current;
    if (!target) return;
    savedSelectionRef.current = {
      start: target.selectionStart ?? rawText.length,
      end: target.selectionEnd ?? rawText.length
    };
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Synchronize text when section changes externally and user is not actively typing
  useEffect(() => {
    if (!isTypingRef.current) {
      setRawText(getLinesAsRawText(section));
    }
  }, [section.id, section.lines, section.blockKind, section.type]);

  // Detected chord stats
  const chordStats = useMemo(() => {
    return extractTextChordStats(rawText);
  }, [rawText]);

  const availableChoruses = useMemo(() => {
    return (allSections || []).filter(
      s => s.id !== section.id && s.type === 'chorus' && !s.isChorusRecall && s.blockKind !== 'chorus_recall'
    );
  }, [allSections, section.id]);

  const matchedRecallChorus = useMemo(() => {
    if (effectiveBlockKind !== 'chorus_recall') return undefined;
    const target = (section.recallLabel || section.title || '').trim().toLowerCase();
    return (
      availableChoruses.find(c => (c.title || '').trim().toLowerCase() === target) ||
      availableChoruses[availableChoruses.length - 1]
    );
  }, [effectiveBlockKind, section.recallLabel, section.title, availableChoruses]);

  // Renders syntax-highlighted lines differentiating chords, annotations, comments, grid bars
  const renderHighlightedContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');

    if (effectiveBlockKind === 'grid') {
      return (
        <>
          {lines.map((line, idx) => {
            const isLast = idx === lines.length - 1;
            const tokens = line.split(/(\s+|\|:|:\||\|\||\|)/g);
            return (
              <React.Fragment key={idx}>
                {tokens.map((tok, tIdx) => {
                  if (!tok) return null;
                  if (tok === '|:' || tok === ':|' || tok === '||' || tok === '|') {
                    return <span key={tIdx} className="text-amber-400 font-bold">{tok}</span>;
                  }
                  if (isChordGridToken(tok)) {
                    return <span key={tIdx} style={{ color: chordColor }} className="font-bold">{tok}</span>;
                  }
                  if (tok === '.' || tok === '%' || tok === '/') {
                    return <span key={tIdx} className="text-gray-500">{tok}</span>;
                  }
                  return <span key={tIdx} className="text-gray-300">{tok}</span>;
                })}
                {!isLast && '\n'}
              </React.Fragment>
            );
          })}
          {text.endsWith('\n') && '\u00A0'}
        </>
      );
    }

    if (effectiveBlockKind === 'tab') {
      return (
        <>
          {lines.map((line, idx) => {
            const isLast = idx === lines.length - 1;
            return (
              <React.Fragment key={idx}>
                <span className="text-sky-200">{line || '\u00A0'}</span>
                {!isLast && '\n'}
              </React.Fragment>
            );
          })}
          {text.endsWith('\n') && '\u00A0'}
        </>
      );
    }

    return (
      <>
        {lines.map((line, idx) => {
          const isLast = idx === lines.length - 1;
          const lineInfo = classifyLine(line);

          let renderedLine: React.ReactNode;

          if (lineInfo.type === 'empty') {
            renderedLine = <span>&nbsp;</span>;
          } else if (lineInfo.type === 'hash_comment') {
            renderedLine = <span className="text-gray-500 italic">{line}</span>;
          } else if (lineInfo.type === 'comment') {
            renderedLine = <span className="text-sky-300/90 font-medium">{line}</span>;
          } else if (lineInfo.type === 'comment_italic') {
            renderedLine = <span className="text-cyan-300/90 italic">{line}</span>;
          } else if (lineInfo.type === 'comment_box') {
            renderedLine = <span className="text-amber-300 font-semibold">{line}</span>;
          } else if (lineInfo.type === 'chordpro_line') {
            const parts = line.split(/(\[[^\]]+\])/g);
            renderedLine = parts.map((part, pIdx) => {
              if (part.startsWith('[*') && part.endsWith(']')) {
                return (
                  <span key={pIdx} className="text-amber-300 italic font-medium">
                    {part}
                  </span>
                );
              }
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

    let updatedLines: VisualLine[];
    if (effectiveBlockKind === 'grid') {
      updatedLines = newVal.split('\n').map((rawLine) => {
        if (!rawLine.trim()) {
          return { id: generateId('line_emp'), type: 'empty', items: [] };
        }
        return { id: generateId('line_grid'), type: 'grid_row', items: [], gridRaw: rawLine };
      });
    } else if (effectiveBlockKind === 'tab') {
      updatedLines = newVal.split('\n').map((rawLine) => ({
        id: generateId('line_tab'),
        type: 'tab_row',
        items: [],
        tabText: rawLine
      }));
    } else {
      updatedLines = convertIntuitiveTextToVisualLines(newVal);
    }

    onUpdateSection({
      ...section,
      lines: updatedLines
    });
    setTimeout(() => {
      isTypingRef.current = false;
    }, 200);
  };

  // Switch blockKind (Paroles / Grille / Tablature / Rappel Refrain)
  const handleBlockKindChange = (nextKind: 'lyrics' | 'grid' | 'tab' | 'chorus_recall') => {
    if (nextKind === effectiveBlockKind) return;

    if (nextKind === 'chorus_recall') {
      const targetTitle = availableChoruses[0]?.title || 'Refrain';
      onUpdateSection({
        ...section,
        type: 'chorus',
        blockKind: 'chorus_recall',
        isChorusRecall: true,
        recallLabel: targetTitle,
        title: targetTitle,
        lines: []
      });
      return;
    }

    if (nextKind === 'grid') {
      const existingGridLines = rawText.trim()
        ? rawText.split('\n').map(r => (
            r.trim()
              ? { id: generateId('line_grid'), type: 'grid_row' as const, items: [], gridRaw: r }
              : { id: generateId('line_emp'), type: 'empty' as const, items: [] }
          ))
        : [{ id: generateId('line_grid'), type: 'grid_row' as const, items: [], gridRaw: DEFAULT_GRID_TEXT }];
      onUpdateSection({
        ...section,
        type: 'grid',
        blockKind: 'grid',
        isChorusRecall: false,
        recallLabel: undefined,
        lines: existingGridLines
      });
      return;
    }

    if (nextKind === 'tab') {
      const tabSource = rawText.trim() ? rawText.split('\n') : DEFAULT_TAB_LINES;
      onUpdateSection({
        ...section,
        type: 'tab',
        blockKind: 'tab',
        isChorusRecall: false,
        recallLabel: undefined,
        lines: tabSource.map(tabText => ({
          id: generateId('line_tab'),
          type: 'tab_row' as const,
          items: [],
          tabText
        }))
      });
      return;
    }

    // Switching back to lyrics
    const nextType = (section.type === 'grid' || section.type === 'tab') ? 'verse' : section.type;
    onUpdateSection({
      ...section,
      type: nextType,
      blockKind: 'lyrics',
      isChorusRecall: false,
      recallLabel: undefined,
      lines: convertIntuitiveTextToVisualLines(rawText)
    });
  };

  // Quick insertion of snippet at current caret position
  const handleInsertSnippet = (snippet: string, asNewLine = false, explicitPos?: number) => {
    const el = textareaRef.current;
    const basePos = explicitPos !== undefined
      ? explicitPos
      : el
        ? (el.selectionStart ?? rawText.length)
        : rawText.length;
    const start = Math.max(0, Math.min(rawText.length, basePos));
    const before = rawText.substring(0, start);
    const after = rawText.substring(start);
    const needsLeadingNewline = asNewLine && before.length > 0 && !before.endsWith('\n');
    const needsTrailingNewline = asNewLine && after.length > 0 && !after.startsWith('\n');
    const inserted = `${needsLeadingNewline ? '\n' : ''}${snippet}${needsTrailingNewline ? '\n' : ''}`;
    const newText = before + inserted + after;
    handleTextChange(newText);
    setTimeout(() => {
      const targetEl = textareaRef.current;
      if (targetEl) {
        targetEl.focus();
        const cursorPos = start + inserted.length;
        targetEl.setSelectionRange(cursorPos, cursorPos);
        savedSelectionRef.current = { start: cursorPos, end: cursorPos };
      }
    }, 15);
  };

  const handleOpenNoteComposer = (kind: QuickNoteKind) => {
    if (activeNoteType === kind) {
      setActiveNoteType(null);
      return;
    }
    if (textareaRef.current) {
      captureTextareaSelection(textareaRef.current);
    } else if (!rawText) {
      savedSelectionRef.current = { start: 0, end: 0 };
    }
    setActiveNoteType(kind);
    setTimeout(() => {
      noteInputRef.current?.focus();
    }, 10);
  };

  const handleSubmitNoteComposer = () => {
    const clean = noteDraft.trim();
    if (!activeNoteType || !clean) return;

    let formatted = '';
    let asNewLine = true;
    if (activeNoteType === 'comment') formatted = `{c: ${clean}}`;
    else if (activeNoteType === 'comment_italic') formatted = `{ci: ${clean}}`;
    else if (activeNoteType === 'comment_box') formatted = `{cb: ${clean}}`;
    else if (activeNoteType === 'hash_comment') formatted = `# ${clean}`;
    else {
      formatted = `[*${clean}] `;
      asNewLine = false;
    }

    const insertPos = rawText ? savedSelectionRef.current.start : 0;
    handleInsertSnippet(formatted, asNewLine, insertPos);
    setNoteDraft('');
    setActiveNoteType(null);
  };

  // Quick insertion of a chord at current caret position
  const handleInsertChord = (chord: string) => {
    handleInsertSnippet(`${chord} `, false);
  };

  // Perform split at current/saved cursor position: divide rawText into two parts and create new section
  const handlePerformSplitSection = () => {
    if (!rawText.trim()) return;
    const el = textareaRef.current;
    const rawPos = el && document.activeElement === el
      ? (el.selectionStart ?? savedSelectionRef.current.start)
      : savedSelectionRef.current.start;
    const charIndex = Math.max(0, Math.min(rawText.length, rawPos));

    const headText = rawText.substring(0, charIndex);
    const tailText = rawText.substring(charIndex);

    const headLines = convertIntuitiveTextToVisualLines(headText);
    const tailLines = convertIntuitiveTextToVisualLines(tailText);

    if (onSplitSection) {
      onSplitSection(section.id, headLines, tailLines);
    } else {
      onUpdateSection({
        ...section,
        lines: headLines
      });
      if (onAddSection) {
        onAddSection(section.type, section.title, index);
      }
    }
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
      'solo', 'interlude', 'instrumental', 'tag', 'finale', 'grid', 'tab', 'general'
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
    if (newTypeVal === 'grid') {
      handleBlockKindChange('grid');
      return;
    }
    if (newTypeVal === 'tab') {
      handleBlockKindChange('tab');
      return;
    }

    onUpdateSection({
      ...section,
      type: newTypeVal,
      blockKind: effectiveBlockKind === 'grid' || effectiveBlockKind === 'tab' ? 'lyrics' : effectiveBlockKind,
      isChorusRecall: false
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
                  <option value="grid" className="bg-[#141416] text-amber-300">
                    {section.type === 'grid' ? selectedDisplayLabel : 'Grille'}
                  </option>
                  <option value="tab" className="bg-[#141416] text-sky-300">
                    {section.type === 'tab' ? selectedDisplayLabel : 'Tablature'}
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

            {/* Block mode selector (Paroles / Grille / Tablature / Rappel {chorus}) */}
            <select
              value={effectiveBlockKind}
              onChange={(e) => handleBlockKindChange(e.target.value as 'lyrics' | 'grid' | 'tab' | 'chorus_recall')}
              className="px-2 py-1 rounded-md border border-white/10 bg-[#18181C] hover:bg-[#202026] text-[11px] font-semibold text-gray-300 focus:outline-none cursor-pointer"
              title="Format du bloc ChordPro"
              aria-label="Format du bloc ChordPro"
            >
              <option value="lyrics" className="bg-[#141416]">Paroles</option>
              <option value="grid" className="bg-[#141416]">Grille</option>
              <option value="tab" className="bg-[#141416]">Tablature</option>
              <option value="chorus_recall" className="bg-[#141416]">Rappel {'{chorus}'}</option>
            </select>

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

            {/* Modulation toggle button (not needed on recall shortcut) */}
            {effectiveBlockKind !== 'chorus_recall' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowModulationBar(prev => !prev)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold transition-all cursor-pointer ${
                    showModulationBar || hasSectionModulation
                      ? 'bg-indigo-950/50 border-indigo-500/40 text-indigo-300'
                      : 'bg-[#18181C] hover:bg-[#202026] border-white/10 text-gray-400 hover:text-gray-200'
                  }`}
                  title="Modulation & paramètres musicaux propres à cette section"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>
                    {hasSectionModulation
                      ? [
                          section.key ? section.key : null,
                          section.transposeOffset ? `${section.transposeOffset > 0 ? '+' : ''}${section.transposeOffset}t` : null,
                          section.tempo ? `${section.tempo}bpm` : null,
                          section.timeSignature || null
                        ].filter(Boolean).join(' · ')
                      : 'Modulation'}
                  </span>
                </button>
                {hasSectionModulation && (
                  <button
                    type="button"
                    onClick={handleClearModulation}
                    className="inline-flex items-center justify-center p-1 rounded-md border border-rose-500/30 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 hover:text-rose-200 transition-colors cursor-pointer"
                    title="Annuler toutes les modulations de cette section"
                    aria-label="Annuler toutes les modulations de cette section"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </>
            )}
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

        {/* Collapsible Scoped Modulation Controls */}
        {(showModulationBar || hasSectionModulation) && effectiveBlockKind !== 'chorus_recall' && !isSectionCollapsed && (
          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2 text-[11px]">
            <label className="inline-flex items-center gap-1.5 text-gray-400">
              <span>Ton :</span>
              <input
                type="text"
                value={section.key || ''}
                onChange={(e) => onUpdateSection({ ...section, key: e.target.value.trim() || undefined })}
                placeholder="ex: D"
                className="w-14 px-2 py-0.5 rounded bg-[#141418] border border-white/10 text-blue-300 font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </label>

            <div className="inline-flex items-center gap-1 text-gray-400 bg-[#141418] border border-white/10 rounded px-1.5 py-0.5">
              <span>Transpose :</span>
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(-11, (section.transposeOffset || 0) - 1);
                  onUpdateSection({ ...section, transposeOffset: next === 0 ? undefined : next });
                }}
                className="px-1 text-gray-300 hover:text-white cursor-pointer"
                title="Baisser d'un demi-ton"
              >
                -
              </button>
              <span className="font-mono font-bold text-indigo-300 min-w-[3ch] text-center">
                {section.transposeOffset ? `${section.transposeOffset > 0 ? '+' : ''}${section.transposeOffset}` : '0'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = Math.min(11, (section.transposeOffset || 0) + 1);
                  onUpdateSection({ ...section, transposeOffset: next === 0 ? undefined : next });
                }}
                className="px-1 text-gray-300 hover:text-white cursor-pointer"
                title="Monter d'un demi-ton"
              >
                +
              </button>
            </div>

            <label className="inline-flex items-center gap-1.5 text-gray-400">
              <span>BPM :</span>
              <input
                type="number"
                min={30}
                max={260}
                value={section.tempo || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onUpdateSection({ ...section, tempo: !isNaN(val) && val > 0 ? val : undefined });
                }}
                placeholder="—"
                className="w-16 px-2 py-0.5 rounded bg-[#141418] border border-white/10 text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </label>

            <label className="inline-flex items-center gap-1.5 text-gray-400">
              <span>Mesure :</span>
              <select
                value={section.timeSignature || ''}
                onChange={(e) => onUpdateSection({ ...section, timeSignature: e.target.value || undefined })}
                className="px-2 py-0.5 rounded bg-[#141418] border border-white/10 text-emerald-300 font-bold focus:outline-none"
              >
                <option value="">Défaut</option>
                {['4/4', '3/4', '6/8', '2/4', '12/8', '5/4'].map(ts => (
                  <option key={ts} value={ts}>{ts}</option>
                ))}
              </select>
            </label>

            {hasSectionModulation && (
              <button
                type="button"
                onClick={handleClearModulation}
                className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 hover:text-rose-200 font-semibold transition-colors cursor-pointer"
                title="Annuler toutes les modulations de cette section"
                aria-label="Annuler toutes les modulations de cette section"
              >
                <X className="w-3 h-3" />
                <span>Annuler</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Section Content */}
      {!isSectionCollapsed && (
        <div className="p-3 sm:p-4">
        {effectiveBlockKind === 'chorus_recall' ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-amber-200 font-semibold">
                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  {'{chorus}'}
                </span>
                <span>Rappel automatique du refrain</span>
              </div>
              {availableChoruses.length > 0 && (
                <select
                  value={section.recallLabel || matchedRecallChorus?.title || 'Refrain'}
                  onChange={(e) => onUpdateSection({
                    ...section,
                    recallLabel: e.target.value,
                    title: e.target.value
                  })}
                  className="px-2 py-1 rounded-md bg-[#141418] border border-amber-500/30 text-xs text-amber-200 focus:outline-none"
                >
                  {availableChoruses.map(ch => (
                    <option key={ch.id} value={ch.title}>{ch.title}</option>
                  ))}
                </select>
              )}
            </div>
            {matchedRecallChorus ? (
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-chord bg-[#121216]/80 rounded-md p-2.5 border border-white/5 max-h-40 overflow-y-auto">
                {getLinesAsRawText(matchedRecallChorus) || 'Refrain vide'}
              </pre>
            ) : (
              <p className="text-xs text-amber-300/75 italic">
                Définissez un bloc Refrain plus haut pour prévisualiser ses paroles et accords ici.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Quick-insert helpers bar tailored to blockKind */}
            <div className="mb-2.5 rounded-xl bg-[#141418]/90 border border-white/10 p-1.5 shadow-inner">
              {effectiveBlockKind === 'lyrics' && (() => {
                const noteOptions: {
                  kind: QuickNoteKind;
                  label: string;
                  placeholder: string;
                  hint: string;
                  icon: React.ReactNode;
                  idleClass: string;
                  activeClass: string;
                  badgeClass: string;
                }[] = [
                  {
                    kind: 'comment',
                    label: 'Note',
                    placeholder: 'Écrire une note musicale (ex: Guitare seule, Monter)...',
                    hint: 'Note affichée dans la section {c:}',
                    icon: <MessageSquare className="w-3.5 h-3.5" />,
                    idleClass: 'bg-sky-500/8 hover:bg-sky-500/18 border-sky-500/20 text-sky-300',
                    activeClass: 'bg-sky-500/25 border-sky-400 text-white ring-1 ring-sky-400/40',
                    badgeClass: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
                  },
                  {
                    kind: 'comment_italic',
                    label: 'Italique',
                    placeholder: 'Indication en italique (ex: En doux, Chœur seul)...',
                    hint: 'Indication discrète en italique {ci:}',
                    icon: <Italic className="w-3.5 h-3.5" />,
                    idleClass: 'bg-cyan-500/8 hover:bg-cyan-500/18 border-cyan-500/20 text-cyan-300',
                    activeClass: 'bg-cyan-500/25 border-cyan-400 text-white ring-1 ring-cyan-400/40',
                    badgeClass: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
                  },
                  {
                    kind: 'comment_box',
                    label: 'Encadré',
                    placeholder: 'Alerte encadrée (ex: Attention reprise, +1 ton)...',
                    hint: 'Bloc encadré bien visible sur scène {cb:}',
                    icon: <Square className="w-3.5 h-3.5" />,
                    idleClass: 'bg-amber-500/8 hover:bg-amber-500/18 border-amber-500/25 text-amber-300',
                    activeClass: 'bg-amber-500/25 border-amber-400 text-white ring-1 ring-amber-400/40',
                    badgeClass: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
                  },
                  {
                    kind: 'annotation',
                    label: 'Sur mot',
                    placeholder: 'Annotation au fil des paroles (ex: Crescendo, Pause)...',
                    hint: 'Annotation placée directement sur le passage [*texte]',
                    icon: <Highlighter className="w-3.5 h-3.5" />,
                    idleClass: 'bg-yellow-500/8 hover:bg-yellow-500/18 border-yellow-500/20 text-yellow-200',
                    activeClass: 'bg-yellow-500/25 border-yellow-400 text-white ring-1 ring-yellow-400/40',
                    badgeClass: 'text-yellow-200 bg-yellow-500/15 border-yellow-500/30',
                  },
                  {
                    kind: 'hash_comment',
                    label: 'Masquée',
                    placeholder: 'Note technique privée (masquée en lecture et projection)...',
                    hint: 'Commentaire interne masqué (#)',
                    icon: <EyeOff className="w-3.5 h-3.5" />,
                    idleClass: 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300',
                    activeClass: 'bg-white/15 border-gray-400 text-white ring-1 ring-white/30',
                    badgeClass: 'text-gray-300 bg-white/10 border-white/20',
                  },
                ];

                const activeOption = noteOptions.find(o => o.kind === activeNoteType);

                return (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-1.5 hidden sm:inline">
                        Ajouter :
                      </span>
                      {noteOptions.map(opt => {
                        const isActive = activeNoteType === opt.kind;
                        return (
                          <button
                            key={opt.kind}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleOpenNoteComposer(opt.kind)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer active:scale-95 ${
                              isActive ? opt.activeClass : opt.idleClass
                            }`}
                            title={opt.hint}
                          >
                            {opt.icon}
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                      <div className="ml-auto pl-1.5 border-l border-white/10">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={handlePerformSplitSection}
                          disabled={!rawText.trim()}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-blue-500/25 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-35 text-blue-300 font-medium transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
                          title={`Couper la section « ${selectedDisplayLabel} » à la position du curseur`}
                          aria-label={`Découper la section « ${selectedDisplayLabel} »`}
                        >
                          <Scissors className="w-3.5 h-3.5" />
                          <span>Découper</span>
                        </button>
                      </div>
                    </div>

                    {activeOption && (
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/10 animate-in fade-in duration-100">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold shrink-0 ${activeOption.badgeClass}`}>
                          {activeOption.icon}
                          <span className="hidden xs:inline">{activeOption.label}</span>
                        </span>
                        <input
                          ref={noteInputRef}
                          type="text"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSubmitNoteComposer();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setActiveNoteType(null);
                            }
                          }}
                          placeholder={activeOption.placeholder}
                          className="flex-1 min-w-0 bg-[#1B1B22] border border-white/15 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSubmitNoteComposer}
                          disabled={!noteDraft.trim()}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                          title="Insérer la note (Entrée)"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span className="hidden sm:inline">Insérer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveNoteType(null)}
                          className="p-1.5 rounded-lg bg-[#1E1E26] hover:bg-[#2A2A35] text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                          title="Fermer (Échap)"
                          aria-label="Fermer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {effectiveBlockKind === 'grid' && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {['|:', ':|', '|', '.', '%'].map(sym => (
                    <button
                      key={sym}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleInsertSnippet(`${sym} `, false)}
                      className="px-2 py-0.5 rounded-lg bg-[#1A1A20] hover:bg-[#24242C] border border-amber-500/30 text-amber-300 font-mono font-bold cursor-pointer"
                    >
                      {sym}
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertSnippet('|: C . G . | Am . F . :|', true)}
                    className="px-2.5 py-0.5 rounded-lg bg-[#1A1A20] hover:bg-[#24242C] border border-white/10 text-gray-300 cursor-pointer"
                  >
                    + Ligne de grille
                  </button>
                </div>
              )}

              {effectiveBlockKind === 'tab' && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertSnippet(DEFAULT_TAB_LINES.join('\n'), true)}
                    className="px-2.5 py-0.5 rounded-lg bg-[#1A1A20] hover:bg-[#24242C] border border-sky-500/30 text-sky-300 font-mono cursor-pointer"
                  >
                    + Portée 6 cordes
                  </button>
                </div>
              )}
            </div>

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
                  className={`absolute inset-0 p-2 sm:p-3 text-sm sm:text-base leading-relaxed overflow-hidden pointer-events-none select-none ${
                    effectiveBlockKind === 'tab'
                      ? 'font-mono whitespace-pre'
                      : effectiveBlockKind === 'grid'
                        ? 'font-mono tabular-nums whitespace-pre-wrap break-words'
                        : 'font-chord whitespace-pre-wrap break-words'
                  }`}
                >
                  {renderHighlightedContent(rawText)}
                </div>

                {/* Zone de saisie synchrone directe */}
                <textarea
                  ref={textareaRef}
                  value={rawText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  onClick={(e) => captureTextareaSelection(e.currentTarget)}
                  onKeyUp={(e) => captureTextareaSelection(e.currentTarget)}
                  onSelect={(e) => captureTextareaSelection(e.currentTarget)}
                  onBlur={(e) => captureTextareaSelection(e.currentTarget)}
                  onScroll={handleScroll}
                  rows={Math.max(6, Math.min(24, rawText.split('\n').length + 2))}
                  placeholder={
                    effectiveBlockKind === 'grid'
                      ? '|: C . G . | Am . F . :|'
                      : effectiveBlockKind === 'tab'
                        ? DEFAULT_TAB_LINES.join('\n')
                        : `Écrivez vos accords sur une ligne (ex: Sol   Do   Mim ou G   C   Em)\nEt vos paroles sur la ligne en dessous.\nPour faire une ligne vide, faites simplement un saut de ligne ou tapez un espace.`
                  }
                  className={`relative w-full h-full min-h-[160px] bg-transparent p-2 sm:p-3 text-sm sm:text-base text-transparent caret-blue-400 placeholder-gray-500/60 leading-relaxed outline-none resize-y selection:bg-blue-600/35 selection:text-white ${
                    effectiveBlockKind === 'tab'
                      ? 'font-mono whitespace-pre overflow-x-auto'
                      : effectiveBlockKind === 'grid'
                        ? 'font-mono tabular-nums'
                        : 'font-chord'
                  }`}
                  spellCheck={false}
                />
              </div>
            )}
          </>
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
