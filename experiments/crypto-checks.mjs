import * as c from "@drvillo/webcrypto-seal";
import assert from "node:assert/strict";
import { blake2b } from "@noble/hashes/blake2.js";
import { writeFile, mkdir } from "node:fs/promises";
const rows = [];
const key = await c.generateKeypair();
const other = await c.generateKeypair();
const context = {
  scopeId: "disposable-vault",
  resourceId: "disposable-object",
  kind: "document-dek",
  keyId: key.keyId,
  publicKey: key.publicKey,
};
const original = new TextEncoder().encode("original disposable document");
const forged = new TextEncoder().encode("replacement disposable document");
const a = await c.encryptBytesForSealedUpload(original, context);
const opener = {
  ...context,
  privateKey: key.privateKey,
  sealedKey: a.sealedKey,
};
async function check(name, f, classification = "correctness example") {
  await f();
  rows.push({ name, status: "passed", classification });
}
await check("object round trip", async () =>
  assert.deepEqual(
    await c.decryptBytesFromSealedUpload(a.ciphertext, opener),
    original,
  ),
);
await check("wrong generation rejected", async () =>
  assert.rejects(() =>
    c.decryptBytesFromSealedUpload(a.ciphertext, {
      ...opener,
      publicKey: other.publicKey,
      privateKey: other.privateKey,
    }),
  ),
);
await check("wrong context rejected", async () =>
  assert.rejects(() =>
    c.decryptBytesFromSealedUpload(a.ciphertext, {
      ...opener,
      resourceId: "other-object",
    }),
  ),
);
await check("changed ciphertext rejected", async () => {
  const bad = a.ciphertext.slice();
  bad[0] ^= 1;
  await assert.rejects(() => c.decryptBytesFromSealedUpload(bad, opener));
});
await check(
  "public-key-only replacement accepted",
  async () => {
    const b = await c.encryptBytesForSealedUpload(forged, context);
    assert.deepEqual(
      await c.decryptBytesFromSealedUpload(b.ciphertext, {
        ...opener,
        sealedKey: b.sealedKey,
      }),
      forged,
    );
  },
  "expected limitation; no uploader authentication",
);
const dek = c.generateDek(),
  link = c.generateDek(),
  differentLink = c.generateDek();
const wrapped = await c.wrapKey(dek, link);
await check("package wrapper round trip", async () =>
  assert.deepEqual(await c.unwrapKey(wrapped, link), dek),
);
await check("independent package key rejected", async () =>
  assert.rejects(() => c.unwrapKey(wrapped, differentLink)),
);
await check(
  "retained package key still opens retained wrapper",
  async () => assert.deepEqual(await c.unwrapKey(wrapped, link), dek),
  "expected limitation; no erasure by service revocation",
);
await check("HKDF empty salt equals 32 zero bytes", async () =>
  assert.deepEqual(
    await c.deriveChildKey(dek, new Uint8Array()),
    await c.deriveChildKey(dek, new Uint8Array(32)),
  ),
);
await check("BLAKE2b-24 differs from truncated BLAKE2b-64", async () =>
  assert.notDeepEqual(
    blake2b(original, { dkLen: 24 }),
    blake2b(original, { dkLen: 64 }).slice(0, 24),
  ),
);
const verifier = await c.createVerifier(link);
await check("wrong verifier key rejected", async () =>
  assert.rejects(() => c.verifyWithVerifier(differentLink, verifier)),
);
await mkdir("results", { recursive: true });
await writeFile(
  "results/crypto-checks.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      node: process.version,
      package: "@drvillo/webcrypto-seal@0.2.1",
      rows,
      vector: {
        plaintext: c.toBase64Url(original),
        publicKey: c.toBase64Url(key.publicKey),
        privateKey: c.toBase64Url(key.privateKey),
        keyId: key.keyId,
        ciphertext: c.toBase64Url(a.ciphertext),
        sealedKey: a.sealedKey,
      },
      scope:
        "actual published library; disposable random keys; no application routes exercised",
    },
    null,
    2,
  ) + "\n",
);
console.log(rows.length + " published-library checks passed");
