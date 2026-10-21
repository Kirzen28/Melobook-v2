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

async function searchEverywhere() {
  const App = (await import('./src/App')).default;
  const tabs = ['groups', 'repertoire', 'setlists', 'stage', 'presentation', 'editor', 'settings'];

  for (const tab of tabs) {
    storage['songbook_active_tab'] = tab;
    
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement('div', { id: 'root' },
        React.createElement(App, null)
      )
    );

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Check all elements in doc
    const all = doc.querySelectorAll('*');
    for (const el of Array.from(all)) {
      const divChildren = Array.from(el.children).filter(c => c.tagName.toLowerCase() === 'div');
      if (divChildren.length >= 5) {
        // Child 4
        const c4 = divChildren[3];
        // Check if c4 has a button
        const btn = c4.querySelector('button');
        if (btn) {
          // Compute full CSS selector of el
          function getSelector(node: any): string {
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

          function getBtnSelector(node: any, rootParent: any): string {
            const parts: string[] = [];
            let curr = node;
            while (curr && curr !== rootParent) {
              const tag = curr.tagName.toLowerCase();
              const sibs = Array.from(curr.parentElement.children).filter((c: any) => c.tagName.toLowerCase() === tag);
              const nth = sibs.indexOf(curr) + 1;
              parts.unshift(`${tag}:nth-of-type(${nth})`);
              curr = curr.parentElement;
            }
            return parts.join(' > ');
          }

          console.log(`\n========================================`);
          console.log(`TAB: ${tab}`);
          console.log(`Parent Selector: ${getSelector(el)}`);
          console.log(`Button Selector inside Parent: ${getBtnSelector(btn, el)}`);
          console.log(`Button text: "${btn.textContent?.trim()}" | class: "${btn.className}"`);
          console.log(`Child 1 text: "${divChildren[0].textContent?.trim().slice(0, 50)}"`);
          console.log(`Child 3 text: "${divChildren[2].textContent?.trim().slice(0, 50)}"`);
          console.log(`Child 4 text: "${divChildren[3].textContent?.trim().slice(0, 50)}"`);
          console.log(`Child 5 text: "${divChildren[4].textContent?.trim().slice(0, 50)}"`);
        }
      }
    }
  }
}

searchEverywhere().catch(console.error);
