import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  SVG_AVATAR_ICONS,
  SVG_AVATAR_COLORS,
  SvgAvatarIconId,
  SvgAvatarColorId,
  SvgAvatarGlyph,
  UserAvatar,
  encodeSvgAvatar,
  parseSvgAvatar
} from '../utils/avatarPresets';

interface ProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfilePictureModal: React.FC<ProfilePictureModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, selectSvgAvatar, removeProfileAvatar, showNotification } = useApp();

  const existing = parseSvgAvatar(currentUser?.photoURL);
  const [selectedIcon, setSelectedIcon] = useState<SvgAvatarIconId>(existing?.iconId || 'mic');
  const [selectedColor, setSelectedColor] = useState<SvgAvatarColorId>(existing?.color.id || 'blue');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const parsed = parseSvgAvatar(currentUser?.photoURL);
      setSelectedIcon(parsed?.iconId || 'mic');
      setSelectedColor(parsed?.color.id || 'blue');
      setIsSaving(false);
    }
  }, [isOpen, currentUser?.photoURL]);

  if (!isOpen) return null;

  const previewToken = encodeSvgAvatar(selectedIcon, selectedColor);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await selectSvgAvatar(previewToken);
      onClose();
    } catch {
      showNotification("Erreur lors de l'enregistrement de l'avatar", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await removeProfileAvatar();
      onClose();
    } catch {
      showNotification('Erreur lors de la réinitialisation', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Choisir un avatar SVG"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#121215] border border-slate-300 dark:border-[#26262E] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#222228] bg-slate-50 dark:bg-[#16161B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Avatar SVG</h3>
              <p className="text-[11px] text-slate-600 dark:text-gray-400">
                Léger et instantané — aucune image stockée
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#EDF1F5] dark:bg-[#202026] hover:bg-slate-200 dark:hover:bg-[#2C2C34] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Aperçu */}
          <div className="flex flex-col items-center gap-2">
            <UserAvatar
              photoURL={previewToken}
              displayName={currentUser?.displayName}
              sizeClass="w-20 h-20 border-2 shadow-lg"
              iconClass="w-9 h-9"
            />
            <div className="text-center">
              <p className="font-semibold text-sm text-slate-900 dark:text-white">
                {currentUser?.displayName || 'Musicien'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-gray-400">
                {currentUser?.email || 'Compte utilisateur'}
              </p>
            </div>
          </div>

          {/* Liste des icônes SVG */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-gray-400">
              Choisir un icône
            </p>
            <div className="grid grid-cols-4 gap-2">
              {SVG_AVATAR_ICONS.map((item) => {
                const active = selectedIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIcon(item.id)}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1.5 rounded-xl border text-[11px] font-medium transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600/20 border-blue-500 text-slate-900 dark:text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-[#18181E] border-slate-300 dark:border-[#262630] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-[#3A3A48]'
                    }`}
                  >
                    <SvgAvatarGlyph iconId={item.id} className="w-5 h-5" />
                    <span className="truncate max-w-full">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Couleur */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-gray-400">
              Couleur
            </p>
            <div className="flex items-center justify-between gap-2">
              {SVG_AVATAR_COLORS.map((c) => {
                const active = selectedColor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id)}
                    title={c.label}
                    aria-label={c.label}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${c.swatchClass} ${
                      active ? 'ring-2 ring-white ring-offset-2 ring-offset-[#121215] scale-110' : 'opacity-75 hover:opacity-100'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-200 dark:border-[#202028] flex items-center justify-between gap-2">
            {existing ? (
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="px-3 py-2 rounded-xl bg-[#EDF1F5] dark:bg-[#1A1A20] hover:bg-slate-200 dark:hover:bg-[#24242C] text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-[#2C2C36] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Revenir à l'initiale du nom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Initiale</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-3 py-2 rounded-xl bg-[#EDF1F5] dark:bg-[#1A1A20] hover:bg-slate-200 dark:hover:bg-[#24242C] text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-[#2C2C36] text-xs font-medium cursor-pointer"
              >
                Annuler
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-900/30 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Enregistrer l'avatar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
