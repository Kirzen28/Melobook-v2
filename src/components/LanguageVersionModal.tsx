import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Song } from '../types';
import { PRESET_LANGUAGES, getLanguageMeta, getLinkedSongVersions } from '../utils/languageUtils';
import { 
  Globe, 
  X, 
  Plus, 
  Unlink, 
  Check, 
  Search, 
  ExternalLink, 
  Copy,
  Music,
  ArrowRight
} from 'lucide-react';

interface LanguageVersionModalProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
  onSelectSong?: (song: Song) => void;
}

export const LanguageVersionModal: React.FC<LanguageVersionModalProps> = ({
  song: initialSong,
  isOpen,
  onClose,
  onSelectSong
}) => {
  const { 
    songs, 
    updateSong, 
    linkSongs, 
    unlinkSongs, 
    createLanguageVersion,
    setSelectedSong,
    setActiveTab
  } = useApp();

  // Always resolve the freshest version of current song from state
  const currentSong = useMemo(() => {
    return songs.find(s => s.id === initialSong.id) || initialSong;
  }, [songs, initialSong]);

  const [activeTabMode, setActiveTabMode] = useState<'versions' | 'link_existing' | 'create_new'>('versions');
  const [searchSongQuery, setSearchSongQuery] = useState('');
  const [newVersionLanguage, setNewVersionLanguage] = useState('Anglais');
  const [newVersionTitle, setNewVersionTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get all linked versions
  const linkedVersions = useMemo(() => {
    return getLinkedSongVersions(currentSong, songs);
  }, [currentSong, songs]);

  // Available songs to link (exclude current song and already linked songs)
  const availableSongsToLink = useMemo(() => {
    const linkedIds = new Set([currentSong.id, ...linkedVersions.map(s => s.id)]);
    const filtered = songs.filter(s => !linkedIds.has(s.id));
    if (!searchSongQuery.trim()) return filtered;
    const q = searchSongQuery.toLowerCase().trim();
    return filtered.filter(s => 
      s.title.toLowerCase().includes(q) || 
      (s.artist && s.artist.toLowerCase().includes(q)) ||
      (s.language && s.language.toLowerCase().includes(q))
    );
  }, [songs, currentSong.id, linkedVersions, searchSongQuery]);

  if (!isOpen) return null;

  const currentSongLangMeta = getLanguageMeta(currentSong.language);

  const handleUpdateCurrentLanguage = async (newLang: string) => {
    await updateSong(currentSong.id, { language: newLang });
    setSuccessMessage(`Langue définie sur ${newLang}`);
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  const handleLink = async (targetSongId: string) => {
    setIsProcessing(true);
    try {
      await linkSongs(currentSong.id, targetSongId);
      setSuccessMessage('Chant lié avec succès');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlink = async (targetSongId: string) => {
    setIsProcessing(true);
    try {
      await unlinkSongs(currentSong.id, targetSongId);
      setSuccessMessage('Lien supprimé');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNewTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const generatedTitle = newVersionTitle.trim() || `${currentSong.title} - ${newVersionLanguage}`;
      const newSongId = await createLanguageVersion(currentSong.id, newVersionLanguage, generatedTitle);
      setSuccessMessage(`Version ${newVersionLanguage} créée`);
      setNewVersionTitle('');
      setActiveTabMode('versions');
      
      const created = songs.find(s => s.id === newSongId);
      if (created && onSelectSong) {
        onSelectSong(created);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenSong = (targetSong: Song) => {
    if (onSelectSong) {
      onSelectSong(targetSong);
    } else {
      setSelectedSong(targetSong);
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#141416] border border-[#2A2A2D] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-100"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#222224] bg-[#171719] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white tracking-tight truncate">
                Langue et Versions du Chant
              </h3>
              <p className="text-xs text-gray-400 truncate">
                {currentSong.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#222225] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Song Language Selector */}
        <div className="p-3.5 bg-[#18181C] border-b border-[#222224] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Langue de ce chant :</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${currentSongLangMeta.badgeClass}`}>
              {currentSongLangMeta.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={currentSong.language || 'Français'}
              onChange={(e) => handleUpdateCurrentLanguage(e.target.value)}
              className="bg-[#202024] hover:bg-[#28282E] text-xs text-gray-200 border border-[#333] rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
            >
              {PRESET_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.name} className="bg-[#141416]">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Nav Tabs */}
        <div className="flex items-center border-b border-[#222224] bg-[#111113] px-3 pt-2 text-xs gap-2">
          <button
            type="button"
            onClick={() => setActiveTabMode('versions')}
            className={`pb-2 px-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTabMode === 'versions'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Versions liées</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#202024] text-[10px] text-gray-300">
              {linkedVersions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabMode('link_existing')}
            className={`pb-2 px-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTabMode === 'link_existing'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lier un chant existant</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabMode('create_new')}
            className={`pb-2 px-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTabMode === 'create_new'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Nouvelle version</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="bg-emerald-950/60 border-b border-emerald-500/30 px-3.5 py-2 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-100">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto max-h-[50vh] space-y-3">
          
          {/* TAB 1: Linked Versions List */}
          {activeTabMode === 'versions' && (
            <div>
              {linkedVersions.length === 0 ? (
                <div className="text-center py-8 bg-[#18181C] rounded-lg border border-[#242428] p-4">
                  <Globe className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-300">
                    Aucune autre version liée pour l'instant
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 max-w-xs mx-auto">
                    Vous pouvez relier une version existante ou créer une version dans une autre langue en 1 clic.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setActiveTabMode('link_existing')}
                      className="px-3 py-1.5 rounded-lg bg-[#242428] hover:bg-[#303036] text-xs font-semibold text-gray-200 transition-colors"
                    >
                      Lier un chant
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTabMode('create_new')}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
                    >
                      Créer une version
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] text-gray-400 font-medium px-1">
                    Versions linguistiques disponibles :
                  </div>

                  {/* Current Active Song Row */}
                  <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${currentSongLangMeta.badgeClass}`}>
                        {currentSongLangMeta.name}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <span>{currentSong.title}</span>
                          <span className="text-[10px] text-blue-400 font-normal">version affichée</span>
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {currentSong.artist || 'Auteur inconnu'} • Tonalité {currentSong.key}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Linked Songs List */}
                  {linkedVersions.map((linkedSong) => {
                    const lMeta = getLanguageMeta(linkedSong.language);
                    return (
                      <div
                        key={linkedSong.id}
                        className="p-3 rounded-lg bg-[#18181C] hover:bg-[#1E1E22] border border-[#28282C] hover:border-[#38383E] flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${lMeta.badgeClass}`}>
                            {lMeta.name}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-200 truncate">
                              {linkedSong.title}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate">
                              {linkedSong.artist || 'Auteur inconnu'} • Tonalité {linkedSong.key}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenSong(linkedSong)}
                            className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Ouvrir cette version"
                          >
                            <span>Ouvrir</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleUnlink(linkedSong.id)}
                            className="p-1.5 rounded bg-[#242428] hover:bg-rose-950/40 text-gray-400 hover:text-rose-400 border border-[#333] hover:border-rose-500/30 transition-colors"
                            title="Délier cette version"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Link Existing Song */}
          {activeTabMode === 'link_existing' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher un chant à relier..."
                  value={searchSongQuery}
                  onChange={(e) => setSearchSongQuery(e.target.value)}
                  className="w-full bg-[#18181C] border border-[#2E2E32] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {availableSongsToLink.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-xs">
                    Aucun chant correspondant disponible
                  </div>
                ) : (
                  availableSongsToLink.map((item) => {
                    const lMeta = getLanguageMeta(item.language);
                    return (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg bg-[#18181C] hover:bg-[#1F1F24] border border-[#28282C] flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${lMeta.badgeClass}`}>
                            {lMeta.code}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-200 truncate">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate">
                              {item.artist || 'Auteur inconnu'} • {lMeta.name}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleLink(item.id)}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Lier</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Create New Translated Version */}
          {activeTabMode === 'create_new' && (
            <form onSubmit={handleCreateNewTranslation} className="space-y-3.5">
              <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-lg text-xs text-blue-200">
                Cette action crée une nouvelle chanson individuelle avec les mêmes accords, tempo et tonalité que <span className="font-bold text-white">{currentSong.title}</span>, tout en liant automatiquement les deux versions.
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Langue cible *
                </label>
                <select
                  value={newVersionLanguage}
                  onChange={(e) => setNewVersionLanguage(e.target.value)}
                  className="w-full bg-[#18181C] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {PRESET_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.name} className="bg-[#141416]">
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Titre de la nouvelle version
                </label>
                <input
                  type="text"
                  placeholder={`ex: ${currentSong.title} - ${newVersionLanguage}`}
                  value={newVersionTitle}
                  onChange={(e) => setNewVersionTitle(e.target.value)}
                  className="w-full bg-[#18181C] border border-[#333] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTabMode('versions')}
                  className="px-3 py-2 rounded-lg bg-[#202024] hover:bg-[#28282E] text-xs font-medium text-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Créer la version liée</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#111113] border-t border-[#222224] flex items-center justify-between text-xs text-gray-400">
          <span>{linkedVersions.length + 1} version{linkedVersions.length > 0 ? 's' : ''} au total</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 transition-colors font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
