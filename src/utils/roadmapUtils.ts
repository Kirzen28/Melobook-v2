import { RoadmapCategory, RoadmapItem, RoadmapStatus } from '../types';

export const MAIN_ADMIN_EMAIL = 'kriveravelasquez@rivera-marketing.com';

// Synced with firebase-blueprint.json & firestore.rules
export const ROADMAP_TITLE_MAX = 160;
export const ROADMAP_DESCRIPTION_MAX = 4000;
export const ROADMAP_COMMENT_MAX = 2000;
export const ROADMAP_MAX_IMAGES = 3;
export const ROADMAP_IMAGE_MAX_CHARS = 260000;
export const ROADMAP_IMAGE_TARGET_CHARS = 225000;

export const ROADMAP_COLUMNS: ReadonlyArray<{
  id: RoadmapStatus;
  label: string;
  emptyText: string;
}> = [
  {
    id: 'idea_bug',
    label: 'Idée / Bug',
    emptyText: 'Aucune idée ou anomalie proposée pour le moment.'
  },
  {
    id: 'in_progress',
    label: 'En cours',
    emptyText: 'Aucun chantier en cours de développement.'
  },
  {
    id: 'live',
    label: 'En ligne',
    emptyText: 'Aucune fonctionnalité déployée récemment.'
  }
];

export const isMainAppAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === MAIN_ADMIN_EMAIL;
};

export const canEditRoadmapItem = (
  item: Pick<RoadmapItem, 'authorId'>,
  uid?: string | null,
  isGuest = false
): boolean => {
  if (isGuest || !uid) return false;
  return item.authorId === uid;
};

export const canChangeRoadmapStatus = (
  email?: string | null,
  isGuest = false
): boolean => {
  if (isGuest) return false;
  return isMainAppAdmin(email);
};

export const sanitizeRoadmapInput = (input: {
  title: string;
  description: string;
  category: RoadmapCategory;
  images: string[];
}): {
  title: string;
  description: string;
  category: RoadmapCategory;
  images: string[];
} => {
  const title = input.title.trim().slice(0, ROADMAP_TITLE_MAX);
  const description = input.description.trim().slice(0, ROADMAP_DESCRIPTION_MAX);
  if (!title) {
    throw new Error('Le titre est obligatoire.');
  }
  if (!description) {
    throw new Error('La description est obligatoire.');
  }
  const category: RoadmapCategory = input.category === 'bug' ? 'bug' : 'idea';
  const images = (Array.isArray(input.images) ? input.images : [])
    .filter((img): img is string => typeof img === 'string' && img.length > 0 && img.length <= ROADMAP_IMAGE_MAX_CHARS)
    .slice(0, ROADMAP_MAX_IMAGES);

  return { title, description, category, images };
};

export const sanitizeRoadmapComment = (text: string): string => {
  const clean = text.trim().slice(0, ROADMAP_COMMENT_MAX);
  if (!clean) {
    throw new Error('Le commentaire ne peut pas être vide.');
  }
  return clean;
};

export const toDateSafe = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof value?.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatRoadmapDate = (value: any, nowMs = Date.now()): string => {
  const date = toDateSafe(value);
  if (!date) return 'À l’instant';
  const diffSec = Math.max(0, Math.floor((nowMs - date.getTime()) / 1000));
  if (diffSec < 60) return 'À l’instant';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export const compressRoadmapImage = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Seuls les fichiers image sont acceptés.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.readAsDataURL(file);
  });

  if (dataUrl.length <= ROADMAP_IMAGE_TARGET_CHARS && file.type !== 'image/heic') {
    return dataUrl;
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Format d'image non pris en charge."));
    image.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Compression image indisponible.');
  }

  let maxDim = 1280;
  let result = '';

  for (let pass = 0; pass < 4; pass++) {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height, 1));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.82, 0.68, 0.54, 0.4]) {
      const webp = canvas.toDataURL('image/webp', quality);
      const candidate = webp.startsWith('data:image/webp')
        ? webp
        : canvas.toDataURL('image/jpeg', quality);
      if (candidate.length <= ROADMAP_IMAGE_TARGET_CHARS) {
        return candidate;
      }
      result = candidate;
    }
    maxDim = Math.round(maxDim * 0.72);
  }

  if (result.length > ROADMAP_IMAGE_MAX_CHARS) {
    throw new Error("L'image reste trop volumineuse après compression.");
  }
  return result;
};
