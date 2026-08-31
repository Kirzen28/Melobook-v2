import React, { useState, useMemo, useEffect } from 'react';
import { X, Trash2, Check, ArrowLeft, ArrowRight, Music, Sparkles } from 'lucide-react';
import { CHROMATIC_SHARP, CHROMATIC_FLAT } from '../../utils/chordUtils';

interface ChordPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChord: string;
  onSaveChord: (chord: string) => void;
  onDeleteChord?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  availableSongChords: string[];
  anchorContext?: {
    lyricsSnippet?: string;
    sectionTitle?: string;
  };
}

const ROOT_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ACCIDENTALS = ['', '#', 'b'];
const COMMON_QUALITIES = [
  { label: 'Majeur', value: '' },
  { label: 'Mineur', value: 'm' },
  { label: '7', value: '7' },
  { label: 'm7', value: 'm7' },
  { label: 'maj7', value: 'maj7' },
  { label: 'sus4', value: 'sus4' },
  { label: 'sus2', value: 'sus2' },
  { label: 'add9', value: 'add9' },
  { label: '2', value: '2' },
  { label: '6', value: '6' },
  { label: 'm6', value: 'm6' },
  { label: '9', value: '9' },
  { label: 'dim', value: 'dim' },
  { label: 'aug', value: 'aug' },
  { label: '5', value: '5' }
];

const SLASH_BASSES = ['', 'C', 'C#', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

export const ChordPickerModal: React.FC<ChordPickerModalProps> = ({
  isOpen,
  onClose,
  currentChord,
  onSaveChord,
  onDeleteChord,
  onMoveLeft,
  onMoveRight,
  availableSongChords,
  anchorContext
}) => {
  const [manualInput, setManualInput] = useState(currentChord || '');
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [selectedAccidental, setSelectedAccidental] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [selectedBass, setSelectedBass] = useState('');

  // Parse current chord on open
  useEffect(() => {
    if (isOpen) {
      setManualInput(currentChord || '');

      if (currentChord) {
        // Parse chord string
        let baseChord = currentChord.trim();
        let bass = '';
        if (baseChord.includes('/')) {
          const parts = baseChord.split('/');
          baseChord = parts[0];
          bass = parts[1] || '';
        }

        const match = baseChord.match(/^([A-G])([#b]?)(.*)$/);
        if (match) {
          setSelectedRoot(match[1]);
          setSelectedAccidental(match[2] || '');
          setSelectedQuality(match[3] || '');
          setSelectedBass(bass);
        }
      } else {
        setSelectedRoot('C');
        setSelectedAccidental('');
        setSelectedQuality('');
        setSelectedBass('');
      }
    }
  }, [isOpen, currentChord]);

  // Computed chord from builder
  const builtChord = useMemo(() => {
    const root = `${selectedRoot}${selectedAccidental}`;
    const base = `${root}${selectedQuality}`;
    return selectedBass ? `${base}/${selectedBass}` : base;
  }, [selectedRoot, selectedAccidental, selectedQuality, selectedBass]);

  if (!isOpen) return null;

  const handleApplyQuickChord = (chord: string) => {
    onSaveChord(chord);
    onClose();
  };

  const handleApplyBuiltChord = () => {
    if (manualInput.trim()) {
      onSaveChord(manualInput.trim());
    } else {
      onSaveChord(builtChord);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#141416] border border-[#2A2A2D] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0E0E10] border-b border-[#222224]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {currentChord ? 'Modifier l\'accord' : 'Placer un accord'}
              </h3>
              {anchorContext?.lyricsSnippet && (
                <p className="text-[11px] text-gray-400 truncate max-w-[220px]">
                  Sur &quot;{anchorContext.lyricsSnippet}&quot;
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#222226] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Quick Chords from current song */}
          {availableSongChords.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Accords déjà dans ce chant</span>
                </span>
                <span className="text-[10px] text-gray-500">1 clic</span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-[#0A0A0C] border border-[#222224]">
                {availableSongChords.map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => handleApplyQuickChord(ch)}
                    className={`px-2.5 py-1 rounded font-mono font-bold text-xs transition-all active:scale-95 cursor-pointer ${
                      (manualInput || currentChord) === ch
                        ? 'bg-blue-600 text-white shadow-sm border border-blue-400'
                        : 'bg-[#1C1C1F] hover:bg-blue-600/30 text-blue-400 hover:text-blue-200 border border-[#333]'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Direct Input & Live Preview Box */}
          <div className="p-3 rounded-lg bg-[#0E0E10] border border-[#2A2A2D]">
            <label className="block text-[11px] font-semibold text-gray-300 mb-1.5">
              Accord sélectionné
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="ex: G, Am7, Dsus4, C/E..."
                className="flex-1 bg-[#1C1C1E] border border-[#333] focus:border-blue-500 rounded-md px-3 py-1.5 text-base font-bold font-mono text-blue-400 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setManualInput(builtChord)}
                className="px-2.5 py-1.5 rounded bg-[#222226] hover:bg-[#2C2C30] text-gray-300 text-xs font-semibold border border-[#333]"
                title="Insérer la sélection visuelle ci-dessous"
              >
                Générer
              </button>
            </div>
          </div>

          {/* Visual Interactive Chord Builder */}
          <div className="space-y-3 pt-1">
            
            {/* Root Note & Accidental */}
            <div>
              <span className="block text-[11px] font-semibold text-gray-400 mb-1">
                Fondamentale
              </span>
              <div className="grid grid-cols-7 gap-1">
                {ROOT_NOTES.map(note => (
                  <button
                    key={note}
                    type="button"
                    onClick={() => {
                      setSelectedRoot(note);
                      const chord = `${note}${selectedAccidental}${selectedQuality}${selectedBass ? `/${selectedBass}` : ''}`;
                      setManualInput(chord);
                    }}
                    className={`py-1.5 rounded font-mono font-bold text-xs transition-colors ${
                      selectedRoot === note
                        ? 'bg-blue-600 text-white border border-blue-400'
                        : 'bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#333]'
                    }`}
                  >
                    {note}
                  </button>
                ))}
              </div>

              {/* Accidentals */}
              <div className="grid grid-cols-3 gap-1 mt-1.5">
                {[
                  { label: 'Bécarre (Naturel)', val: '' },
                  { label: '# Dièse', val: '#' },
                  { label: 'b Bémol', val: 'b' }
                ].map(acc => (
                  <button
                    key={acc.val}
                    type="button"
                    onClick={() => {
                      setSelectedAccidental(acc.val);
                      const chord = `${selectedRoot}${acc.val}${selectedQuality}${selectedBass ? `/${selectedBass}` : ''}`;
                      setManualInput(chord);
                    }}
                    className={`py-1 rounded text-xs font-mono font-semibold transition-colors ${
                      selectedAccidental === acc.val
                        ? 'bg-purple-600 text-white border border-purple-400'
                        : 'bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#333]'
                    }`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <span className="block text-[11px] font-semibold text-gray-400 mb-1">
                Type d&apos;accord
              </span>
              <div className="grid grid-cols-5 gap-1">
                {COMMON_QUALITIES.map(q => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => {
                      setSelectedQuality(q.value);
                      const chord = `${selectedRoot}${selectedAccidental}${q.value}${selectedBass ? `/${selectedBass}` : ''}`;
                      setManualInput(chord);
                    }}
                    className={`py-1 px-1 rounded font-mono text-xs transition-colors truncate ${
                      selectedQuality === q.value
                        ? 'bg-emerald-600 text-white font-bold border border-emerald-400'
                        : 'bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#333]'
                    }`}
                  >
                    {q.value || 'maj'}
                  </button>
                ))}
              </div>
            </div>

            {/* Bass Note for Slash Chords */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-gray-400">
                  Basse renversée
                </span>
                {selectedBass && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBass('');
                      const chord = `${selectedRoot}${selectedAccidental}${selectedQuality}`;
                      setManualInput(chord);
                    }}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Retirer la basse
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {SLASH_BASSES.map(b => (
                  <button
                    key={b || 'none'}
                    type="button"
                    onClick={() => {
                      setSelectedBass(b);
                      const chord = `${selectedRoot}${selectedAccidental}${selectedQuality}${b ? `/${b}` : ''}`;
                      setManualInput(chord);
                    }}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors ${
                      selectedBass === b
                        ? 'bg-amber-600 text-white font-bold border border-amber-400'
                        : 'bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 border border-[#333]'
                    }`}
                  >
                    {b ? `/${b}` : 'Sans'}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Position adjustments (Shift Left / Shift Right) */}
          {(onMoveLeft || onMoveRight || onDeleteChord) && (
            <div className="flex items-center justify-between pt-3 border-t border-[#222224]">
              <div className="flex items-center gap-1.5">
                {onMoveLeft && (
                  <button
                    type="button"
                    onClick={onMoveLeft}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-xs border border-[#333]"
                    title="Déplacer l'accord vers la gauche"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Gauche</span>
                  </button>
                )}
                {onMoveRight && (
                  <button
                    type="button"
                    onClick={onMoveRight}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-xs border border-[#333]"
                    title="Déplacer l'accord vers la droite"
                  >
                    <span>Droite</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {onDeleteChord && currentChord && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteChord();
                    onClose();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-semibold border border-rose-500/40 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Supprimer</span>
                </button>
              )}
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0E0E10] border-t border-[#222224]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-xs font-medium border border-[#333]"
          >
            Annuler
          </button>
          
          <button
            type="button"
            onClick={handleApplyBuiltChord}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Valider l&apos;accord {manualInput || builtChord}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
