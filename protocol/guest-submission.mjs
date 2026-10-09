// Experimental baseline only. This is not used by the 1Bridge application.
import * as c from '@drvillo/webcrypto-seal';
import { webcrypto } from 'node:crypto';
const subtle=webcrypto.subtle;
const utf8=new TextEncoder();
export const encode=x=>utf8.encode(JSON.stringify(x));
export async function digest(x){return c.computeChecksum(x)}
async function signingPair(){return subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify'])}
async function sign(body,key){return c.toBase64Url(new Uint8Array(await subtle.sign({name:'ECDSA',hash:'SHA-256'},key,encode(body))))}
async function verify(body,signature,key){return subtle.verify({name:'ECDSA',hash:'SHA-256'},key,c.fromBase64Url(signature),encode(body))}
// Fixed insertion order is the prototype encoding contract, not arbitrary JSON canonicalization.
export async function descriptor(f,overrides={}){
 const body={version:1,scheme:'experimental-p256-x25519-aesgcm',scope:'disposable-vault',request:'disposable-request',epoch:1,generationKeyId:f.generation.keyId,generationPublicKey:c.toBase64Url(f.generation.publicKey),guestPublicKey:await subtle.exportKey('jwk',f.guest.publicKey),expiresAt:Date.now()+3600000,...overrides};
 return {body,signature:await sign(body,f.holder.privateKey)};
}
export async function fixture(){
 const f={holder:await signingPair(),guest:await signingPair(),generation:await c.generateKeypair(),state:{epoch:1,scope:'disposable-vault',request:'disposable-request',consumed:new Set()}};
 f.trustedHolder=f.holder.publicKey;f.descriptor=await descriptor(f);return f;
}
async function validDescriptor(f){
 if(!await verify(f.descriptor.body,f.descriptor.signature,f.trustedHolder))throw Error('descriptor signature');
 if(f.descriptor.body.expiresAt<=Date.now())throw Error('expired descriptor');
}
export async function submit(f,plaintext=utf8.encode('disposable guest document')){
 await validDescriptor(f);
 const d=f.descriptor.body;
 const object=await c.encryptBytesForSealedUpload(plaintext,{publicKey:c.fromBase64Url(d.generationPublicKey),keyId:d.generationKeyId,scopeId:d.scope,resourceId:d.request,kind:'experimental-guest-object'});
 const body={version:1,descriptorHash:await digest(encode(f.descriptor)),ciphertextHash:await digest(object.ciphertext),sealedKeyHash:await digest(utf8.encode(object.sealedKey))};
 return {...object,commitment:body,signature:await sign(body,f.guest.privateKey)};
}
export async function accept(f,p){
 await validDescriptor(f);const d=f.descriptor.body;
 if(d.epoch!==f.state.epoch)throw Error('stale epoch');
 if(d.scope!==f.state.scope||d.request!==f.state.request)throw Error('wrong scope');
 const expected={version:1,descriptorHash:await digest(encode(f.descriptor)),ciphertextHash:await digest(p.ciphertext),sealedKeyHash:await digest(utf8.encode(p.sealedKey))};
 if(JSON.stringify(expected)!==JSON.stringify(p.commitment))throw Error('commitment mismatch');
 const pub=await subtle.importKey('jwk',d.guestPublicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 if(!await verify(p.commitment,p.signature,pub))throw Error('guest signature');
 if(f.state.consumed.has(d.request))throw Error('local replay');
 const plaintext=await c.decryptBytesFromSealedUpload(p.ciphertext,{publicKey:f.generation.publicKey,privateKey:f.generation.privateKey,scopeId:d.scope,resourceId:d.request,kind:'experimental-guest-object',sealedKey:p.sealedKey});
 f.state.consumed.add(d.request);return plaintext;
}
export async function replaceDirectory(f,replaceInitialAnchor=false){
 const attacker=await fixture();attacker.trustedHolder=replaceInitialAnchor?attacker.holder.publicKey:f.trustedHolder;return attacker;
}
