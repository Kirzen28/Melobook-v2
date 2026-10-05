import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Check, ChevronDown, Trash2 } from 'lucide-react';
import { getVocalBadgeStyle } from '../../utils/chordUtils';

export const SATB_VOICE_TYPES = [
  { key: 'Soprano', label: 'Soprano', shortLabel: 'Soprano', desc: 'Voix aiguë (femmes)', badge: 'S' },
  { key: 'Alto', label: 'Alto', shortLabel: 'Alto', desc: 'Voix grave (femmes)', badge: 'A' },
  { key: 'Ténor', label: 'Ténor', shortLabel: 'Ténor', desc: 'Voix aiguë (hommes)', badge: 'T' },
  { key: 'Basse', label: 'Basse', shortLabel: 'Basse', desc: 'Voix grave (hommes)', badge: 'B' },
];

export const OTHER_VOCAL_ARRANGEMENTS = [
  { key: 'Lead', label: 'Lead / Solo' },
  { key: 'Unisson', label: 'Unisson' },
  { key: 'Chœur', label: 'Chœur / Tous' },
  { key: '2 Voix', label: '2 Voix' },
  { key: '3 Voix', label: '3 Voix' },
  { key: 'Femmes', label: 'Femmes' },
  { key: 'Hommes', label: 'Hommes' },
];

interface VocalArrangementSelectorProps {
  vocals: string[];
  onChange: (newVocals: string[]) => void;
  canEdit?: boolean;
  className?: string;
  discreet?: boolean;
}

export const VocalArrangementSelector: React.FC<VocalArrangementSelectorProps> = ({
  vocals = [],
  onChange,
  canEdit = true,
  className = '',
  discreet = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const toggleVoice = (voiceKey: string) => {
    if (!canEdit) return;
    const exists = vocals.some(v => v.toLowerCase().trim() === voiceKey.toLowerCase().trim());
    if (exists) {
      onChange(vocals.filter(v => v.toLowerCase().trim() !== voiceKey.toLowerCase().trim()));
    } else {
      onChange([...vocals, voiceKey]);
    }
  };

  const handleRemoveVocal = (vocToRemove: string) => {
    if (!canEdit) return;
    onChange(vocals.filter(v => v !== vocToRemove));
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || !canEdit) return;
    if (!vocals.some(v => v.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...vocals, trimmed]);
    }
    setCustomInput('');
  };

  const handleClearAll = () => {
    if (!canEdit) return;
    onChange([]);
    setIsOpen(false);
  };

  const hasVocals = vocals && vocals.length > 0;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Current Badges or Empty Trigger */}
      {hasVocals ? (
        <div className="inline-flex items-center gap-1 flex-wrap">
          {vocals.map((voc, vIdx) => {
            const vStyle = getVocalBadgeStyle(voc);
            return (
              <span
                key={vIdx}
                onClick={() => canEdit && setIsOpen(!isOpen)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${vStyle.bg} ${vStyle.border} ${vStyle.text} shadow-2xs select-none transition-all ${
                  canEdit ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
                }`}
                title={canEdit ? `Arrangement des voix : ${voc} (Cliquer pour modifier)` : `Voix : ${voc}`}
              >
                <span>{voc}</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveVocal(voc);
                    }}
                    className="ml-0.5 -mr-0.5 p-0.5 rounded-full hover:bg-black/30 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title={`Retirer ${voc}`}
                    aria-label={`Retirer ${voc}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            );
          })}

          {canEdit && (
            <div className="inline-flex items-center gap-0.5">
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 rounded-md text-gray-400 hover:text-purple-300 hover:bg-[#1F1F24] border border-transparent hover:border-[#333] transition-colors cursor-pointer"
                title="Modifier les voix pour cette section"
                aria-label="Modifier les voix"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className="p-1 rounded-md text-gray-400 hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
                title="Retirer toutes les voix pour cette section"
                aria-label="Retirer toutes les voix"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      ) : canEdit ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer border ${
            isOpen
              ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-xs'
              : 'bg-[#18181C] hover:bg-[#202026] text-gray-400 hover:text-gray-200 border-[#2E2E34] hover:border-purple-500/30'
          }`}
          title="Ajouter un arrangement des voix (Soprano, Alto, Ténor, Basse...)"
        >
          <span className="text-[10px] sm:text-[11px]">Voix</span>
          <Plus className="w-2.5 h-2.5 text-gray-400" />
        </button>
      ) : null}

      {/* Popover Dropdown Picker */}
      {isOpen && canEdit && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-1.5 z-50 w-72 max-w-[calc(100vw-2rem)] bg-[#141417] border border-[#2E2E36] rounded-xl shadow-2xl p-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 box-border text-xs"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#26262E]">
            <span className="font-bold text-gray-200 text-xs truncate">
              Arrangement des voix
            </span>
            <div className="flex items-center gap-1">
              {hasVocals && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 border border-rose-500/30 transition-colors cursor-pointer"
                  title="Retirer toutes les voix pour cette section"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  <span>Tout retirer</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#202026] transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* SATB Grid */}
          <div className="mb-2.5">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Pupitres (SATB)</span>
              <span className="text-[9px] text-gray-500">Multisélection</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {SATB_VOICE_TYPES.map((v) => {
                const isSelected = vocals.some(
                  voc => voc.toLowerCase().trim() === v.key.toLowerCase().trim()
                );
                const vStyle = getVocalBadgeStyle(v.key);
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => toggleVoice(v.key)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? `${vStyle.bg} ${vStyle.border} ${vStyle.text} ring-1 ring-white/10 shadow-xs`
                        : 'bg-[#1A1A1E] border-[#2A2A30] text-gray-400 hover:text-gray-200 hover:border-[#383840]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#24242A] text-gray-400'
                      }`}>
                        {v.badge}
                      </span>
                      <span className="truncate">{v.label}</span>
                    </div>
                    {isSelected && <Check className="w-3 h-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Common Vocal Presets */}
          <div className="mb-2.5">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Autres arrangements
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {OTHER_VOCAL_ARRANGEMENTS.map((v) => {
                const isSelected = vocals.some(
                  voc => voc.toLowerCase().trim() === v.key.toLowerCase().trim()
                );
                const vStyle = getVocalBadgeStyle(v.key);
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => toggleVoice(v.key)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? `${vStyle.bg} ${vStyle.border} ${vStyle.text} font-semibold shadow-xs`
                        : 'bg-[#1A1A1E] border-[#2A2A30] text-gray-400 hover:text-gray-200 hover:border-[#383840]'
                    }`}
                  >
                    {isSelected ? '✓ ' : ''}{v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom voice input */}
          <div className="pt-2 border-t border-[#26262E] mb-2">
            <div className="text-[10px] font-semibold text-gray-400 mb-1">
              Personnalisé (ex: Femmes & Hommes, Solo...)
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustom();
                  }
                }}
                placeholder="Nouvelle voix..."
                className="flex-1 bg-[#1A1A1E] border border-[#2E2E36] rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!customInput.trim()}
                className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-semibold text-xs transition-colors cursor-pointer shrink-0"
              >
                +
              </button>
            </div>
          </div>

          {/* Footer action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-[#26262E]">
            {hasVocals ? (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                title="Retirer toutes les voix pour cette section"
              >
                <Trash2 className="w-3 h-3" />
                <span>Retirer toutes les voix</span>
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-md bg-[#24242C] hover:bg-[#2C2C34] text-gray-200 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Terminé
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
