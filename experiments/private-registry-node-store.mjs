// Compiled into an authorized, clean app checkout by registry-node-store-bench.mjs.
// All source functions below resolve to that checkout, not copied implementations.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { performance } from 'node:perf_hooks'
import { Prisma, PrismaClient } from '@prisma/client'
import {
  canonicalJson, generateSigningKey, hashLeaf, hashNode, merkleRoot, registryCheckpointHash,
  signRegistryCheckpoint, signingKeyId, verifyConsistency,
} from '@drvillo/1bridge-authority'
import { readRegistryConsistency } from 'private-registry'

const sizes = (process.env.REGISTRY_NODE_STORE_SIZES || '').split(',').map(Number)
const trials = Number(process.env.REGISTRY_NODE_STORE_TRIALS)
if (!sizes.length || sizes.some(n => !Number.isSafeInteger(n) || n < 2 || n > 100_000)
  || !Number.isSafeInteger(trials) || trials < 1 || trials > 30) {
  throw new Error('Sizes must be 2..100000 and trials 1..30')
}
const db = new PrismaClient()
const schema = await db.$queryRaw`SELECT EXISTS (
  SELECT 1 FROM pg_namespace WHERE nspname = 'authority'
) AS exists`
if (schema[0]?.exists) {
  await db.$disconnect()
  throw new Error('Refusing a database with an existing authority schema')
}

const hashes = {}
for (const name of ['registry-source.ts', 'registry-merkle.ts', 'registry-node-store.ts']) {
  // The bundled driver lives in webapp/.research.
  const bytes = await readFile(new URL(`../src/lib/authority/${name}`, import.meta.url))
  hashes[name] = createHash('sha256').update(bytes).digest('hex')
}

const result = {
  format: '1bridge.governance.registry-node-store-benchmark/v1',
  appRevision: process.env.REGISTRY_APP_REVISION,
  sourceSha256: hashes,
  recordedAt: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, arch: process.arch,
    cpuModel: os.cpus()[0]?.model, cpuCount: os.cpus().length, postgres: null },
  options: { sizes, trialsPerSize: trials, warmups: 2, bytesPerEntry: 512,
    oldSize: 'floor(size / 2)' },
  method: 'Actual application readRegistryConsistency, buildRegistryConsistencyProof, and readRegistryRangeHash bundled from the pinned private revision. Indexed leaf and persisted subtree lookups run on disposable loopback PostgreSQL with production-shaped primary keys. Synthetic fixture generation, schema setup, independent root computation, and external verification are outside timed calls.',
  limitations: [
    'Minimal isolated authority tables reproduce the queried columns and primary keys, not the complete application migrations or production data distribution.',
    'No Next route, Supabase network, Vercel deployment, concurrency, or production latency is measured.',
    'RSS and heap are process snapshots, not per-request allocations or peak memory attribution.',
  ],
  cases: [], runComplete: false,
}

function median(values) {
  const ordered = [...values].sort((a, b) => a - b)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2
}

async function insertEntries(rows) {
  for (let i = 0; i < rows.length; i += 256) {
    const values = rows.slice(i, i + 256).map(row => Prisma.sql`(${row.index}, ${row.bytes}, ${row.hash})`)
    await db.$executeRaw`INSERT INTO authority.registry_entries (entry_index, entry_bytes, leaf_hash)
      VALUES ${Prisma.join(values)}`
  }
}

async function insertNodes(rows) {
  for (let i = 0; i < rows.length; i += 256) {
    const values = rows.slice(i, i + 256).map(row => Prisma.sql`(${row.start}, ${row.height}, ${row.hash})`)
    await db.$executeRaw`INSERT INTO authority.registry_merkle_nodes (start_index, height, hash)
      VALUES ${Prisma.join(values)}`
  }
}

async function runCase(size, pair, keyId) {
  await db.$executeRaw`TRUNCATE authority.registry_entries, authority.registry_merkle_nodes, authority.registry_checkpoints`
  const oldSize = Math.floor(size / 2)
  const entries = []
  const nodes = []
  const peaks = []
  for (let index = 0; index < size; index++) {
    const bytes = Buffer.alloc(512)
    bytes.writeUInt32BE(index, 0)
    const leaf = await hashLeaf(bytes)
    entries.push({ index, bytes, hash: leaf })
    let current = { start: index, height: 0, hash: leaf }
    while (peaks[current.height]) {
      const left = peaks[current.height]
      peaks[current.height] = null
      current = { start: left.start, height: current.height + 1,
        hash: await hashNode(left.hash, current.hash) }
      nodes.push(current)
    }
    peaks[current.height] = current
  }
  const [oldRoot, targetRoot] = await Promise.all([
    merkleRoot(entries.slice(0, oldSize).map(row => row.bytes)),
    merkleRoot(entries.map(row => row.bytes)),
  ])
  await insertEntries(entries)
  await insertNodes(nodes)
  const oldSigned = await signRegistryCheckpoint({ version: 1, size: oldSize, root: oldRoot,
    signerKeyId: keyId, previous: '0'.repeat(64) }, pair)
  const old = await registryCheckpointHash(oldSigned.statement)
  const targetSigned = await signRegistryCheckpoint({ version: 1, size, root: targetRoot,
    signerKeyId: keyId, previous: old }, pair)
  const target = await registryCheckpointHash(targetSigned.statement)
  for (const [number, hash, signed, root] of [
    [oldSize, old, oldSigned, oldRoot], [size, target, targetSigned, targetRoot],
  ]) {
    await db.$executeRaw`INSERT INTO authority.registry_checkpoints
      (checkpoint_number, checkpoint_hash, signed_checkpoint, size, root)
      VALUES (${number}, ${hash}, ${canonicalJson(signed)}, ${number}, ${root})`
  }
  // This assertion is independent of the indexed hashes used during proof construction.
  assert.equal((await db.$queryRaw`SELECT COUNT(*)::integer AS count FROM authority.registry_entries`)[0].count, size)
  const measurements = []
  for (let i = -2; i < trials; i++) {
    global.gc?.()
    const before = process.memoryUsage()
    const start = performance.now()
    const proof = await readRegistryConsistency(db, old, target)
    const durationMs = performance.now() - start
    const after = process.memoryUsage()
    assert.equal(proof.old, old)
    assert.equal(proof.target, target)
    assert.equal(await verifyConsistency(oldSize, size, oldRoot, targetRoot, proof.proof), true)
    if (i >= 0) measurements.push({ durationMs, proofItems: proof.proof.length,
      rssBeforeMiB: before.rss / 1048576, rssAfterMiB: after.rss / 1048576,
      heapBeforeMiB: before.heapUsed / 1048576, heapAfterMiB: after.heapUsed / 1048576 })
  }
  return { size, oldSize, entries: entries.length, persistedNodes: nodes.length,
    measurements, medianMs: median(measurements.map(m => m.durationMs)), proofVerified: true }
}

let created = false
try {
  await db.$executeRawUnsafe('CREATE SCHEMA authority')
  created = true
  await db.$executeRawUnsafe(`CREATE TABLE authority.registry_entries (
    entry_index BIGINT PRIMARY KEY, entry_bytes BYTEA NOT NULL, leaf_hash TEXT NOT NULL)`)
  await db.$executeRawUnsafe(`CREATE TABLE authority.registry_merkle_nodes (
    start_index BIGINT NOT NULL, height SMALLINT NOT NULL, hash TEXT NOT NULL,
    PRIMARY KEY (start_index, height))`)
  await db.$executeRawUnsafe(`CREATE TABLE authority.registry_checkpoints (
    checkpoint_number BIGINT PRIMARY KEY, checkpoint_hash TEXT NOT NULL UNIQUE,
    signed_checkpoint TEXT NOT NULL, size BIGINT NOT NULL UNIQUE, root TEXT NOT NULL)`)
  result.environment.postgres = (await db.$queryRaw`SHOW server_version`)[0].server_version
  const pair = await generateSigningKey()
  const keyId = await signingKeyId(pair.publicKey)
  for (const size of sizes) result.cases.push(await runCase(size, pair, keyId))
  result.runComplete = true
  await writeFile(process.argv[2], JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
} finally {
  if (created) await db.$executeRawUnsafe('DROP SCHEMA authority CASCADE')
  await db.$disconnect()
}
