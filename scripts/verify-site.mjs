import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { pageContracts } from "./page-contracts.mjs";

const root = resolve(import.meta.dirname, "..");

const forbiddenValues = [
  ["https://learnershift.github.io/fridge-menu/", "privacy.html"].join(""),
  ["stevensong332", "@gmail.com"].join(""),
];
const textExtensions = new Set([".css", ".html", ".json", ".md", ".mjs", ".txt", ".yaml", ".yml"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (entry.isFile() && textExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

function assertNoExternalResources(html, relativePath) {
  assert(!/<script\b|<style\b|\sstyle=|<(?:iframe|object|embed)\b/i.test(html), `${relativePath}: scripts, embeds, and inline CSS are forbidden`);
  assert(!/<link\b[^>]*rel="(?:preconnect|dns-prefetch|preload|modulepreload)"/i.test(html), `${relativePath}: resource hint or preload is forbidden`);

  for (const match of html.matchAll(/\b(?:src|href|poster|action|formaction)=["']([^"']+)["']/gi)) {
    const url = match[1];
    assert(url.startsWith("/") || url.startsWith("#") || url.startsWith("mailto:"), `${relativePath}: external resource or navigation URL is forbidden: ${url}`);
  }
}

for (const [relativePath, requiredText] of pageContracts) {
  const html = await readFile(resolve(root, relativePath), "utf8");

  assert(html.includes('<html lang="en">'), `${relativePath}: html lang must be en`);
  assert(html.includes('href="/styles.css"'), `${relativePath}: /styles.css is required`);
  assert((html.match(/rel="stylesheet"/g) ?? []).length === 1, `${relativePath}: exactly one stylesheet is allowed`);
  assertNoExternalResources(html, relativePath);
  assert(html.includes('class="site-header"'), `${relativePath}: site header is required`);
  assert(html.includes('class="wrap nav"'), `${relativePath}: wrapped navigation is required`);
  assert(html.includes('class="brand"'), `${relativePath}: brand is required`);
  assert(html.includes('class="nav-links"'), `${relativePath}: navigation links are required`);
  assert(html.includes('class="site-footer"'), `${relativePath}: site footer is required`);
  assert(html.includes('mailto:support@nuvopilot.com'), `${relativePath}: support email link is required`);
  assert(html.includes('LABONDANCE Co., Ltd.'), `${relativePath}: operator name is required`);
  if (relativePath !== "index.html") {
    assert(html.includes('<main class="wrap">'), `${relativePath}: wrapped main content is required`);
    assert(html.includes('<article class="content">'), `${relativePath}: content article is required`);
    assert(html.includes('class="eyebrow"'), `${relativePath}: eyebrow label is required`);
    assert(html.includes('class="muted"'), `${relativePath}: muted metadata is required`);
  }

  for (const expected of requiredText) {
    assert(html.includes(expected), `${relativePath}: missing ${JSON.stringify(expected)}`);
  }

}

const css = await readFile(resolve(root, "styles.css"), "utf8");
assert(!/@import\b|url\s*\(/i.test(css), "styles.css: imported or URL-backed resources are forbidden");

for (const file of await collectFiles(root)) {
  const content = await readFile(file, "utf8");
  const relativePath = relative(root, file);
  if (extname(file) === ".html") assertNoExternalResources(content, relativePath);
  for (const forbidden of forbiddenValues) {
    assert(!content.includes(forbidden), `${relativePath}: contains retired value ${JSON.stringify(forbidden)}`);
  }
}

console.log(`SITE_INTEGRITY_OK pages=${pageContracts.size}`);
