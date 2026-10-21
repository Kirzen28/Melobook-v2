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

const cat3 = doc.querySelectorAll(".w-full.lg\\:w-7\\/12 > div")[2];
console.log("Cat 3 found:", !!cat3);
if (cat3) {
  function print(node: Element, depth = 0) {
    const indent = "  ".repeat(depth);
    const cl = typeof node.className === 'string' ? ` class="${node.className.slice(0, 35)}"` : '';
    const txt = node.textContent?.trim().slice(0, 20) ? ` "${node.textContent.trim().slice(0, 20).replace(/\n/g, ' ')}"` : '';
    console.log(`${indent}<${node.tagName.toLowerCase()}>${cl}${txt}`);
    for (let i = 0; i < node.children.length; i++) {
      print(node.children[i], depth + 1);
    }
  }
  print(cat3);
}
