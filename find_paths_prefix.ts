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

async function findPaths() {
  const App = (await import('./src/App')).default;
  const tabs = ['repertoire', 'setlists', 'stage', 'presentation', 'editor', 'groups', 'settings'];

  const targetPrefix = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2)";

  for (const tab of tabs) {
    storage['songbook_active_tab'] = tab;
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement('div', { id: 'root' },
        React.createElement(App, null)
      )
    );
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const allDivs = doc.querySelectorAll('div');
    allDivs.forEach(d => {
      let curr: Element | null = d;
      const parts: string[] = [];
      while (curr && curr.tagName.toLowerCase() !== 'body' && curr.tagName.toLowerCase() !== 'html') {
        const parent = curr.parentElement;
        if (!parent) {
          parts.unshift(`${curr.tagName.toLowerCase()}${curr.id ? '#' + curr.id : ''}`);
          break;
        }
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
      if (fullPath.startsWith(targetPrefix)) {
        console.log(`[${tab}] ${fullPath} | text: "${d.textContent?.trim().slice(0, 30)}" | tag: <${d.tagName} class="${d.className.slice(0, 30)}">`);
      }
    });
  }
}

findPaths().catch(console.error);
