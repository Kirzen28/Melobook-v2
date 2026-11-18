import React, { useMemo } from 'react';
import { X } from 'lucide-react';

export function parseKey(keyStr: string): { root: string; accidental: '' | '#' | 'b'; isMinor: boolean } {
  const raw = (keyStr || 'C').trim();
  const match = raw.match(/^([A-Ga-g])([#♯b♭]?)(m|min|maj|M)?/i);
  const root = match ? match[1].toUpperCase() : 'C';
  let accidental: '' | '#' | 'b' = '';
  if (match) {
    if (match[2] === '#' || match[2] === '♯') accidental = '#';
    else if (match[2] === 'b' || match[2] === '♭') accidental = 'b';
  }
  const isMinor = match ? (Boolean(match[3]) && match[3].toLowerCase().startsWith('m') && match[3] !== 'M') : false;
  return { root, accidental, isMinor };
}

export interface KeySelectorKeypadProps {
  currentKey: string;
  onKeyChange: (newKey: string) => void;
  onClose?: () => void;
  modeLock?: 'both' | 'major' | 'minor';
  title?: string;
  className?: string;
}

export const KeySelectorKeypad: React.FC<KeySelectorKeypadProps> = ({
  currentKey,
  onKeyChange,
  onClose,
  modeLock = 'both',
  title = 'Tonalité :',
  className = ''
}) => {
  const parsed = useMemo(() => {
    const p = parseKey(currentKey);
    if (modeLock === 'major') p.isMinor = false;
    if (modeLock === 'minor') p.isMinor = true;
    // Interdire dièse (#) sur E et B
    if ((p.root === 'E' || p.root === 'B') && p.accidental === '#') {
      p.accidental = '';
    }
    // Interdire bémol (b) sur F et C
    if ((p.root === 'F' || p.root === 'C') && p.accidental === 'b') {
      p.accidental = '';
    }
    return p;
  }, [currentKey, modeLock]);

  const isSharpDisabled = parsed.root === 'E' || parsed.root === 'B';
  const isFlatDisabled = parsed.root === 'F' || parsed.root === 'C';

  const buildAndEmitKey = (newRoot: string, newAccidental: '' | '#' | 'b', newIsMinor: boolean) => {
    const effectiveMinor = modeLock === 'major' ? false : modeLock === 'minor' ? true : newIsMinor;
    let safeAccidental = newAccidental;
    if ((newRoot === 'E' || newRoot === 'B') && safeAccidental === '#') {
      safeAccidental = '';
    }
    if ((newRoot === 'F' || newRoot === 'C') && safeAccidental === 'b') {
      safeAccidental = '';
    }
    const newKey = `${newRoot}${safeAccidental}${effectiveMinor ? 'm' : ''}`;
    onKeyChange(newKey);
  };

  const handleSelectRoot = (note: string) => {
    let safeAccidental = parsed.accidental;
    if ((note === 'E' || note === 'B') && safeAccidental === '#') safeAccidental = '';
    if ((note === 'F' || note === 'C') && safeAccidental === 'b') safeAccidental = '';
    buildAndEmitKey(note, safeAccidental, parsed.isMinor);
  };

  const handleToggleAccidental = (acc: '#' | 'b') => {
    if (acc === '#' && isSharpDisabled) return;
    if (acc === 'b' && isFlatDisabled) return;
    const nextAcc = parsed.accidental === acc ? '' : acc;
    buildAndEmitKey(parsed.root, nextAcc, parsed.isMinor);
  };

  const handleSelectMode = (minor: boolean) => {
    if (modeLock !== 'both') return;
    buildAndEmitKey(parsed.root, parsed.accidental, minor);
  };

  const displayKey = `${parsed.root}${parsed.accidental}${parsed.isMinor ? 'm' : ''}`;

  return (
    <div className={`w-[295px] sm:w-[325px] bg-[#141416] border border-[#2A2A2E] rounded-xl p-2.5 shadow-2xl ${className}`}>
      {/* Header avec état actuel et bouton fermer */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-gray-300">
            {title} <strong className="text-blue-400 font-mono text-xs">{displayKey}</strong>
          </span>
          <span className="text-[10px] text-gray-400">
            ({parsed.isMinor ? 'Mineur' : 'Majeur'})
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Ligne 1 : Fondamentales C D E F G A B */}
      <div className="grid grid-cols-7 gap-1">
        {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((note) => {
          const isSelected = parsed.root === note;
          return (
            <button
              key={note}
              type="button"
              onClick={() => handleSelectRoot(note)}
              className={`h-8 sm:h-9 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center cursor-pointer select-none active:scale-95 ${
                isSelected
                  ? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/40 ring-1 ring-blue-400'
                  : 'bg-[#252528] hover:bg-[#323236] text-gray-200 hover:text-white border border-white/5'
              }`}
            >
              {note}
            </button>
          );
        })}
      </div>

      {/* Ligne 2 : Altérations (♭, ♯) et éventuellement Modes (Majeur, Mineur) */}
      {modeLock === 'both' ? (
        <div className="flex items-center gap-1 sm:gap-1.5 pt-1.5">
          {/* Groupe Dièses / Bémols */}
          <div className="grid grid-cols-2 gap-1 flex-1">
            <button
              type="button"
              disabled={isFlatDisabled}
              onClick={() => handleToggleAccidental('b')}
              className={`h-8 rounded-lg text-base font-bold transition-all flex items-center justify-center select-none active:scale-95 ${
                isFlatDisabled
                  ? 'opacity-20 cursor-not-allowed bg-[#18181A] text-gray-600 border border-transparent'
                  : parsed.accidental === 'b'
                  ? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/40 ring-1 ring-blue-400 cursor-pointer'
                  : 'bg-[#252528] hover:bg-[#323236] text-gray-200 hover:text-white border border-white/5 cursor-pointer'
              }`}
              title={isFlatDisabled ? "Bémol (♭) non disponible pour Fa (F) et Do (C)" : "Bémol (♭)"}
            >
              ♭
            </button>

            <button
              type="button"
              disabled={isSharpDisabled}
              onClick={() => handleToggleAccidental('#')}
              className={`h-8 rounded-lg text-base font-bold transition-all flex items-center justify-center select-none active:scale-95 ${
                isSharpDisabled
                  ? 'opacity-20 cursor-not-allowed bg-[#18181A] text-gray-600 border border-transparent'
                  : parsed.accidental === '#'
                  ? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/40 ring-1 ring-blue-400 cursor-pointer'
                  : 'bg-[#252528] hover:bg-[#323236] text-gray-200 hover:text-white border border-white/5 cursor-pointer'
              }`}
              title={isSharpDisabled ? "Dièse (♯) non disponible pour Mi (E) et Si (B)" : "Dièse (♯)"}
            >
              ♯
            </button>
          </div>

          {/* Petit séparateur vertical discret */}
          <div className="w-[1.5px] h-6 bg-[#333338] mx-0.5 shrink-0 rounded-full" />

          {/* Groupe Majeur / Mineur */}
          <div className="grid grid-cols-2 gap-1 flex-[1.4]">
            <button
              type="button"
              onClick={() => handleSelectMode(false)}
              className={`h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center cursor-pointer select-none active:scale-95 ${
                !parsed.isMinor
                  ? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/40 ring-1 ring-blue-400'
                  : 'bg-[#252528] hover:bg-[#323236] text-gray-200 hover:text-white border border-white/5'
              }`}
            >
              Majeur
            </button>

            <button
              type="button"
              onClick={() => handleSelectMode(true)}
              className={`h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center cursor-pointer select-none active:scale-95 ${
                parsed.isMinor
                  ? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/40 ring-1 ring-blue-400'
                  : 'bg-[#252528] hover:bg-[#323236] text-gray-200 hover:text-white border border-white/5'
              }`}
            >
              Mineur
            </button>
          </div>
        </div>
      ) : (
        /* Mode verrouillé (Majeur ou Mineur) : uniquement les altérations ♭ et ♯ */
        <div className="grid grid-cols-2 gap-1.5 pt-1.5">
          <button
            type="button"
            disabled={isFlatDisabled}
            onClick={() => handleToggleAccidental('b')}
            className={`h-8 rounded-lg text-base font-bold transition-all flex items-center justify-center select-none active:scale-95 ${
              isFlatDisabled
                ? 'opacity-20 cursor-not-allowed bg-[#18181A] text-gray-600 border border-transparent'
                : parsed.accidental === 'b'
                ? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/40 ring-1 ring-blue-400 cursor-pointer'
                : 'bg-[#252528] hover:bg-[#323236] text-gray-200 hover:text-white border border-white/5 cursor-pointer'
            }`}
            title={isFlatDisabled ? "Bémol (♭) non disponible pour Fa (F) et Do (C)" : "Bémol (♭)"}
          >
            ♭
          </button>

          <button
            type="button"
            disabled={isSharpDisabled}
            onClick={() => handleToggleAccidental('#')}
            className={`h-8 rounded-lg text-base font-bold transition-all flex items-center justify-center select-none active:scale-95 ${
              isSharpDisabled
                ? 'opacity-20 cursor-not-allowed bg-[#18181A] text-gray-600 border border-transparent'
                : parsed.accidental === '#'
                ? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/40 ring-1 ring-blue-400 cursor-pointer'
                : 'bg-[#252528] hover:bg-[#323236] text-gray-200 hover:text-white border border-white/5 cursor-pointer'
            }`}
            title={isSharpDisabled ? "Dièse (♯) non disponible pour Mi (E) et Si (B)" : "Dièse (♯)"}
          >
            ♯
          </button>
        </div>
      )}
    </div>
  );
};
