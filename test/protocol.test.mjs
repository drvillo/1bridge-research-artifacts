import test from "node:test";
import assert from "node:assert/strict";
import {
  fixture,
  submit,
  accept,
  replaceDirectory,
  descriptor,
} from "../protocol/guest-submission.mjs";
test("authentic scoped submission opens and retained plaintext survives later denial", async () => {
  const f = await fixture();
  const p = await submit(f);
  assert.equal(
    new TextDecoder().decode(await accept(f, p)),
    "disposable guest document",
  );
  f.state.epoch++;
  await assert.rejects(() => accept(f, p), /epoch/);
});
test("fixed trusted anchor rejects directory substitution", async () => {
  const f = await fixture();
  const attack = await replaceDirectory(f);
  await assert.rejects(() => submit(attack), /descriptor signature/);
});
test("service-supplied initial anchor permits substitution under existing delivery assumptions", async () => {
  const f = await fixture();
  const attack = await replaceDirectory(f, true);
  const p = await submit(attack);
  assert.equal(
    new TextDecoder().decode(await accept(attack, p)),
    "disposable guest document",
  );
});
test("changed ciphertext, key envelope, scope and replay are rejected", async () => {
  const f = await fixture();
  const p = await submit(f);
  const bad = structuredClone(p);
  bad.ciphertext[0] ^= 1;
  await assert.rejects(() => accept(f, bad), /commitment/);
  await assert.rejects(
    () => accept(f, { ...p, sealedKey: p.sealedKey + "a" }),
    /commitment/,
  );
  const altered = {
    ...f,
    descriptor: {
      ...f.descriptor,
      body: { ...f.descriptor.body, scope: "other" },
    },
  };
  await assert.rejects(() => submit(altered), /signature/);
  await accept(f, p);
  await assert.rejects(() => accept(f, p), /replay/);
});
test("authenticated but stale or expired descriptors are rejected", async () => {
  const f = await fixture();
  const p = await submit(f);
  f.state.epoch = 2;
  await assert.rejects(() => accept(f, p), /epoch/);
  const g = await fixture();
  g.descriptor = await descriptor(g, { expiresAt: 0 });
  await assert.rejects(() => submit(g), /expired/);
});
