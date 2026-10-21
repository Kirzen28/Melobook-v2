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

async function inspectCategory3Deep() {
  const App = (await import('./src/App')).default;
  storage['songbook_active_tab'] = 'settings';
  
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement('div', { id: 'root' },
      React.createElement(App, null)
    )
  );
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const sel2 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)";
  const sel1 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)";

  const el2 = doc.querySelector(sel2);
  const el1 = doc.querySelector(sel1);

  console.log("SEL2 MATCH:", !!el2);
  if (el2) {
    console.log("SEL2 tag:", el2.tagName, "class:", el2.className);
    console.log("SEL2 outerHTML:\n", el2.outerHTML);
  }

  console.log("\nSEL1 MATCH:", !!el1);
  if (el1) {
    console.log("SEL1 tag:", el1.tagName, "class:", el1.className);
    console.log("SEL1 outerHTML:\n", el1.outerHTML);
  }
}

inspectCategory3Deep().catch(console.error);
