import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('./rendered.html', 'utf-8');
const dom = new JSDOM(html);
const doc = dom.window.document;

const r3 = doc.querySelector("div#root > div > main > div > div > div:nth-of-type(2) > div:nth-of-type(3)");
console.log("R3 found:", !!r3);
if (r3) {
  console.log("R3 tag:", r3.tagName, r3.className);
  console.log("R3 children:", r3.children.length);
  Array.from(r3.children).forEach((c, idx) => {
    console.log(`  [${idx+1}] <${c.tagName} class="${c.className.slice(0, 40)}"> text: "${c.textContent?.trim().slice(0, 50)}"`);
    Array.from(c.children).forEach((gc, gidx) => {
      console.log(`    [${idx+1}.${gidx+1}] <${gc.tagName} class="${gc.className.slice(0, 40)}"> text: "${gc.textContent?.trim().slice(0, 50)}"`);
      Array.from(gc.children).forEach((ggc, ggidx) => {
        console.log(`      [${idx+1}.${gidx+1}.${ggidx+1}] <${ggc.tagName} class="${ggc.className.slice(0, 40)}"> text: "${ggc.textContent?.trim().slice(0, 50)}"`);
      });
    });
  });
}
