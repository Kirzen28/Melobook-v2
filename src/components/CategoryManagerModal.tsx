import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Plus, 
  Trash2, 
  Tag, 
  Check, 
  AlertCircle, 
  RotateCcw,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import { 
  DEFAULT_CATEGORY_SUGGESTIONS, 
  getCustomCategories, 
  saveCustomCategories, 
  getHiddenCategories, 
  saveHiddenCategories 
} from '../utils/categoryUtils';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategories?: string[];
  onToggleCategory?: (cat: string) => void;
  onCategoriesChanged?: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  selectedCategories = [],
  onToggleCategory,
  onCategoriesChanged
}) => {
  const { songs, updateSong } = useApp();
  
  const [newCatName, setNewCatName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>(() => getCustomCategories());
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => getHiddenCategories());
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [isDeletingWithSongs, setIsDeletingWithSongs] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deletingCategory) {
          setDeletingCategory(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deletingCategory, onClose]);

  // Aggregate all unique categories and song count
  const allCategories = useMemo(() => {
    const counts: Record<string, { count: number; isCustom: boolean; isDefault: boolean }> = {};

    // Defaults not hidden
    DEFAULT_CATEGORY_SUGGESTIONS.forEach(c => {
      if (!hiddenCategories.includes(c)) {
        counts[c] = { count: 0, isCustom: false, isDefault: true };
      }
    });

    // Custom
    customCategories.forEach(c => {
      if (!counts[c]) {
        counts[c] = { count: 0, isCustom: true, isDefault: false };
      } else {
        counts[c].isCustom = true;
      }
    });

    // Songs
    songs.forEach(s => {
      s.tags?.forEach(t => {
        const trimmed = t?.trim();
        if (trimmed) {
          if (!counts[trimmed]) {
            counts[trimmed] = { count: 1, isCustom: false, isDefault: false };
          } else {
            counts[trimmed].count += 1;
          }
        }
      });
    });

    return Object.entries(counts)
      .map(([name, meta]) => ({
        name,
        count: meta.count,
        isCustom: meta.isCustom,
        isDefault: meta.isDefault
      }))
      .sort((a, b) => {
        if (b.count !== a.count && (a.count === 0 || b.count === 0)) {
          return b.count - a.count;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
  }, [songs, customCategories, hiddenCategories]);

  // Filtered list
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return allCategories;
    const q = searchQuery.toLowerCase().trim();
    return allCategories.filter(c => c.name.toLowerCase().includes(q));
  }, [allCategories, searchQuery]);

  // Show feedback
  const showFeedback = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3000);
  };

  // Add/Create category
  const handleAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    // If it was hidden, unhide it
    if (hiddenCategories.includes(trimmed)) {
      const updatedHidden = hiddenCategories.filter(c => c !== trimmed);
      setHiddenCategories(updatedHidden);
      saveHiddenCategories(updatedHidden);
    }

    if (!customCategories.includes(trimmed)) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      saveCustomCategories(updated);
      showFeedback(`Catégorie "${trimmed}" créée avec succès !`);
    } else {
      showFeedback(`La catégorie "${trimmed}" existe déjà.`, 'info');
    }

    setNewCatName('');
    onCategoriesChanged?.();
  };

  // Delete Category
  const confirmDeleteCategory = async (catName: string, removeTagFromSongs: boolean) => {
    // 1. Remove from custom categories
    if (customCategories.includes(catName)) {
      const updatedCustom = customCategories.filter(c => c !== catName);
      setCustomCategories(updatedCustom);
      saveCustomCategories(updatedCustom);
    }

    // 2. If it's a default category, add to hidden
    if (DEFAULT_CATEGORY_SUGGESTIONS.includes(catName)) {
      const updatedHidden = Array.from(new Set([...hiddenCategories, catName]));
      setHiddenCategories(updatedHidden);
      saveHiddenCategories(updatedHidden);
    }

    // 3. If requested, remove tag from all matching songs
    if (removeTagFromSongs) {
      const songsWithTag = songs.filter(s => s.tags?.some(t => t.trim().toLowerCase() === catName.toLowerCase()));
      for (const s of songsWithTag) {
        const updatedTags = (s.tags || []).filter(t => t.trim().toLowerCase() !== catName.toLowerCase());
        await updateSong(s.id, { tags: updatedTags });
      }
    }

    setDeletingCategory(null);
    setIsDeletingWithSongs(false);
    showFeedback(`Catégorie "${catName}" retirée.`);
    onCategoriesChanged?.();
  };

  // Reset to default presets
  const handleResetDefaults = () => {
    setHiddenCategories([]);
    saveHiddenCategories([]);
    showFeedback('Catégories par défaut restaurées.');
    onCategoriesChanged?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-[#111113] border border-[#2A2A2D] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-[#222224] flex items-center justify-between bg-[#151518]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Gestion des Catégories</h3>
              <p className="text-[11px] text-gray-400">Créer, filtrer ou retirer des catégories de votre répertoire</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#222226] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert banner */}
        {feedbackMsg && (
          <div className={`px-4 py-2 text-xs font-medium border-b flex items-center gap-2 ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
              : 'bg-blue-950/40 border-blue-800/40 text-blue-300'
          }`}>
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* Create / Add Section */}
          <div className="p-3 bg-[#161619] rounded-lg border border-[#262629] space-y-2">
            <label className="block text-xs font-semibold text-gray-200">
              Ajouter une nouvelle catégorie
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ex: Évangélisation, Psaume, Sainte Cène..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={!newCatName.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-sm transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer</span>
              </button>
            </div>
          </div>

          {/* Search bar inside list */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrer les catégories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#161619] border border-[#2A2A2D] rounded-md pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="text-[11px] text-gray-400 whitespace-nowrap">
              {filteredCategories.length} catégorie{filteredCategories.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Categories List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {filteredCategories.length === 0 ? (
              <div className="py-6 text-center text-gray-500 text-xs bg-[#161619]/40 rounded-lg border border-[#222224]">
                Aucune catégorie trouvée.
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.name);
                const isDeleting = deletingCategory === cat.name;

                return (
                  <div
                    key={cat.name}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-blue-950/20 border-blue-500/40 text-blue-200'
                        : 'bg-[#161619] border-[#262629] text-gray-200 hover:border-[#333]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {onToggleCategory && (
                        <button
                          type="button"
                          onClick={() => onToggleCategory(cat.name)}
                          className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'border-[#444] bg-[#1C1C1E] text-transparent hover:border-gray-300'
                          }`}
                          title={isSelected ? "Retirer du filtre actif" : "Ajouter au filtre actif"}
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </button>
                      )}
                      
                      <span className="text-xs font-medium truncate">{cat.name}</span>
                      
                      {cat.count > 0 ? (
                        <span className="text-[10px] text-gray-400 bg-[#0E0E10] px-1.5 py-0.5 rounded border border-[#222224] shrink-0">
                          {cat.count} {cat.count > 1 ? 'chants' : 'chant'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500 shrink-0 italic">
                          inutilisée
                        </span>
                      )}

                      {cat.isCustom && (
                        <span className="text-[9px] font-bold text-blue-400 bg-blue-950/40 px-1.5 py-0.2 rounded border border-blue-800/30 shrink-0">
                          Perso
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isDeleting ? (
                        <div className="flex items-center gap-1 bg-rose-950/60 p-1 rounded border border-rose-800/50 animate-in fade-in">
                          <span className="text-[10px] text-rose-300 px-1">Retirer ?</span>
                          <button
                            type="button"
                            onClick={() => confirmDeleteCategory(cat.name, cat.count > 0)}
                            className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition-colors"
                          >
                            Oui
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCategory(null)}
                            className="px-1.5 py-0.5 rounded bg-[#222] hover:bg-[#333] text-gray-300 text-[10px] transition-colors"
                          >
                            Non
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingCategory(cat.name)}
                          className="p-1.5 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                          title={`Retirer la catégorie "${cat.name}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reset suggestions option */}
          {hiddenCategories.length > 0 && (
            <div className="pt-2 border-t border-[#222224] flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                {hiddenCategories.length} catégories par défaut masquées
              </span>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurer les catégories par défaut</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#151518] border-t border-[#222224] flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            Les catégories créées sont synchronisées avec vos chants
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#222226] hover:bg-[#2C2C30] text-gray-200 text-xs font-semibold border border-[#333] transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
