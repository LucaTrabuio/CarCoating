/**
 * Scrape context (car model, coating type) for our downloaded case images.
 * Parses jirei.html pages looking for 車種 and 施工内容 labels near each image.
 *
 * Run: npx tsx scripts/scrape-case-context.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import https from 'https';
import http from 'http';

const IMAGES_DIR = join(import.meta.dirname || __dirname, '..', 'downloaded-case-images');

interface CaseEntry {
  imageUrl: string;
  car: string;
  coatingType: string;
  date: string | null;
}

function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) {
          const fullLoc = loc.startsWith('http') ? loc : `https://${new URL(url).host}${loc}`;
          fetchPage(fullLoc).then(resolve).catch(reject);
          return;
        }
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    }).on('error', reject).on('timeout', function(this: ReturnType<typeof client.get>) { this.destroy(); reject(new Error('timeout')); });
  });
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function extractAllCases(html: string, domain: string): Map<string, CaseEntry> {
  const caseMap = new Map<string, CaseEntry>();

  // Strategy: split HTML into blocks around each image, then look for labels
  // Find all img/jirei/ references
  const imgRegex = /img\/jirei\/([^"'\s<>]+)/g;
  let match;
  const imagePositions: { filename: string; pos: number }[] = [];

  while ((match = imgRegex.exec(html)) !== null) {
    imagePositions.push({ filename: match[1], pos: match.index });
  }

  for (let i = 0; i < imagePositions.length; i++) {
    const { filename, pos } = imagePositions[i];
    // Get the block of HTML before this image (up to previous image or 2000 chars)
    const blockStart = i > 0 ? imagePositions[i - 1].pos + 50 : Math.max(0, pos - 2000);
    const block = html.substring(blockStart, pos + 100);

    let car = '';
    let coatingType = '';

    // Look for 車種 label → value pattern
    // HTML uses <th>車種</th>\n<td>VALUE</td> or <p>車種</p><p>VALUE</p> etc.
    const carPatterns = [
      /車種<\/th>\s*<td[^>]*>([^<]+)/gi,
      /車種<\/[^>]+>\s*<[^>]+>([^<]+)/gi,
      /車種<\/p>\s*<p[^>]*>([^<]+)/gi,
      /車種<\/div>\s*<div[^>]*>([^<]+)/gi,
      /車種[：:]\s*([^\s<]+)/gi,
    ];

    for (const pat of carPatterns) {
      pat.lastIndex = 0;
      const m = pat.exec(block);
      if (m && m[1]) {
        car = stripTags(m[1]).replace(/&[a-z]+;/g, '').trim();
        break;
      }
    }

    // Look for 施工内容 label → value pattern
    const coatingPatterns = [
      /施工内容<\/th>\s*<td[^>]*>([^<]+)/gi,
      /施工内容<\/[^>]+>\s*<[^>]+>([^<]+)/gi,
      /施工内容<\/p>\s*<p[^>]*>([^<]+)/gi,
      /施工内容<\/div>\s*<div[^>]*>([^<]+)/gi,
      /施工内容[：:]\s*([^\s<]+[^\s<]*)/gi,
    ];

    for (const pat of coatingPatterns) {
      pat.lastIndex = 0;
      const m = pat.exec(block);
      if (m && m[1]) {
        coatingType = stripTags(m[1]).replace(/&[a-z]+;/g, '');
        break;
      }
    }

    // Try date from filename: YYYYMMDDHHMMSS format (first 8 digits = date)
    let date: string | null = null;
    const dateMatch = filename.match(/^(\d{4})(\d{2})(\d{2})/);
    if (dateMatch) {
      const y = parseInt(dateMatch[1]);
      const m = parseInt(dateMatch[2]);
      const d = parseInt(dateMatch[3]);
      if (y >= 2015 && y <= 2027 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        date = `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
      }
    }

    caseMap.set(filename, {
      imageUrl: `/case-images/${domain}/${filename}`,
      car,
      coatingType,
      date,
    });
  }

  return caseMap;
}

async function main() {
  const manifest = JSON.parse(readFileSync(join(IMAGES_DIR, 'manifest.json'), 'utf-8'));

  const allCases: Record<string, CaseEntry[]> = {};
  const domains = Object.keys(manifest);

  console.log(`Scraping context for ${domains.length} domains...\n`);

  for (const domain of domains) {
    const images = manifest[domain] as { filename: string }[];
    if (images.length === 0) continue;

    console.log(`${domain} (${images.length} images)`);

    try {
      const html = await fetchPage(`https://${domain}/jirei.html`);
      const caseMap = extractAllCases(html, domain);

      const cases: CaseEntry[] = [];
      for (const img of images) {
        const entry = caseMap.get(img.filename);
        if (entry) {
          cases.push(entry);
          const status = entry.car ? `${entry.car} | ${entry.coatingType} | ${entry.date}` : `no context | ${entry.date}`;
          console.log(`  ${img.filename}: ${status}`);
        } else {
          // Image not found on page, add with date from filename only
          let date: string | null = null;
          const dm = img.filename.match(/^(\d{4})(\d{2})(\d{2})/);
          if (dm) {
            const y = parseInt(dm[1]), m = parseInt(dm[2]), d = parseInt(dm[3]);
            if (y >= 2015 && y <= 2027 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
              date = `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
            }
          }
          cases.push({
            imageUrl: `/case-images/${domain}/${img.filename}`,
            car: '',
            coatingType: '',
            date,
          });
          console.log(`  ${img.filename}: not on page | ${date}`);
        }
      }
      allCases[domain] = cases;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ERROR: ${msg}`);
      allCases[domain] = images.map(i => {
        let date: string | null = null;
        const dm = i.filename.match(/^(\d{4})(\d{2})(\d{2})/);
        if (dm) {
          const y = parseInt(dm[1]), m = parseInt(dm[2]), d = parseInt(dm[3]);
          if (y >= 2015 && y <= 2027 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            date = `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
          }
        }
        return { imageUrl: `/case-images/${domain}/${i.filename}`, car: '', coatingType: '', date };
      });
    }

    await new Promise(r => setTimeout(r, 300));
  }

  const outPath = join(import.meta.dirname || __dirname, '..', 'src', 'data', 'store-cases.json');
  writeFileSync(outPath, JSON.stringify(allCases, null, 2));
  console.log(`\nSaved to ${outPath}`);

  let withCar = 0, withCoating = 0, total = 0;
  for (const cases of Object.values(allCases)) {
    for (const c of cases) {
      total++;
      if (c.car) withCar++;
      if (c.coatingType) withCoating++;
    }
  }
  console.log(`${withCar}/${total} have car model, ${withCoating}/${total} have coating type`);
}

main().catch(err => { console.error(err); process.exit(1); });
