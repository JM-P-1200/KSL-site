import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const pages = ["index.html", "about.html", "blog.html", "contact.html", "projects.html", "404.html"];
const assets = ["style.css", "app.js", "forms.js", "blog-renderer.js", "data/projects.json", "data/blogs.json", "vercel.json"];
const failures = [];

for (const file of [...pages, ...assets]) {
  try { await access(file, constants.R_OK); } catch { failures.push(`Missing ${file}`); }
}

for (const file of pages) {
  const html = await readFile(file, "utf8");
  if (!/<meta[^>]+viewport/i.test(html)) failures.push(`${file}: missing viewport`);
  if (!/<title>[^<]+<\/title>/i.test(html)) failures.push(`${file}: missing title`);
  if (/â€|â€™|ï¿½/.test(html)) failures.push(`${file}: contains mojibake`);
  for (const match of html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|tel:)/.test(target)) continue;
    try { await access(target, constants.R_OK); } catch { failures.push(`${file}: broken local reference ${target}`); }
  }
}

for (const file of ["data/projects.json", "data/blogs.json"]) JSON.parse(await readFile(file, "utf8"));
const tools = JSON.parse(await readFile("data/projects.json", "utf8")).tools;
const ids = new Set();
for (const tool of tools) {
  for (const key of ["id", "name", "category", "tagline", "url"]) if (!tool[key]) failures.push(`Tool missing ${key}`);
  if (ids.has(tool.id)) failures.push(`Duplicate tool id: ${tool.id}`);
  ids.add(tool.id);
}

if (failures.length) {
  console.error(failures.map((failure) => `✗ ${failure}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${pages.length} pages, ${assets.length} assets, and ${tools.length} directory entries passed.`);
