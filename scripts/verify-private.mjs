// Builds a driver around the actual pinned private application. No application logic is copied.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';import {spawnSync} from 'node:child_process';import path from 'node:path';
const source=process.env.ONEBRIDGE_SOURCE||((await readFile('.private-source-path','utf8')).trim());
const env=process.env.ONEBRIDGE_DATABASE_URL?{...process.env,DATABASE_URL:process.env.ONEBRIDGE_DATABASE_URL,DIRECT_URL:process.env.ONEBRIDGE_DATABASE_URL}:JSON.parse(await readFile('.private-db-env.json','utf8'));
const u=new URL(env.DATABASE_URL);if(!['127.0.0.1','localhost'].includes(u.hostname)||!u.pathname.startsWith('/bridge_research_'))throw Error('Disposable local research database required');
const dir=path.join(source,'webapp/.research');await mkdir(dir,{recursive:true});
const imports={prisma:'db/prisma',activateRosterCompleteGeneration:'vaults/generation-activation',sealVaultGenerationGrant:'crypto/vault-key-grants',sealMembershipPrivateKey:'crypto/membership-keys',wrapMasterKeyForPasskey:'crypto/passkey-crypto',unwrapMasterKeyWithPasskey:'crypto/passkey-crypto',listCurrentPasskeyCredentials:'passkeys/server'};
const adapter=Object.entries(imports).map(([name,module])=>`export {${name}} from ${JSON.stringify(path.join(source,'webapp/src/lib/'+module+'.ts'))};`).join('\n');
await writeFile(dir+'/adapter.mjs',adapter);
await build({entryPoints:[path.resolve('experiments/private-lifecycle.mjs')],outfile:dir+'/driver.mjs',bundle:true,platform:'node',format:'esm',packages:'external',alias:{'private-app':dir+'/adapter.mjs','@':path.join(source,'webapp/src'),'next/server':'next/server.js','next/headers':'next/headers.js','next/navigation':'next/navigation.js'},logLevel:'silent'});
const p=spawnSync(process.execPath,[dir+'/driver.mjs',path.resolve('results/private-lifecycle.json')],{cwd:source+'/webapp',env:{...env,NODE_ENV:'development',TEST_AUTH_ENABLED:'true',TOKEN_HASH_PEPPER:'disposable-research-pepper',APP_ORIGIN:'http://127.0.0.1:3000',NEXT_PUBLIC_APP_URL:'http://127.0.0.1:3000',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'disposable-local-placeholder',SUPABASE_SERVICE_ROLE_KEY:'disposable-local-placeholder'},encoding:'utf8',timeout:600000,maxBuffer:25*1024*1024});
await writeFile('.private-lifecycle-output.log',p.stdout+'\n'+p.stderr);
if(p.status!==0){console.error(p.stderr.slice(-3000));throw Error('Actual application lifecycle driver failed; see private log')}
console.log('Actual application lifecycle results written to results/private-lifecycle.json');
