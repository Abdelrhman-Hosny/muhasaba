// scripts/gen-azkar.mjs
// Regenerates src/domain/azkarData.ts from azkar.csv.
// Run: node scripts/gen-azkar.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSV = join(root, 'azkar.csv');
const OUT = join(root, 'src', 'domain', 'azkarData.ts');

const MORNING_TITLE = 'أذكار الصباح';
const EVENING_TITLE = 'أذكار المساء';

// RFC-4180 parser → array of string[] rows.
function parseCsv(text) {
  // Normalize line endings so \r never leaks into quoted field values.
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const raw = readFileSync(CSV, 'utf8');
const rows = parseCsv(raw).filter((r) => r.length > 1 && r.some((c) => c.trim() !== ''));
const header = rows.shift().map((h) => h.trim());
const col = (name) => header.indexOf(name);
const ci = {
  category: col('category'),
  zekr: col('zekr'),
  description: col('description'),
  count: col('count'),
  reference: col('reference'),
  search: col('search'),
};

const order = [];
const byCat = new Map();
for (const r of rows) {
  const title = (r[ci.category] ?? '').trim();
  if (!title) continue;
  if (!byCat.has(title)) { byCat.set(title, []); order.push(title); }
  const countRaw = (r[ci.count] ?? '').trim();
  const count = Number.parseInt(countRaw, 10);
  byCat.get(title).push({
    dhikr: (r[ci.zekr] ?? '').trim(),
    description: (r[ci.description] ?? '').trim(),
    // Blank or invalid count defaults to 1 (recite once) — CSV convention for most rows.
    count: Number.isFinite(count) && count > 0 ? count : 1,
    reference: (r[ci.reference] ?? '').trim(),
    _search: (r[ci.search] ?? '').trim(),
  });
}

const categories = order.map((title, index) => {
  const items = byCat.get(title);
  const search = [...new Set([title, ...items.map((it) => it._search)])].join(' ').trim();
  return {
    index,
    title,
    search,
    items: items.map(({ _search, ...keep }) => keep),
  };
});

const banner = '// Auto-generated from azkar.csv by scripts/gen-azkar.mjs. Do not edit manually.\n\n';
const types =
  'export interface DhikrItem {\n' +
  '  dhikr: string;\n  description: string;\n  count: number;\n  reference: string;\n}\n\n' +
  'export interface AdhkarCategory {\n' +
  '  index: number;\n  title: string;\n  search: string;\n  items: DhikrItem[];\n}\n\n';
const data = 'export const azkarCategories: AdhkarCategory[] = ' + JSON.stringify(categories, null, 2) + ';\n\n';
const derived =
  'const byTitle = (t: string): DhikrItem[] =>\n' +
  '  azkarCategories.find((c) => c.title === t)?.items ?? [];\n\n' +
  `export const morningAdhkar: DhikrItem[] = byTitle(${JSON.stringify(MORNING_TITLE)});\n` +
  `export const eveningAdhkar: DhikrItem[] = byTitle(${JSON.stringify(EVENING_TITLE)});\n`;

writeFileSync(OUT, banner + types + data + derived, 'utf8');
console.log(`Wrote ${categories.length} categories to ${OUT}`);
