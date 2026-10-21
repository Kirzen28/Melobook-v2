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

async function test() {
  const App = (await import('./src/App')).default;
  const tabs = ['groups', 'repertoire', 'setlists', 'stage', 'presentation', 'editor', 'settings'];

  for (const tab of tabs) {
    storage['songbook_active_tab'] = tab;
    let html = '';
    try {
      html = ReactDOMServer.renderToStaticMarkup(
        React.createElement('div', { id: 'root' },
          React.createElement(App, null)
        )
      );
    } catch (e: any) {
      continue;
    }

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const all = doc.querySelectorAll('*');
    for (const el of Array.from(all)) {
      const divSibs = Array.from(el.children).filter(c => c.tagName.toLowerCase() === 'div');
      if (divSibs.length >= 5) {
        const d1 = divSibs[0];
        const d3 = divSibs[2];
        const d4 = divSibs[3];
        const d5 = divSibs[4];

        // check if d4 has direct child div which has direct child div which has button
        const btn = d4.querySelector(':scope > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)');
        if (btn) {
          function getPath(node: any) {
            const parts: string[] = [];
            let curr = node;
            while (curr && curr.parentElement) {
              const tag = curr.tagName.toLowerCase();
              const sibs = Array.from(curr.parentElement.children).filter((c: any) => c.tagName.toLowerCase() === tag);
              const nth = sibs.indexOf(curr) + 1;
              const id = curr.id ? '#' + curr.id : '';
              parts.unshift(`${tag}${id}:nth-of-type(${nth})`);
              curr = curr.parentElement;
            }
            return parts.join(' > ');
          }
          console.log(`\n🔥🔥🔥 MATCH FOUND IN TAB: ${tab} 🔥🔥🔥`);
          console.log(`Parent: <${el.tagName.toLowerCase()} class="${el.className}"> id="${el.id}"`);
          console.log(`Parent path: ${getPath(el)}`);
          console.log(`Button text: "${btn.textContent?.trim()}"`);
          console.log(`Div 1: ${d1.textContent?.trim().slice(0, 50)}`);
          console.log(`Div 3: ${d3.textContent?.trim().slice(0, 50)}`);
          console.log(`Div 5: ${d5.textContent?.trim().slice(0, 50)}`);
        }
      }
    }
  }
}

test().catch(console.error);
