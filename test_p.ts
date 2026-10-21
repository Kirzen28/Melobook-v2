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

async function testAll() {
  const App = (await import('./src/App')).default;
  const tabs = ['repertoire', 'setlists', 'stage', 'presentation', 'editor', 'groups', 'settings'];

  const sel1 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)";
  const sel2 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)";

  for (const tab of tabs) {
    storage['songbook_active_tab'] = tab;
    // let's also mock selected song if needed
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement('div', { id: 'root' },
        React.createElement(App, null)
      )
    );
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Check parent
    const pSel = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3)";
    const p = doc.querySelector(pSel);
    if (p) {
      console.log(`\nTAB: ${tab}`);
      console.log(`P tag: <${p.tagName}> class: "${p.className}"`);
      const c2 = p.querySelector(":scope > div:nth-of-type(2)");
      if (c2) {
        console.log(`  c2 tag: <${c2.tagName}> class: "${c2.className}"`);
        const c3 = c2.querySelector(":scope > div:nth-of-type(3)");
        if (c3) {
          console.log(`    c3 tag: <${c3.tagName}> class: "${c3.className}"`);
          console.log(`    c3 HTML:\n${c3.outerHTML}\n`);
          const c3_2 = c3.querySelector(":scope > div:nth-of-type(2)");
          if (c3_2) {
            console.log(`      c3_2 tag: <${c3_2.tagName}> class: "${c3_2.className}"`);
            console.log(`      c3_2 HTML:\n${c3_2.outerHTML}\n`);
          }
        }
      }
    }
  }
}

testAll().catch(console.error);
