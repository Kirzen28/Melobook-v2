import { JSDOM } from 'jsdom';
import React, { useState } from 'react';
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

async function testWithOpen() {
  const { AppProvider } = await import('./src/context/AppContext');
  const { MidiProvider } = await import('./src/context/MidiContext');
  const { SettingsView } = await import('./src/components/SettingsView');

  // Let's render SettingsView inside AppProvider & MidiProvider
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement('div', { id: 'root' },
      React.createElement('div', null,
        React.createElement('main', null,
          React.createElement('div', null,
            React.createElement(AppProvider, null,
              React.createElement(MidiProvider, null,
                React.createElement(SettingsView, null)
              )
            )
          )
        )
      )
    )
  );

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const sel1 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)";
  const sel2 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)";

  console.log("sel1 match:", !!doc.querySelector(sel1));
  console.log("sel2 match:", !!doc.querySelector(sel2));
  if (doc.querySelector(sel2)) {
    console.log("SEL2 HTML:", doc.querySelector(sel2)?.outerHTML);
  }
}

testWithOpen().catch(console.error);
