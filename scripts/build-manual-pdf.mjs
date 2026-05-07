#!/usr/bin/env node
// Generates docs/USER_MANUAL.pdf and docs/USER_MANUAL_JA.pdf from the
// matching .md sources. Markdown rendered with markdown-it, embedded
// images resolved relative to docs/, then printed to PDF via Playwright
// chromium. Inline screenshots in docs/screenshots/ and docs/images/
// are read off disk and embedded as data: URIs so the resulting PDFs
// are self-contained.
//
// Usage: node scripts/build-manual-pdf.mjs
//        node scripts/build-manual-pdf.mjs --lang=ja
//        node scripts/build-manual-pdf.mjs --lang=en

import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DOCS = path.join(ROOT, "docs");

const VARIANTS = {
  ja: { md: "USER_MANUAL_JA.md", pdf: "USER_MANUAL_JA.pdf", title: "car-coating ユーザーマニュアル" },
  en: { md: "USER_MANUAL.md",    pdf: "USER_MANUAL.pdf",    title: "car-coating User Manual" },
};

const args = process.argv.slice(2);
const langArg = args.find((a) => a.startsWith("--lang="))?.split("=")[1];
const langs = langArg ? [langArg] : Object.keys(VARIANTS);

const md = new MarkdownIt({ html: false, linkify: true, breaks: false, typographer: true });

const MIME_BY_EXT = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
};

async function inlineImage(srcRel) {
  const candidates = [
    path.join(DOCS, srcRel),
    path.join(ROOT, srcRel),
  ];
  for (const p of candidates) {
    try {
      await access(p);
      const ext = path.extname(p).toLowerCase();
      const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
      const buf = await readFile(p);
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function buildHtml(lang) {
  const variant = VARIANTS[lang];
  if (!variant) throw new Error(`unknown lang: ${lang}`);

  const source = await readFile(path.join(DOCS, variant.md), "utf-8");
  let html = md.render(source);

  const imgRe = /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*)>/g;
  const replacements = [];
  let match;
  while ((match = imgRe.exec(html)) !== null) {
    const fullSrc = match[2];
    if (/^https?:\/\//.test(fullSrc) || fullSrc.startsWith("data:")) continue;
    replacements.push({ raw: match[0], pre: match[1], src: fullSrc, post: match[3] });
  }
  for (const r of replacements) {
    const inlined = await inlineImage(r.src);
    if (inlined) {
      html = html.replace(r.raw, `<img ${r.pre}src="${inlined}"${r.post}>`);
    }
  }

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${variant.title}</title>
<style>
  @page { size: A4; margin: 18mm 16mm 22mm; }
  html, body { font-family: "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Inter", "Helvetica Neue", Arial, sans-serif; color: #1a1a1a; }
  body { font-size: 11pt; line-height: 1.7; }
  h1 { font-size: 22pt; margin: 8pt 0 12pt; padding-bottom: 6pt; border-bottom: 2px solid #1a1a1a; page-break-after: avoid; }
  h2 { font-size: 16pt; margin: 18pt 0 8pt; padding-bottom: 4pt; border-bottom: 1px solid #ddd; page-break-after: avoid; }
  h3 { font-size: 13pt; margin: 14pt 0 6pt; page-break-after: avoid; }
  h4 { font-size: 11pt; margin: 10pt 0 4pt; page-break-after: avoid; }
  p, ul, ol { margin: 0 0 8pt; }
  ul, ol { padding-left: 18pt; }
  li { margin-bottom: 2pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 9.5pt; page-break-inside: avoid; }
  th, td { border: 1px solid #d0d0d0; padding: 4pt 8pt; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 700; }
  code { background: #f3f4f6; padding: 0 4pt; border-radius: 2pt; font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-size: 9.5pt; }
  pre { background: #0b1020; color: #e5e7eb; padding: 8pt 10pt; border-radius: 4pt; overflow: hidden; font-size: 9pt; page-break-inside: avoid; white-space: pre-wrap; word-wrap: break-word; }
  pre code { background: transparent; color: inherit; padding: 0; }
  blockquote { border-left: 3px solid #d0d0d0; color: #555; margin: 8pt 0; padding: 2pt 10pt; }
  a { color: #1d4ed8; text-decoration: none; }
  img { max-width: 100%; height: auto; border: 1px solid #e5e5ea; border-radius: 3pt; margin: 6pt 0; page-break-inside: avoid; }
  hr { border: 0; border-top: 1px solid #e5e5ea; margin: 14pt 0; }
</style>
</head>
<body>${html}</body>
</html>`;
}

async function renderPdf(lang) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    try {
      ({ chromium } = await import("@playwright/test"));
    } catch {
      throw new Error(
        "Playwright not installed. Run `npm install` then retry, " +
        "or install browsers via `npx playwright install chromium`."
      );
    }
  }

  const variant = VARIANTS[lang];
  const html = await buildHtml(lang);
  const outPath = path.join(DOCS, variant.pdf);

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      margin: { top: "18mm", bottom: "22mm", left: "16mm", right: "16mm" },
      headerTemplate: `<div style="font-size:8pt;color:#888;width:100%;text-align:right;padding-right:16mm">${variant.title}</div>`,
      footerTemplate: `<div style="font-size:8pt;color:#888;width:100%;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
    });
  } finally {
    await browser.close();
  }

  const buf = await readFile(outPath);
  return { outPath, bytes: buf.length };
}

async function main() {
  for (const lang of langs) {
    process.stdout.write(`Rendering ${lang}…`);
    const { outPath, bytes } = await renderPdf(lang);
    const rel = path.relative(ROOT, outPath);
    process.stdout.write(` wrote ${rel} (${(bytes / 1024).toFixed(1)} KB)\n`);
  }
  const stamp = {
    builtAt: new Date().toISOString(),
    variants: langs,
  };
  await writeFile(path.join(DOCS, ".manual-build.json"), JSON.stringify(stamp, null, 2) + "\n");
}

main().catch((err) => {
  console.error("[build-manual-pdf] failed:", err);
  process.exit(1);
});
