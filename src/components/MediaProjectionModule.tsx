import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Film, 
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
  Check, 
  Search, 
  Sparkles, 
  Globe, 
  Folder, 
  MonitorPlay,
  Info,
  Layers,
  Loader2,
  RotateCcw,
  Key,
  SlidersHorizontal,
  Monitor,
  ExternalLink,
  Star,
  X,
  Bookmark,
  FolderPlus,
  FolderOpen,
  Tag,
  ChevronDown,
  Plus
} from 'lucide-react';
import { 
  MediaType, 
  MediaSourceType, 
  MediaPresentationState, 
  getYouTubeEmbedUrl, 
  extractYouTubeVideoId 
} from '../utils/presentationUtils';

// Bibliothèques de médias libres de droits intégrées (Pixabay / Unsplash / Pexels CDN)
export interface CuratedMediaItem {
  id: string;
  type: MediaType;
  source: MediaSourceType;
  title: string;
  category: string;
  url: string;
  thumbnail: string;
  author: string;
}

const CURATED_VIDEOS: CuratedMediaItem[] = [
  {
    id: 'vid-clouds',
    type: 'video',
    source: 'pixabay',
    title: 'Nuages dorés au coucher du soleil',
    category: 'Ciel & Gloire',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=600&auto=format&fit=crop&q=80',
    author: 'Mixkit / Pixabay'
  },
  {
    id: 'vid-particles',
    type: 'video',
    source: 'pixabay',
    title: 'Particules dorées scintillantes',
    category: 'Lumière & Abstrait',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-dust-particles-moving-slowly-in-the-air-42353-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    author: 'Mixkit / Pixabay'
  },
  {
    id: 'vid-water',
    type: 'video',
    source: 'pixabay',
    title: 'Vagues de l\'océan et reflets',
    category: 'Nature & Sérénité',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-sea-waves-approaching-the-shoreline-42995-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    author: 'Mixkit / Pixabay'
  },
  {
    id: 'vid-stars',
    type: 'video',
    source: 'pixabay',
    title: 'Ciel étoilé & Voie Lactée',
    category: 'Univers & Majesté',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-night-sky-with-stars-at-a-calm-lake-time-lapse-40292-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80',
    author: 'Mixkit / Pixabay'
  },
  {
    id: 'vid-rays',
    type: 'video',
    source: 'pixabay',
    title: 'Rayons de lumière à travers les arbres',
    category: 'Forêt & Espérance',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-sun-rays-in-the-middle-of-a-forest-42407-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80',
    author: 'Mixkit / Pixabay'
  }
];

const CURATED_IMAGES: CuratedMediaItem[] = [
  {
    id: 'img-cross-sunrise',
    type: 'image',
    source: 'unsplash',
    title: 'Croix illuminée à l\'aube',
    category: 'Foi & Célébration',
    url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=1920&auto=format&fit=crop&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=600&auto=format&fit=crop&q=80',
    author: 'Unsplash'
  },
  {
    id: 'img-worship-hands',
    type: 'image',
    source: 'unsplash',
    title: 'Mains levées dans la louange',
    category: 'Adoration & Louange',
    url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1920&auto=format&fit=crop&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=600&auto=format&fit=crop&q=80',
    author: 'Unsplash'
  },
  {
    id: 'img-mountains-clouds',
    type: 'image',
    source: 'unsplash',
    title: 'Pics montagneux au-dessus des nuages',
    category: 'Nature & Majesté',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&auto=format&fit=crop&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
    author: 'Unsplash'
  },
  {
    id: 'img-bible-light',
    type: 'image',
    source: 'pixabay',
    title: 'Sainte Bible baignée de lumière',
    category: 'Parole & Méditation',
    url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=1920&auto=format&fit=crop&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&auto=format&fit=crop&q=80',
    author: 'Pixabay'
  },
  {
    id: 'img-calm-lake',
    type: 'image',
    source: 'unsplash',
    title: 'Lac paisible au coucher du soleil',
    category: 'Paix & Sérénité',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&auto=format&fit=crop&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    author: 'Unsplash'
  },
  {
    id: 'img-gold-light',
    type: 'image',
    source: 'pixabay',
    title: 'Arrière-plan doré cinématique',
    category: 'Lumière & Abstrait',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1920&auto=format&fit=crop&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    author: 'Pixabay'
  }
];

const CURATED_AUDIOS: CuratedMediaItem[] = [
  {
    id: 'aud-pads-c',
    type: 'audio',
    source: 'url',
    title: 'Worship Ambient Pad (Do / C Major)',
    category: 'Atmosphère & Prière',
    url: 'https://assets.mixkit.co/music/preview/mixkit-gentle-meditation-109.mp3',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    author: 'Mixkit Audio'
  },
  {
    id: 'aud-piano-worship',
    type: 'audio',
    source: 'url',
    title: 'Piano Doux de Méditation & Louange',
    category: 'Piano Solennel',
    url: 'https://assets.mixkit.co/music/preview/mixkit-piano-reflections-22.mp3',
    thumbnail: 'https://images.unsplash.com/photo-1520523839898-507125cd53c1?w=600&auto=format&fit=crop&q=80',
    author: 'Mixkit Audio'
  },
  {
    id: 'aud-acoustic-guitar',
    type: 'audio',
    source: 'url',
    title: 'Guitare Acoustique Contemplative',
    category: 'Acoustique',
    url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
    thumbnail: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&auto=format&fit=crop&q=80',
    author: 'Mixkit Audio'
  }
];

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
  // Source active : 'curated' (Pixabay/Unsplash) | 'youtube' | 'url' | 'local'
  const [selectedSource, setSelectedSource] = useState<MediaSourceType>('pixabay');

  // Champs de saisie
  const [youtubeInput, setYoutubeInput] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [mediaTitleInput, setMediaTitleInput] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
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

  // Recherche en ligne Pixabay & Unsplash (Formats horizontaux 16:9)
  const [onlineSearchQuery, setOnlineSearchQuery] = useState<string>('');
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);
  const [onlineResults, setOnlineResults] = useState<CuratedMediaItem[]>([]);
  const [hasSearchedOnline, setHasSearchedOnline] = useState<boolean>(false);
  const [onlineSourceFilter, setOnlineSourceFilter] = useState<'all' | 'pixabay' | 'unsplash'>('all');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showApiKeyConfig, setShowApiKeyConfig] = useState<boolean>(false);
  const [pixabayApiKey, setPixabayApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('melobook_pixabay_key') || '';
    } catch {
      return '';
    }
  });

  const savePixabayApiKey = (key: string) => {
    setPixabayApiKey(key);
    try {
      if (key.trim()) {
        localStorage.setItem('melobook_pixabay_key', key.trim());
      } else {
        localStorage.removeItem('melobook_pixabay_key');
      }
    } catch {}
  };

  // Exécution de la recherche en ligne
  const handleSearchOnline = async (termToSearch?: string) => {
    const q = (typeof termToSearch === 'string' ? termToSearch : onlineSearchQuery).trim();
    if (!q) return;

    if (typeof termToSearch === 'string') {
      setOnlineSearchQuery(termToSearch);
    }

    setIsSearchingOnline(true);
    setSearchError(null);
    setHasSearchedOnline(true);

    try {
      const res = await fetch('/api/media/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          mediaType: selectedMediaType === 'audio' ? 'audio' : selectedMediaType,
          source: onlineSourceFilter,
          pixabayApiKey: pixabayApiKey.trim() || undefined
        })
      });

      if (!res.ok) {
        throw new Error(`Erreur serveur (${res.status})`);
      }

      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        setOnlineResults(data.results);
      } else {
        setOnlineResults([]);
        setSearchError(`Aucun média horizontal (16:9) trouvé pour "${q}". Essayez un autre mot-clé.`);
      }
    } catch (err: any) {
      console.error('Erreur recherche média en ligne:', err);
      setSearchError('Impossible d\'effectuer la recherche en ligne pour le moment.');
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleClearOnlineSearch = () => {
    setOnlineSearchQuery('');
    setOnlineResults([]);
    setHasSearchedOnline(false);
    setSearchError(null);
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
    query?: string;
    url?: string;
    type: MediaType;
    source?: MediaSourceType;
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
          return parsed.map((item: any, idx: number) => ({
            id: item.id || `fav-${idx}-${Date.now()}`,
            title: item.title || item.query || 'Favori',
            query: item.query || item.title || '',
            url: item.url,
            type: (item.type || item.mediaType || 'video') as MediaType,
            source: item.source || 'pixabay',
            category: item.category || (
              item.query?.toLowerCase().includes('tuto') ? 'Tutos' :
              (item.mediaType === 'audio' || item.type === 'audio') ? 'Backing tracks' : 'Backgrounds'
            ),
            thumbnail: item.thumbnail,
            author: item.author,
            createdAt: item.createdAt || Date.now()
          }));
        }
      }
    } catch {}
    return [
      { id: 'fav-bg-clouds', title: 'Nuages & Ciel (16:9)', query: 'Nuages & Ciel', type: 'video' as MediaType, source: 'pixabay' as MediaSourceType, category: 'Backgrounds', createdAt: 1 },
      { id: 'fav-bg-cross', title: 'Croix & Foi (16:9)', query: 'Croix & Foi', type: 'image' as MediaType, source: 'unsplash' as MediaSourceType, category: 'Backgrounds', createdAt: 2 },
      { id: 'fav-bg-gold', title: 'Lumière dorée céleste', query: 'Lumière dorée', type: 'video' as MediaType, source: 'pixabay' as MediaSourceType, category: 'Backgrounds', createdAt: 3 },
      { id: 'fav-bg-stars', title: 'Étoiles & Ciel nocturne', query: 'Étoiles & Ciel', type: 'image' as MediaType, source: 'unsplash' as MediaSourceType, category: 'Backgrounds', createdAt: 4 },
      { id: 'fav-tuto-praise', title: 'Tutoriel Louange & Projection', query: 'Tutoriel Louange', type: 'video' as MediaType, source: 'youtube' as MediaSourceType, category: 'Tutos', createdAt: 5 },
      { id: 'fav-tuto-sound', title: 'Formation Sonorisation Église', query: 'Formation Sono', type: 'video' as MediaType, source: 'youtube' as MediaSourceType, category: 'Tutos', createdAt: 6 },
      { id: 'fav-bt-acoustic', title: 'Piste acoustique Louange (G)', query: 'Piste acoustique louange', type: 'audio' as MediaType, source: 'youtube' as MediaSourceType, category: 'Backing tracks', createdAt: 7 },
      { id: 'fav-bt-pad', title: 'Pad d\'ambiance continu (D)', query: 'Pad ambiance priere', type: 'audio' as MediaType, source: 'youtube' as MediaSourceType, category: 'Backing tracks', createdAt: 8 }
    ];
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

  const isCurrentQueryFavorited = useMemo(() => {
    const q = onlineSearchQuery.trim().toLowerCase();
    if (!q) return false;
    return mediaFavorites.some(f => (f.query || f.title).trim().toLowerCase() === q);
  }, [onlineSearchQuery, mediaFavorites]);

  const toggleFavoriteCurrentQuery = (customCategory?: string) => {
    const q = onlineSearchQuery.trim();
    if (!q) return;
    const lower = q.toLowerCase();
    const existing = mediaFavorites.find(f => (f.query || f.title).trim().toLowerCase() === lower);
    if (existing) {
      saveFavorites(mediaFavorites.filter(f => f.id !== existing.id));
    } else {
      const targetCat = customCategory || (selectedCategoryFilter !== 'all' ? selectedCategoryFilter : targetCategoryForAdd || 'Backgrounds');
      const newFav = {
        id: `fav-${Date.now()}`,
        title: q,
        query: q,
        type: selectedMediaType === 'audio' ? 'audio' as MediaType : selectedMediaType,
        source: (selectedSource === 'unsplash' ? 'unsplash' : 'pixabay') as MediaSourceType,
        category: targetCat,
        createdAt: Date.now()
      };
      saveFavorites([newFav, ...mediaFavorites]);
    }
  };

  const handleTriggerFavorite = (fav: typeof mediaFavorites[0]) => {
    // Si URL directe YouTube
    if (fav.url && fav.source === 'youtube') {
      setSelectedMediaType(fav.type);
      setSelectedSource('youtube');
      setYoutubeInput(fav.url);
      setMediaTitleInput(fav.title);
      onProjectMedia({
        isActive: true,
        type: fav.type,
        source: 'youtube',
        url: fav.url,
        title: fav.title,
        isLoop,
        isMuted: fav.type === 'video' ? isMuted : false
      });
      return;
    }

    // Si URL directe d'un fichier
    if (fav.url && fav.source === 'url') {
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
      return;
    }

    // Si terme de recherche
    if (fav.query) {
      if (fav.type === 'audio') {
        setSelectedMediaType('audio');
        setSelectedSource('youtube');
        setYoutubeInput(fav.query);
        setMediaTitleInput(fav.title);
      } else {
        setSelectedMediaType(fav.type);
        setSelectedSource('pixabay');
        handleSearchOnline(fav.query);
      }
    }
  };

  // Favoris affichés selon le filtre de dossier
  const displayedFavorites = useMemo(() => {
    if (selectedCategoryFilter === 'all') return mediaFavorites;
    return mediaFavorites.filter(f => f.category === selectedCategoryFilter);
  }, [mediaFavorites, selectedCategoryFilter]);

  // Liste filtrée des éléments prédéfinis
  const filteredCurated = useMemo(() => {
    let list: CuratedMediaItem[] = [];
    if (selectedMediaType === 'video') list = CURATED_VIDEOS;
    else if (selectedMediaType === 'image') list = CURATED_IMAGES;
    else list = CURATED_AUDIOS;

    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase();
    return list.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.category.toLowerCase().includes(q)
    );
  }, [selectedMediaType, searchFilter]);

  // Déclencher la projection d'un élément curated
  const handleProjectCuratedItem = (item: CuratedMediaItem) => {
    onProjectMedia({
      isActive: true,
      type: item.type,
      source: item.source,
      url: item.url,
      title: item.title,
      thumbnail: item.thumbnail,
      author: item.author,
      isLoop,
      isMuted: item.type === 'video' ? isMuted : false
    });
  };

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
            onClick={() => {
              setSelectedMediaType('video');
              if (selectedSource === 'unsplash') setSelectedSource('pixabay');
            }}
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
            onClick={() => setSelectedMediaType('image')}
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
            onClick={() => {
              setSelectedMediaType('audio');
              if (selectedSource === 'unsplash' || selectedSource === 'pixabay') setSelectedSource('url');
            }}
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

      {/* 3. Sélecteur de Source (YouTube, Pixabay/Unsplash, URL, Ordinateur) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
        {/* Source Curated (Pixabay / Unsplash) */}
        {selectedMediaType !== 'audio' && (
          <button
            type="button"
            onClick={() => setSelectedSource('pixabay')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedSource === 'pixabay' || selectedSource === 'unsplash'
                ? 'bg-purple-600/25 border-purple-400 text-white ring-1 ring-purple-500/40 shadow-xs'
                : 'bg-[#181820] border-[#292936] text-gray-300 hover:bg-[#20202A] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Pixabay & Unsplash (En ligne 16:9)</span>
          </button>
        )}

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
              Aucun favori dans le dossier {selectedCategoryFilter === 'all' ? 'actuel' : `"${selectedCategoryFilter}"`}. Utilisez l'étoile pour enregistrer vos recherches et médias fréquents.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs custom-scrollbar">
            {displayedFavorites.map((fav) => {
              const isSearchActive = Boolean(fav.query && onlineSearchQuery.trim().toLowerCase() === fav.query.toLowerCase());
              const isUrlActive = Boolean(fav.url && activeMedia?.isActive && activeMedia.url === fav.url);
              const isActive = isSearchActive || isUrlActive;

              return (
                <div
                  key={fav.id}
                  className={`group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-xl border transition-all shrink-0 ${
                    isActive
                      ? 'bg-amber-400/20 border-amber-400 text-amber-200 shadow-xs'
                      : 'bg-[#181824] border-[#29293C] text-gray-300 hover:text-white hover:border-amber-400/40 hover:bg-[#1E1E2C]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleTriggerFavorite(fav)}
                    className="flex items-center gap-1.5 cursor-pointer font-medium text-left"
                    title={`Projeter ou lancer "${fav.title}" (${fav.category})`}
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

      {/* A. Source : Recherche en ligne & Bibliothèque Pixabay / Unsplash */}
      {(selectedSource === 'pixabay' || selectedSource === 'unsplash') && selectedMediaType !== 'audio' && (
        <div className="space-y-4 animate-in fade-in duration-100">
          
          {/* En-tête : Badge Format Horizontal & Filtres Sources */}
          <div className="p-3 rounded-xl bg-[#16161F] border border-[#2A2A38] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Recherche en ligne Pixabay & Unsplash
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono flex items-center gap-1">
                    <Monitor className="w-3 h-3" />
                    Format 16:9 Horizontal
                  </span>
                </h4>
                <p className="text-[11px] text-gray-400">
                  Accédez à des millions d'{selectedMediaType === 'video' ? 'arrières-plans vidéo animés' : 'images haute résolution'} en format paysage
                </p>
              </div>
            </div>

            {/* Filtre Pixabay / Unsplash / Tous */}
            <div className="flex items-center gap-1 bg-[#101014] p-1 rounded-lg border border-[#262633] shrink-0">
              <button
                type="button"
                onClick={() => setOnlineSourceFilter('all')}
                className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                  onlineSourceFilter === 'all'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setOnlineSourceFilter('pixabay')}
                className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                  onlineSourceFilter === 'pixabay'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Pixabay
              </button>
              {selectedMediaType === 'image' && (
                <button
                  type="button"
                  onClick={() => setOnlineSourceFilter('unsplash')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                    onlineSourceFilter === 'unsplash'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Unsplash
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowApiKeyConfig(c => !c)}
                className={`p-1 rounded text-[11px] cursor-pointer transition-colors ${
                  showApiKeyConfig || pixabayApiKey
                    ? 'text-purple-300 bg-purple-950/50'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                title="Configurer une clé API Pixabay personnelle"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tiroir de configuration de la clé API Pixabay personnelle (facultatif) */}
          {showApiKeyConfig && (
            <div className="p-3 rounded-xl bg-[#14141A] border border-purple-500/30 space-y-2 animate-in fade-in duration-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Clé API Pixabay personnelle (Optionnel)
                </span>
                <span className="text-[10px] text-gray-500">Gratuit sur pixabay.com/api/docs</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pixabayApiKey}
                  onChange={(e) => savePixabayApiKey(e.target.value)}
                  placeholder="Ex: 43924688-6c0b318d960f2bb502bc343e8..."
                  className="flex-1 bg-[#1A1A24] border border-[#2D2D3D] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-400 font-mono"
                />
                {pixabayApiKey && (
                  <button
                    type="button"
                    onClick={() => savePixabayApiKey('')}
                    className="px-2.5 py-1 rounded-lg bg-red-950/40 text-red-300 border border-red-500/30 text-xs hover:bg-red-900/50 cursor-pointer"
                  >
                    Effacer
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-400">
                La clé est mémorisée localement dans votre navigateur et permet d'interroger directement l'ensemble du catalogue Pixabay avec orientation horizontale stricte.
              </p>
            </div>
          )}

          {/* Barre de recherche en ligne avec bouton Favori instantané */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchOnline();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={onlineSearchQuery}
                onChange={(e) => setOnlineSearchQuery(e.target.value)}
                placeholder={`Rechercher en ligne sur ${onlineSourceFilter === 'all' ? 'Pixabay & Unsplash' : onlineSourceFilter === 'pixabay' ? 'Pixabay' : 'Unsplash'} (ex: nuages, croix, océan, étoiles, louange)...`}
                className={`w-full bg-[#16161E] border border-[#2A2A38] rounded-xl pl-9 ${onlineSearchQuery.trim() ? 'pr-9' : 'pr-3'} py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors shadow-inner`}
              />
              {onlineSearchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => toggleFavoriteCurrentQuery()}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors cursor-pointer ${
                    isCurrentQueryFavorited
                      ? 'text-amber-400 hover:text-amber-300'
                      : 'text-gray-500 hover:text-amber-400'
                  }`}
                  title={isCurrentQueryFavorited ? "Retirer cette recherche des favoris" : "Sauvegarder cette recherche dans les favoris"}
                >
                  <Star className={`w-4 h-4 ${isCurrentQueryFavorited ? 'fill-amber-400' : ''}`} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="submit"
                disabled={isSearchingOnline || !onlineSearchQuery.trim()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                {isSearchingOnline ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Recherche...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Rechercher en ligne</span>
                  </>
                )}
              </button>

              {onlineSearchQuery.trim() && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleFavoriteCurrentQuery(targetCategoryForAdd)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 ${
                      isCurrentQueryFavorited
                        ? 'bg-amber-400/15 border-amber-400/40 text-amber-300 hover:bg-amber-400/25'
                        : 'bg-[#1A1A24] border-[#2C2C3C] text-gray-300 hover:text-amber-300 hover:border-amber-400/40'
                    }`}
                    title={isCurrentQueryFavorited ? "Retirer des favoris" : `Ajouter au dossier "${targetCategoryForAdd}"`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isCurrentQueryFavorited ? 'fill-amber-400 text-amber-400' : ''}`} />
                    <span className="hidden md:inline">{isCurrentQueryFavorited ? 'Favori' : '+ Favori'}</span>
                  </button>
                  <select
                    value={targetCategoryForAdd}
                    onChange={(e) => setTargetCategoryForAdd(e.target.value)}
                    className="bg-[#1A1A24] border border-[#2C2C3C] text-amber-300 text-[11px] rounded-xl px-2 py-2.5 cursor-pointer focus:outline-none"
                    title="Dossier cible pour ce favori"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} className="bg-[#161622] text-white">
                        📁 {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {hasSearchedOnline && (
                <button
                  type="button"
                  onClick={handleClearOnlineSearch}
                  className="px-3 py-2.5 rounded-xl bg-[#1A1A24] border border-[#2C2C3C] text-gray-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                  title="Revenir à la sélection recommandée"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Réinitialiser</span>
                </button>
              )}
            </div>
          </form>

          {/* Suggestions thématiques rapides pour projection d'église / culte */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider shrink-0 font-bold">Thèmes :</span>
            {[
              'Nuages & Ciel', 
              'Croix & Foi', 
              'Lumière dorée', 
              'Étoiles & Ciel', 
              'Océan & Eau', 
              'Forêt & Nature', 
              'Bougies & Prière', 
              'Abstrait Doré'
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleSearchOnline(tag)}
                className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-purple-950/40 hover:border-purple-500/40 border border-[#282836] text-[11px] text-gray-300 hover:text-white transition-all cursor-pointer shrink-0"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* État de chargement */}
          {isSearchingOnline && (
            <div className="p-8 rounded-xl bg-[#14141C] border border-[#22222E] flex flex-col items-center justify-center gap-3 text-center animate-in fade-in">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <div>
                <p className="text-xs font-bold text-gray-200">Recherche en ligne sur {onlineSourceFilter === 'all' ? 'Pixabay & Unsplash' : onlineSourceFilter}...</p>
                <p className="text-[11px] text-gray-500">Filtrage strict sur les formats horizontaux 16:9 en haute résolution</p>
              </div>
            </div>
          )}

          {/* Message d'erreur éventuel */}
          {searchError && !isSearchingOnline && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
              <span>{searchError}</span>
              <button
                type="button"
                onClick={handleClearOnlineSearch}
                className="underline hover:text-white cursor-pointer shrink-0 font-semibold text-[11px]"
              >
                Voir la sélection par défaut
              </button>
            </div>
          )}

          {/* Grille des résultats en ligne (si recherche active) */}
          {!isSearchingOnline && hasSearchedOnline && onlineResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  {onlineResults.length} résultats horizontaux 16:9 trouvés en ligne pour "{onlineSearchQuery}"
                </span>
                <span className="text-[10px] text-purple-400 font-mono">Format Paysage 16:9 garanti</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                {onlineResults.map((item) => {
                  const isCurrentLive = activeMedia?.isActive && activeMedia.url === item.url;
                  return (
                    <div
                      key={item.id}
                      className={`group relative rounded-xl border overflow-hidden flex flex-col bg-[#16161E] transition-all ${
                        isCurrentLive
                          ? 'border-purple-400 ring-2 ring-purple-500/50 shadow-lg shadow-purple-950/40'
                          : 'border-[#262633] hover:border-gray-500'
                      }`}
                    >
                      {/* Miniature en format 16:9 strict */}
                      <div className="relative aspect-video bg-black/60 overflow-hidden">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        {/* Badges d'information */}
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border uppercase ${
                            item.source === 'unsplash' 
                              ? 'bg-neutral-900/80 text-white border-neutral-700' 
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                          }`}>
                            {item.source}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-black/60 text-gray-300 border border-white/10">
                            16:9
                          </span>
                        </div>

                        {isCurrentLive && (
                          <span className="absolute top-2 right-2 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500 text-white uppercase animate-pulse">
                            En direct
                          </span>
                        )}

                        {/* Bouton de projection direct au survol */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-xs">
                          <button
                            type="button"
                            onClick={() => handleProjectCuratedItem(item)}
                            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer transition-all transform scale-95 group-hover:scale-100"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Projeter maintenant</span>
                          </button>
                        </div>
                      </div>

                      {/* Titre et auteur */}
                      <div className="p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-gray-200 truncate" title={item.title}>
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-gray-400 block truncate">
                            {item.author || item.source}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleProjectCuratedItem(item)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                            isCurrentLive
                              ? 'bg-purple-600 text-white border-purple-400'
                              : 'bg-[#1E1E28] hover:bg-[#282836] text-gray-300 hover:text-white border-[#303040]'
                          }`}
                          title="Diffuser sur l'écran"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grille par défaut des médias recommandés (quand aucune recherche n'est active) */}
          {!isSearchingOnline && !hasSearchedOnline && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Sélection recommandée (Formats horizontaux 16:9)
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {filteredCurated.length} {selectedMediaType === 'video' ? 'vidéos HD' : 'images HD'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                {filteredCurated.map((item) => {
                  const isCurrentLive = activeMedia?.isActive && activeMedia.url === item.url;
                  return (
                    <div
                      key={item.id}
                      className={`group relative rounded-xl border overflow-hidden flex flex-col bg-[#16161E] transition-all ${
                        isCurrentLive
                          ? 'border-purple-400 ring-2 ring-purple-500/50 shadow-lg shadow-purple-950/40'
                          : 'border-[#262633] hover:border-gray-500'
                      }`}
                    >
                      <div className="relative aspect-video bg-black/60 overflow-hidden">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/70 text-gray-200 border border-white/10 uppercase">
                            {item.category}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-black/60 text-purple-300 border border-purple-500/30">
                            16:9
                          </span>
                        </div>

                        {isCurrentLive && (
                          <span className="absolute top-2 right-2 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500 text-white uppercase animate-pulse">
                            En direct
                          </span>
                        )}

                        {/* Bouton de projection direct */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-xs">
                          <button
                            type="button"
                            onClick={() => handleProjectCuratedItem(item)}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer transition-all transform scale-95 group-hover:scale-100"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Projeter</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-gray-200 truncate">{item.title}</h4>
                          <span className="text-[10px] text-gray-500 block truncate">{item.author}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleProjectCuratedItem(item)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                            isCurrentLive
                              ? 'bg-purple-600 text-white border-purple-400'
                              : 'bg-[#1E1E28] hover:bg-[#282836] text-gray-300 hover:text-white border-[#303040]'
                          }`}
                          title="Diffuser sur l'écran"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* B. Source : YouTube (Vidéo ou Audio) */}
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
                      📁 {c}
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

      {/* C. Source : URL directe d'un fichier */}
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
                      📁 {c}
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

      {/* D. Source : Ordinateur (Fichier local) */}
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
