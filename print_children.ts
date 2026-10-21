import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('./rendered.html', 'utf-8');
const dom = new JSDOM(html);
const doc = dom.window.document;

const container = doc.querySelector(".max-w-5xl");
if (container) {
  for (let i = 0; i < container.children.length; i++) {
    const child = container.children[i];
    console.log(`Container child ${i+1} (${child.tagName}): class="${child.className.slice(0, 50)}" text="${child.textContent?.trim().slice(0, 40)}"`);
    if (i === 1) { // The big card
      for (let j = 0; j < child.children.length; j++) {
        const c2 = child.children[j];
        console.log(`  Card child ${j+1} (${c2.tagName}): class="${c2.className.slice(0, 50)}" text="${c2.textContent?.trim().slice(0, 40)}"`);
        for (let k = 0; k < c2.children.length; k++) {
          const c3 = c2.children[k];
          console.log(`    C2 child ${k+1} (${c3.tagName}): class="${c3.className.slice(0, 50)}" text="${c3.textContent?.trim().slice(0, 40)}"`);
        }
      }
    }
  }
}
