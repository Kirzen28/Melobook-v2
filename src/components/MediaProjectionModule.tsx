import React, { useState, useRef, useMemo } from 'react';
import {
  Video,
  Image as ImageIcon,
  Music,
  Upload,
  Link as LinkIcon,
  Play,
  Square,
  Volume2,
  VolumeX,
  Repeat,
  Globe,
  Folder,
  MonitorPlay,
  Info,
  Star,
  X,
  FolderPlus,
  FolderOpen
} from 'lucide-react';
import {
  MediaType,
  MediaSourceType,
  MediaPresentationState,
  getYouTubeEmbedUrl,
  extractYouTubeVideoId
} from '../utils/presentationUtils';

interface MediaProjectionModuleProps {
  activeMedia: MediaPresentationState | null;
  onProjectMedia: (media: MediaPresentationState) => void;
  onStopMedia: () => void;
  className?: string;
}

export const MediaProjectionModule: React.FC<MediaProjectionModuleProps> = ({
  activeMedia,
  onProjectMedia,
  onStopMedia,
  className,
}) => {
  // Onglet de média : Vidéo | Image | Audio
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>('video');
  // Source active : 'youtube' | 'url' | 'local'
  const [selectedSource, setSelectedSource] = useState<MediaSourceType>('youtube');

  // Champs de saisie
  const [youtubeInput, setYoutubeInput] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [mediaTitleInput, setMediaTitleInput] = useState<string>('');
  const [isLoop, setIsLoop] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Fichier local chargé
  const [localFileMedia, setLocalFileMedia] = useState<{
    file: File;
    url: string;
    type: MediaType;
    name: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gestion du fichier local (ordinateur)
  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let detectedType: MediaType = 'image';
    if (file.type.startsWith('video/')) detectedType = 'video';
    else if (file.type.startsWith('audio/')) detectedType = 'audio';

    const objectUrl = URL.createObjectURL(file);
    setLocalFileMedia({
      file,
      url: objectUrl,
      type: detectedType,
      name: file.name
    });
    setMediaTitleInput(file.name.replace(/\.[^/.]+$/, ''));
  };

  // Système de dossiers / catégories pour organiser les favoris (Backgrounds, Tutos, Backing tracks, etc.)
  const DEFAULT_CATEGORIES = ['Backgrounds', 'Tutos', 'Backing tracks'];

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('melobook_media_favorite_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CATEGORIES;
  });

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [targetCategoryForAdd, setTargetCategoryForAdd] = useState<string>('Backgrounds');

  const [mediaFavorites, setMediaFavorites] = useState<{
    id: string;
    title: string;
    url: string;
    type: MediaType;
    source: MediaSourceType;
    category: string;
    thumbnail?: string;
    author?: string;
    createdAt: number;
  }[]>(() => {
    try {
      const saved = localStorage.getItem('melobook_media_search_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((item: any) =>
              item &&
              typeof item.url === 'string' &&
              item.url.trim() !== '' &&
              (item.source === 'youtube' || item.source === 'url')
            )
            .map((item: any, idx: number) => ({
              id: item.id || `fav-${idx}-${Date.now()}`,
              title: item.title || 'Favori',
              url: item.url,
              type: (item.type || item.mediaType || 'video') as MediaType,
              source: item.source as MediaSourceType,
              category: item.category || (
                (item.mediaType === 'audio' || item.type === 'audio') ? 'Backing tracks' : 'Backgrounds'
              ),
              thumbnail: item.thumbnail,
              author: item.author,
              createdAt: item.createdAt || Date.now()
            }));
        }
      }
    } catch {}
    return [];
  });

  const saveFavorites = (favs: typeof mediaFavorites) => {
    setMediaFavorites(favs);
    try {
      localStorage.setItem('melobook_media_search_favorites', JSON.stringify(favs));
    } catch {}
  };

  const saveCategories = (cats: string[]) => {
    setCategories(cats);
    try {
      localStorage.setItem('melobook_media_favorite_categories', JSON.stringify(cats));
    } catch {}
  };

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (!categories.includes(name)) {
      saveCategories([...categories, name]);
    }
    setSelectedCategoryFilter(name);
    setTargetCategoryForAdd(name);
    setNewCategoryName('');
    setIsCreatingCategory(false);
  };

  const handleDeleteCategory = (catToDelete: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (categories.length <= 1) return;
    const remaining = categories.filter(c => c !== catToDelete);
    saveCategories(remaining);
    const fallback = remaining[0] || 'Backgrounds';
    saveFavorites(mediaFavorites.map(f => f.category === catToDelete ? { ...f, category: fallback } : f));
    if (selectedCategoryFilter === catToDelete) {
      setSelectedCategoryFilter('all');
    }
  };

  const handleChangeFavoriteCategory = (favId: string, newCat: string) => {
    saveFavorites(mediaFavorites.map(f => f.id === favId ? { ...f, category: newCat } : f));
  };

  const removeFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    saveFavorites(mediaFavorites.filter(f => f.id !== id));
  };

  const handleTriggerFavorite = (fav: typeof mediaFavorites[0]) => {
    if (fav.source === 'youtube') {
      const embedUrl = getYouTubeEmbedUrl(fav.url, true, isLoop, isMuted);
      setSelectedMediaType(fav.type);
      setSelectedSource('youtube');
      setYoutubeInput(fav.url);
      setMediaTitleInput(fav.title);
      onProjectMedia({
        isActive: true,
        type: fav.type,
        source: 'youtube',
        url: embedUrl || fav.url,
        title: fav.title,
        isLoop,
        isMuted: fav.type === 'video' ? isMuted : false
      });
      return;
    }

    if (fav.source === 'url') {
      setSelectedMediaType(fav.type);
      setSelectedSource('url');
      setUrlInput(fav.url);
      setMediaTitleInput(fav.title);
      onProjectMedia({
        isActive: true,
        type: fav.type,
        source: 'url',
        url: fav.url,
        title: fav.title,
        isLoop,
        isMuted: fav.type === 'video' ? isMuted : false
      });
    }
  };

  // Favoris affichés selon le filtre de dossier
  const displayedFavorites = useMemo(() => {
    if (selectedCategoryFilter === 'all') return mediaFavorites;
    return mediaFavorites.filter(f => f.category === selectedCategoryFilter);
  }, [mediaFavorites, selectedCategoryFilter]);

  // Déclencher la projection YouTube
  const handleProjectYouTube = () => {
    const videoId = extractYouTubeVideoId(youtubeInput);
    if (!videoId) return;

    const embedUrl = getYouTubeEmbedUrl(youtubeInput, true, isLoop, isMuted);
    if (!embedUrl) return;

    const title = mediaTitleInput.trim() || `Vidéo YouTube (${videoId})`;
    onProjectMedia({
      isActive: true,
      type: selectedMediaType === 'audio' ? 'audio' : 'video',
      source: 'youtube',
      url: embedUrl,
      title,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      isLoop,
      isMuted
    });
  };

  // Déclencher la projection via URL directe
  const handleProjectUrl = () => {
    if (!urlInput.trim()) return;
    const title = mediaTitleInput.trim() || `Média (${urlInput.substring(urlInput.lastIndexOf('/') + 1)})`;

    onProjectMedia({
      isActive: true,
      type: selectedMediaType,
      source: 'url',
      url: urlInput.trim(),
      title,
      isLoop,
      isMuted
    });
  };

  // Déclencher la projection d'un fichier local de l'ordinateur
  const handleProjectLocalFile = () => {
    if (!localFileMedia) return;
    const title = mediaTitleInput.trim() || localFileMedia.name;

    onProjectMedia({
      isActive: true,
      type: selectedMediaType,
      source: 'local',
      url: localFileMedia.url,
      title,
      isLoop,
      isMuted
    });
  };

  return (
    <div className={className ? `flex flex-col gap-4 text-gray-200 ${className}` : "bg-[#121215] border border-[#222226] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col gap-4 text-gray-200"}>

      {/* 1. Bandeau de statut en direct si un média est actif */}
      {activeMedia?.isActive ? (
        <div className="p-3.5 sm:p-4 rounded-xl bg-purple-950/40 border border-purple-500/50 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
              {activeMedia.type === 'video' ? (
                <Video className="w-5 h-5 animate-pulse" />
              ) : activeMedia.type === 'image' ? (
                <ImageIcon className="w-5 h-5" />
              ) : (
                <Music className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 animate-pulse">
                  Média en direct
                </span>
                <span className="text-[11px] font-mono text-gray-400 uppercase">
                  {activeMedia.type} • {activeMedia.source}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
                {activeMedia.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onStopMedia}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-900/30 ring-1 ring-amber-400/40 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Arrêter la diffusion</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-[#16161D] border border-[#262633] flex items-center justify-between gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-2.5">
            <MonitorPlay className="w-4 h-4 text-purple-400" />
            <span>Sélectionnez ou téléversez un média pour le projeter instantanément sur le grand écran.</span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-mono text-gray-500">Vidéo • Image • Audio</span>
        </div>
      )}

      {/* 2. Sélecteur du Type de média (Vidéo | Image | Audio) */}
      <div className="flex items-center justify-between border-b border-[#202028] pb-3.5 gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-[#16161C] border border-[#262633] rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedMediaType('video')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedMediaType === 'video'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40 ring-1 ring-purple-400/40'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#202028]'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Vidéo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMediaType('image');
              if (selectedSource === 'youtube') setSelectedSource('url');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedMediaType === 'image'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40 ring-1 ring-purple-400/40'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#202028]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMediaType('audio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedMediaType === 'audio'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40 ring-1 ring-purple-400/40'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#202028]'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Audio</span>
          </button>
        </div>

        {/* Options de lecture pour la projection (Boucle / Muet) */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setIsLoop(l => !l)}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
              isLoop
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                : 'bg-[#181820] border-[#2A2A38] text-gray-400 hover:text-gray-200'
            }`}
            title="Répéter en boucle sur l'écran externe"
          >
            <Repeat className="w-3 h-3" />
            <span className="hidden sm:inline">Boucle</span>
          </button>

          {selectedMediaType === 'video' && (
            <button
              type="button"
              onClick={() => setIsMuted(m => !m)}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                isMuted
                  ? 'bg-amber-600/20 border-amber-500/40 text-amber-300'
                  : 'bg-[#181820] border-[#2A2A38] text-gray-400 hover:text-gray-200'
              }`}
              title="Couper le son de la vidéo"
            >
              {isMuted ? <VolumeX className="w-3 h-3 text-amber-400" /> : <Volume2 className="w-3 h-3" />}
              <span className="hidden sm:inline">{isMuted ? 'Muet' : 'Son actif'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Sélecteur de Source (YouTube, URL, Ordinateur) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
        {/* Source YouTube (pour Vidéo et Audio) */}
        {(selectedMediaType === 'video' || selectedMediaType === 'audio') && (
          <button
            type="button"
            onClick={() => setSelectedSource('youtube')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedSource === 'youtube'
                ? 'bg-red-600/25 border-red-400 text-white ring-1 ring-red-500/40 shadow-xs'
                : 'bg-[#181820] border-[#292936] text-gray-300 hover:bg-[#20202A] hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-red-400" />
            <span>YouTube</span>
          </button>
        )}

        {/* Source URL d'un fichier */}
        <button
          type="button"
          onClick={() => setSelectedSource('url')}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            selectedSource === 'url'
              ? 'bg-blue-600/25 border-blue-400 text-white ring-1 ring-blue-500/40 shadow-xs'
              : 'bg-[#181820] border-[#292936] text-gray-300 hover:bg-[#20202A] hover:text-white'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
          <span>URL d'un fichier</span>
        </button>

        {/* Source Ordinateur (Fichier local) */}
        <button
          type="button"
          onClick={() => setSelectedSource('local')}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            selectedSource === 'local'
              ? 'bg-emerald-600/25 border-emerald-400 text-white ring-1 ring-emerald-500/40 shadow-xs'
              : 'bg-[#181820] border-[#292936] text-gray-300 hover:bg-[#20202A] hover:text-white'
          }`}
        >
          <Folder className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ordinateur (Fichier local)</span>
        </button>
      </div>

      {/* Système de Dossiers & Favoris Média (Backgrounds, Tutos, Backing tracks, etc.) */}
      <div className="p-3 rounded-2xl bg-[#14141E] border border-[#242436] space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Onglets Dossiers / Catégories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar text-xs">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1 shrink-0 mr-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              Dossiers :
            </span>

            {/* Tous */}
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 flex items-center gap-1.5 ${
                selectedCategoryFilter === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'bg-[#191924] text-gray-400 hover:text-white border border-[#272736]'
              }`}
            >
              <span>Tous</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-gray-300 font-mono">
                {mediaFavorites.length}
              </span>
            </button>

            {/* Catégories / Dossiers */}
            {categories.map((cat) => {
              const count = mediaFavorites.filter(f => f.category === cat).length;
              const isSelected = selectedCategoryFilter === cat;
              return (
                <div key={cat} className="relative group shrink-0 flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter(cat);
                      setTargetCategoryForAdd(cat);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50 shadow-xs'
                        : 'bg-[#191924] text-gray-300 hover:text-white border border-[#272736]'
                    }`}
                  >
                    <FolderOpen className="w-3 h-3 text-amber-400" />
                    <span>{cat}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-gray-300 font-mono">
                      {count}
                    </span>
                  </button>

                  {!['Backgrounds', 'Tutos', 'Backing tracks'].includes(cat) && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCategory(cat, e)}
                      className="ml-0.5 p-1 text-gray-500 hover:text-red-400 opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title={`Supprimer le dossier "${cat}"`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Formulaire ajout nouveau dossier */}
            {isCreatingCategory ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddCategory();
                }}
                className="flex items-center gap-1 shrink-0"
              >
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nouveau dossier..."
                  className="px-2 py-1 text-xs bg-[#191924] border border-amber-500/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none w-32"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2 py-1 text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg cursor-pointer"
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingCategory(false);
                    setNewCategoryName('');
                  }}
                  className="p-1 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreatingCategory(true)}
                className="px-2 py-1 rounded-lg text-xs font-medium text-gray-400 hover:text-amber-300 bg-[#191924]/60 hover:bg-[#191924] border border-dashed border-[#333346] cursor-pointer flex items-center gap-1 shrink-0"
                title="Créer un nouveau dossier ou catégorie"
              >
                <FolderPlus className="w-3 h-3 text-amber-400" />
                <span>+ Dossier</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-gray-500 hidden md:inline">
              {displayedFavorites.length} favori(s) • Cliquez pour projeter
            </span>
          </div>
        </div>

        {/* Liste des favoris du dossier sélectionné */}
        {displayedFavorites.length === 0 ? (
          <div className="p-3 rounded-xl bg-[#101016] border border-[#20202C] text-center">
            <p className="text-[11px] text-gray-500 italic">
              Aucun favori dans le dossier {selectedCategoryFilter === 'all' ? 'actuel' : `"${selectedCategoryFilter}"`}. Utilisez le bouton « + Favori » sur un lien YouTube ou une URL pour l'enregistrer ici.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs custom-scrollbar">
            {displayedFavorites.map((fav) => {
              const isUrlActive = Boolean(fav.url && activeMedia?.isActive && activeMedia.url === fav.url);

              return (
                <div
                  key={fav.id}
                  className={`group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-xl border transition-all shrink-0 ${
                    isUrlActive
                      ? 'bg-amber-400/20 border-amber-400 text-amber-200 shadow-xs'
                      : 'bg-[#181824] border-[#29293C] text-gray-300 hover:text-white hover:border-amber-400/40 hover:bg-[#1E1E2C]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleTriggerFavorite(fav)}
                    className="flex items-center gap-1.5 cursor-pointer font-medium text-left"
                    title={`Projeter "${fav.title}" (${fav.category})`}
                  >
                    {fav.type === 'video' ? (
                      <Video className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    ) : fav.type === 'audio' ? (
                      <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                    <span className="text-[11px] max-w-[130px] truncate">{fav.title}</span>
                  </button>

                  {/* Sélecteur de dossier/catégorie pour déplacer facilement */}
                  <select
                    value={fav.category}
                    onChange={(e) => handleChangeFavoriteCategory(fav.id, e.target.value)}
                    className="text-[9px] bg-[#12121A] text-amber-300/80 hover:text-amber-300 border border-[#2D2D3E] rounded px-1 py-0.5 cursor-pointer focus:outline-none"
                    title="Déplacer vers un autre dossier"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} className="bg-[#161622] text-white">
                        {c}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={(e) => removeFavorite(fav.id, e)}
                    className="p-0.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/40 cursor-pointer transition-colors"
                    title="Retirer ce favori"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Panneau de contenu selon la source sélectionnée */}

      {/* A. Source : YouTube (Vidéo ou Audio) */}
      {selectedSource === 'youtube' && (
        <div className="space-y-3.5 p-4 rounded-xl bg-[#16161D] border border-[#272736] animate-in fade-in duration-100">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-red-500 shrink-0" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Projeter une vidéo ou musique YouTube
            </h4>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-gray-300 block">
              Lien ou ID de la vidéo YouTube :
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                placeholder="Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ ou https://youtu.be/..."
                className="flex-1 bg-[#1A1A24] border border-[#2F2F40] rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-400 block">
              Titre personnalisé (facultatif) :
            </label>
            <input
              type="text"
              value={mediaTitleInput}
              onChange={(e) => setMediaTitleInput(e.target.value)}
              placeholder="Ex: Moment d'adoration & louange"
              className="w-full bg-[#1A1A24] border border-[#2F2F40] rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          {/* Prévisualisation YouTube */}
          {extractYouTubeVideoId(youtubeInput) && (
            <div className="space-y-2 pt-2 border-t border-[#262635]">
              <span className="text-[11px] font-semibold text-gray-400 block">Aperçu YouTube :</span>
              <div className="aspect-video w-full max-w-md rounded-xl overflow-hidden border border-[#333346] bg-black">
                <iframe
                  src={getYouTubeEmbedUrl(youtubeInput, false, isLoop, isMuted) || ''}
                  title="Aperçu YouTube"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            {extractYouTubeVideoId(youtubeInput) && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const title = mediaTitleInput.trim() || 'Vidéo YouTube';
                    const targetCat = targetCategoryForAdd || 'Tutos';
                    const newFav = {
                      id: `fav-${Date.now()}`,
                      title,
                      url: youtubeInput.trim(),
                      type: (selectedMediaType === 'audio' ? 'audio' : 'video') as MediaType,
                      source: 'youtube' as MediaSourceType,
                      category: targetCat,
                      createdAt: Date.now()
                    };
                    saveFavorites([newFav, ...mediaFavorites]);
                  }}
                  className="px-3 py-2 rounded-xl bg-[#1D1D2B] hover:bg-[#252538] border border-[#333348] text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Enregistrer ce lien YouTube dans vos favoris"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>+ Favori ({targetCategoryForAdd || 'Tutos'})</span>
                </button>
                <select
                  value={targetCategoryForAdd}
                  onChange={(e) => setTargetCategoryForAdd(e.target.value)}
                  className="bg-[#1A1A26] border border-[#333348] text-amber-300 text-[11px] rounded-xl px-2 py-2 cursor-pointer focus:outline-none"
                  title="Choisir le dossier"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-[#161622] text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleProjectYouTube}
              disabled={!extractYouTubeVideoId(youtubeInput)}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold transition-all shadow-lg shadow-red-900/30 flex items-center gap-2 cursor-pointer ml-auto"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Projeter la vidéo YouTube sur l'écran</span>
            </button>
          </div>
        </div>
      )}

      {/* B. Source : URL directe d'un fichier */}
      {selectedSource === 'url' && (
        <div className="space-y-3.5 p-4 rounded-xl bg-[#16161D] border border-[#272736] animate-in fade-in duration-100">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-blue-400 shrink-0" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Projeter depuis l'URL d'un fichier en ligne
            </h4>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-gray-300 block">
              URL directe du fichier ({selectedMediaType === 'video' ? 'MP4, WebM' : selectedMediaType === 'image' ? 'JPG, PNG, WebP' : 'MP3, WAV, AAC'}) :
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={
                selectedMediaType === 'video'
                  ? 'https://mon-serveur.com/video-louange.mp4'
                  : selectedMediaType === 'image'
                  ? 'https://mon-serveur.com/arriere-plan.jpg'
                  : 'https://mon-serveur.com/musique-fond.mp3'
              }
              className="w-full bg-[#1A1A24] border border-[#2F2F40] rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-400 block">
              Titre du média affiché :
            </label>
            <input
              type="text"
              value={mediaTitleInput}
              onChange={(e) => setMediaTitleInput(e.target.value)}
              placeholder="Ex: Arrière-plan cinématique ou cantique"
              className="w-full bg-[#1A1A24] border border-[#2F2F40] rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Prévisualisation de l'URL */}
          {urlInput.trim() && (
            <div className="pt-2 border-t border-[#262635] space-y-1.5">
              <span className="text-[11px] font-semibold text-gray-400 block">Aperçu direct :</span>
              <div className="max-w-md rounded-xl overflow-hidden border border-[#333346] bg-black/60 p-2 flex items-center justify-center">
                {selectedMediaType === 'video' ? (
                  <video src={urlInput} controls className="max-h-48 w-full object-contain rounded-lg" />
                ) : selectedMediaType === 'image' ? (
                  <img src={urlInput} alt="Aperçu" className="max-h-48 w-full object-contain rounded-lg" />
                ) : (
                  <audio src={urlInput} controls className="w-full" />
                )}
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            {urlInput.trim() && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const title = mediaTitleInput.trim() || 'Fichier en ligne';
                    const targetCat = targetCategoryForAdd || (selectedMediaType === 'audio' ? 'Backing tracks' : 'Backgrounds');
                    const newFav = {
                      id: `fav-${Date.now()}`,
                      title,
                      url: urlInput.trim(),
                      type: selectedMediaType,
                      source: 'url' as MediaSourceType,
                      category: targetCat,
                      createdAt: Date.now()
                    };
                    saveFavorites([newFav, ...mediaFavorites]);
                  }}
                  className="px-3 py-2 rounded-xl bg-[#1D1D2B] hover:bg-[#252538] border border-[#333348] text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Enregistrer ce fichier dans vos favoris"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>+ Favori ({targetCategoryForAdd || (selectedMediaType === 'audio' ? 'Backing tracks' : 'Backgrounds')})</span>
                </button>
                <select
                  value={targetCategoryForAdd}
                  onChange={(e) => setTargetCategoryForAdd(e.target.value)}
                  className="bg-[#1A1A26] border border-[#333348] text-amber-300 text-[11px] rounded-xl px-2 py-2 cursor-pointer focus:outline-none"
                  title="Choisir le dossier"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-[#161622] text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleProjectUrl}
              disabled={!urlInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2 cursor-pointer ml-auto"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Projeter ce fichier sur l'écran</span>
            </button>
          </div>
        </div>
      )}

      {/* C. Source : Ordinateur (Fichier local) */}
      {selectedSource === 'local' && (
        <div className="space-y-3.5 p-4 rounded-xl bg-[#16161D] border border-[#272736] animate-in fade-in duration-100">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Sélectionner un fichier sur votre ordinateur
            </h4>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={
              selectedMediaType === 'video'
                ? 'video/mp4,video/webm,video/ogg,video/quicktime'
                : selectedMediaType === 'image'
                ? 'image/jpeg,image/png,image/webp,image/svg+xml,image/gif'
                : 'audio/mp3,audio/wav,audio/aac,audio/ogg,audio/m4a'
            }
            onChange={handleLocalFileChange}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#343445] hover:border-emerald-500/70 bg-[#181822] hover:bg-[#1C1C28] p-6 rounded-2xl flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all text-center group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-200">
                {localFileMedia ? localFileMedia.name : "Cliquez pour choisir un fichier sur l'ordinateur"}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {selectedMediaType === 'video'
                  ? 'Fichiers acceptés : MP4, WebM, MOV'
                  : selectedMediaType === 'image'
                  ? 'Fichiers acceptés : JPG, PNG, WebP, SVG'
                  : 'Fichiers acceptés : MP3, WAV, AAC, M4A'}
              </p>
            </div>
          </div>

          {localFileMedia && (
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-400 block">
                  Titre du média affiché :
                </label>
                <input
                  type="text"
                  value={mediaTitleInput}
                  onChange={(e) => setMediaTitleInput(e.target.value)}
                  className="w-full bg-[#1A1A24] border border-[#2F2F40] rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Aperçu local */}
              <div className="max-w-md rounded-xl overflow-hidden border border-[#333346] bg-black/60 p-2 flex items-center justify-center">
                {selectedMediaType === 'video' ? (
                  <video src={localFileMedia.url} controls className="max-h-48 w-full object-contain rounded-lg" />
                ) : selectedMediaType === 'image' ? (
                  <img src={localFileMedia.url} alt="Aperçu local" className="max-h-48 w-full object-contain rounded-lg" />
                ) : (
                  <audio src={localFileMedia.url} controls className="w-full" />
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleProjectLocalFile}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Projeter ce fichier sur l'écran</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Note d'information */}
      <div className="flex items-center gap-2 text-[11px] text-gray-500 pt-1 border-t border-[#1C1C22]">
        <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        <span>Le média projeté prend la priorité sur l'écran externe tout en laissant le pupitre et les paroles disponibles pour la suite du culte.</span>
      </div>
    </div>
  );
};
