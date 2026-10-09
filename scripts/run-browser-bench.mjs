import { build } from 'esbuild';
import { chromium, firefox, webkit } from 'playwright';
import { createServer } from 'node:http';
import { readFile,writeFile,mkdir,copyFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1]};
const browserName=arg('--browser','chromium'),warm=Number(arg('--warm','100')),cold=Number(arg('--cold','30')),filter=arg('--filter','');
const source=process.env.ONEBRIDGE_SOURCE;
const out=path.resolve('.private-browser-dist');await mkdir(out,{recursive:true});
let entry="export * from '../experiments/browser-workloads.mjs';\n";
const imports=[];
if(source){
 for(const [module,names] of [['vault-crypto',['deriveOwnerMasterKey']],['vault-key-grants',['sealVaultGenerationGrant']],['client-crypto',['encryptFileForUploadV3']]])imports.push(`import {${names.join(',')}} from ${JSON.stringify(path.join(source,'webapp/src/lib/crypto/'+module+'.ts'))};`);
 entry+=imports.join('\n')+"\nexport const app={deriveOwnerMasterKey,sealVaultGenerationGrant,encryptFileForUploadV3};\n";
}else entry+='export const app={};\n';
await writeFile(out+'/entry.mjs',entry);
await build({entryPoints:[out+'/entry.mjs'],outfile:out+'/bundle.mjs',bundle:true,format:'esm',platform:'browser',alias:source?{'@':path.join(source,'webapp/src')}:undefined,define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
await copyFile('node_modules/@drvillo/webcrypto-seal/dist/argon2-worker/worker.js',out+'/worker.js');
const server=createServer(async(req,res)=>{try{const p=req.url.split('?')[0];if(p==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Disposable benchmark context</title>');return}if(!['/bundle.mjs','/worker.js'].includes(p)){res.writeHead(404);res.end();return}res.setHeader('Content-Type','text/javascript');res.end(await readFile(out+p))}catch{res.writeHead(500);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
const engine={chromium,firefox,webkit}[browserName];if(!engine)throw Error('Unknown browser');
const browser=await engine.launch({headless:true});const version=browser.version();let rows=[];
async function pageFor(){const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(180000);await page.goto(url);return {context,page}}
async function prepare(page){return page.evaluate(async()=>{const t=performance.now();window.lab=await import('/bundle.mjs');window.ws=await window.lab.workloads(window.lab.app);return {names:window.ws.map(x=>x.name),setupMs:performance.now()-t,userAgent:navigator.userAgent}})}
const first=await pageFor();const setup=await prepare(first.page);await first.context.close();const names=setup.names.filter(x=>!filter||x.includes(filter));
console.log(browserName,version,names.length+' workloads',warm+' initialized',cold+' cold');
try{
 for(let session=0;session<3;session++){
  const {context,page}=await pageFor();await prepare(page);
  for(const name of names){
   await page.evaluate(n=>window.ws.find(x=>x.name===n).run(),name);
   const n=Math.floor(warm/3)+(session<warm%3?1:0);
   for(let i=0;i<n;i++){let r;try{r=await page.evaluate(n=>window.lab.measure(window.ws.find(x=>x.name===n)),name)}catch(e){r={ms:null,error:String(e)}}rows.push({name,mode:'initialized',session,trial:i,...r})}
  }
  await context.close();console.log('initialized session',session+1,'complete');
 }
 for(let i=0;i<cold;i++){
  const {context,page}=await pageFor();const s=await prepare(page);
  // One selected workload per fresh context prevents earlier workloads warming it.
  for(const name of names){if(name!==names[0]){await context.close();break}const r=await page.evaluate(n=>window.lab.measure(window.ws.find(x=>x.name===n)),name);rows.push({name,mode:'cold',session:i,trial:0,setupMs:s.setupMs,...r});await context.close()}
  for(const name of names.slice(1)){const p=await pageFor();const s=await prepare(p.page);const r=await p.page.evaluate(n=>window.lab.measure(window.ws.find(x=>x.name===n)),name);rows.push({name,mode:'cold',session:i,trial:0,setupMs:s.setupMs,...r});await p.context.close()}
  if((i+1)%10===0)console.log('cold contexts',i+1,'complete');
 }
}finally{await browser.close();server.close()}
const sourceFiles={};if(source)for(const name of ['vault-crypto','vault-key-grants','client-crypto'])sourceFiles['webapp/src/lib/crypto/'+name+'.ts']=createHash('sha256').update(await readFile(path.join(source,'webapp/src/lib/crypto/'+name+'.ts'))).digest('hex');
await writeFile('results/browser-'+browserName+(source?'-application':'-library')+(filter?'-'+filter.replaceAll('.','-'):'')+'.json',JSON.stringify({date:new Date().toISOString(),environment:{browser:browserName,version,userAgent:setup.userAgent,headless:true,os:os.platform(),release:os.release(),arch:os.arch(),cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem(),node:process.version,powerMode:'not independently recorded',thermalState:'not instrumented',crossOriginIsolated:false},method:{warm,cold,sessions:3,warmup:'one unrecorded trial per workload per initialized session',order:'fixed; no randomization in this initial run',coldDefinition:'fresh browser context, imported module and disposable fixture setup reported separately; browser process reused',memory:'Chromium JS heap when exposed; not peak memory or worker/native allocation coverage',eventLoop:'10 ms timer; no-tick trials cannot estimate maximum blocking',package:'0.2.1',applicationCommit:source?'a103da282e2cec6351f28f04db67b22d16fdd75b':null},sourceFiles,rows},null,2)+'\n');
console.log('Saved',rows.length,'raw trials');
