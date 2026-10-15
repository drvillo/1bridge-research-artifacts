import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resultUrl = new URL('../results/observer-catchup-benchmark.json', import.meta.url)
const pin = 'github:drvillo/1bridge-authority#b48c9989b59f243b22c655b3d55b4ce0ae814f06'
const buildSha256 = '2a0774548fb95f8d88698a8a19de02ce128d0a7c53383ddcaa561bdaf89ea50b'
const observerCommit = 'b5a0a047d33e8d63010e41226df729d397193fa5'

test('observer catch-up raw artifact records verified nonempty poller samples', () => {
  const result = JSON.parse(readFileSync(resultUrl, 'utf8'))
  assert.equal(result.format, '1bridge.governance.observer-catchup/v1')
  assert.equal(result.observerCommit, observerCommit)
  assert.equal(result.observerDirty, false)
  assert.equal(result.authorityDependency, pin)
  assert.equal(result.authorityBuildSha256, buildSha256)
  assert.equal(result.environment.postgresImage, 'postgres@sha256:f4c66b820c6f974249089d3d16d86a3698eae11e8746eb6644b2271031e91232')
  assert.match(result.environment.postgresImageId, /^sha256:[0-9a-f]{64}$/)
  assert.equal(result.environment.postgresImageArchitecture, 'arm64')
  assert.deepEqual(result.options, { trials: 30, warmup: 3 })
  assert.equal(result.samples.length, 30)
  const acceptedHead = result.samples[0].acceptedCheckpointHash
  for (const [trial, sample] of result.samples.entries()) {
    assert.equal(sample.trial, trial)
    assert.equal(sample.coldStatus, 'accepted')
    assert.equal(sample.hotStatus, 'up_to_date')
    assert.equal(sample.acceptedLeaves, 7)
    assert.equal(sample.acceptedCheckpoints, 8)
    assert.match(sample.acceptedCheckpointHash, /^[0-9a-f]{64}$/)
    assert.equal(sample.acceptedCheckpointHash, acceptedHead)
    assert.ok(Number.isFinite(sample.coldMs) && sample.coldMs >= 0)
    assert.ok(Number.isFinite(sample.hotMs) && sample.hotMs >= 0)
    assert.ok(Number.isSafeInteger(sample.coldHttpRequests) && sample.coldHttpRequests > 0)
    assert.equal(sample.hotHttpRequests, 0)
  }
  assert.match(result.method, /pollObserverOnce/)
  assert.match(result.limitations.join(' '), /multi-feed|multi-tenant/i)
})
