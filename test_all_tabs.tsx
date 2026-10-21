// Mock window and localStorage
const storage: Record<string, string> = {};
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

async function testTabs() {
  const React = (await import('react')).default;
  const ReactDOMServer = (await import('react-dom/server')).default;
  const App = (await import('./src/App')).default;

  const tabs = ['repertoire', 'setlists', 'stage', 'presentation', 'editor', 'groups', 'settings'];

  const sel1 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1)";
  const sel2 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3)";
  const sel3 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(5)";
  const sel4 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)";

  for (const tab of tabs) {
    storage['songbook_active_tab'] = tab;
    let html = '';
    try {
      html = ReactDOMServer.renderToStaticMarkup(
        React.createElement('div', { id: 'root' },
          React.createElement(App, null)
        )
      );
    } catch(err: any) {
      console.log(`Error rendering ${tab}:`, err.message);
      continue;
    }

    // Parse html into tree
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

    // Function to match a selector
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

    const docRoot = stack[0];
    const parts1 = sel1.split(' > ');
    const parts2 = sel2.split(' > ');
    const parts3 = sel3.split(' > ');
    const parts4 = sel4.split(' > ');

    const r1 = query(docRoot, parts1);
    const r2 = query(docRoot, parts2);
    const r3 = query(docRoot, parts3);
    const r4 = query(docRoot, parts4);

    console.log(`Tab ${tab}: r1=${r1.length}, r2=${r2.length}, r3=${r3.length}, r4=${r4.length}`);
    if (r1.length > 0 || r4.length > 0) {
      if (r1[0]) console.log(`  r1 raw: ${r1[0].raw.slice(0, 100)}`);
      if (r2[0]) console.log(`  r2 raw: ${r2[0].raw.slice(0, 100)}`);
      if (r3[0]) console.log(`  r3 raw: ${r3[0].raw.slice(0, 100)}`);
      if (r4[0]) console.log(`  r4 raw: ${r4[0].raw.slice(0, 100)}`);
    }
  }
}

testTabs().catch(console.error);
