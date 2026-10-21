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

async function inspect() {
  const React = (await import('react')).default;
  const ReactDOMServer = (await import('react-dom/server')).default;
  const App = (await import('./src/App')).default;

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement('div', { id: 'root' },
      React.createElement(App, null)
    )
  );

  // Parse HTML
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

  // Print paths of elements containing certain strings
  function search(node: any) {
    if (node.raw && node.raw.includes('Affichage &amp; Thème') || (node.children || []).some((c: any) => c.text && c.text.includes('Affichage & Thème'))) {
      console.log('Found Affichage & Thème:', getPath(node));
    }
    if (node.raw && node.raw.includes('Cartes des Chants') || (node.children || []).some((c: any) => c.text && c.text.includes('Cartes des Chants'))) {
      console.log('Found Cartes des Chants:', getPath(node));
    }
    if (node.raw && node.raw.includes('Contrôle MIDI &amp; Pédaliers') || (node.children || []).some((c: any) => c.text && c.text.includes('Contrôle MIDI & Pédaliers'))) {
      console.log('Found Contrôle MIDI:', getPath(node));
    }
    (node.children || []).forEach(search);
  }

  search(stack[0]);
}

inspect().catch(console.error);
