/* Checks the UI string catalogs (FRONTEND_SPEC §6.3, §14):
 *  - every catalog has exactly the keys of en.json
 *  - no string states or implies wrongdoing (shared checkNeutrality guard)
 * Run: pnpm --filter @repo/web check:i18n   (needs `pnpm build:shared` first)
 */
const fs = require('node:fs');
const path = require('node:path');
const { checkNeutrality, SUPPORTED_LANGUAGES } = require('@repo/shared');

const dir = path.join(__dirname, '..', 'src', 'i18n');
const flatten = (o, prefix = '') =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[prefix + k, v]] : flatten(v, `${prefix}${k}.`)));

const en = new Map(flatten(JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'))));
let problems = 0;
for (const { code } of SUPPORTED_LANGUAGES) {
  const file = path.join(dir, `${code}.json`);
  if (!fs.existsSync(file)) {
    console.error(`✗ ${code}: missing catalog`);
    problems++;
    continue;
  }
  const cat = new Map(flatten(JSON.parse(fs.readFileSync(file, 'utf8'))));
  for (const k of en.keys()) if (!cat.has(k)) (console.error(`✗ ${code}: missing key ${k}`), problems++);
  for (const k of cat.keys()) if (!en.has(k)) (console.error(`✗ ${code}: unknown key ${k}`), problems++);
  for (const [k, v] of cat) {
    const n = checkNeutrality(v);
    if (!n.ok) (console.error(`✗ ${code}.${k}: "${v}" flagged: ${n.flaggedTerms.map((f) => f.term).join(', ')}`), problems++);
  }
}
if (problems) {
  console.error(`${problems} problem(s) in UI catalogs`);
  process.exit(1);
}
console.log(`✓ ${SUPPORTED_LANGUAGES.length} UI catalogs complete and neutral (${en.size} keys each)`);
