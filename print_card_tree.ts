import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('./rendered.html', 'utf-8');
const dom = new JSDOM(html);
const doc = dom.window.document;

const card = doc.querySelector(".max-w-5xl > div:nth-of-type(2)");

function printTree(el: Element, depth = 0, index = 1, currentPath = "") {
  const indent = "  ".repeat(depth);
  const tag = el.tagName.toLowerCase();
  const step = `${tag}:nth-of-type(${index})`;
  const fullPath = currentPath ? `${currentPath} > ${step}` : step;
  const cl = typeof el.className === 'string' ? ` class="${el.className.slice(0, 40)}"` : "";
  const txt = el.textContent ? ` text="${el.textContent.trim().slice(0, 25).replace(/\n/g, ' ')}"` : "";
  console.log(`${indent}${step}${cl}${txt}`);
  
  // Also check if fullPath matches our selectors
  if (fullPath.endsWith("div:nth-of-type(3) > div:nth-of-type(2)") || fullPath.endsWith("div:nth-of-type(3)")) {
    console.log(`    >>> CANDIDATE: ${fullPath}`);
  }

  const tagCounts: Record<string, number> = {};
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    const ctag = child.tagName.toLowerCase();
    tagCounts[ctag] = (tagCounts[ctag] || 0) + 1;
    printTree(child, depth + 1, tagCounts[ctag], fullPath);
  }
}

if (card) {
  printTree(card, 0, 2, "div#root > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1)");
}
