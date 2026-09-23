/**
 * Robust cross-browser Fullscreen helper.
 * Prevents "TypeError: document.documentElement.requestFullscreen is not a function"
 * on mobile Safari / WebKit, embedded iframes, and older browsers.
 */

export function isNativeFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const docEl = document.documentElement as any;
  return Boolean(
    docEl.requestFullscreen ||
    docEl.webkitRequestFullscreen ||
    docEl.webkitRequestFullScreen ||
    docEl.mozRequestFullScreen ||
    docEl.msRequestFullscreen
  );
}

export function getIsNativeFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.webkitCurrentFullScreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

export function requestFullscreenSafe(element: Element = document.documentElement): void {
  if (typeof document === 'undefined') return;
  const el = element as any;
  const request =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.webkitRequestFullScreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;

  if (typeof request === 'function') {
    try {
      const res = request.call(el);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {
          // Fullscreen request rejected or disallowed (e.g. iframe policy)
        });
      }
    } catch {
      // Ignored: browser or permissions error
    }
  }
}

export function exitFullscreenSafe(): void {
  if (typeof document === 'undefined') return;
  const doc = document as any;
  const exit =
    doc.exitFullscreen ||
    doc.webkitExitFullscreen ||
    doc.webkitCancelFullScreen ||
    doc.mozCancelFullScreen ||
    doc.msExitFullscreen;

  if (typeof exit === 'function') {
    if (getIsNativeFullscreen()) {
      try {
        const res = exit.call(doc);
        if (res && typeof res.catch === 'function') {
          res.catch(() => {
            // Exit fullscreen rejected
          });
        }
      } catch {
        // Ignored
      }
    }
  }
}

export function addFullscreenChangeListener(callback: (isFullscreen: boolean) => void): () => void {
  if (typeof document === 'undefined') return () => {};

  const handler = () => {
    callback(getIsNativeFullscreen());
  };

  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  document.addEventListener('mozfullscreenchange', handler);
  document.addEventListener('MSFullscreenChange', handler);

  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
    document.removeEventListener('mozfullscreenchange', handler);
    document.removeEventListener('MSFullscreenChange', handler);
  };
}
