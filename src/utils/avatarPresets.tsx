import React from 'react';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  displayName?: string | null;
  sizeClass?: string;
  iconClass?: string;
  fallbackClassName?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  displayName,
  sizeClass = 'w-7 h-7',
  iconClass = 'w-4 h-4',
  fallbackClassName = 'bg-[#EDF1F5] dark:bg-[#1C1C1E] text-slate-900 dark:text-white border border-slate-300 dark:border-[#333]'
}) => {
  const trimmed = (displayName || '').trim();
  const initial = trimmed ? trimmed.charAt(0).toUpperCase() : '';

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold shrink-0 ${fallbackClassName}`}
    >
      {initial ? (
        <span>{initial}</span>
      ) : (
        <UserIcon className={iconClass} />
      )}
    </div>
  );
};
