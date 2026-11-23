import React from 'react';
import { User as UserIcon } from 'lucide-react';

export type SvgAvatarIconId =
  | 'guitar'
  | 'electric'
  | 'piano'
  | 'mic'
  | 'drums'
  | 'violin'
  | 'sax'
  | 'headphones'
  | 'clef'
  | 'waveform'
  | 'choir'
  | 'flame';

export type SvgAvatarColorId =
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'slate';

export interface SvgAvatarIconMeta {
  id: SvgAvatarIconId;
  label: string;
}

export interface SvgAvatarColorMeta {
  id: SvgAvatarColorId;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  swatchClass: string;
}

export const SVG_AVATAR_ICONS: SvgAvatarIconMeta[] = [
  { id: 'mic', label: 'Chant' },
  { id: 'guitar', label: 'Guitare' },
  { id: 'electric', label: 'Électrique' },
  { id: 'piano', label: 'Piano' },
  { id: 'drums', label: 'Batterie' },
  { id: 'violin', label: 'Violon' },
  { id: 'sax', label: 'Saxo' },
  { id: 'headphones', label: 'Régie' },
  { id: 'clef', label: 'Clé de sol' },
  { id: 'waveform', label: 'Audio' },
  { id: 'choir', label: 'Chœur' },
  { id: 'flame', label: 'Louange' }
];

export const SVG_AVATAR_COLORS: SvgAvatarColorMeta[] = [
  {
    id: 'blue',
    label: 'Bleu',
    bgClass: 'bg-blue-600/25',
    textClass: 'text-blue-300',
    borderClass: 'border-blue-500/45',
    swatchClass: 'bg-blue-500'
  },
  {
    id: 'indigo',
    label: 'Indigo',
    bgClass: 'bg-indigo-600/25',
    textClass: 'text-indigo-300',
    borderClass: 'border-indigo-500/45',
    swatchClass: 'bg-indigo-500'
  },
  {
    id: 'purple',
    label: 'Violet',
    bgClass: 'bg-purple-600/25',
    textClass: 'text-purple-300',
    borderClass: 'border-purple-500/45',
    swatchClass: 'bg-purple-500'
  },
  {
    id: 'emerald',
    label: 'Émeraude',
    bgClass: 'bg-emerald-600/25',
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-500/45',
    swatchClass: 'bg-emerald-500'
  },
  {
    id: 'cyan',
    label: 'Cyan',
    bgClass: 'bg-cyan-600/25',
    textClass: 'text-cyan-300',
    borderClass: 'border-cyan-500/45',
    swatchClass: 'bg-cyan-500'
  },
  {
    id: 'amber',
    label: 'Or',
    bgClass: 'bg-amber-500/25',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-400/45',
    swatchClass: 'bg-amber-400'
  },
  {
    id: 'rose',
    label: 'Rose',
    bgClass: 'bg-rose-600/25',
    textClass: 'text-rose-300',
    borderClass: 'border-rose-500/45',
    swatchClass: 'bg-rose-500'
  },
  {
    id: 'slate',
    label: 'Ardoise',
    bgClass: 'bg-[#22222B]',
    textClass: 'text-gray-200',
    borderClass: 'border-[#3A3A48]',
    swatchClass: 'bg-slate-400'
  }
];

const ICON_SET = new Set<string>(SVG_AVATAR_ICONS.map(i => i.id));
const COLOR_MAP = new Map<string, SvgAvatarColorMeta>(SVG_AVATAR_COLORS.map(c => [c.id, c]));

export const encodeSvgAvatar = (iconId: SvgAvatarIconId, colorId: SvgAvatarColorId): string => {
  return `svg:${iconId}:${colorId}`;
};

export const parseSvgAvatar = (
  value?: string | null
): { iconId: SvgAvatarIconId; color: SvgAvatarColorMeta } | null => {
  if (!value || typeof value !== 'string' || !value.startsWith('svg:')) return null;
  const parts = value.split(':');
  if (parts.length !== 3) return null;
  const [, rawIcon, rawColor] = parts;
  if (!ICON_SET.has(rawIcon)) return null;
  const color = COLOR_MAP.get(rawColor) || SVG_AVATAR_COLORS[0];
  return { iconId: rawIcon as SvgAvatarIconId, color };
};

export const SvgAvatarGlyph: React.FC<{ iconId: SvgAvatarIconId; className?: string }> = ({
  iconId,
  className = 'w-4 h-4'
}) => {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.85,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true as const
  };

  switch (iconId) {
    case 'mic':
      return (
        <svg {...common}>
          <rect x="9" y="2.5" width="6" height="11" rx="3" fill="currentColor" fillOpacity="0.18" />
          <path d="M5.5 10.5a6.5 6.5 0 0 0 13 0" />
          <path d="M12 17v4.5" />
          <path d="M8.5 21.5h7" />
        </svg>
      );
    case 'guitar':
      return (
        <svg {...common}>
          <path d="m19.5 4.5-3 3" />
          <path d="M17.5 3.5 20.5 6.5" />
          <path
            d="M14.5 9.5c-1.8-.9-4.1-.2-5.2 1.5-.7 1.1-.8 2.3-2.1 3.1-1.6 1-2.5 3-1.6 4.9.8 1.6 2.8 2.5 4.6 1.8 1.5-.6 2.3-1.8 3.2-2.7 1.2-1.2 2.9-1.1 4-2.5 1.3-1.7.9-4.4-1.1-5.6Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <circle cx="11.5" cy="14.5" r="1.4" />
        </svg>
      );
    case 'electric':
      return (
        <svg {...common}>
          <path d="m19 3-5.5 5.5" />
          <path d="M17.5 2.5 21.5 6.5" />
          <path
            d="M12.5 7.5 9 10.2c-.8.6-2 .5-2.7-.2-.8.9-.9 2.3-.2 3.3l-2.3 2.7c-.8 1-.7 2.5.3 3.4l1.5 1.5c.9.9 2.4 1 3.4.2l2.7-2.2c1 .6 2.4.5 3.2-.4-.7-.7-.8-1.9-.2-2.7L17.5 12"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <path d="m8.8 15.2 1.8-1.8" />
        </svg>
      );
    case 'piano':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" fill="currentColor" fillOpacity="0.12" />
          <path d="M7.5 5v8.5" />
          <path d="M12 5v8.5" />
          <path d="M16.5 5v8.5" />
          <path d="M9.5 13.5V19" />
          <path d="M14.5 13.5V19" />
          <rect x="6.5" y="5" width="2" height="7.5" rx="0.5" fill="currentColor" />
          <rect x="11" y="5" width="2" height="7.5" rx="0.5" fill="currentColor" />
          <rect x="15.5" y="5" width="2" height="7.5" rx="0.5" fill="currentColor" />
        </svg>
      );
    case 'drums':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12.5" rx="8" ry="4.5" fill="currentColor" fillOpacity="0.16" />
          <path d="M4 12.5v4c0 2.5 3.6 4.5 8 4.5s8-2 8-4.5v-4" />
          <path d="m5 4.5 5.5 5" />
          <path d="m19 4.5-5.5 5" />
          <circle cx="10.5" cy="9.5" r="0.8" fill="currentColor" />
          <circle cx="13.5" cy="9.5" r="0.8" fill="currentColor" />
        </svg>
      );
    case 'violin':
      return (
        <svg {...common}>
          <path d="m18.5 3.5-3 3" />
          <path
            d="M15 7c-1.7-.7-3.6.3-4.1 2-.3 1-.9 1.6-1.9 2-1.8.7-3 2.5-2.8 4.5.2 2.2 2 4 4.2 4.2 2 .2 3.8-1 4.5-2.8.4-1 1-1.6 2-1.9 1.7-.5 2.7-2.4 2-4.1"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <path d="m4 20 15-15" />
        </svg>
      );
    case 'sax':
      return (
        <svg {...common}>
          <path d="M6 4h3.5a2 2 0 0 1 2 2v8.5a3 3 0 0 0 6 0V12" />
          <path d="M15.5 12.5c0-1.2 1.2-2 2.5-2s2.5.8 2.5 2-1.2 2-2.5 2-2.5-.8-2.5-2Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M11.5 9h1.5" />
          <path d="M11.5 12h1.5" />
        </svg>
      );
    case 'headphones':
      return (
        <svg {...common}>
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
          <rect x="3" y="13.5" width="3.5" height="6" rx="1.5" fill="currentColor" fillOpacity="0.22" />
          <rect x="17.5" y="13.5" width="3.5" height="6" rx="1.5" fill="currentColor" fillOpacity="0.22" />
        </svg>
      );
    case 'clef':
      return (
        <svg {...common}>
          <path d="M9 18V5l10-2v12" />
          <circle cx="6.5" cy="18" r="2.5" fill="currentColor" fillOpacity="0.22" />
          <circle cx="16.5" cy="15.5" r="2.5" fill="currentColor" fillOpacity="0.22" />
        </svg>
      );
    case 'waveform':
      return (
        <svg {...common}>
          <path d="M4 10v4" />
          <path d="M8 7v10" />
          <path d="M12 4v16" />
          <path d="M16 7v10" />
          <path d="M20 10v4" />
        </svg>
      );
    case 'choir':
      return (
        <svg {...common}>
          <circle cx="12" cy="7" r="2.5" fill="currentColor" fillOpacity="0.2" />
          <path d="M7.5 18.5a4.5 4.5 0 0 1 9 0" />
          <circle cx="5.5" cy="9.5" r="1.8" />
          <path d="M2.5 18.5a3.2 3.2 0 0 1 4-3.1" />
          <circle cx="18.5" cy="9.5" r="1.8" />
          <path d="M21.5 18.5a3.2 3.2 0 0 0-4-3.1" />
        </svg>
      );
    case 'flame':
      return (
        <svg {...common}>
          <path
            d="M12 2.8c.4 3-1.4 4.7-2.9 6.3-1.3 1.4-2.1 2.7-2.1 4.7a5 5 0 0 0 10 0c0-2.6-1.5-4.3-2.9-5.7-.4 1.3-1.3 2-2.2 2.2.8-2.3.5-4.9.1-7.5Z"
            fill="currentColor"
            fillOpacity="0.2"
          />
        </svg>
      );
  }
};

interface UserAvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  sizeClass?: string;
  iconClass?: string;
  fallbackClassName?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoURL,
  displayName,
  sizeClass = 'w-7 h-7',
  iconClass = 'w-4 h-4',
  fallbackClassName = 'bg-[#1C1C1E] text-white border border-[#333]'
}) => {
  const parsed = parseSvgAvatar(photoURL);

  if (parsed) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center shrink-0 border ${parsed.color.bgClass} ${parsed.color.textClass} ${parsed.color.borderClass}`}
      >
        <SvgAvatarGlyph iconId={parsed.iconId} className={iconClass} />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold shrink-0 ${fallbackClassName}`}
    >
      {displayName ? (
        <span>{displayName.trim().charAt(0).toUpperCase()}</span>
      ) : (
        <UserIcon className={iconClass} />
      )}
    </div>
  );
};
