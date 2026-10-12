import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Image as ImageIcon, 
  Check, 
  Sliders, 
  Sparkles, 
  Link2,
  Trash2
} from 'lucide-react';

export interface BackgroundPreset {
  id: string;
  title: string;
  category: 'louange' | 'ciel' | 'nature' | 'lumiere' | 'texture';
  url: string;
  thumb: string;
}

export const PRESET_BACKGROUNDS: BackgroundPreset[] = [
  {
    id: 'bg-1',
    title: 'Nuit Étoilée & Voie Lactée',
    category: 'ciel',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-2',
    title: 'Montagnes Brumeuses au Crépuscule',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-3',
    title: 'Lumières Bokeh de Scène',
    category: 'lumiere',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-4',
    title: 'Nébuleuse Cosmique Violette',
    category: 'ciel',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-5',
    title: 'Rayons de Lumière Célestes',
    category: 'lumiere',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-6',
    title: 'Mains & Rayons de Grâce',
    category: 'louange',
    url: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-7',
    title: 'Sanctuaire & Bougies',
    category: 'louange',
    url: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-8',
    title: 'Sommets Alpins Énigmatiques',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-9',
    title: 'Nuages d’Orage & Lueur Dorée',
    category: 'ciel',
    url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-10',
    title: 'Océan Pacifique au Crépuscule',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-11',
    title: 'Texture Minérale Sombre',
    category: 'texture',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-12',
    title: 'Forêt de Pins & Ciel Pur',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-13',
    title: 'Aurore Boréale Pastel',
    category: 'ciel',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-14',
    title: 'Rayons dans la Clairière',
    category: 'lumiere',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-15',
    title: 'Prairie au Soleil Couchant',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=400&q=70'
  },
  {
    id: 'bg-16',
    title: 'Feuillage & Ombre Subtile',
    category: 'texture',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=400&q=70'
  }
];

interface PresentationBackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBackground: string;
  onSelectBackground: (url: string) => void;
  currentOverlay: number;
  onAdjustOverlay: (overlay: number) => void;
}

export const PresentationBackgroundModal: React.FC<PresentationBackgroundModalProps> = ({
  isOpen,
  onClose,
  currentBackground,
  onSelectBackground,
  currentOverlay,
  onAdjustOverlay
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [customUrlError, setCustomUrlError] = useState<string>('');

  const filteredPresets = useMemo(() => {
    let list = PRESET_BACKGROUNDS;
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customUrlInput.trim();
    if (!trimmed) {
      setCustomUrlError('Veuillez entrer une adresse URL valide.');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setCustomUrlError("L'URL doit commencer par https:// ou http://");
      return;
    }
    setCustomUrlError('');
    onSelectBackground(trimmed);
  };

  const handleClearBackground = () => {
    onSelectBackground('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-[#121216] border border-[#2B2B38] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#22222E] bg-[#16161D]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Arrière-plan de Projection</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 font-medium">
                  Personnalisation
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Sélectionnez une image de fond et ajustez le filtre sombre automatique pour une lisibilité parfaite.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#252532] transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

          {/* Section 1 : Filtre sombre automatique protecteur */}
          <div className="p-4 rounded-xl bg-[#191922] border border-[#2D2D3E] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Filtre sombre automatique (Contraste)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
                  {Math.round(currentOverlay * 100)}%
                </span>
              </div>
              <p className="text-xs text-gray-400 max-w-lg">
                Superpose un voile sombre sur l'image pour que le texte des chants reste 100% lisible quel que soit le vidéo-projecteur.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Clair</span>
              <input
                type="range"
                min="0.30"
                max="0.90"
                step="0.05"
                value={currentOverlay}
                onChange={(e) => onAdjustOverlay(parseFloat(e.target.value))}
                className="w-32 sm:w-44 accent-blue-500 cursor-pointer h-2 bg-[#2E2E3F] rounded-lg"
              />
              <span className="text-xs text-gray-400">Foncé</span>

              <div className="flex gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => onAdjustOverlay(0.50)}
                  className={`px-2 py-1 text-[11px] rounded font-medium transition-colors cursor-pointer ${
                    currentOverlay === 0.50 ? 'bg-blue-600 text-white' : 'bg-[#252535] text-gray-300 hover:bg-[#303045]'
                  }`}
                  title="50% : Image plus visible"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustOverlay(0.65)}
                  className={`px-2 py-1 text-[11px] rounded font-medium transition-colors cursor-pointer ${
                    currentOverlay === 0.65 ? 'bg-blue-600 text-white' : 'bg-[#252535] text-gray-300 hover:bg-[#303045]'
                  }`}
                  title="65% : Réglage optimal recommandé"
                >
                  65%
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustOverlay(0.80)}
                  className={`px-2 py-1 text-[11px] rounded font-medium transition-colors cursor-pointer ${
                    currentOverlay === 0.80 ? 'bg-blue-600 text-white' : 'bg-[#252535] text-gray-300 hover:bg-[#303045]'
                  }`}
                  title="80% : Contraste maximal"
                >
                  80%
                </button>
              </div>
            </div>
          </div>

          {/* Section 2 : Barre de recherche et catégories */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher une image (ex: étoiles, mont, ciel, louange, brume, bokeh)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#171720] border border-[#2C2C3C] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Bouton pour réinitialiser à Noir pur */}
              <button
                type="button"
                onClick={handleClearBackground}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  !currentBackground
                    ? 'bg-blue-600/30 border-blue-500 text-white ring-2 ring-blue-500/30'
                    : 'bg-[#1A1A24] border-[#2C2C3C] text-gray-300 hover:text-white hover:bg-[#252535]'
                }`}
                title="Supprimer l'image et revenir au fond noir classique"
              >
                <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Fond noir pur</span>
                {!currentBackground && <Check className="w-3 h-3 text-blue-400" />}
              </button>
            </div>

            {/* Filtres par catégories */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'all', label: 'Toutes les images' },
                { id: 'louange', label: 'Louange & Scène' },
                { id: 'ciel', label: 'Ciel & Étoiles' },
                { id: 'nature', label: 'Montagnes & Nature' },
                { id: 'lumiere', label: 'Lumières & Bokeh' },
                { id: 'texture', label: 'Textures & Minéral' }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-[#1C1C26] text-gray-400 hover:text-gray-200 hover:bg-[#252536]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3 : Grille des images de la bibliothèque */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Bibliothèque intégrée ({filteredPresets.length})</span>
              </span>
              <span className="text-[11px] text-gray-500">Cliquez pour appliquer immédiatement</span>
            </div>

            {filteredPresets.length === 0 ? (
              <div className="text-center py-10 bg-[#161620] rounded-xl border border-[#272736] text-xs text-gray-500">
                Aucune image ne correspond à votre recherche "{searchQuery}".
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredPresets.map(preset => {
                  const isSelected = currentBackground === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectBackground(preset.url)}
                      className={`group relative aspect-video rounded-xl overflow-hidden border-2 text-left transition-all cursor-pointer shadow-md ${
                        isSelected
                          ? 'border-purple-400 ring-2 ring-purple-500/50 scale-[1.02]'
                          : 'border-transparent hover:border-gray-500 hover:scale-[1.01]'
                      }`}
                    >
                      {/* Image vignette */}
                      <img
                        src={preset.thumb}
                        alt={preset.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:brightness-110 transition-all"
                      />

                      {/* Voile sombre de prévisualisation */}
                      <div 
                        className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                        style={{ opacity: currentOverlay }}
                      />

                      {/* Titre et badge sélectionné */}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between gap-1">
                        <span className="text-[11px] font-medium text-white truncate drop-shadow">
                          {preset.title}
                        </span>
                        {isSelected && (
                          <div className="p-1 rounded-full bg-purple-600 text-white shrink-0 shadow">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4 : Image personnalisée depuis une URL externe */}
          <div className="p-4 rounded-xl bg-[#161620] border border-[#252536] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
              <Link2 className="w-4 h-4 text-blue-400" />
              <span>Ou utiliser votre propre image (Lien URL direct)</span>
            </div>

            <form onSubmit={handleApplyCustomUrl} className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="https://exemple.com/mon-fond-eglise.jpg"
                value={customUrlInput}
                onChange={(e) => {
                  setCustomUrlInput(e.target.value);
                  setCustomUrlError('');
                }}
                className="flex-1 bg-[#121218] border border-[#2A2A3A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Appliquer l'URL
              </button>
            </form>
            {customUrlError && (
              <p className="text-[11px] text-red-400">{customUrlError}</p>
            )}
          </div>

        </div>

        {/* Pied de page modal */}
        <div className="px-5 py-3.5 border-t border-[#22222E] bg-[#16161D] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span>Fond actif :</span>
            {currentBackground ? (
              <span className="text-purple-300 font-semibold truncate max-w-xs">
                Image personnalisée ({Math.round(currentOverlay * 100)}% opacité)
              </span>
            ) : (
              <span className="text-gray-400">Noir pur classique</span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors cursor-pointer"
          >
            Terminé
          </button>
        </div>
      </div>
    </div>
  );
};
