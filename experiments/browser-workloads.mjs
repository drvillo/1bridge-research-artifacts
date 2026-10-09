import * as c from '@drvillo/webcrypto-seal';
import { deriveMasterKeyInWorker, terminateArgon2Worker } from '@drvillo/webcrypto-seal/argon2-worker';
const payload=n=>new Uint8Array(n).fill(0x41);
export async function workloads(app={}) {
 const gen=await c.generateKeypair(),dek=c.generateDek();const verifier=await c.createVerifier(dek);const objects={};
 for(const n of [1024,1048576,26214400])objects[n]={bytes:payload(n),encrypted:await c.encryptPayload(payload(n),dek)};
 const salt=new Uint8Array(16).fill(3);const recipients=await Promise.all(Array.from({length:50},()=>c.generateKeypair()));
 const list=[{name:app.deriveOwnerMasterKey?'application.account-root':'library.argon2-worker',run:async()=>{if(app.deriveOwnerMasterKey)await app.deriveOwnerMasterKey('disposable benchmark password',salt,c.DEFAULT_KDF_PARAMS);else{try{await deriveMasterKeyInWorker('disposable benchmark password',salt,c.DEFAULT_KDF_PARAMS)}finally{terminateArgon2Worker()}}}},{name:'library.generation-create',run:()=>c.generateKeypair()},{name:'library.verifier-open',run:()=>c.verifyWithVerifier(dek,verifier)},{name:'library.contextual-seal',run:()=>c.sealContextualKey({scopeId:'bench-vault',resourceId:'bench-object',kind:'document-dek',publicKey:gen.publicKey,keyId:gen.keyId,key:dek})}];
 for(const [n,o] of Object.entries(objects)){
  list.push({name:'library.aes-encrypt.'+n,run:()=>c.encryptPayload(o.bytes,dek)},{name:'library.aes-decrypt.'+n,run:()=>c.decryptPayload(o.encrypted,dek)},{name:'library.pack.'+n,run:()=>c.packCiphertextEnvelope(o.encrypted)},{name:'library.sha256.'+n,run:()=>c.computeChecksum(o.bytes)});
  if(app.encryptFileForUploadV3){const file=new File([o.bytes],'disposable.bin');list.push({name:'application.upload-encrypt.'+n,run:()=>app.encryptFileForUploadV3(file,{publicKey:gen.publicKey,keyId:gen.keyId,vaultId:'bench-vault',docId:'bench-document'})})}
 }
 for(const count of [1,10,50]) list.push({name:(app.sealVaultGenerationGrant?'application.generation-grants.':'library.contextual-grants.')+count,run:async()=>{
  // Sequential issuance follows the inspected rotation client; recipients are prepared outside timing.
  for(let i=0;i<count;i++){
   const r=recipients[i];
   if(app.sealVaultGenerationGrant)await app.sealVaultGenerationGrant(gen.privateKey,r.publicKey,r.keyId,{workspaceId:'bench-workspace',vaultId:'bench-vault',generationId:'bench-generation',generationNumber:2,generationKeyId:gen.keyId,recipientWorkspaceMembershipId:'bench-member-'+i,recipientMembershipKeyFingerprint:r.keyId,recipientMembershipKeyVersion:1,suite:'x25519',envelopeVersion:1},gen.publicKeyEnvelope);
   else await c.sealContextualKey({scopeId:'bench-workspace',resourceId:'bench-generation-'+i,kind:'benchmark-control',key:gen.privateKey,publicKey:r.publicKey,keyId:r.keyId});
  }
 }});
 return list;
}
export async function measure(workload){
 const heapBefore=performance.memory?.usedJSHeapSize??null;
 let ticks=0,last=performance.now(),maxGap=0;
 const timer=setInterval(()=>{const now=performance.now();maxGap=Math.max(maxGap,now-last);last=now;ticks++},10);
 const start=performance.now();let error=null;
 try{await workload.run()}catch(e){error=String(e)}
 const ms=performance.now()-start;clearInterval(timer);
 return {ms,error,heapBefore,heapAfter:performance.memory?.usedJSHeapSize??null,eventLoopTicks:ticks,maxObservedTimerGapMs:maxGap||null};
}
