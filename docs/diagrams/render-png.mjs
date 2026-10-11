// Renders the SVGs to PNG: node docs/diagrams/render-png.mjs  (uses sharp from apps/api)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const sharp = createRequire(path.join(here, '../../apps/api/package.json'))('sharp');
for (const n of ['technical-approach', 'user-flow']) {
  await sharp(path.join(here, `../${n}.svg`), { density: 144 }).png().toFile(path.join(here, `../${n}.png`));
  console.log('rendered', n + '.png');
}
