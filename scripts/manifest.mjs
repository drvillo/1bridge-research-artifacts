import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const files = ['README.md', 'LICENSE', '.gitignore', 'package.json', 'pnpm-lock.yaml'];
for (const directory of ['docs', 'results', 'scripts', 'experiments', 'protocol', 'test']) {
  for (const file of await readdir(directory)) {
    if (file === 'artifact-manifest.json' || !/\.(md|tex|pdf|json|mjs|py|sh)$/.test(file)) continue;
    files.push(`${directory}/${file}`);
  }
}
const hashes = {};
for (const file of files.sort()) hashes[file] = createHash('sha256').update(await readFile(file)).digest('hex');
await writeFile('results/artifact-manifest.json', JSON.stringify({
  version: '0.1.0',
  status: 'working technical reports; independent review and contribution gates open',
  applicationCommit: 'a103da282e2cec6351f28f04db67b22d16fdd75b',
  note: 'Content linkage, not a correctness proof. The manifest excludes itself.',
  files: hashes,
}, null, 2) + '\n');
console.log(`${files.length} public artifact checksums written`);
