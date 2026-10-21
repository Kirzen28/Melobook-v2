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

async function run() {
  const App = (await import('./src/App')).default;
  const tabs = ['repertoire', 'setlists', 'stage', 'presentation', 'editor', 'groups', 'settings'];

  const sel1 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)";
  const sel2 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)";

  for (const tab of tabs) {
    storage['songbook_active_tab'] = tab;
    // For settings, maybe also test with openCategories
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement('div', { id: 'root' },
        React.createElement(App, null)
      )
    );
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const el1 = doc.querySelector(sel1);
    const el2 = doc.querySelector(sel2);

    if (el1 || el2) {
      console.log(`=== FOUND IN TAB: ${tab} ===`);
      if (el2) {
        console.log(`SEL2 (Parent div):`);
        console.log(`  tag: ${el2.tagName}, class: "${el2.className}"`);
        console.log(`  outerHTML: ${el2.outerHTML.slice(0, 300)}...`);
      }
      if (el1) {
        console.log(`SEL1 (Target div):`);
        console.log(`  tag: ${el1.tagName}, class: "${el1.className}"`);
        console.log(`  outerHTML: ${el1.outerHTML.slice(0, 300)}...`);
      }
    }
  }
}

run().catch(console.error);
