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

async function testAll() {
  const App = (await import('./src/App')).default;
  const tabs = ['repertoire', 'setlists', 'stage', 'presentation', 'editor', 'groups', 'settings'];

  for (const tab of tabs) {
    storage['songbook_active_tab'] = tab;
    // Set some sample state
    storage['songbook_active_song_id'] = '1';
    storage['songbook_active_setlist_id'] = '1';
    
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement('div', { id: 'root' },
        React.createElement(App, null)
      )
    );
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Search for all elements that match selector or partial selector
    const sel2 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)";
    const match = doc.querySelector(sel2);
    if (match) {
      console.log(`FOUND SEL2 in TAB ${tab}:`);
      console.log(match.outerHTML);
    }

    // Also let's check any div containing buttons
    const allDivs = doc.querySelectorAll("main div");
    allDivs.forEach((div) => {
      // Check if div has buttons
      const buttons = div.querySelectorAll("button");
      if (buttons.length > 0 && div.children.length === 2) {
        // check selector path
      }
    });
  }
}

testAll().catch(console.error);
