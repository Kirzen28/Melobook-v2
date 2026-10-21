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

async function findMatch() {
  const App = (await import('./src/App')).default;
  const tabs = ['repertoire', 'setlists', 'stage', 'presentation', 'editor', 'groups', 'settings'];

  const sel1 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)";
  const sel2 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)";

  for (const tab of tabs) {
    storage['songbook_active_tab'] = tab;
    // Try multiple states
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
      console.log(`MATCHED TAB: ${tab}`);
      console.log('el1:', el1?.outerHTML);
      console.log('el2:', el2?.outerHTML);
    }

    // Let's also check all elements in doc with tag div and check their CSS selector
    const allDivs = doc.querySelectorAll('div');
    allDivs.forEach(d => {
      // Build full path
      let curr: Element | null = d;
      const parts: string[] = [];
      while (curr && curr.tagName.toLowerCase() !== 'body' && curr.tagName.toLowerCase() !== 'html') {
        const parent = curr.parentElement;
        if (!parent) {
          parts.unshift(`${curr.tagName.toLowerCase()}${curr.id ? '#' + curr.id : ''}`);
          break;
        }
        // Count nth-of-type
        let index = 1;
        let sibling = curr.previousElementSibling;
        while (sibling) {
          if (sibling.tagName === curr.tagName) index++;
          sibling = sibling.previousElementSibling;
        }
        parts.unshift(`${curr.tagName.toLowerCase()}${curr.id ? '#' + curr.id : ''}:nth-of-type(${index})`);
        curr = parent;
      }
      const fullPath = parts.join(' > ');
      if (fullPath === sel1) {
        console.log(`[FULL PATH MATCH sel1 in ${tab}]:`, d.outerHTML);
      }
      if (fullPath === sel2) {
        console.log(`[FULL PATH MATCH sel2 in ${tab}]:`, d.outerHTML);
      }
    });
  }
}

findMatch().catch(console.error);
