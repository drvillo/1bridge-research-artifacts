import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('indexed registry evidence retains complete verified trials and reproduction provenance', () => {
  const root = new URL('../', import.meta.url)
  const bytes = readFileSync(new URL('results/registry-node-store-benchmark-20261030.json', root))
  const result = JSON.parse(bytes)
  const provenance = JSON.parse(readFileSync(new URL('results/registry-node-store-provenance-20261030.json', root)))
  assert.equal(result.format, '1bridge.governance.registry-node-store-benchmark/v1')
  assert.equal(result.appRevision, 'f44a051a2539a2be930ad55f218002b25a9cd104')
  assert.equal(result.runComplete, true)
  assert.equal(provenance.resultSha256, createHash('sha256').update(bytes).digest('hex'))
  assert.equal(provenance.appCleanBeforeRun, true)
  assert.equal(provenance.sourceHashesVerified, true)
  for (const [file, expected] of Object.entries(provenance.runnerFilesSha256)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL(file, root))).digest('hex'), expected)
  }
  assert.equal(provenance.researchRevision, 'c0fb0e7edf8da89a4474842eb3e2c36773218e4f')
  assert.match(provenance.postgresImageDigest, /^postgres@sha256:[0-9a-f]{64}$/)
  assert.deepEqual(result.options.sizes, [100, 1000, 10000, 100000])
  assert.equal(result.options.trialsPerSize, 5)
  assert.equal(result.options.warmups, 2)
  assert.deepEqual(result.cases.map(item => item.size), result.options.sizes)
  for (const item of result.cases) {
    assert.equal(item.oldSize, Math.floor(item.size / 2))
    assert.equal(item.proofVerified, true)
    assert.equal(item.measurements.length, 5)
    for (const sample of item.measurements) {
      assert.ok(Number.isFinite(sample.durationMs) && sample.durationMs > 0)
      assert.ok(Number.isSafeInteger(sample.proofItems) && sample.proofItems > 0)
      for (const field of ['rssBeforeMiB', 'rssAfterMiB', 'heapBeforeMiB', 'heapAfterMiB']) {
        assert.ok(Number.isFinite(sample[field]) && sample[field] > 0)
      }
    }
    assert.equal(item.medianMs, item.measurements.map(sample => sample.durationMs).sort((a, b) => a - b)[2])
  }
  assert.match(result.limitations.join(' '), /not the complete application migrations/)
  assert.match(result.limitations.join(' '), /not per-request allocations/)
})
