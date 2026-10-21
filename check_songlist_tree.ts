import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

const storage: Record<string, string> = {
  songbook_active_tab: 'repertoire'
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

async function checkSongList() {
  const App = (await import('./src/App')).default;
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement('div', { id: 'root' },
      React.createElement(App, null)
    )
  );
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const path = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2)";
  const el = doc.querySelector(path);
  console.log("SongList el found:", !!el);
  if (el) {
    console.log("el:", el.tagName, el.className);
    Array.from(el.children).forEach((c, idx) => {
      console.log(`  [${idx+1}] <${c.tagName} class="${c.className.slice(0, 50)}"> text: "${c.textContent?.trim().slice(0, 50)}"`);
      Array.from(c.children).forEach((gc, gidx) => {
        console.log(`    [${idx+1}.${gidx+1}] <${gc.tagName} class="${gc.className.slice(0, 50)}"> text: "${gc.textContent?.trim().slice(0, 50)}"`);
        Array.from(gc.children).forEach((ggc, ggidx) => {
          console.log(`      [${idx+1}.${gidx+1}.${ggidx+1}] <${ggc.tagName} class="${ggc.className.slice(0, 50)}"> text: "${ggc.textContent?.trim().slice(0, 50)}"`);
        });
      });
    });
  }
}

checkSongList().catch(console.error);
