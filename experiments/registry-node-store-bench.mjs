// Bundle the exact private application source into its own installed webapp workspace.
// The driver uses a disposable local Postgres database and never publishes a result on failure.
import { build } from 'esbuild'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const revision = 'f44a051a2539a2be930ad55f218002b25a9cd104'
const source = process.env.ONEBRIDGE_SOURCE
const database = process.env.ONEBRIDGE_REGISTRY_DATABASE_URL
if (!source || !database) {
  throw new Error('Set ONEBRIDGE_SOURCE and ONEBRIDGE_REGISTRY_DATABASE_URL')
}
const url = new URL(database)
if (!['127.0.0.1', 'localhost'].includes(url.hostname)
  || !/^\/bridge_research_registry_[a-z0-9_]+$/.test(url.pathname)) {
  throw new Error('Use a dedicated bridge_research_registry_* database on loopback Postgres')
}
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim()
const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: source, encoding: 'utf8' }).trim()
if (head !== revision || dirty) throw new Error(`Expected clean application revision ${revision}; got ${head}, dirty=${Boolean(dirty)}`)

const webapp = path.join(source, 'webapp')
const dir = path.join(webapp, '.research')
await mkdir(dir, { recursive: true })
const adapter = path.join(dir, 'registry-proof-adapter.mjs')
await writeFile(adapter, `export { readRegistryConsistency } from ${JSON.stringify(path.join(webapp, 'src/lib/authority/registry-source.ts'))}\n`)
const output = path.join(dir, 'registry-proof-driver.mjs')
await build({
  entryPoints: [path.resolve('experiments/private-registry-node-store.mjs')],
  outfile: output,
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  alias: {
    'private-registry': adapter,
    '@': path.join(webapp, 'src'),
    'next/server': 'next/server.js',
  },
  logLevel: 'silent',
})
const destination = path.resolve(process.env.REGISTRY_NODE_STORE_OUT || 'results/registry-node-store-benchmark.json')
const sizes = process.env.REGISTRY_NODE_STORE_SIZES || '100,1000,10000,100000'
const trials = process.env.REGISTRY_NODE_STORE_TRIALS || '5'
const run = spawnSync(process.execPath, ['--expose-gc', output, destination], {
  cwd: webapp,
  encoding: 'utf8',
  timeout: 30 * 60 * 1000,
  env: { ...process.env, DATABASE_URL: database, DIRECT_URL: database,
    REGISTRY_NODE_STORE_SIZES: sizes, REGISTRY_NODE_STORE_TRIALS: trials,
    REGISTRY_APP_REVISION: revision },
  maxBuffer: 2 * 1024 * 1024,
})
if (run.status !== 0) {
  throw new Error(`Registry proof driver failed (${run.status ?? run.signal}): ${run.stderr?.slice(-4000)}`)
}
const result = JSON.parse(await readFile(destination, 'utf8'))
if (!result.runComplete || result.appRevision !== revision) throw new Error('Incomplete registry proof result')
console.log(`Validated ${result.cases.length} sizes; wrote ${destination}`)
