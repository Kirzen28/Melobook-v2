import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:3000'
});
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).navigator = dom.window.navigator;
(globalThis as any).localStorage = dom.window.localStorage;
(globalThis as any).sessionStorage = dom.window.sessionStorage;
dom.window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }) as any;

const App = (await import('./src/App')).default;
const { AppProvider } = await import('./src/context/AppContext');
const { MidiProvider } = await import('./src/context/MidiContext');

const tabs = ['songs', 'setlists', 'groups', 'settings', 'bible'];
for (const tab of tabs) {
  dom.window.localStorage.setItem('songbook_active_tab', tab);
  try {
    const html = ReactDOMServer.renderToString(
      React.createElement(AppProvider, null,
        React.createElement(MidiProvider, null,
          React.createElement(App, null)
        )
      )
    );
    const tabDom = new JSDOM(html);
    const doc = tabDom.window.document;
    
    const sel1 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)";
    const sel2 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)";

    const m1 = doc.querySelector(sel1);
    const m2 = doc.querySelector(sel2);

    if (m1 || m2) {
      console.log(`FOUND IN TAB ${tab}:`);
      console.log("m1:", m1?.outerHTML?.slice(0, 500));
      console.log("m2:", m2?.outerHTML?.slice(0, 500));
    } else {
      // Find where it diverges
      let p = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1)";
      const parts = [
        "> div:nth-of-type(2)",
        "> div:nth-of-type(2)",
        "> div:nth-of-type(3)",
        "> div:nth-of-type(2)",
        "> div:nth-of-type(3)",
        "> div:nth-of-type(2)"
      ];
      let lastMatch = doc.querySelector(p);
      let matchedSteps = 0;
      for (const pt of parts) {
        p += " " + pt;
        const next = doc.querySelector(p);
        if (next) {
          lastMatch = next;
          matchedSteps++;
        } else {
          break;
        }
      }
      console.log(`Tab ${tab}: matched ${matchedSteps}/${parts.length} steps. Last tag=${lastMatch?.tagName}, class=${lastMatch?.className?.slice(0, 40)}`);
    }
  } catch (e: any) {
    console.error(`Error in tab ${tab}:`, e.message);
  }
}
