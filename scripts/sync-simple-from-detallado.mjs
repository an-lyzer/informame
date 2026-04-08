import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const dataPath = path.join(repoRoot, 'src', 'data', 'candidatos.json');

function toTitle(line) {
  if (typeof line !== 'string') return '';
  const idx = line.indexOf(':');
  const title = idx === -1 ? line : line.slice(0, idx);
  return title.trim();
}

const raw = fs.readFileSync(dataPath, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const sanitized = raw.replace(/^\uFEFF/, '');
const data = JSON.parse(sanitized);

if (!Array.isArray(data)) {
  throw new Error('Expected candidatos.json root to be an array');
}

for (const candidate of data) {
  if (!candidate || typeof candidate !== 'object') continue;
  const propuestas = candidate.propuestas;
  if (!propuestas || typeof propuestas !== 'object') continue;

  const detallado = propuestas.detallado;
  if (!detallado || typeof detallado !== 'object') continue;

  if (!propuestas.simple || typeof propuestas.simple !== 'object') {
    propuestas.simple = {};
  }

  for (const [category, entries] of Object.entries(detallado)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const titles = entries.map(toTitle).filter(Boolean);
    if (titles.length > 0) {
      propuestas.simple[category] = titles;
    }
  }
}

const next = JSON.stringify(data, null, 2).replace(/\n/g, eol) + eol;
fs.writeFileSync(dataPath, next, 'utf8');
console.log('Updated propuestas.simple from propuestas.detallado titles for', data.length, 'candidates');
