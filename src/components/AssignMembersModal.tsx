import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Library, 
  Search, 
  Check, 
  X, 
  UserPlus, 
  UserMinus, 
  Shield, 
  Award, 
  UserCheck, 
  CheckSquare, 
  Square, 
  Filter, 
  Loader2,
  Mail,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Group, UserProfile, UserRole } from '../types';

interface AssignMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetGroupId?: string;
}

export const AssignMembersModal: React.FC<AssignMembersModalProps> = ({
  isOpen,
  onClose,
  targetGroupId
}) => {
  const { 
    groups, 
    currentGroup, 
    allUsers, 
    currentUser, 
    setGroupMembers, 
    assignMembersToGroup,
    showNotification 
  } = useApp();

  // Selected group to modify
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    targetGroupId || currentGroup?.id || 'default-group'
  );

  useEffect(() => {
    if (targetGroupId) {
      setSelectedGroupId(targetGroupId);
    } else if (currentGroup?.id) {
      setSelectedGroupId(currentGroup.id);
    }
  }, [targetGroupId, currentGroup?.id, isOpen]);

  const activeTargetGroup = useMemo(() => {
    return groups.find(g => g.id === selectedGroupId) || currentGroup || groups[0];
  }, [groups, selectedGroupId, currentGroup]);

  // Current assigned UIDs for this target group
  const assignedUidsSet = useMemo(() => {
    const list = activeTargetGroup?.members || [];
    if (activeTargetGroup?.id === 'default-group') {
      const valid = list.filter(m => allUsers.some(u => u.uid === m));
      if (valid.length === 0) {
        return new Set<string>(allUsers.map(u => u.uid));
      }
      return new Set<string>(valid);
    }
    return new Set<string>(list.filter(m => allUsers.some(u => u.uid === m)));
  }, [activeTargetGroup?.id, activeTargetGroup?.members, allUsers]);

  // Multi-select state: track selected user UIDs in UI
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());

  // Initialize selectedUids with currently assigned members when modal opens or target group changes
  useEffect(() => {
    if (isOpen && activeTargetGroup) {
      setSelectedUids(new Set(assignedUidsSet));
    }
  }, [isOpen, activeTargetGroup?.id, assignedUidsSet]);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [isSaving, setIsSaving] = useState(false);

  // Manual email assignment input
  const [manualEmail, setManualEmail] = useState('');

  // Filtered users list
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allUsers.filter(u => {
      const name = (u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const matchesSearch = !query || name.includes(query) || email.includes(query);
      if (!matchesSearch) return false;

      const isAssigned = assignedUidsSet.has(u.uid);
      if (filterMode === 'assigned') return isAssigned;
      if (filterMode === 'unassigned') return !isAssigned;
      return true;
    });
  }, [allUsers, searchQuery, filterMode, assignedUidsSet]);

  // Quick stats
  const totalUsersCount = allUsers.length;
  const currentlyAssignedCount = assignedUidsSet.size;
  const selectedCount = selectedUids.size;

  // Toggle single user in multiselect
  const toggleUserSelection = (uid: string) => {
    setSelectedUids(prev => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  // Select all visible filtered users
  const handleSelectAllFiltered = () => {
    setSelectedUids(prev => {
      const next = new Set(prev);
      filteredUsers.forEach(u => next.add(u.uid));
      return next;
    });
  };

  // Deselect all visible filtered users
  const handleDeselectAllFiltered = () => {
    setSelectedUids(prev => {
      const next = new Set(prev);
      filteredUsers.forEach(u => next.delete(u.uid));
      return next;
    });
  };

  // Check if all filtered users are selected
  const areAllFilteredSelected = useMemo(() => {
    if (filteredUsers.length === 0) return false;
    return filteredUsers.every(u => selectedUids.has(u.uid));
  }, [filteredUsers, selectedUids]);

  // Quick action: Add all selected users to the target group right now
  const handleAssignSelectedOnly = async () => {
    if (!activeTargetGroup || selectedUids.size === 0) return;
    setIsSaving(true);
    try {
      await assignMembersToGroup(activeTargetGroup.id, Array.from(selectedUids));
    } finally {
      setIsSaving(false);
    }
  };

  // Save full state (sync exact set of members)
  const handleSaveAllAssignments = async () => {
    if (!activeTargetGroup) return;
    setIsSaving(true);
    try {
      await setGroupMembers(activeTargetGroup.id, Array.from(selectedUids));
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Add member by email if present in database
  const handleAddByEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualEmail.trim().toLowerCase();
    if (!clean) return;

    const found = allUsers.find(u => u.email?.toLowerCase() === clean);
    if (found) {
      setSelectedUids(prev => new Set(prev).add(found.uid));
      setManualEmail('');
      showNotification(`${found.displayName || clean} coché pour cette bibliothèque`);
    } else {
      showNotification(`Aucun compte trouvé avec l'adresse ${clean}`, 'warning');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#111114] border border-[#262630] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[#E0E0E0]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#222228] flex items-start justify-between gap-3 bg-[#15151A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Assigner des membres à une bibliothèque</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Cochez les membres autorisés à accéder au répertoire et aux setlists de cette bibliothèque.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#202028] transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Library Selector Bar */}
        <div className="p-4 border-b border-[#222228] bg-[#0E0E12] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
            <Library className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Bibliothèque cible :</span>
          </div>

          <div className="relative flex-1 max-w-sm">
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full bg-[#1A1A22] border border-[#2E2E3C] rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer appearance-none pr-8"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id} className="bg-[#1A1A22] text-white">
                  {g.name} — code {g.inviteCode || 'LOUAN7'}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Toolbar: Search, Filters & Multiselect actions */}
        <div className="p-4 space-y-3 border-b border-[#222228] bg-[#141418]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom ou adresse e-mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1B1B22] border border-[#2A2A34] rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
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

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#181820] p-1 rounded-lg border border-[#282834] shrink-0">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('assigned')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterMode === 'assigned'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Assignés
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('unassigned')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterMode === 'unassigned'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Non assignés
              </button>
            </div>
          </div>

          {/* Multiselect helper header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={areAllFilteredSelected ? handleDeselectAllFiltered : handleSelectAllFiltered}
                className="px-2.5 py-1 rounded-md bg-[#1E1E26] hover:bg-[#282834] border border-[#2E2E3C] text-gray-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {areAllFilteredSelected ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tout désélectionner</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tout sélectionner</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-gray-400">
                {filteredUsers.length} musicien{filteredUsers.length > 1 ? 's' : ''} visible{filteredUsers.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30">
                {selectedCount} coché{selectedCount > 1 ? 's' : ''} au total
              </span>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedUids(new Set())}
                  className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors cursor-pointer underline"
                >
                  Effacer la sélection
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Users List with Checkboxes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-[#1F1F28] custom-scrollbar">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => {
              const isSelected = selectedUids.has(u.uid);
              const isOriginallyAssigned = assignedUidsSet.has(u.uid);
              const isAdmin = u.role === 'admin';
              const isLeader = u.role === 'leader';
              const isCurrentUser = currentUser?.uid === u.uid;

              return (
                <div
                  key={u.uid}
                  onClick={() => toggleUserSelection(u.uid)}
                  className={`pt-2 first:pt-0 p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                    isSelected
                      ? 'bg-blue-600/12 border-blue-500/50 shadow-xs'
                      : 'bg-[#15151A] hover:bg-[#1C1C22] border-[#22222A]'
                  }`}
                >
                  {/* Left: Checkbox + Avatar + User Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                        isSelected 
                          ? 'bg-blue-600 border-blue-500 text-white' 
                          : 'border-gray-600 bg-[#1A1A22]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isAdmin 
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' 
                        : isLeader
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-[#22222A] text-gray-300 border border-[#333]'
                    }`}>
                      {u.displayName ? u.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                        <span>{u.displayName || 'Utilisateur'}</span>
                        {isCurrentUser && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 font-medium">
                            Vous
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate font-mono">
                        {u.email || 'Sans e-mail'}
                      </div>
                    </div>
                  </div>

                  {/* Right: Badges & Status */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                      isAdmin 
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/30' 
                        : isLeader
                        ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-[#1C1C22] text-gray-400 border-[#2E2E38]'
                    }`}>
                      {isAdmin ? 'Admin' : isLeader ? 'Responsable' : 'Membre'}
                    </span>

                    {isOriginallyAssigned ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>Assigné</span>
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1C1C24] text-gray-400 border border-[#2A2A34] font-medium">
                        Non assigné
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-400 text-xs">
              <Users className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-50" />
              <p>Aucun utilisateur ne correspond à ce critère de recherche.</p>
            </div>
          )}
        </div>

        {/* Quick Add by Email Section */}
        <div className="px-4 py-3 bg-[#0E0E12] border-t border-[#222228]">
          <form onSubmit={handleAddByEmail} className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="email"
              placeholder="Cocher rapidement un membre par e-mail..."
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              className="flex-1 bg-[#181820] border border-[#2A2A36] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!manualEmail.trim()}
              className="px-3 py-1.5 rounded-lg bg-[#22222C] hover:bg-[#2A2A38] text-white font-semibold text-xs border border-[#333342] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cocher
            </button>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#15151A] border-t border-[#222228] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            <span>{selectedCount} membre{selectedCount > 1 ? 's' : ''} assigné{selectedCount > 1 ? 's' : ''} à « {activeTargetGroup?.name} »</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#202028] hover:bg-[#2A2A34] text-gray-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAllAssignments}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Enregistrer les assignations</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
