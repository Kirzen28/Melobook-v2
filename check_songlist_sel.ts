import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('./rendered_songlist.html', 'utf-8');
const dom = new JSDOM(html);
const doc = dom.window.document;

const sel1 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)";
const sel2 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)";

const m1 = doc.querySelector(sel1);
const m2 = doc.querySelector(sel2);

console.log("Songlist match 1:", !!m1, m1?.outerHTML);
console.log("Songlist match 2:", !!m2, m2?.outerHTML);

if (!m1 && !m2) {
  // Let's find partial matches
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
  for (const pt of parts) {
    p += " " + pt;
    const next = doc.querySelector(p);
    if (next) {
      lastMatch = next;
      console.log(`Matched: ${p}`);
    } else {
      console.log(`Failed at: ${p}`);
      break;
    }
  }
}
