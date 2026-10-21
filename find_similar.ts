import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('./rendered.html', 'utf-8');
const dom = new JSDOM(html);
const doc = dom.window.document;

function getSelector(el: Element): string {
  let path = [];
  let curr: Element | null = el;
  while (curr && curr.id !== 'root' && curr.tagName !== 'BODY') {
    let parent: Element | null = curr.parentElement;
    if (!parent) break;
    const tag = curr.tagName.toLowerCase();
    let idx = 1;
    for (let sibling of parent.children) {
      if (sibling === curr) break;
      if (sibling.tagName.toLowerCase() === tag) idx++;
    }
    path.unshift(`${tag}:nth-of-type(${idx})`);
    curr = parent;
  }
  return "div#root:nth-of-type(1) > " + path.join(" > ");
}

const target1 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)";
const target2 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)";

console.log("Looking for targets or similar:");
const divs = doc.querySelectorAll("div");
for (const div of divs) {
  const sel = getSelector(div);
  // Check similarity
  if (sel.includes("div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)")) {
    console.log("MATCH PATTERN:", sel);
    console.log("Text:", div.textContent?.trim().slice(0, 60));
    console.log("HTML:", div.outerHTML.slice(0, 150));
  }
}
