import { JSDOM } from 'jsdom';
import fs from 'fs';

const files = ['./rendered.html', './rendered_songlist.html'];
const sel1 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)";
const sel2 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)";

for (const file of files) {
  if (fs.existsSync(file)) {
    const html = fs.readFileSync(file, 'utf-8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const el1 = doc.querySelector(sel1);
    const el2 = doc.querySelector(sel2);
    console.log(`File: ${file} | sel1: ${!!el1} | sel2: ${!!el2}`);
    if (el2) {
      console.log('el2:', el2.outerHTML);
    }
    if (el1) {
      console.log('el1:', el1.outerHTML);
    }
  }
}
