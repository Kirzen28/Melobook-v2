import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('./rendered.html', 'utf-8');
const dom = new JSDOM(html);
const doc = dom.window.document;

let current: Element | null = doc.querySelector('div#root');
let depth = 1;
console.log(`Depth 1:`, current?.tagName);

const selParts = [
  "div#root:nth-of-type(1)",
  "div:nth-of-type(1)",
  "main:nth-of-type(1)",
  "div:nth-of-type(1)",
  "div:nth-of-type(1)",
  "div:nth-of-type(2)",
  "div:nth-of-type(2)",
  "div:nth-of-type(3)",
  "div:nth-of-type(2)",
  "div:nth-of-type(3)",
  "div:nth-of-type(2)"
];

for (let i = 1; i <= selParts.length; i++) {
  const q = selParts.slice(0, i).join(" > ");
  const el = doc.querySelector(q);
  console.log(`Level ${i} (${selParts[i-1]}): ${el ? 'FOUND' : 'MISSING'}`);
  if (el) {
    console.log(`   tag: <${el.tagName} class="${el.className.slice(0, 40)}"> (children: ${el.children.length})`);
    if (i >= 7) {
      console.log(`   HTML:\n${el.outerHTML.slice(0, 200)}...\n`);
    }
  } else {
    // Show siblings of previous level
    const prevQ = selParts.slice(0, i - 1).join(" > ");
    const prevEl = doc.querySelector(prevQ);
    if (prevEl) {
      console.log(`   Prev element has ${prevEl.children.length} children:`);
      Array.from(prevEl.children).forEach((c, idx) => {
        console.log(`     [${idx+1}] <${c.tagName} class="${c.className.slice(0, 40)}"> text: "${c.textContent?.trim().slice(0, 40)}"`);
      });
    }
    break;
  }
}
