import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const experiment = new URL('../experiments/governance-component-bench.mjs', import.meta.url)
const pin = 'github:drvillo/1bridge-authority#b48c9989b59f243b22c655b3d55b4ce0ae814f06'

test('governance component benchmark records verified raw samples at an exact authority pin', () => {
  const dir = mkdtempSync(join(tmpdir(), '1bridge-governance-bench-'))
  const out = join(dir, 'samples.json')
  try {
    const run = spawnSync(process.execPath, [experiment.pathname,
      '--trials=2', '--warmup=0', '--sizes=8,16', `--out=${out}`],
    { encoding: 'utf8' })
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`)

    const result = JSON.parse(readFileSync(out, 'utf8'))
    assert.equal(result.format, '1bridge.governance.component-benchmark/v1')
    assert.equal(result.authorityDependency, pin)
    assert.deepEqual(result.options, { trials: 2, warmup: 0, sizes: [8, 16] })
    assert.equal(result.merkle.length, 4)
    assert.equal(result.blind.length, 2)
    for (const sample of result.merkle) {
      assert.equal(sample.verified, true)
      assert.equal(sample.proofHashes, Math.log2(sample.size))
      assert.equal(sample.proofBinaryBytes, sample.proofHashes * 32)
      assert.ok(sample.proofJsonBytes > 0)
      for (const key of ['rootMs', 'proofMs', 'verifyMs']) {
        assert.ok(Number.isFinite(sample[key]) && sample[key] >= 0)
      }
    }
    for (const sample of result.blind) {
      assert.equal(sample.verified, true)
      assert.equal(sample.blindedMessageBytes, 512)
      assert.ok(sample.tokenJsonBytes > 0)
      for (const key of ['blindMs', 'signMs', 'finalizeMs', 'verifyMs']) {
        assert.ok(Number.isFinite(sample[key]) && sample[key] >= 0)
      }
    }
    assert.match(result.limitations.join(' '), /component/i)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('governance component benchmark rejects a zero-trial run', () => {
  const run = spawnSync(process.execPath, [experiment.pathname,
    '--trials=0', '--warmup=0', '--sizes=8', '--out=/tmp/unused-governance-bench.json'],
  { encoding: 'utf8' })
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /trials/i)
})

test('governance component benchmark rejects a non-power-of-two size', () => {
  const run = spawnSync(process.execPath, [experiment.pathname,
    '--trials=1', '--warmup=0', '--sizes=12', '--out=/tmp/unused-governance-bench.json'],
  { encoding: 'utf8' })
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /powers of two/i)
})
