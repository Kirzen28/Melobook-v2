import React, { useState, useEffect, useMemo } from 'react';
import { Song } from '../types';
import {
  AiSongTranslation,
  AiTranslationBlock,
  extractSongBlocksForTranslation,
  extractBlocksFromPairedSongs,
  syncTranslationWithSourceSong
} from '../utils/aiTranslationUtils';
import { PRESET_LANGUAGES, getLanguageMeta } from '../utils/languageUtils';
import {
  Sparkles,
  Languages,
  Edit3,
  Eye,
  X,
  Check,
  Loader2,
  AlertCircle,
  Save,
  Trash2,
  Tv,
  RotateCcw
} from 'lucide-react';

interface AiTranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  existingAiTranslation?: AiSongTranslation | null;
  existingLinkedSong?: Song | null;
  existingAlignedBlocks?: AiTranslationBlock[] | null;
  initialEditMode?: boolean;
  canSaveToLibrary: boolean;
  onApplyForProjection: (translation: AiSongTranslation) => void;
  onSaveToLibrary: (translation: AiSongTranslation) => Promise<void>;
  onDeleteLocalTranslation?: (sourceSongId: string) => void;
}

function pickDefaultTargetLanguage(sourceLang?: string): string {
  const meta = getLanguageMeta(sourceLang);
  if (meta.code === 'FR') return 'Anglais';
  return 'Français';
}

export const AiTranslationModal: React.FC<AiTranslationModalProps> = ({
  isOpen,
  onClose,
  song,
  existingAiTranslation,
  existingLinkedSong,
  existingAlignedBlocks,
  initialEditMode = false,
  canSaveToLibrary,
  onApplyForProjection,
  onSaveToLibrary,
  onDeleteLocalTranslation
}) => {
  const sourceLangMeta = useMemo(() => getLanguageMeta(song.language), [song.language]);

  const [targetLanguage, setTargetLanguage] = useState<string>(() =>
    existingAiTranslation?.targetLanguage ||
    existingLinkedSong?.language ||
    pickDefaultTargetLanguage(song.language)
  );
  const [translatedTitle, setTranslatedTitle] = useState<string>('');
  const [blocks, setBlocks] = useState<AiTranslationBlock[]>([]);
  const [isEditMode, setIsEditMode] = useState<boolean>(initialEditMode);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isSavingLibrary, setIsSavingLibrary] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialisation à l'ouverture ou changement de chant
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);

    if (existingAiTranslation && existingAiTranslation.sourceSongId === song.id) {
      setTargetLanguage(existingAiTranslation.targetLanguage);
      setTranslatedTitle(existingAiTranslation.translatedTitle);
      const synced = syncTranslationWithSourceSong(song, existingAiTranslation);
      setBlocks(synced.blocks);
      setIsEditMode(initialEditMode);
      return;
    }

    if (existingLinkedSong) {
      setTargetLanguage(existingLinkedSong.language || pickDefaultTargetLanguage(song.language));
      setTranslatedTitle(existingLinkedSong.title);
      setBlocks(
        existingAlignedBlocks && existingAlignedBlocks.length > 0
          ? existingAlignedBlocks
          : extractBlocksFromPairedSongs(song, existingLinkedSong)
      );
      setIsEditMode(true);
      return;
    }

    setTargetLanguage(pickDefaultTargetLanguage(song.language));
    setTranslatedTitle('');
    setBlocks(extractSongBlocksForTranslation(song));
    setIsEditMode(initialEditMode);
  }, [isOpen, song, existingAiTranslation, existingLinkedSong, existingAlignedBlocks, initialEditMode]);

  if (!isOpen) return null;

  const hasAnyTranslation = blocks.some((b) =>
    b.translatedLines.some((l) => l.trim().length > 0)
  );

  const handleRunAiTranslation = async () => {
    const baseBlocks =
      blocks.length > 0 ? blocks : extractSongBlocksForTranslation(song);
    if (baseBlocks.length === 0) {
      setErrorMsg('Aucune parole détectée dans ce chant.');
      return;
    }

    setIsTranslating(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/translate-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: song.title,
          sourceLanguage: sourceLangMeta.name,
          targetLanguage,
          blocks: baseBlocks.map((b) => ({
            sectionTitle: b.sectionTitle,
            lines: b.originalLines
          }))
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `Erreur serveur (${response.status})`);
      }

      const mergedBlocks: AiTranslationBlock[] = baseBlocks.map((orig, idx) => {
        const resBlock = data.blocks?.[idx];
        return {
          ...orig,
          sectionTitle: resBlock?.sectionTitle || orig.sectionTitle,
          translatedLines: Array.isArray(resBlock?.translatedLines)
            ? orig.originalLines.map((_, lIdx) => String(resBlock.translatedLines[lIdx] ?? ''))
            : orig.translatedLines
        };
      });

      setTranslatedTitle(data.translatedTitle || song.title);
      setBlocks(mergedBlocks);
      setIsEditMode(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Impossible de traduire ce chant pour le moment.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleBlockTextChange = (blockIdx: number, rawText: string) => {
    const splitLines = rawText.split('\n');
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === blockIdx
          ? { ...b, translatedLines: splitLines }
          : b
      )
    );
  };

  const handleBlockSectionTitleChange = (blockIdx: number, value: string) => {
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === blockIdx
          ? { ...b, sectionTitle: value }
          : b
      )
    );
  };

  const buildPayload = (): AiSongTranslation => ({
    sourceSongId: song.id,
    targetLanguage: targetLanguage.trim() || 'Français',
    translatedTitle: translatedTitle.trim() || `${song.title} (${targetLanguage})`,
    blocks,
    linkedSongId: existingLinkedSong?.id || existingAiTranslation?.linkedSongId,
    updatedAt: Date.now()
  });

  const handleApply = () => {
    onApplyForProjection(buildPayload());
    onClose();
  };

  const handleSaveLibrary = async () => {
    setIsSavingLibrary(true);
    setErrorMsg(null);
    try {
      await onSaveToLibrary(buildPayload());
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors de la sauvegarde dans le répertoire.');
    } finally {
      setIsSavingLibrary(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-slate-50 dark:bg-[#14141A] border border-slate-300 dark:border-[#2B2B38] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#22222E] bg-slate-50 dark:bg-[#16161E]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-50 dark:from-cyan-500/25 to-indigo-500/25 border border-cyan-400/40 flex items-center justify-center text-cyan-700 dark:text-cyan-300 shrink-0">
              <Languages className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Traduction IA & Édition
                </h3>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${sourceLangMeta.badgeClass}`}>
                  {sourceLangMeta.code} → {getLanguageMeta(targetLanguage).code}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-gray-400 truncate">
                Chant : <strong className="text-slate-800 dark:text-gray-200">{song.title}</strong>
                {existingLinkedSong && (
                  <span className="ml-2 text-indigo-700 dark:text-indigo-300">• Lié à « {existingLinkedSong.title} »</span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#242430] transition-colors cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barre de commande : Langue cible + Bouton Traduire IA + Toggle Mode Édition */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-[#22222E] bg-slate-50 dark:bg-[#13131A] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="ai-target-lang" className="text-xs font-semibold text-slate-700 dark:text-gray-300">
              Traduire en :
            </label>
            <select
              id="ai-target-lang"
              value={
                PRESET_LANGUAGES.some((l) => l.name === targetLanguage)
                  ? targetLanguage
                  : 'Autre'
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val !== 'Autre') setTargetLanguage(val);
              }}
              className="bg-[#EDF1F5] dark:bg-[#1C1C26] border border-slate-300 dark:border-[#303042] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
            >
              {PRESET_LANGUAGES.filter((l) => l.code !== 'OTHER').map((lang) => (
                <option key={lang.code} value={lang.name} className="bg-slate-50 dark:bg-[#14141A]">
                  {lang.name} ({lang.code})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleRunAiTranslation}
              disabled={isTranslating}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-950/50 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Traduction IA en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{hasAnyTranslation ? 'Retraduire par IA' : 'Traduire automatiquement (IA)'}</span>
                </>
              )}
            </button>
          </div>

          {/* Toggle Aperçu / Mode Édition manuelle */}
          <div className="flex items-center gap-1 bg-[#EDF1F5] dark:bg-[#1A1A24] border border-slate-300 dark:border-[#2C2C3A] rounded-xl p-1">
            <button
              type="button"
              onClick={() => setIsEditMode(false)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                !isEditMode
                  ? 'bg-[#EDF1F5] dark:bg-[#2A2A3A] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Aperçu</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditMode(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                isEditMode
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Éditer à la main</span>
            </button>
          </div>
        </div>

        {/* Message d'erreur éventuel */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-500/40 text-red-700 dark:text-red-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Corps principal : Titre + Blocs (Original vs Traduction) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {/* Titre traduit */}
          <div className="p-3.5 rounded-xl bg-[#EDF1F5] dark:bg-[#181822] border border-slate-300 dark:border-[#282836] flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="sm:w-1/2">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">
                Titre original ({sourceLangMeta.name})
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-gray-200">{song.title}</span>
            </div>
            <div className="sm:w-1/2">
              <label className="text-[10px] uppercase font-bold text-cyan-700 dark:text-cyan-400 block mb-1">
                Titre traduit ({targetLanguage})
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  value={translatedTitle}
                  onChange={(e) => setTranslatedTitle(e.target.value)}
                  placeholder={`${song.title} (${targetLanguage})`}
                  className="w-full bg-white dark:bg-[#121218] border border-slate-300 dark:border-[#323244] focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              ) : (
                <span className="text-xs font-bold text-cyan-700 dark:text-cyan-200">
                  {translatedTitle || <span className="text-gray-500 italic">Non traduit</span>}
                </span>
              )}
            </div>
          </div>

          {!hasAnyTranslation && !isEditMode && !isTranslating && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#161620] border border-dashed border-slate-300 dark:border-[#2E2E3E] text-center space-y-2">
              <Sparkles className="w-7 h-7 text-cyan-700 dark:text-cyan-400 mx-auto opacity-80" />
              <p className="text-xs text-slate-700 dark:text-gray-300 font-medium">
                Cliquez sur <strong>Traduire automatiquement (IA)</strong> pour générer les paroles traduites ligne par ligne, ou passez en mode <strong>Éditer à la main</strong>.
              </p>
            </div>
          )}

          {/* Blocs / Strophes */}
          <div className="space-y-3">
            {blocks.map((block, bIdx) => {
              const origCount = block.originalLines.length;
              const transCount = block.translatedLines.filter((l) => l.trim().length > 0).length;
              const lineCountExact = block.translatedLines.length === origCount;

              return (
                <div
                  key={bIdx}
                  className="rounded-xl border border-slate-300 dark:border-[#262634] bg-slate-50 dark:bg-[#171720] overflow-hidden"
                >
                  <div className="px-3.5 py-2 bg-[#EDF1F5] dark:bg-[#1B1B26] border-b border-slate-300 dark:border-[#252534] flex items-center justify-between gap-2">
                    {isEditMode ? (
                      <input
                        type="text"
                        value={block.sectionTitle}
                        onChange={(e) => handleBlockSectionTitleChange(bIdx, e.target.value)}
                        className="bg-white dark:bg-[#121218] border border-slate-300 dark:border-[#303042] focus:border-amber-500 rounded-md px-2 py-0.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 focus:outline-none w-48"
                        placeholder="Section"
                      />
                    ) : (
                      <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                        {block.sectionTitle}
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        transCount === 0
                          ? 'bg-[#EDF1F5]/60 dark:bg-gray-800/60 text-slate-600 dark:text-gray-400 border-slate-300 dark:border-gray-700'
                          : lineCountExact
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      }`}
                      title="Pour synchroniser les sous-titres, gardez le même nombre de lignes qu'à l'original"
                    >
                      {block.translatedLines.length}/{origCount} lignes
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-[#252534]">
                    {/* Original */}
                    <div className="p-3.5 space-y-1 bg-slate-50 dark:bg-[#14141B]">
                      <span className="text-[9px] uppercase font-bold text-gray-500 block mb-1">
                        Original
                      </span>
                      {block.originalLines.map((line, lIdx) => (
                        <p key={lIdx} className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* Traduction (Édition manuelle ou Aperçu) */}
                    <div className="p-3.5 bg-[#EDF1F5] dark:bg-[#171722]">
                      <span className="text-[9px] uppercase font-bold text-cyan-700 dark:text-cyan-400/80 block mb-1">
                        Traduction ({targetLanguage})
                      </span>
                      {isEditMode ? (
                        <textarea
                          value={block.translatedLines.join('\n')}
                          onChange={(e) => handleBlockTextChange(bIdx, e.target.value)}
                          rows={Math.max(2, origCount)}
                          placeholder={block.originalLines.join('\n')}
                          className="w-full bg-white dark:bg-[#101016] border border-slate-300 dark:border-[#2F2F42] focus:border-amber-500 rounded-lg p-2.5 text-xs text-cyan-100 leading-relaxed focus:outline-none resize-y font-sans"
                        />
                      ) : (
                        <div className="space-y-1">
                          {block.translatedLines.some((l) => l.trim().length > 0) ? (
                            block.translatedLines.map((line, lIdx) => (
                              <p key={lIdx} className="text-xs text-cyan-700 dark:text-cyan-200 leading-relaxed italic">
                                {line || <span className="text-slate-500 dark:text-gray-600">—</span>}
                              </p>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500 italic">En attente de traduction...</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pied de modal : Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-[#22222E] bg-slate-50 dark:bg-[#16161E] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {existingAiTranslation && onDeleteLocalTranslation && (
              <button
                type="button"
                onClick={() => {
                  onDeleteLocalTranslation(song.id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-500/30 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Supprimer la traduction IA locale de ce chant"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            )}
            {hasAnyTranslation && isEditMode && (
              <button
                type="button"
                onClick={() => {
                  setBlocks(extractSongBlocksForTranslation(song));
                  setTranslatedTitle('');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-[#EDF1F5] dark:bg-[#1E1E28] hover:bg-slate-200 dark:hover:bg-[#262634] border border-slate-300 dark:border-[#2E2E3E] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Réinitialiser les champs de traduction"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-[#EDF1F5] dark:bg-[#1E1E28] hover:bg-slate-200 dark:hover:bg-[#272736] text-slate-700 dark:text-gray-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              Annuler
            </button>

            {canSaveToLibrary && existingLinkedSong && (
              <button
                type="button"
                onClick={handleSaveLibrary}
                disabled={!hasAnyTranslation || isSavingLibrary}
                className="px-3.5 py-2 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/40 disabled:opacity-40 border border-indigo-500/50 text-indigo-700 dark:text-indigo-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Enregistrer les modifications dans le chant lié du répertoire"
              >
                {isSavingLibrary ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Mettre à jour le chant lié</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleApply}
              disabled={!hasAnyTranslation}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Projeter en bilingue</span>
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
