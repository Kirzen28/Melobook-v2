import React, { useState, useEffect } from 'react';
import { Sparkles, Check, RotateCcw, Loader2 } from 'lucide-react';
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

export const UserAvatarSelector: React.FC = () => {
  const { currentUser, selectSvgAvatar, removeProfileAvatar, showNotification } = useApp();

  const existing = parseSvgAvatar(currentUser?.photoURL);
  const [selectedIcon, setSelectedIcon] = useState<SvgAvatarIconId>(existing?.iconId || 'mic');
  const [selectedColor, setSelectedColor] = useState<SvgAvatarColorId>(existing?.color.id || 'blue');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const parsed = parseSvgAvatar(currentUser?.photoURL);
    if (parsed) {
      setSelectedIcon(parsed.iconId);
      setSelectedColor(parsed.color.id);
    }
  }, [currentUser?.photoURL]);

  const previewToken = encodeSvgAvatar(selectedIcon, selectedColor);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await selectSvgAvatar(previewToken);
      showNotification({
        title: 'Avatar mis à jour',
        message: 'Votre nouvel avatar SVG a été enregistré.',
        type: 'success'
      });
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
      showNotification({
        title: 'Avatar réinitialisé',
        message: 'Affichage par initiale rétabli.',
        type: 'info'
      });
    } catch {
      showNotification('Erreur lors de la réinitialisation', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-[#16161C] border border-slate-300 dark:border-[#262630] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 text-slate-900 dark:text-white">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-300 dark:border-[#252530]">
        <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Mon Avatar Musical (SVG)</h3>
          <p className="text-xs text-slate-600 dark:text-gray-400">
            Choisissez un avatar vectoriel sans stockage d'image (léger et instantané)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Preview & Info */}
        <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl bg-white dark:bg-[#101014] border border-slate-200 dark:border-[#22222B]">
          <UserAvatar
            photoURL={previewToken}
            displayName={currentUser?.displayName}
            sizeClass="w-20 h-20 text-xl border-2 shadow-xl"
            iconClass="w-9 h-9"
          />
          <div className="text-center">
            <p className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[200px]">
              {currentUser?.displayName || 'Musicien'}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-gray-400 truncate max-w-[220px]">
              {currentUser?.email || 'Compte connecté'}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
              <span>Appliquer</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-lg bg-[#EDF1F5] dark:bg-[#1C1C24] hover:bg-slate-200 dark:hover:bg-[#252530] text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-[#2E2E3A] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Revenir à l'initiale"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Initiale</span>
            </button>
          </div>
        </div>

        {/* Picker: Icons & Colors */}
        <div className="md:col-span-2 space-y-4">
          {/* Icon Selector */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
              Icône (Instrument / Rôle)
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {SVG_AVATAR_ICONS.map((item) => {
                const active = selectedIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIcon(item.id)}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border text-[11px] font-medium transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600/25 border-blue-500 text-slate-900 dark:text-white shadow-xs'
                        : 'bg-white dark:bg-[#121216] border-slate-200 dark:border-[#22222B] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-[#333]'
                    }`}
                  >
                    <SvgAvatarGlyph iconId={item.id} className="w-5 h-5" />
                    <span className="truncate max-w-full text-[10px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
              Thème couleur
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {SVG_AVATAR_COLORS.map((c) => {
                const active = selectedColor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id)}
                    title={c.label}
                    aria-label={c.label}
                    className={`h-7 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                      active
                        ? `${c.bgClass} ${c.textClass} ${c.borderClass} ring-1 ring-white/30 scale-105`
                        : 'bg-white dark:bg-[#121216] border-slate-200 dark:border-[#22222B] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${c.swatchClass}`} />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
