import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Regression guard for text clipping / ellipsis on Arabic labels.
 *
 * Symptom: titles and labels (e.g. "محاسبة" → "محاس", tab "الأذكار" → "الأذ…")
 * were clipped/ellipsized despite having plenty of horizontal space.
 *
 * Root cause: a `writingDirection: 'rtl'` style on those `Text` nodes. The app
 * already runs fully RTL via `I18nManager.isRTL`, so the property is redundant —
 * and with a custom font it makes React Native mis-measure text width, so the
 * trailing glyphs get cut off. The deed-row labels, which never set
 * `writingDirection`, rendered fine with the same font.
 *
 * This test fails if anyone reintroduces `writingDirection: 'rtl'` anywhere in
 * src/. (`writingDirection: 'ltr'`, used to force LTR for the numeric keypad,
 * is intentional and allowed.)
 */
const SRC_DIR = join(__dirname, '..', '..', 'src');

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe('text direction styling', () => {
  it("does not set writingDirection: 'rtl' anywhere in src/ (causes Arabic text clipping)", () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(SRC_DIR)) {
      const content = readFileSync(file, 'utf8');
      content.split('\n').forEach((line, i) => {
        // Matches writingDirection: 'rtl' / "rtl" with any spacing.
        if (/writingDirection\s*:\s*['"]rtl['"]/.test(line)) {
          offenders.push(`${file}:${i + 1}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});
