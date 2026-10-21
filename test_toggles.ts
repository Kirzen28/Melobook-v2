import { JSDOM } from 'jsdom';
import React from 'react';
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

async function testThemeToggle() {
  const App = (await import('./src/App')).default;
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement('div', { id: 'root' },
      React.createElement(App, null)
    )
  );
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const themeToggle = doc.querySelector('.theme-toggle-group');
  console.log("themeToggle found:", !!themeToggle);
  if (themeToggle) {
    let curr: Element | null = themeToggle;
    const parts: string[] = [];
    while (curr && curr.parentElement) {
      const tag = curr.tagName.toLowerCase();
      const sibs = Array.from(curr.parentElement.children).filter((c: any) => c.tagName.toLowerCase() === tag);
      const nth = sibs.indexOf(curr) + 1;
      const id = curr.id ? '#' + curr.id : '';
      parts.unshift(`${tag}${id}:nth-of-type(${nth})`);
      curr = curr.parentElement;
    }
    console.log("Full path of 1st theme toggle:", parts.join(' > '));
  }

  // All theme toggles
  const allToggles = doc.querySelectorAll('.theme-toggle-group');
  allToggles.forEach((t, i) => {
    let curr: Element | null = t;
    const parts: string[] = [];
    while (curr && curr.parentElement) {
      const tag = curr.tagName.toLowerCase();
      const sibs = Array.from(curr.parentElement.children).filter((c: any) => c.tagName.toLowerCase() === tag);
      const nth = sibs.indexOf(curr) + 1;
      const id = curr.id ? '#' + curr.id : '';
      parts.unshift(`${tag}${id}:nth-of-type(${nth})`);
      curr = curr.parentElement;
    }
    console.log(`Toggle ${i+1} path:`, parts.join(' > '));
    console.log(`Parent path:`, parts.slice(0, -1).join(' > '));
  });
}

testThemeToggle().catch(console.error);
