import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('./rendered_songlist.html', 'utf-8');
const dom = new JSDOM(html);
const doc = dom.window.document;

const p = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3)";
const el = doc.querySelector(p);
console.log("Found:", !!el, "Tag:", el?.tagName, "Class:", el?.className);
console.log("Children count:", el?.children.length);
if (el) {
  for (let i = 0; i < el.children.length; i++) {
    const c = el.children[i];
    console.log(`Child ${i+1}: <${c.tagName}> class="${c.className.slice(0, 40)}" text="${c.textContent?.trim().slice(0, 30)}"`);
  }
}
