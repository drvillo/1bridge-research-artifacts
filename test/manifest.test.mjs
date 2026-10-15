import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)

test('artifact manifest covers the governance benchmark and matches its current files', () => {
  const manifest = JSON.parse(readFileSync(new URL('results/artifact-manifest.json', root)))
  for (const required of [
    'pnpm-workspace.yaml',
    'experiments/governance-component-bench.mjs',
    'results/governance-component-benchmark.json',
    'test/governance-component-bench.test.mjs',
  ]) assert.ok(manifest.files[required], `Missing ${required}`)
  for (const [file, expected] of Object.entries(manifest.files)) {
    const actual = createHash('sha256').update(readFileSync(new URL(file, root))).digest('hex')
    assert.equal(actual, expected, `Stale manifest hash for ${file}`)
  }
})
