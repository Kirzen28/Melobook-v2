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

async function inspectTabs() {
  const App = (await import('./src/App')).default;
  const tabs = ['repertoire', 'setlists', 'stage', 'presentation', 'editor', 'groups', 'settings'];

  for (const tab of tabs) {
    storage['songbook_active_tab'] = tab;
    
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement('div', { id: 'root' },
        React.createElement(App, null)
      )
    );
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Check main > div:nth-of-type(1)
    const tabRoot = doc.querySelector("div#root > div > main > div:nth-of-type(1)");
    if (!tabRoot) continue;

    console.log(`\n================== TAB: ${tab} ==================`);
    const c1 = tabRoot.querySelector(":scope > div:nth-of-type(1)");
    if (c1) {
      console.log(`L1: <${c1.tagName} class="${c1.className.slice(0, 50)}"> (children: ${c1.children.length})`);
      const c2 = c1.querySelector(":scope > div:nth-of-type(2)");
      if (c2) {
        console.log(`  L2: <${c2.tagName} class="${c2.className.slice(0, 50)}"> (children: ${c2.children.length})`);
        const c3 = c2.querySelector(":scope > div:nth-of-type(2)");
        if (c3) {
          console.log(`    L3: <${c3.tagName} class="${c3.className.slice(0, 50)}"> (children: ${c3.children.length})`);
          const c4 = c3.querySelector(":scope > div:nth-of-type(3)");
          if (c4) {
            console.log(`      L4: <${c4.tagName} class="${c4.className.slice(0, 50)}"> (children: ${c4.children.length})`);
            const c5 = c4.querySelector(":scope > div:nth-of-type(2)");
            if (c5) {
              console.log(`        L5: <${c5.tagName} class="${c5.className.slice(0, 50)}"> (children: ${c5.children.length})`);
              const c6 = c5.querySelector(":scope > div:nth-of-type(3)");
              if (c6) {
                console.log(`          L6: <${c6.tagName} class="${c6.className.slice(0, 50)}"> (children: ${c6.children.length})`);
                console.log(`          L6 outerHTML: ${c6.outerHTML}`);
                const c7 = c6.querySelector(":scope > div:nth-of-type(2)");
                if (c7) {
                  console.log(`            L7: <${c7.tagName} class="${c7.className.slice(0, 50)}">`);
                  console.log(`            L7 outerHTML: ${c7.outerHTML}`);
                }
              }
            }
          }
        }
      }
    }
  }
}

inspectTabs().catch(console.error);
