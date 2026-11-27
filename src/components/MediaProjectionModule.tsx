import React, { useState, useRef, useMemo, useEffect, useImperativeHandle } from 'react';
import {
  Video,
  Image as ImageIcon,
  Music,
  Upload,
  Link as LinkIcon,
  Square,
  Volume2,
  VolumeX,
  Repeat,
  Globe,
  Folder,
  MonitorPlay,
  Star,
  X,
  FolderPlus,
  FolderOpen,
  Search
} from 'lucide-react';
import {
  MediaType,
  MediaSourceType,
  MediaPresentationState,
  getYouTubeEmbedUrl,
  extractYouTubeVideoId,
  inferMediaTypeFromUrl
} from '../utils/presentationUtils';

export interface MediaProjectionHandle {
  projectCurrent: () => Promise<void>;
}

interface MediaProjectionModuleProps {
  activeMedia: MediaPresentationState | null;
  onProjectMedia: (media: MediaPresentationState) => void;
  onStopMedia: () => void;
  onCanProjectChange?: (canProject: boolean) => void;
  className?: string;
}

interface MediaFavoriteItem {
  id: string;
  title: string;
  url: string;
  type: MediaType;
  source: MediaSourceType;
  category: string;
  thumbnail?: string;
  author?: string;
  createdAt: number;
}

const DEFAULT_CATEGORIES = ['Backgrounds', 'Tutos', 'Backing tracks'];

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  video: 'Vidéo',
  image: 'Image',
  audio: 'Audio'
};

const SOURCE_LABELS: Record<MediaSourceType, string> = {
  youtube: 'YouTube',
  url: 'URL directe',
  local: 'Fichier local'
};

const renderTypeIcon = (type: MediaType, className = 'w-3.5 h-3.5') => {
  if (type === 'image') return <ImageIcon className={`${className} text-blue-600 dark:text-blue-400 shrink-0`} />;
  if (type === 'audio') return <Music className={`${className} text-emerald-600 dark:text-emerald-400 shrink-0`} />;
  return <Video className={`${className} text-purple-600 dark:text-purple-400 shrink-0`} />;
};

export const MediaProjectionModule = React.forwardRef<MediaProjectionHandle, MediaProjectionModuleProps>(({
  activeMedia,
  onProjectMedia,
  onStopMedia,
  onCanProjectChange,
  className
}, ref) => {
  // Source active pour l'aperçu et la projection (détectée automatiquement selon la saisie)
  const [selectedSource, setSelectedSource] = useState<MediaSourceType>('youtube');

  // Champs de saisie
  const [youtubeInput, setYoutubeInput] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [isLoop, setIsLoop] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Surcharges manuelles ponctuelles (YouTube Audio vs Vidéo, ou URL sans extension)
  const [youtubeMode, setYoutubeMode] = useState<'video' | 'audio'>('video');
  const [urlTypeOverride, setUrlTypeOverride] = useState<'auto' | MediaType>('auto');
  const [previewLoadError, setPreviewLoadError] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Fichier local chargé
  const [localFileMedia, setLocalFileMedia] = useState<{
    file: File;
    url: string;
    remoteUrl?: string;
    isUploading?: boolean;
    type: MediaType;
    name: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const localUploadPromiseRef = useRef<Promise<string> | null>(null);

  // Nettoyage de l'ObjectURL précédent
  useEffect(() => {
    const currentUrl = localFileMedia?.url;
    return () => {
      if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [localFileMedia?.url]);

  // Réinitialisation d'erreur d'aperçu dès que la source ou l'URL change
  useEffect(() => {
    setPreviewLoadError(false);
  }, [selectedSource, urlInput, youtubeInput, localFileMedia?.url, urlTypeOverride]);

  // Auto-détection du type de média selon la source active
  const urlDetection = useMemo(() => inferMediaTypeFromUrl(urlInput), [urlInput]);
  const youtubeVideoId = useMemo(() => extractYouTubeVideoId(youtubeInput), [youtubeInput]);
  const youtubeTitleCacheRef = useRef<Record<string, string>>({});
  const youtubeTitlePromisesRef = useRef<Map<string, Promise<string>>>(new Map());

  const resolveYouTubeTitle = (videoId: string): Promise<string> => {
    const cached = youtubeTitleCacheRef.current[videoId];
    if (cached) return Promise.resolve(cached);

    const pending = youtubeTitlePromisesRef.current.get(videoId);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const res = await fetch(`/api/youtube-title?videoId=${encodeURIComponent(videoId)}`);
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.title === 'string' && data.title.trim()) {
            const clean = data.title.trim();
            youtubeTitleCacheRef.current[videoId] = clean;
            return clean;
          }
        }
      } catch {}

      try {
        const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`);
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          if (typeof data?.title === 'string' && data.title.trim()) {
            const clean = data.title.trim();
            youtubeTitleCacheRef.current[videoId] = clean;
            return clean;
          }
        }
      } catch {}

      return `Vidéo YouTube (${videoId})`;
    })().finally(() => {
      youtubeTitlePromisesRef.current.delete(videoId);
    });

    youtubeTitlePromisesRef.current.set(videoId, promise);
    return promise;
  };

  useEffect(() => {
    if (youtubeVideoId) {
      resolveYouTubeTitle(youtubeVideoId);
    }
  }, [youtubeVideoId]);

  const effectiveMediaType: MediaType = useMemo(() => {
    if (selectedSource === 'youtube') {
      return youtubeMode;
    }
    if (selectedSource === 'local') {
      return localFileMedia?.type || 'video';
    }
    return urlTypeOverride === 'auto' ? urlDetection.type : urlTypeOverride;
  }, [selectedSource, youtubeMode, localFileMedia?.type, urlTypeOverride, urlDetection.type]);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read failed')));
      reader.onerror = () => reject(reader.error || new Error('read failed'));
      reader.readAsDataURL(file);
    });

  const uploadLocalMediaForProjection = async (file: File, detectedType: MediaType, fallbackUrl: string): Promise<string> => {
    try {
      const res = await fetch('/api/presentation-media', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          return data.url;
        }
      }
    } catch {}

    // Fallback cross-fenêtre pour images si le serveur est inaccessible
    if (detectedType === 'image' && file.size <= 4 * 1024 * 1024) {
      try {
        return await readFileAsDataUrl(file);
      } catch {}
    }
    return fallbackUrl;
  };

  // Chargement d'un fichier local (clic ou glisser-déposer)
  const loadLocalFile = (file: File | undefined) => {
    if (!file) return;
    let detectedType: MediaType = 'image';
    if (file.type.startsWith('video/')) detectedType = 'video';
    else if (file.type.startsWith('audio/')) detectedType = 'audio';
    else if (file.type.startsWith('image/')) detectedType = 'image';
    else {
      detectedType = inferMediaTypeFromUrl(file.name).type;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedSource('local');
    setLocalFileMedia({
      file,
      url: objectUrl,
      isUploading: true,
      type: detectedType,
      name: file.name
    });

    const uploadPromise = uploadLocalMediaForProjection(file, detectedType, objectUrl).then((resolvedUrl) => {
      setLocalFileMedia((prev) =>
        prev && prev.url === objectUrl
          ? { ...prev, remoteUrl: resolvedUrl, isUploading: false }
          : prev
      );
      return resolvedUrl;
    });
    localUploadPromiseRef.current = uploadPromise;
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    loadLocalFile(e.target.files?.[0]);
    e.target.value = '';
  };

  // Système de dossiers & favoris (bibliothèque en bas)
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
  const [favoritesSearch, setFavoritesSearch] = useState<string>('');

  const [mediaFavorites, setMediaFavorites] = useState<MediaFavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem('melobook_media_search_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter(
              (item: any) =>
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
              category:
                item.category ||
                (item.mediaType === 'audio' || item.type === 'audio' ? 'Backing tracks' : 'Backgrounds'),
              thumbnail: item.thumbnail,
              author: item.author,
              createdAt: item.createdAt || Date.now()
            }));
        }
      }
    } catch {}
    return [];
  });

  const saveFavorites = (favs: MediaFavoriteItem[]) => {
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
    saveFavorites(mediaFavorites.map(f => (f.category === catToDelete ? { ...f, category: fallback } : f)));
    if (selectedCategoryFilter === catToDelete) {
      setSelectedCategoryFilter('all');
    }
    if (targetCategoryForAdd === catToDelete) {
      setTargetCategoryForAdd(fallback);
    }
  };

  const handleChangeFavoriteCategory = (favId: string, newCat: string) => {
    saveFavorites(mediaFavorites.map(f => (f.id === favId ? { ...f, category: newCat } : f)));
  };

  const removeFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    saveFavorites(mediaFavorites.filter(f => f.id !== id));
  };

  const handleTriggerFavorite = async (fav: MediaFavoriteItem) => {
    if (fav.source === 'youtube') {
      const mode: 'video' | 'audio' = fav.type === 'audio' ? 'audio' : 'video';
      const embedUrl = getYouTubeEmbedUrl(fav.url, true, isLoop, isMuted);
      setSelectedSource('youtube');
      setYoutubeMode(mode);
      setYoutubeInput(fav.url);
      let resolvedTitle = fav.title;
      const favVid = extractYouTubeVideoId(fav.url);
      if (favVid && /^Vidéo YouTube \(/.test(resolvedTitle)) {
        resolvedTitle = await resolveYouTubeTitle(favVid);
      }
      onProjectMedia({
        isActive: true,
        type: mode,
        source: 'youtube',
        url: embedUrl || fav.url,
        title: resolvedTitle,
        isLoop,
        isMuted: mode === 'video' ? isMuted : false
      });
      return;
    }

    if (fav.source === 'url') {
      setSelectedSource('url');
      setUrlTypeOverride(fav.type);
      setUrlInput(fav.url);
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

  const displayedFavorites = useMemo(() => {
    const byFolder =
      selectedCategoryFilter === 'all'
        ? mediaFavorites
        : mediaFavorites.filter(f => f.category === selectedCategoryFilter);
    const q = favoritesSearch.trim().toLowerCase();
    if (!q) return byFolder;
    return byFolder.filter(
      f => f.title.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
    );
  }, [mediaFavorites, selectedCategoryFilter, favoritesSearch]);

  // Projection selon la source active
  const canProject = useMemo(() => {
    if (selectedSource === 'youtube') return Boolean(youtubeVideoId);
    if (selectedSource === 'url') return Boolean(urlInput.trim());
    return Boolean(localFileMedia);
  }, [selectedSource, youtubeVideoId, urlInput, localFileMedia]);

  const handleProjectCurrent = async () => {
    if (selectedSource === 'youtube') {
      if (!youtubeVideoId) return;
      const embedUrl = getYouTubeEmbedUrl(youtubeInput, true, isLoop, isMuted);
      if (!embedUrl) return;
      const resolvedTitle = await resolveYouTubeTitle(youtubeVideoId);
      onProjectMedia({
        isActive: true,
        type: youtubeMode,
        source: 'youtube',
        url: embedUrl,
        title: resolvedTitle,
        thumbnail: `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`,
        isLoop,
        isMuted: youtubeMode === 'video' ? isMuted : false
      });
      return;
    }

    if (selectedSource === 'url') {
      const trimmedUrl = urlInput.trim();
      if (!trimmedUrl) return;
      const fallbackName = trimmedUrl.split(/[?#]/)[0].split('/').pop() || 'Média en ligne';
      onProjectMedia({
        isActive: true,
        type: effectiveMediaType,
        source: 'url',
        url: trimmedUrl,
        title: fallbackName,
        isLoop,
        isMuted: effectiveMediaType === 'video' ? isMuted : false
      });
      return;
    }

    if (selectedSource === 'local' && localFileMedia) {
      let projectionUrl = localFileMedia.remoteUrl;
      if (!projectionUrl && localUploadPromiseRef.current) {
        projectionUrl = await localUploadPromiseRef.current;
      }
      onProjectMedia({
        isActive: true,
        type: localFileMedia.type,
        source: 'local',
        url: projectionUrl || localFileMedia.url,
        title: localFileMedia.name.replace(/\.[^/.]+$/, '') || localFileMedia.name,
        isLoop,
        isMuted: localFileMedia.type === 'video' ? isMuted : false
      });
    }
  };

  useEffect(() => {
    onCanProjectChange?.(canProject);
  }, [canProject, onCanProjectChange]);

  useImperativeHandle(ref, () => ({
    projectCurrent: handleProjectCurrent
  }));

  const canSaveFavorite =
    (selectedSource === 'youtube' && Boolean(youtubeVideoId)) ||
    (selectedSource === 'url' && Boolean(urlInput.trim()));

  const handleSaveCurrentFavorite = async () => {
    if (!canSaveFavorite) return;
    const defaultCat =
      effectiveMediaType === 'audio'
        ? 'Backing tracks'
        : selectedSource === 'youtube'
        ? 'Tutos'
        : 'Backgrounds';
    const targetCat = categories.includes(targetCategoryForAdd) ? targetCategoryForAdd : defaultCat;
    const rawUrl = selectedSource === 'youtube' ? youtubeInput.trim() : urlInput.trim();
    const defaultTitle =
      selectedSource === 'youtube' && youtubeVideoId
        ? await resolveYouTubeTitle(youtubeVideoId)
        : rawUrl.split(/[?#]/)[0].split('/').pop() || 'Média en ligne';

    const newFav: MediaFavoriteItem = {
      id: `fav-${Date.now()}`,
      title: defaultTitle,
      url: rawUrl,
      type: effectiveMediaType,
      source: selectedSource,
      category: targetCat,
      createdAt: Date.now()
    };
    saveFavorites([newFav, ...mediaFavorites]);
  };

  const isFavoriteActive = (fav: MediaFavoriteItem): boolean => {
    if (!activeMedia?.isActive) return false;
    if (activeMedia.url === fav.url) return true;
    if (fav.source === 'youtube' && activeMedia.source === 'youtube') {
      const favVid = extractYouTubeVideoId(fav.url);
      const activeVid = extractYouTubeVideoId(activeMedia.url);
      return Boolean(favVid && activeVid && favVid === activeVid);
    }
    return false;
  };

  return (
    <div
      className={
        className
          ? `flex flex-col gap-4 text-slate-800 dark:text-gray-200 ${className}`
          : 'bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#222226] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col gap-4 text-slate-800 dark:text-gray-200'
      }
    >
      {/* 1. Bandeau compact de diffusion active */}
      {activeMedia?.isActive && (
        <div className="px-3.5 py-2.5 rounded-xl bg-[#EDF1F5] dark:bg-[#191524] border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-400/30 flex items-center justify-center shrink-0">
              {renderTypeIcon(activeMedia.type, 'w-4 h-4')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-purple-700 dark:text-purple-200/90">
                <span className="font-semibold text-purple-700 dark:text-purple-300">En direct</span>
                <span aria-hidden="true" className="text-gray-500">·</span>
                <span>{MEDIA_TYPE_LABELS[activeMedia.type]}</span>
                <span aria-hidden="true" className="text-gray-500">·</span>
                <span className="text-slate-600 dark:text-gray-400">{SOURCE_LABELS[activeMedia.source]}</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {activeMedia.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onStopMedia}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Arrêter la diffusion</span>
          </button>
        </div>
      )}

      {/* 2. Régie côte à côte : 3 sources visibles à gauche | Aperçu 16:9 à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Colonne gauche : YouTube, URL directe et Fichier local visibles ensemble */}
        <div className="lg:col-span-7 bg-slate-50 dark:bg-[#15151C] border border-slate-300 dark:border-[#242432] rounded-xl p-4 flex flex-col justify-between gap-3.5">
          <div className="space-y-2.5">
            {/* Lien YouTube */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                <span>Lien YouTube</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={youtubeInput}
                  onFocus={() => {
                    if (youtubeInput.trim() || (!urlInput.trim() && !localFileMedia)) {
                      setSelectedSource('youtube');
                    }
                  }}
                  onChange={(e) => {
                    const next = e.target.value;
                    setYoutubeInput(next);
                    if (next.trim()) {
                      setSelectedSource('youtube');
                    } else if (urlInput.trim()) {
                      setSelectedSource('url');
                    } else if (localFileMedia) {
                      setSelectedSource('local');
                    }
                  }}
                  className={`w-full bg-[#1A1A24] border rounded-lg pl-3 pr-8 py-2 text-xs text-white focus:outline-none transition-colors ${
                    selectedSource === 'youtube' && youtubeInput.trim()
                      ? 'border-red-500/70'
                      : 'border-slate-300 dark:border-[#2F2F40] focus:border-red-500'
                  }`}
                />
                {youtubeInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setYoutubeInput('');
                      if (urlInput.trim()) setSelectedSource('url');
                      else if (localFileMedia) setSelectedSource('local');
                    }}
                    aria-label="Effacer le lien YouTube"
                    className="absolute right-2 p-1 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* URL directe */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>URL directe (vidéo, image ou audio)</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="url"
                  value={urlInput}
                  onFocus={() => {
                    if (urlInput.trim()) setSelectedSource('url');
                  }}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (extractYouTubeVideoId(next)) {
                      setYoutubeInput(next);
                      setUrlInput('');
                      setSelectedSource('youtube');
                      return;
                    }
                    setUrlInput(next);
                    setUrlTypeOverride('auto');
                    if (next.trim()) {
                      setSelectedSource('url');
                    } else if (youtubeInput.trim()) {
                      setSelectedSource('youtube');
                    } else if (localFileMedia) {
                      setSelectedSource('local');
                    }
                  }}
                  className={`w-full bg-[#1A1A24] border rounded-lg pl-3 pr-8 py-2 text-xs text-white focus:outline-none transition-colors font-mono ${
                    selectedSource === 'url' && urlInput.trim()
                      ? 'border-blue-500/70'
                      : 'border-slate-300 dark:border-[#2F2F40] focus:border-blue-500'
                  }`}
                />
                {urlInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput('');
                      setUrlTypeOverride('auto');
                      if (youtubeInput.trim()) setSelectedSource('youtube');
                      else if (localFileMedia) setSelectedSource('local');
                    }}
                    aria-label="Effacer l'URL"
                    className="absolute right-2 p-1 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Fichier local */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Fichier local (vidéo, image ou audio)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,image/*,audio/*"
                onChange={handleLocalFileChange}
                className="hidden"
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  loadLocalFile(e.dataTransfer.files?.[0]);
                }}
                onClick={() => {
                  if (localFileMedia && selectedSource !== 'local') {
                    setSelectedSource('local');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className={`border border-dashed rounded-xl px-3.5 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                  isDraggingFile
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/25'
                    : selectedSource === 'local' && localFileMedia
                    ? 'border-emerald-500/70 bg-[#EDF1F5] dark:bg-[#18201E]'
                    : 'border-slate-300 dark:border-[#343446] hover:border-emerald-500/60 bg-[#EDF1F5] dark:bg-[#181822] hover:bg-slate-200/70 dark:hover:bg-[#1C1C28]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-gray-200 truncate">
                    {localFileMedia ? localFileMedia.name : 'Déposer un fichier'}
                  </p>
                </div>
                {localFileMedia && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalFileMedia(null);
                      if (youtubeInput.trim()) setSelectedSource('youtube');
                      else if (urlInput.trim()) setSelectedSource('url');
                    }}
                    aria-label="Retirer le fichier local"
                    className="p-1 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Ligne d'auto-détection du type + options de lecture */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-gray-400">
                {selectedSource === 'youtube' && youtubeVideoId && (
                  <div className="flex items-center gap-1 bg-[#EDF1F5] dark:bg-[#181822] border border-slate-300 dark:border-[#282838] rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setYoutubeMode('video')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                        youtubeMode === 'video' ? 'bg-purple-600 text-white' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Vidéo
                    </button>
                    <button
                      type="button"
                      onClick={() => setYoutubeMode('audio')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                        youtubeMode === 'audio' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Audio seul
                    </button>
                  </div>
                )}

                {selectedSource === 'url' && urlInput.trim() && (
                  <select
                    value={urlTypeOverride}
                    onChange={(e) => setUrlTypeOverride(e.target.value as 'auto' | MediaType)}
                    aria-label="Forcer le type de média pour cette URL"
                    className="bg-[#EDF1F5] dark:bg-[#181822] border border-slate-300 dark:border-[#2A2A3A] text-slate-700 dark:text-gray-300 text-[11px] rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:border-blue-500"
                  >
                    <option value="auto" className="bg-slate-50 dark:bg-[#161622] text-slate-900 dark:text-white">
                      Auto ({MEDIA_TYPE_LABELS[urlDetection.type]})
                    </option>
                    <option value="video" className="bg-slate-50 dark:bg-[#161622] text-slate-900 dark:text-white">Forcer : Vidéo</option>
                    <option value="image" className="bg-slate-50 dark:bg-[#161622] text-slate-900 dark:text-white">Forcer : Image</option>
                    <option value="audio" className="bg-slate-50 dark:bg-[#161622] text-slate-900 dark:text-white">Forcer : Audio</option>
                  </select>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsLoop(l => !l)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                    isLoop
                      ? 'bg-purple-600/20 border-purple-500/40 text-purple-700 dark:text-purple-200'
                      : 'bg-[#EDF1F5] dark:bg-[#181820] border-slate-300 dark:border-[#2A2A38] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
                  }`}
                  title="Répéter en boucle sur l'écran externe"
                >
                  <Repeat className="w-3 h-3" />
                  <span>Boucle</span>
                </button>

                {effectiveMediaType === 'video' && (
                  <button
                    type="button"
                    onClick={() => setIsMuted(m => !m)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                      isMuted
                        ? 'bg-amber-600/20 border-amber-500/40 text-amber-700 dark:text-amber-200'
                        : 'bg-[#EDF1F5] dark:bg-[#181820] border-slate-300 dark:border-[#2A2A38] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
                    }`}
                    title="Couper le son de la vidéo"
                  >
                    {isMuted ? <VolumeX className="w-3 h-3 text-amber-600 dark:text-amber-400" /> : <Volume2 className="w-3 h-3" />}
                    <span>{isMuted ? 'Muet' : 'Son'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Barre d'actions : Enregistrer en favori */}
          {canSaveFavorite && (
            <div className="pt-3 border-t border-slate-200 dark:border-[#222230] flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleSaveCurrentFavorite}
                className="px-3 py-2 rounded-lg bg-[#EDF1F5] dark:bg-[#1D1D2B] hover:bg-slate-200 dark:hover:bg-[#252538] border border-slate-300 dark:border-[#323246] text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                title="Enregistrer ce média dans le dossier choisi"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-600 dark:text-amber-400" />
                <span>+ Favori</span>
              </button>
              <select
                value={targetCategoryForAdd}
                onChange={(e) => setTargetCategoryForAdd(e.target.value)}
                aria-label="Dossier de destination du favori"
                className="bg-[#EDF1F5] dark:bg-[#1A1A26] border border-slate-300 dark:border-[#323246] text-amber-700 dark:text-amber-200 text-xs rounded-lg px-2 py-2 cursor-pointer focus:outline-none max-w-[140px] truncate"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-slate-50 dark:bg-[#161622] text-slate-900 dark:text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Colonne droite : Moniteur d'aperçu 16:9 */}
        <div className="lg:col-span-5 bg-white dark:bg-[#101016] border border-slate-300 dark:border-[#242432] rounded-xl overflow-hidden flex flex-col">
          <div className="px-3.5 py-2 border-b border-slate-200 dark:border-[#1E1E28] flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700 dark:text-gray-300">Aperçu</span>
            <span className="text-slate-600 dark:text-gray-400">
              {MEDIA_TYPE_LABELS[effectiveMediaType]} · {SOURCE_LABELS[selectedSource]}
            </span>
          </div>

          <div className="aspect-video w-full bg-black/75 flex items-center justify-center p-2 flex-1 min-h-[180px]">
            {selectedSource === 'youtube' && youtubeVideoId ? (
              <iframe
                src={getYouTubeEmbedUrl(youtubeInput, false, isLoop, isMuted) || ''}
                title="Aperçu YouTube"
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : selectedSource === 'url' && urlInput.trim() ? (
              previewLoadError ? (
                <div className="text-center px-4 space-y-1.5">
                  <MonitorPlay className="w-7 h-7 text-slate-500 dark:text-gray-600 mx-auto" />
                  <p className="text-xs text-slate-600 dark:text-gray-400">Aperçu indisponible pour ce lien</p>
                </div>
              ) : effectiveMediaType === 'video' ? (
                <video
                  src={urlInput}
                  controls
                  onError={() => setPreviewLoadError(true)}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : effectiveMediaType === 'image' ? (
                <img
                  src={urlInput}
                  alt="Aperçu du média"
                  referrerPolicy="no-referrer"
                  onError={() => setPreviewLoadError(true)}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="w-full px-3 space-y-2 text-center">
                  <Music className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <p className="text-xs text-slate-700 dark:text-gray-300 truncate">Piste audio</p>
                  <audio src={urlInput} controls className="w-full" />
                </div>
              )
            ) : selectedSource === 'local' && localFileMedia ? (
              localFileMedia.type === 'video' ? (
                <video src={localFileMedia.url} controls className="w-full h-full object-contain rounded-lg" />
              ) : localFileMedia.type === 'image' ? (
                <img
                  src={localFileMedia.url}
                  alt={localFileMedia.name}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="w-full px-3 space-y-2 text-center">
                  <Music className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <p className="text-xs text-slate-700 dark:text-gray-300 truncate">{localFileMedia.name}</p>
                  <audio src={localFileMedia.url} controls className="w-full" />
                </div>
              )
            ) : (
              <div className="text-center px-4 space-y-1.5">
                <MonitorPlay className="w-8 h-8 text-slate-500 dark:text-gray-600 mx-auto" />
                <p className="text-xs text-gray-500">
                  Saisissez un lien ou choisissez un fichier pour l'aperçu
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bibliothèque Dossiers & Favoris (placée en bas sous le panneau de projection) */}
      <div className="pt-4 border-t border-slate-200 dark:border-[#22222C] space-y-3">
        {/* En-tête de bibliothèque */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <Star className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-400 shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-white">Dossiers & Favoris</span>
            <span aria-hidden="true" className="text-slate-500 dark:text-gray-600">·</span>
            <span className="text-slate-600 dark:text-gray-400 tabular-nums font-mono text-[11px]">
              {mediaFavorites.length} enregistré{mediaFavorites.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {mediaFavorites.length > 4 && (
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={favoritesSearch}
                  onChange={(e) => setFavoritesSearch(e.target.value)}
                  placeholder="Filtrer les favoris..."
                  className="bg-[#EDF1F5] dark:bg-[#181820] border border-slate-300 dark:border-[#2A2A38] rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-amber-500/60 w-40 sm:w-48"
                />
              </div>
            )}

            {isCreatingCategory ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddCategory();
                }}
                className="flex items-center gap-1"
              >
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nom du dossier..."
                  className="px-2.5 py-1 text-xs bg-[#EDF1F5] dark:bg-[#181820] border border-amber-500/50 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none w-32"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingCategory(false);
                    setNewCategoryName('');
                  }}
                  aria-label="Annuler la création de dossier"
                  className="p-1 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreatingCategory(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-gray-300 hover:text-amber-800 dark:hover:text-amber-200 bg-[#EDF1F5] dark:bg-[#181820] hover:bg-slate-200/70 dark:hover:bg-[#20202C] border border-slate-300 dark:border-[#2C2C3C] cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Nouveau dossier</span>
              </button>
            )}
          </div>
        </div>

        {/* Barre des dossiers */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              selectedCategoryFilter === 'all'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-200 border border-amber-500/45'
                : 'bg-slate-50 dark:bg-[#16161E] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-[#252534]'
            }`}
          >
            <span>Tous</span>
            <span className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-gray-400">
              {mediaFavorites.length}
            </span>
          </button>

          {categories.map((cat) => {
            const count = mediaFavorites.filter(f => f.category === cat).length;
            const isSelected = selectedCategoryFilter === cat;
            const isDefault = DEFAULT_CATEGORIES.includes(cat);

            return (
              <div key={cat} className="inline-flex items-center group">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryFilter(cat);
                    setTargetCategoryForAdd(cat);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-200 border border-amber-500/45'
                      : 'bg-slate-50 dark:bg-[#16161E] text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-[#252534]'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{cat}</span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-gray-400">
                    {count}
                  </span>
                </button>

                {!isDefault && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCategory(cat, e)}
                    className="ml-0.5 p-1 text-gray-500 hover:text-red-800 dark:hover:text-red-400 opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title={`Supprimer le dossier « ${cat} »`}
                    aria-label={`Supprimer le dossier ${cat}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Grille des favoris du dossier actif */}
        {displayedFavorites.length === 0 ? (
          <div className="px-4 py-5 rounded-xl bg-slate-50 dark:bg-[#14141C] border border-slate-200 dark:border-[#222230] text-center">
            <p className="text-xs text-slate-600 dark:text-gray-400">
              Aucun favori dans {selectedCategoryFilter === 'all' ? 'la bibliothèque' : `« ${selectedCategoryFilter} »`}. Utilisez « + Favori » ci-dessus pour enregistrer un lien YouTube ou une URL.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
            {displayedFavorites.map((fav) => {
              const isActive = isFavoriteActive(fav);

              return (
                <div
                  key={fav.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-400/60 text-slate-900 dark:text-white'
                      : 'bg-slate-50 dark:bg-[#15151D] border-slate-300 dark:border-[#252534] hover:border-slate-400 dark:hover:border-[#36364A] hover:bg-slate-200/70 dark:hover:bg-[#191924] text-slate-800 dark:text-gray-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleTriggerFavorite(fav)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    title={`Projeter « ${fav.title} »`}
                  >
                    {renderTypeIcon(fav.type, 'w-4 h-4')}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{fav.title}</div>
                      <div className="text-[11px] text-slate-600 dark:text-gray-400 truncate">
                        {SOURCE_LABELS[fav.source]} · {MEDIA_TYPE_LABELS[fav.type]}
                        {isActive ? ' · En direct' : ''}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      value={fav.category}
                      onChange={(e) => handleChangeFavoriteCategory(fav.id, e.target.value)}
                      aria-label={`Déplacer ${fav.title} vers un dossier`}
                      className="text-[11px] bg-white dark:bg-[#111118] text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-[#2A2A3B] rounded-md px-1.5 py-1 cursor-pointer focus:outline-none max-w-[105px] truncate"
                      title="Déplacer vers un autre dossier"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c} className="bg-slate-50 dark:bg-[#161622] text-slate-900 dark:text-white">
                          {c}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={(e) => removeFavorite(fav.id, e)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-red-800 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                      title="Retirer ce favori"
                      aria-label={`Retirer ${fav.title}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
