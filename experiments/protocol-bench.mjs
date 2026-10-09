import {
  fixture,
  submit,
  accept,
  replaceDirectory,
} from "../protocol/guest-submission.mjs";
import { writeFile } from "node:fs/promises";
const rows = [];
for (let session = 0; session < 3; session++)
  for (let i = 0; i < (session === 0 ? 34 : 33); i++) {
    const start = performance.now();
    const f = await fixture();
    const setup = performance.now() - start;
    const a = performance.now(),
      p = await submit(f),
      b = performance.now();
    await accept(f, p);
    const end = performance.now();
    rows.push({
      session,
      trial: i,
      setupMs: setup,
      submitMs: b - a,
      acceptMs: end - b,
      descriptorBytes: Buffer.byteLength(JSON.stringify(f.descriptor)),
      commitmentBytes: Buffer.byteLength(JSON.stringify(p.commitment)),
      signatureBytes: Buffer.byteLength(p.signature),
      ciphertextBytes: p.ciphertext.length,
    });
  }
const f = await fixture(),
  anchored = await replaceDirectory(f),
  unanchored = await replaceDirectory(f, true);
let fixedAnchorRejected = false;
try {
  await submit(anchored);
} catch {
  fixedAnchorRejected = true;
}
await submit(unanchored);
await writeFile(
  "results/protocol-baseline.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      node: process.version,
      rows,
      trustProfiles: {
        authenticatedBootstrap: {
          directorySubstitutionRejected: fixedAnchorRejected,
          required:
            "authentic initial holder/vault signing key and holder-authenticated guest credential binding",
        },
        existingDelivery: {
          replacementInitialAnchorAccepted: true,
          required: "honest initial service/email-assisted distribution",
        },
      },
      limitations: [
        "Established signed-envelope baseline, not a new protocol result",
        "Local replay ledger is in-memory, not durable or globally consistent",
        "Offline client cannot infer an unseen latest generation",
        "No participant study",
        "Fixture setup includes key generation; no real-world enrollment or network",
      ],
      status: "experimental baseline; not used by 1Bridge",
    },
    null,
    2,
  ) + "\n",
);
console.log(rows.length + " protocol baseline trials");
