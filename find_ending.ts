import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

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

async function testSettings() {
  const App = (await import('./src/App')).default;
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement('div', { id: 'root' },
      React.createElement(App, null)
    )
  );
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const targetSel2 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)";
  
  // Let's check all elements that have path ending in div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)
  const all = doc.querySelectorAll('*');
  for (const el of Array.from(all)) {
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
    const p = getPath(el);
    if (p.endsWith('div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)')) {
      console.log('MATCH ENDING:', p);
      console.log('el HTML:', el.outerHTML);
    }
  }
}

testSettings().catch(console.error);
