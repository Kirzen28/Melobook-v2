import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppNotification } from '../types';

interface ToastItemProps {
  notification: AppNotification;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ notification, onDismiss }) => {
  const duration = notification.duration ?? 2200;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss, duration]);

  const type = notification.type || 'success';
  const label = notification.title || notification.message || 'Enregistré';

  const config = {
    success: {
      icon: Check,
      iconColor: 'text-emerald-400',
      border: 'border-emerald-500/25',
      bg: 'bg-[#18181B]/95',
    },
    info: {
      icon: Info,
      iconColor: 'text-cyan-400',
      border: 'border-cyan-500/25',
      bg: 'bg-[#18181B]/95',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      border: 'border-amber-500/25',
      bg: 'bg-[#18181B]/95',
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-rose-400',
      border: 'border-rose-500/25',
      bg: 'bg-[#18181B]/95',
    },
  }[type];

  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.95 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className={`pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} backdrop-blur-md border ${config.border} shadow-lg text-xs font-medium text-gray-200 select-none`}
      role="status"
    >
      <Icon className={`w-3.5 h-3.5 ${config.iconColor} shrink-0`} />
      <span className="whitespace-nowrap tracking-wide">{label}</span>
    </motion.div>
  );
};

export const SnackbarNotification: React.FC = () => {
  const { notifications, dismissNotification } = useApp();

  return (
    <aside
      aria-label="Notifications"
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[9999] flex flex-col items-start gap-1.5 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => (
          <ToastItem
            key={notif.id}
            notification={notif}
            onDismiss={dismissNotification}
          />
        ))}
      </AnimatePresence>
    </aside>
  );
};
