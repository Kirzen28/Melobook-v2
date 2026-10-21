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

async function inspectCardDivChildren() {
  const App = (await import('./src/App')).default;
  storage['songbook_active_tab'] = 'settings';
  
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement('div', { id: 'root' },
      React.createElement(App, null)
    )
  );
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const basePath = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3)";
  const cardDiv = doc.querySelector(basePath);
  if (!cardDiv) return;

  console.log("CardDiv children count:", cardDiv.children.length);
  for (let i = 0; i < cardDiv.children.length; i++) {
    const c = cardDiv.children[i];
    console.log(`Child ${i+1}: <${c.tagName}> class="${c.className.slice(0, 50)}"`);
    for (let j = 0; j < c.children.length; j++) {
      const c2 = c.children[j];
      console.log(`  Subchild ${j+1}: <${c2.tagName}> class="${c2.className.slice(0, 50)}" text="${c2.textContent?.trim().slice(0, 40)}"`);
      for (let k = 0; k < c2.children.length; k++) {
        const c3 = c2.children[k];
        console.log(`    Sub-subchild ${k+1}: <${c3.tagName}> class="${c3.className.slice(0, 50)}" text="${c3.textContent?.trim().slice(0, 40)}"`);
      }
    }
  }
}

inspectCardDivChildren().catch(console.error);
