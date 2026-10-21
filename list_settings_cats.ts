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

const { SettingsView } = await import('./src/components/SettingsView');
const { AppProvider } = await import('./src/context/AppContext');
const { MidiProvider } = await import('./src/context/MidiContext');

const html = ReactDOMServer.renderToString(
  React.createElement(AppProvider, null,
    React.createElement(MidiProvider, null,
      React.createElement(SettingsView, null)
    )
  )
);

const cDom = new JSDOM(html);
const doc = cDom.window.document;

const panel = doc.querySelector(".w-full.lg\\:w-7\\/12");
console.log("Settings panel found:", !!panel);
if (panel) {
  for (let i = 0; i < panel.children.length; i++) {
    const ch = panel.children[i];
    console.log(`Cat ${i+1}: <${ch.tagName}> class="${ch.className.slice(0, 40)}" text="${ch.textContent?.trim().slice(0, 40)}"`);
  }
}
