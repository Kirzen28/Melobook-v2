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

async function checkAll() {
  const React = (await import('react')).default;
  const ReactDOMServer = (await import('react-dom/server')).default;
  const { AppProvider } = await import('./src/context/AppContext');
  const { SettingsView } = await import('./src/components/SettingsView');
  const { SongReader } = await import('./src/components/SongReader');
  const { PresentationManager } = await import('./src/components/PresentationManager');
  const { PlanningManager } = await import('./src/components/PlanningManager');
  const { SongEditor } = await import('./src/components/SongEditor');

  const comps = [
    { name: 'SettingsView', comp: SettingsView },
    { name: 'SongReader', comp: SongReader },
    { name: 'PresentationManager', comp: PresentationManager },
    { name: 'PlanningManager', comp: PlanningManager },
    { name: 'SongEditor', comp: SongEditor }
  ];

  for (const c of comps) {
    let html = '';
    try {
      html = ReactDOMServer.renderToStaticMarkup(
        React.createElement('div', { id: 'root' },
          React.createElement('div', null,
            React.createElement('main', null,
              React.createElement('div', null,
                React.createElement(AppProvider, null,
                  React.createElement(c.comp, null)
                )
              )
            )
          )
        )
      );
    } catch(err: any) {
      console.log(`Error rendering ${c.name}:`, err.message);
      continue;
    }

    const tokens: any[] = [];
    let i = 0;
    while (i < html.length) {
      if (html[i] === '<') {
        const end = html.indexOf('>', i);
        tokens.push({ type: 'tag', text: html.slice(i, end + 1) });
        i = end + 1;
      } else {
        const next = html.indexOf('<', i);
        tokens.push({ type: 'text', text: next === -1 ? html.slice(i) : html.slice(i, next) });
        i = next === -1 ? html.length : next;
      }
    }

    const stack: any[] = [{ tag: 'DOC', children: [] }];
    const buttons: any[] = [];

    for (const t of tokens) {
      if (t.type === 'tag') {
        const raw = t.text;
        if (raw.startsWith('<!--')) continue;
        if (raw.startsWith('</')) {
          stack.pop();
        } else {
          const m = raw.match(/^<([a-zA-Z0-9\-]+)/);
          if (!m) continue;
          const tag = m[1].toLowerCase();
          const isVoid = ['input', 'img', 'br', 'hr', 'meta', 'link'].includes(tag) || raw.endsWith('/>');
          const node = { tag, raw, children: [], parent: stack[stack.length - 1] };
          stack[stack.length - 1].children.push(node);
          if (tag === 'button') buttons.push(node);
          if (!isVoid) stack.push(node);
        }
      }
    }

    function getPath(node: any) {
      const parts: string[] = [];
      let curr = node;
      while (curr && curr.parent) {
        const sibs = curr.parent.children.filter((c: any) => c.tag === curr.tag);
        const nth = sibs.indexOf(curr) + 1;
        const id = (curr.raw.match(/id="([^"]+)"/) || [])[1];
        parts.unshift(`${curr.tag}${id ? '#' + id : ''}:nth-of-type(${nth})`);
        curr = curr.parent;
      }
      return parts.join(' > ');
    }

    let found = false;
    buttons.forEach((b, idx) => {
      const p = getPath(b);
      if (p.includes('div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)')) {
        console.log(`\nMATCH IN ${c.name}! Button: ${b.raw.slice(0, 80)}`);
        console.log(`  Path: ${p}`);
        found = true;
      }
    });
    if (!found) {
      console.log(`No match in ${c.name} (${buttons.length} buttons checked)`);
    }
  }
}

checkAll().catch(console.error);
