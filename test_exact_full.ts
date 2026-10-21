import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('./rendered.html', 'utf-8');
const dom = new JSDOM(html);
const doc = dom.window.document;

// Let's test if we modify rendered.html to remove currentGroup or check what div:nth-of-type(2) > div:nth-of-type(2) is
const c2 = doc.querySelector(".max-w-5xl > div:nth-of-type(2)");
if (c2) {
  // Let's check all paths from c2 that end with div:nth-of-type(3) or div:nth-of-type(2)
  console.log("c2 children count:", c2.children.length);
}

// Let's search across all elements in doc for any div that has buttons inside it
const allDivs = doc.querySelectorAll("div");
console.log("Total divs:", allDivs.length);

// Let's check each div and build its CSS path from root
for (const div of allDivs) {
  // Compute path
  let path = [];
  let curr: Element | null = div;
  while (curr && curr.id !== 'root' && curr.tagName !== 'BODY') {
    let parent: Element | null = curr.parentElement;
    if (!parent) break;
    // count nth-of-type
    const tag = curr.tagName.toLowerCase();
    let idx = 1;
    for (let sibling of parent.children) {
      if (sibling === curr) break;
      if (sibling.tagName.toLowerCase() === tag) idx++;
    }
    path.unshift(`${tag}:nth-of-type(${idx})`);
    curr = parent;
  }
  const fullSelector = "div#root:nth-of-type(1) > " + path.join(" > ");
  
  if (fullSelector === "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)") {
    console.log("EXACT MATCH 1 FOUND!");
    console.log(div.outerHTML);
  }
  if (fullSelector === "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(3)") {
    console.log("EXACT MATCH 2 FOUND!");
    console.log(div.outerHTML);
  }
}
