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
const { SongList } = await import('./src/components/SongList');
const { SetlistManager } = await import('./src/components/SetlistManager');
const { GroupManager } = await import('./src/components/GroupManager');
const { AppProvider } = await import('./src/context/AppContext');
const { MidiProvider } = await import('./src/context/MidiContext');

function checkComp(name: string, comp: React.ReactElement) {
  try {
    const html = ReactDOMServer.renderToString(
      React.createElement(AppProvider, null,
        React.createElement(MidiProvider, null, comp)
      )
    );
    const cDom = new JSDOM(html);
    const doc = cDom.window.document;
    
    const relSel1 = ":scope > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)";
    const relSel2 = ":scope > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)";

    const rootEl = doc.body.firstElementChild;
    if (!rootEl) return;
    
    let m1 = rootEl.querySelector(relSel1);
    let m2 = rootEl.querySelector(relSel2);
    if (m1 || m2) {
      console.log(`FOUND in ${name}:`);
      console.log("m1:", m1?.outerHTML);
      console.log("m2:", m2?.outerHTML);
    } else {
      const child1 = rootEl.firstElementChild;
      if (child1) {
        let cm1 = child1.querySelector(relSel1);
        let cm2 = child1.querySelector(relSel2);
        if (cm1 || cm2) {
          console.log(`FOUND in ${name} (child1):`);
          console.log("cm1:", cm1?.outerHTML);
          console.log("cm2:", cm2?.outerHTML);
        }
      }
    }
  } catch (e: any) {
    console.error(`Error in ${name}:`, e.message);
  }
}

checkComp('GroupManager', React.createElement(GroupManager));
checkComp('SettingsView', React.createElement(SettingsView));
checkComp('SongList', React.createElement(SongList));
checkComp('SetlistManager', React.createElement(SetlistManager));
