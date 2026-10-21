import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('./rendered.html', 'utf-8');
const dom = new JSDOM(html);
const doc = dom.window.document;

let curr: Element | null = doc.querySelector("div#root");
let path = "div#root";
console.log("Root children:", curr?.children.length);

const parts = [
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

for (let i = 0; i < parts.length; i++) {
  path += " > " + parts[i];
  const el = doc.querySelector(path);
  console.log(`Step ${i} (${parts[i]}): found=${!!el}, tagName=${el?.tagName}, class=${el?.className?.slice(0, 50)}`);
  if (!el && curr) {
    console.log(`Failed at step ${i}. Parent children count: ${curr.children.length}`);
    for (let j = 0; j < curr.children.length; j++) {
      console.log(`  child ${j}: <${curr.children[j].tagName.toLowerCase()}> class="${curr.children[j].className?.slice(0, 50)}" text="${curr.children[j].textContent?.slice(0, 40)}"`);
    }
    break;
  }
  curr = el;
}
