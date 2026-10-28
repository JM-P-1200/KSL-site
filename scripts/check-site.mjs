import { readFile, access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { execFileSync } from "node:child_process";

const pages = [];
const failures = [];

async function collectHtml(dir = ".") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const filePath = join(dir, entry.name);
    if (entry.isDirectory()) await collectHtml(filePath);
    if (entry.isFile() && entry.name.endsWith(".html")) pages.push(normalize(filePath));
  }
}

await collectHtml();

const assets = [
  "style.css",
  "services.css",
  "privacy.css",
  "app.js",
  "forms.js",
  "blog-renderer.js",
  "data/projects.json",
  "data/blogs.json",
  "data/build-lab.json",
  "vercel.json",
  "favicon.svg",
  "og-image.svg",
  "site.webmanifest",
  "sitemap.xml",
  "build-lab/build-lab.js",
  "build-lab/core.mjs"
];

for (const file of [...pages, ...assets]) {
  try {
    await access(file, constants.R_OK);
  } catch {
    failures.push(`Missing ${file}`);
  }
}

for (const file of pages) {
  const html = await readFile(file, "utf8");
  if (!/<meta[^>]+viewport/i.test(html)) failures.push(`${file}: missing viewport`);
  if (!/<title>[^<]+<\/title>/i.test(html)) failures.push(`${file}: missing title`);
  if (/Ã¢â‚¬|Ã¢â‚¬â„¢|Ã¯Â¿Â½/.test(html)) failures.push(`${file}: contains mojibake`);
  for (const match of html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|tel:)/.test(target) || target === "#") continue;
    const resolved = target.startsWith("/") ? target.slice(1) : join(dirname(file), target);
    try {
      await access(resolved, constants.R_OK);
    } catch {
      failures.push(`${file}: broken local reference ${target}`);
    }
  }
}

for (const file of ["api/submit.js", "lib/submission-guard.js", "forms.js"]) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch {
    failures.push(`${file}: JavaScript syntax check failed`);
  }
}

const servicesHtml = await readFile("services.html", "utf8");
if (/<style\b|\sstyle\s*=/i.test(servicesHtml)) {
  failures.push("services.html: inline styles conflict with the deployed CSP");
}

for (const file of ["data/projects.json", "data/blogs.json", "data/build-lab.json"]) {
  JSON.parse(await readFile(file, "utf8"));
}

const tools = JSON.parse(await readFile("data/projects.json", "utf8")).tools;
const buildLab = JSON.parse(await readFile("data/build-lab.json", "utf8"));
if (buildLab.stages.length !== 9) failures.push("Build Lab must define exactly nine stages");
for (const stage of buildLab.stages) {
  const page = `build-lab/stages/${stage.slug}.html`;
  try {
    await access(page, constants.R_OK);
  } catch {
    failures.push(`Missing Build Lab stage page ${page}`);
  }
}

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

console.log(`✓ ${pages.length} pages, ${assets.length} assets, ${tools.length} directory entries, and ${buildLab.stages.length} Build Lab stages passed.`);
