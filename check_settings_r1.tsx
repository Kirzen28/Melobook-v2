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

  function query(node: any, pathParts: string[]): any[] {
    if (pathParts.length === 0) return [node];
    const [part, ...rest] = pathParts;
    const m = part.match(/^([a-zA-Z0-9\-#]+)(?::nth-of-type\((\d+)\))?$/);
    if (!m) return [];
    const tagWithId = m[1];
    const tag = tagWithId.split('#')[0];
    const id = tagWithId.includes('#') ? tagWithId.split('#')[1] : null;
    const nth = m[2] ? parseInt(m[2]) : null;

    const matchedChildren = (node.children || []).filter((c: any) => {
      if (c.tag !== tag) return false;
      if (id && !c.raw.includes(`id="${id}"`)) return false;
      return true;
    });

    let currentMatches: any[] = [];
    if (nth !== null) {
      if (matchedChildren[nth - 1]) currentMatches = [matchedChildren[nth - 1]];
    } else {
      currentMatches = matchedChildren;
    }

    let res: any[] = [];
    for (const cm of currentMatches) {
      res.push(...query(cm, rest));
    }
    return res;
  }

  const sel1 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3)";
  const parentMatches = query(stack[0], sel1.split(' > '));
  console.log("Parent matches count:", parentMatches.length);
  if (parentMatches[0]) {
    const p = parentMatches[0];
    console.log("Parent raw:", p.raw);
    console.log("Parent total children:", p.children.length);
    p.children.forEach((c: any, idx: number) => {
      console.log(`Child ${idx+1} <${c.tag}>: ${c.raw.slice(0, 80)}`);
    });
  }
}

check().catch(console.error);
