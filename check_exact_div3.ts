import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

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

async function checkExact() {
  const App = (await import('./src/App')).default;
  const tabs = ['settings', 'repertoire', 'presentation', 'editor', 'groups', 'setlists'];

  for (const tab of tabs) {
    storage['songbook_active_tab'] = tab;
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement('div', { id: 'root' },
        React.createElement(App, null)
      )
    );
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const base = doc.querySelector("div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3)");
    if (base) {
      console.log(`\n=== TAB ${tab} ===`);
      console.log(`Base: <${base.tagName} class="${base.className}">`);
      Array.from(base.children).forEach((c, i) => {
        console.log(`  child ${i + 1} (<${c.tagName} class="${c.className}">) text: ${c.textContent?.trim().slice(0, 50)}`);
      });
      const c2 = base.children[1];
      if (c2) {
        console.log(`  child 2 has ${c2.children.length} children:`);
        Array.from(c2.children).forEach((gc, gi) => {
          console.log(`    grandchild ${gi + 1} (<${gc.tagName} class="${gc.className}">) text: ${gc.textContent?.trim().slice(0, 50)}`);
        });
      }
    }
  }
}

checkExact().catch(console.error);
