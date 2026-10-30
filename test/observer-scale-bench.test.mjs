import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resultUrl = new URL('../results/observer-scale-benchmark.json', import.meta.url)
const authorityPin = 'github:drvillo/1bridge-authority#b48c9989b59f243b22c655b3d55b4ce0ae814f06'
const authorityBuildSha256 = '2a0774548fb95f8d88698a8a19de02ce128d0a7c53383ddcaa561bdaf89ea50b'
const postgresImage = 'postgres@sha256:f4c66b820c6f974249089d3d16d86a3698eae11e8746eb6644b2271031e91232'
const observerCommit = 'f918e09615cae5062d5eeb41bc80114a527758d3'

test('observer scale artifact records bounded real-Postgres catch-up at three sizes', () => {
  const result = JSON.parse(readFileSync(resultUrl, 'utf8'))
  assert.equal(result.format, '1bridge.governance.observer-scale/v1')
  assert.equal(result.runComplete, true)
  assert.equal(result.observerCommit, observerCommit)
  assert.equal(result.observerDirty, false)
  assert.equal(result.authorityDependency, authorityPin)
  assert.equal(result.authorityBuildSha256, authorityBuildSha256)
  assert.equal(result.environment.postgresImage, postgresImage)
  assert.match(result.environment.postgresImageId, /^sha256:[0-9a-f]{64}$/)
  assert.deepEqual(result.options.sizes, [100, 1000, 10000])
  assert.equal(result.options.maxPolls, 150)
  assert.deepEqual(result.options.budget, { maxLeafPages: 100, maxCheckpoints: 100, maxMs: 60000 })
  assert.deepEqual(result.cases.map(item => item.size), [100, 1000, 10000])
  assert.equal(result.workload, 'one root-signed null-policy revision and one provider-signed checkpoint per leaf')
  for (const item of result.cases) {
    assert.ok(item.polls.length > 0 && item.polls.length <= result.options.maxPolls)
    assert.deepEqual(item.polls.map(poll => poll.invocation),
      Array.from({ length: item.polls.length }, (_, index) => index))
    assert.ok(item.polls.every(poll => Number.isFinite(poll.durationMs) && poll.durationMs >= 0))
    assert.ok(item.polls.every(poll => Number.isSafeInteger(poll.httpRequests) && poll.httpRequests >= 0))
    assert.ok(item.polls.every(poll => ['pending', 'accepted', 'unavailable',
      'source_nonconforming', 'quarantined', 'busy', 'up_to_date', 'error'].includes(poll.status)))
    assert.equal(item.outcome, item.polls.at(-1).status)
    assert.equal(item.persistedContiguous, true)
    assert.ok(Number.isFinite(item.totalPollMs) && item.totalPollMs >= 0)
    assert.equal(item.totalPollMs, item.polls.reduce((total, poll) => total + poll.durationMs, 0))
    assert.match(item.targetCheckpointHash, /^[0-9a-f]{64}$/)
    if (item.outcome === 'accepted') {
      assert.equal(item.acceptedLeaves, item.size)
      assert.equal(item.acceptedCheckpoints, item.size + 1)
      assert.equal(item.acceptedCheckpointHash, item.targetCheckpointHash)
    } else if (item.outcome === 'pending') {
      assert.equal(item.polls.length, result.options.maxPolls)
      assert.equal(item.acceptedLeaves, 0)
    } else {
      assert.notEqual(item.outcome, 'accepted')
      assert.equal(item.acceptedLeaves, 0)
      if (item.outcome === 'error') assert.match(item.polls.at(-1).errorName, /^[A-Za-z]+Error$/)
    }
  }
  assert.match(result.limitations.join(' '), /Vercel|multi-tenant/)
  assert.match(result.method, /pollObserverOnce/)
  assert.match(result.method, /paging, not full call duration/)
})
