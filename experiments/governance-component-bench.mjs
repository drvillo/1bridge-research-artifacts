import { createHash, createPublicKey, generateKeyPairSync } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { cpus, platform, release, totalmem } from 'node:os'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import {
  blindProofAccess, decodeBase64Url, encodeBase64Url, finalizeProofAccess,
  importProofAccessPublicKey, inclusionProof, merkleRoot, verifyInclusion,
  verifyProofAccess,
} from '@drvillo/1bridge-authority'
import { signBlindedProofAccess } from '@drvillo/1bridge-authority/server'

const DEFAULTS = {
  trials: 30,
  warmup: 3,
  sizes: [256, 1024, 4096],
  out: 'results/governance-component-benchmark.json',
}
// Hash of package.json and compiled JS from the clean b48c998 authority checkout.
const AUTHORITY_BUILD_SHA256 = '2a0774548fb95f8d88698a8a19de02ce128d0a7c53383ddcaa561bdaf89ea50b'

async function authorityBuildDigest() {
  const packageUrl = new URL('../', import.meta.resolve('@drvillo/1bridge-authority'))
  const distUrl = new URL('dist/', packageUrl)
  const files = ['package.json', ...(await readdir(distUrl))
    .filter((file) => file.endsWith('.js')).sort().map((file) => `dist/${file}`)]
  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(file).update('\0').update(await readFile(new URL(file, packageUrl))).update('\0')
  }
  return { digest: hash.digest('hex'), packagePath: fileURLToPath(packageUrl) }
}

function boundedInteger(value, label, min, max) {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new TypeError(`${label} must be an integer from ${min} to ${max}`)
  }
  return number
}

function options(argv) {
  const selected = { ...DEFAULTS }
  const seen = new Set()
  for (const arg of argv) {
    const match = /^--(trials|warmup|sizes|out)=(.+)$/.exec(arg)
    if (!match || seen.has(match[1])) throw new TypeError(`Unknown or duplicate option: ${arg}`)
    seen.add(match[1])
    const [, name, raw] = match
    if (name === 'trials') selected.trials = boundedInteger(raw, name, 1, 100)
    if (name === 'warmup') selected.warmup = boundedInteger(raw, name, 0, 20)
    if (name === 'sizes') {
      selected.sizes = raw.split(',').map((part) => boundedInteger(part, 'size', 8, 16384))
      if (new Set(selected.sizes).size !== selected.sizes.length
        || selected.sizes.some((size) => (size & (size - 1)) !== 0)) {
        throw new TypeError('sizes must be distinct powers of two')
      }
    }
    if (name === 'out') selected.out = raw
  }
  if (!selected.out.trim()) throw new TypeError('out must be a file path')
  return selected
}

async function timed(work) {
  const start = performance.now()
  const value = await work()
  return { value, ms: performance.now() - start }
}

function leafFixtures(size) {
  return Array.from({ length: size }, (_, index) =>
    createHash('sha256').update(`1bridge.governance.benchmark/v1:${index}`).digest())
}

async function merkleSample(leaves, size, trial) {
  const index = Math.floor(size / 2)
  const root = await timed(() => merkleRoot(leaves))
  const proof = await timed(() => inclusionProof(leaves, index))
  const verified = await timed(() => verifyInclusion(leaves[index], index, size,
    proof.value, root.value))
  if (!verified.value || proof.value.length !== Math.log2(size)) {
    throw new Error(`Merkle inclusion failed for size ${size}`)
  }
  return {
    size, trial, rootMs: root.ms, proofMs: proof.ms, verifyMs: verified.ms,
    proofHashes: proof.value.length,
    proofBinaryBytes: proof.value.length * 32,
    proofJsonBytes: Buffer.byteLength(JSON.stringify(proof.value)),
    verified: verified.value,
  }
}

async function blindSample(publicKey, privateKey, trial) {
  const blinded = await timed(() => blindProofAccess(publicKey))
  const signed = await timed(() => signBlindedProofAccess(blinded.value.blindedMessage, privateKey))
  const finalized = await timed(() => finalizeProofAccess(blinded.value.state, signed.value))
  const verified = await timed(() => verifyProofAccess(finalized.value, publicKey))
  if (!verified.value) throw new Error('Blind proof-access token failed verification')
  return {
    trial, blindMs: blinded.ms, signMs: signed.ms,
    finalizeMs: finalized.ms, verifyMs: verified.ms,
    blindedMessageBytes: decodeBase64Url(blinded.value.blindedMessage).length,
    tokenJsonBytes: Buffer.byteLength(JSON.stringify(finalized.value)),
    verified: verified.value,
  }
}

async function main() {
  const selected = options(process.argv.slice(2))
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const authorityDependency = pkg.dependencies['@drvillo/1bridge-authority']
  if (authorityDependency !== 'github:drvillo/1bridge-authority#b48c9989b59f243b22c655b3d55b4ce0ae814f06') {
    throw new Error('Unexpected authority dependency revision')
  }
  const authorityBuild = await authorityBuildDigest()
  if (authorityBuild.digest !== AUTHORITY_BUILD_SHA256) {
    throw new Error('Authority build digest mismatch: installed package differs from the clean pinned build')
  }

  const merkle = []
  for (const size of selected.sizes) {
    const leaves = leafFixtures(size)
    for (let trial = -selected.warmup; trial < selected.trials; trial += 1) {
      const sample = await merkleSample(leaves, size, trial)
      if (trial >= 0) merkle.push(sample)
    }
  }

  // Key generation and SPKI import are setup, deliberately outside timed samples.
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096, publicExponent: 0x10001,
  })
  const publicSpki = createPublicKey(privateKey).export({ type: 'spki', format: 'der' })
  const publicKey = await importProofAccessPublicKey(encodeBase64Url(publicSpki))
  const blind = []
  for (let trial = -selected.warmup; trial < selected.trials; trial += 1) {
    const sample = await blindSample(publicKey, privateKey, trial)
    if (trial >= 0) blind.push(sample)
  }

  const artifact = {
    format: '1bridge.governance.component-benchmark/v1',
    recordedAt: new Date().toISOString(),
    authorityDependency,
    authorityBuildSha256: authorityBuild.digest,
    environment: {
      node: process.version, platform: platform(), release: release(),
      cpuModel: cpus()[0]?.model ?? 'unknown', cpuCount: cpus().length,
      totalMemoryBytes: totalmem(),
    },
    options: {
      trials: selected.trials, warmup: selected.warmup, sizes: selected.sizes,
    },
    method: {
      merkle: 'Fresh root and inclusion proof from the same in-memory 32-byte leaves in each trial; fixed midpoint index; JSON proof size.',
      blind: 'Fresh random token per trial; RSA-4096 key generation and public-key import excluded; server private operation includes its self-check; finalize includes its own verification before the separately timed verify stage.',
      timing: 'Separate performance.now() wall-clock stages; warmups discarded; raw trials retained without outlier deletion.',
    },
    merkle,
    blind,
    limitations: [
      'Pure authority-library component benchmark, not a browser, database, network, observer, share or recovery journey.',
      'Node and this host are one environment; timings do not establish population-wide latency or a service-level guarantee.',
      'Sizes run in fixed ascending batches in one process; JIT, thermal and ordering effects are not counterbalanced.',
      'Proof generation rebuilds from an in-memory array; it does not measure a persisted tree or indexed source query.',
      'Cryptographic timings and token size do not establish anonymity against timing, account or network metadata.',
    ],
  }
  await writeFile(selected.out, `${JSON.stringify(artifact, null, 2)}\n`)
  console.log(`Wrote ${merkle.length} Merkle and ${blind.length} blind raw samples to ${selected.out}`)
}

main().catch((error) => {
  console.error(`governance benchmark: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
