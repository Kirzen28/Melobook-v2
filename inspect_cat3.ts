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

async function inspectCategory3() {
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
  console.log("CardDiv found:", !!cardDiv);
  if (cardDiv) {
    console.log("CardDiv HTML:\n", cardDiv.outerHTML);
  }
}

inspectCategory3().catch(console.error);
