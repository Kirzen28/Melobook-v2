export const STAGE_EASE = [0.16, 1, 0.3, 1] as const;

export const NAV_SPRING = {
  type: 'spring' as const,
  stiffness: 460,
  damping: 34,
  mass: 0.8,
};

export const VIEW_VARIANTS = {
  initial: {
    opacity: 0,
    y: 6,
    scale: 0.996,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.18,
      ease: STAGE_EASE,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.996,
    transition: {
      duration: 0.12,
      ease: [0.36, 0, 0.66, -0.04] as const,
    },
  },
};

export const POPOVER_MOTION = {
  initial: { opacity: 0, y: -4, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.96 },
  transition: { duration: 0.14, ease: STAGE_EASE },
};

export const MODAL_BACKDROP_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: 'easeOut' as const },
};

export const MODAL_PANEL_MOTION = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 6 },
  transition: { duration: 0.18, ease: STAGE_EASE },
};

export const SHEET_PANEL_MOTION = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 18, scale: 0.98 },
  transition: { duration: 0.18, ease: STAGE_EASE },
};
