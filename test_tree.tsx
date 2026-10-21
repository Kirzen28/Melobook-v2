// Mock window and localStorage
const storage: Record<string, string> = {
  songbook_active_tab: 'repertoire'
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

async function main() {
  const React = (await import('react')).default;
  const ReactDOMServer = (await import('react-dom/server')).default;
  const { AppProvider } = await import('./src/context/AppContext');
  const { SongList } = await import('./src/components/SongList');
  const fs = (await import('fs')).default;

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement('div', { id: 'root' },
      React.createElement('div', null,
        React.createElement('main', null,
          React.createElement('div', null,
            React.createElement(AppProvider, null,
              React.createElement(SongList, null)
            )
          )
        )
      )
    )
  );

  console.log("RENDERED HTML LENGTH:", html.length);
  fs.writeFileSync('rendered_songlist.html', html);
}

main().catch(console.error);
