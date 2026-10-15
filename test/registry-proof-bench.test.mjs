import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resultUrl = new URL('../results/registry-proof-microbenchmark.json', import.meta.url)
const observerCommit = '2fca1af67a6578d691ee95dbc2b6ee3b786ff0f5'
const authorityPin = 'github:drvillo/1bridge-authority#b48c9989b59f243b22c655b3d55b4ce0ae814f06'
const authorityBuildSha256 = '2a0774548fb95f8d88698a8a19de02ce128d0a7c53383ddcaa561bdaf89ea50b'
const postgresImage = 'postgres@sha256:f4c66b820c6f974249089d3d16d86a3698eae11e8746eb6644b2271031e91232'

test('registry proof artifact retains validated clean-source measurements and scope', () => {
  const result = JSON.parse(readFileSync(resultUrl, 'utf8'))
  assert.equal(result.format, '1bridge.governance.registry-proof-microbenchmark/v1')
  assert.equal(result.runComplete, true)
  assert.equal(result.observerCommit, observerCommit)
  assert.equal(result.observerDirty, false)
  assert.equal(result.authorityDependency, authorityPin)
  assert.equal(result.authorityBuildSha256, authorityBuildSha256)
  assert.equal(result.environment.postgresImage, postgresImage)
  assert.match(result.environment.postgresImageId, /^sha256:[0-9a-f]{64}$/)
  assert.deepEqual(result.options, { sizes: [100, 1000, 10000, 100000],
    bytesPerEntry: 512, trialsPerSize: 3, oldSize: 'floor(size / 2)' })
  assert.deepEqual(result.cases.map(item => item.size), result.options.sizes)
  for (const item of result.cases) {
    assert.equal(item.oldSize, Math.floor(item.size / 2))
    assert.equal(item.measurements.length, result.options.trialsPerSize)
    for (const trial of item.measurements) {
      for (const field of ['fetchMs', 'prepareMs', 'proofMs', 'totalMs', 'rssMiB']) {
        assert.ok(Number.isFinite(trial[field]) && trial[field] >= 0, `${item.size}: ${field}`)
      }
      assert.ok(Math.abs(trial.totalMs - trial.fetchMs - trial.prepareMs - trial.proofMs) < 0.001)
      assert.ok(Number.isSafeInteger(trial.proofItems) && trial.proofItems > 0 && trial.proofItems < 32)
    }
  }
  assert.match(result.method, /verify the proof in every trial/)
  assert.match(result.limitations.join(' '), /not a timed 1Bridge route/)
  assert.match(result.limitations.join(' '), /RSS is a process snapshot/)
})
