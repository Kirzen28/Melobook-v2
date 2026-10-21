// Mock window and localStorage
const storage: Record<string, string> = {
  songbook_active_tab: 'settings'
};
(globalThis as any).window = globalThis;
(globalThis as any).window.addEventListener = () => {};
(globalThis as any).window.removeEventListener = () => {};
(globalThis as any).window.location = { search: '', hash: '', origin: 'http://localhost:3000' };
(globalThis as any).localStorage = {
  getItem: (k: string) => storage[k] || null,
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => {}
};

async function check() {
  const React = (await import('react')).default;
  const ReactDOMServer = (await import('react-dom/server')).default;
  const { AppProvider } = await import('./src/context/AppContext');
  const { SettingsView } = await import('./src/components/SettingsView');

  // Let us inspect the 3rd card in SettingsView:
  // Card 1: Display
  // Card 2: Interactive preview button
  // Card 3: Cartes de Chants (line 1876)!
  // In Card 3, when openCategories.song_cards is true:
  // Let us see what is inside Card 3!
}
check();
