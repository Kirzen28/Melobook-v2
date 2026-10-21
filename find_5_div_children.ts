import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fs from 'fs';

// Let us mock localStorage and window
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

async function findCandidates() {
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
      console.log(`Error in ${tab}:`, e.message);
      continue;
    }

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Find all elements that have at least 5 child DIVs
    const allElements = doc.querySelectorAll('*');
    for (const el of Array.from(allElements)) {
      const divChildren = Array.from(el.children).filter(c => c.tagName.toLowerCase() === 'div');
      if (divChildren.length >= 5) {
        // Check if child 4 has div > div > button
        const c4 = divChildren[3];
        const btn = c4.querySelector('div > div > button');
        
        // Compute path of el
        function getPath(node: any): string {
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

        const path = getPath(el);
        console.log(`\n================================`);
        console.log(`TAB: ${tab}`);
        console.log(`Parent Path: ${path}`);
        console.log(`Parent tag: <${el.tagName.toLowerCase()} class="${el.className}">`);
        console.log(`Total div children: ${divChildren.length}`);
        console.log(`c4 has div > div > button: ${!!btn}`);
        if (btn) {
          console.log(`  BUTTON: ${btn.outerHTML.slice(0, 100)}`);
        }
        divChildren.slice(0, 5).forEach((c, idx) => {
          console.log(`  Div ${idx + 1}: <div class="${c.className}">: ${c.textContent?.trim().slice(0, 40)}`);
        });
      }
    }
  }
}

findCandidates().catch(console.error);
