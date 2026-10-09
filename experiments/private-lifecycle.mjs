import {
  prisma as db,
  activateRosterCompleteGeneration as activate,
  sealVaultGenerationGrant as sealGrant,
  sealMembershipPrivateKey,
  wrapMasterKeyForPasskey,
  unwrapMasterKeyWithPasskey,
  listCurrentPasskeyCredentials,
} from "private-app";
import * as c from "@drvillo/webcrypto-seal";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
const rows = [],
  trials = [];
async function seed(count) {
  const workspace = await db.workspace.create({
    data: {
      name: "Disposable research workspace",
      migrationState: "expand_complete",
    },
  });
  const gen = await c.generateKeypair(),
    root = c.generateDek(),
    members = [];
  const vault = await db.vault.create({
    data: {
      workspaceId: workspace.id,
      kdfSalt: c.uint8ArrayToBase64(new Uint8Array(16)),
      kdfParams: c.DEFAULT_KDF_PARAMS,
      cryptoVersion: 3,
      encryptionPublicKey: gen.publicKeyEnvelope,
      encryptionKeyId: gen.keyId,
      verifierCiphertext: null,
      encryptedPrivateKey: null,
    },
  });
  const generation = await db.vaultKeyGeneration.create({
    data: {
      workspaceId: workspace.id,
      vaultId: vault.id,
      generationNumber: 1,
      keyId: gen.keyId,
      keySuite: "x25519",
      publicKey: gen.publicKeyEnvelope,
      state: "active",
      rosterRevision: 1,
    },
  });
  await db.vault.update({
    where: { id: vault.id },
    data: {
      currentGenerationId: generation.id,
      cryptoReadyAt: new Date(),
      writesFrozenAt: new Date(),
      writesFrozenReason: "research_rotation",
    },
  });
  for (let i = 0; i < count; i++) {
    const profile = await db.userProfile.create({
      data: { userId: randomUUID(), authMethod: "magic_link" },
    });
    const member = await db.workspaceMembership.create({
      data: {
        workspaceId: workspace.id,
        userProfileId: profile.id,
        workspaceRole: i === 0 ? "admin_operator" : "operator",
        state: "active",
      },
    });
    const pair = await c.generateKeypair();
    const key = await db.workspaceMembershipKey.create({
      data: {
        workspaceId: workspace.id,
        workspaceMembershipId: member.id,
        version: 1,
        keyId: pair.keyId,
        keySuite: "x25519",
        envelopeVersion: "1",
        publicKey: pair.publicKeyEnvelope,
        wrappedPrivateKey: await sealMembershipPrivateKey(
          root,
          {
            userProfileId: profile.id,
            workspaceId: workspace.id,
            workspaceMembershipId: member.id,
            membershipKeyVersion: 1,
            publicKeyId: pair.keyId,
            suite: "x25519",
          },
          pair.privateKey,
          { envelopeVersion: 1, rootRotationId: "research-initial" },
        ),
        state: "active",
        verifiedAt: new Date(),
      },
    });
    const envelope = await grant(
      { workspace, vault },
      { ...generation, privateKey: gen.privateKey },
      pair,
      member,
    );
    await db.vaultKeyGrant.create({
      data: {
        workspaceId: workspace.id,
        generationId: generation.id,
        recipientMembershipKeyId: key.id,
        envelopeVersion: "1",
        keySuite: "x25519",
        sealedPrivateKey: envelope,
        state: "active",
        provisionedById: member.id,
      },
    });
    members.push({ profile, member, pair, key });
  }
  return { workspace, vault, generation, members, root };
}
async function grant(f, g, p, m) {
  if (!g.privateKey)
    throw Error(
      "Disposable generation fixture must supply its actual private key",
    );
  return sealGrant(
    g.privateKey,
    p.publicKey,
    p.keyId,
    {
      workspaceId: f.workspace.id,
      vaultId: f.vault.id,
      generationId: g.id,
      generationNumber: g.generationNumber,
      generationKeyId: g.keyId,
      recipientWorkspaceMembershipId: m.id,
      recipientMembershipKeyFingerprint: p.keyId,
      recipientMembershipKeyVersion: 1,
      suite: "x25519",
      envelopeVersion: 1,
    },
    g.publicKey,
  );
}
async function input(f) {
  const pair = await c.generateKeypair(),
    id = randomUUID();
  const current = await db.vault.findUnique({
    where: { id: f.vault.id },
    include: { currentGeneration: true },
  });
  const g = {
    id,
    privateKey: pair.privateKey,
    publicKey: pair.publicKeyEnvelope,
    keyId: pair.keyId,
    generationNumber: current.currentGeneration.generationNumber + 1,
  };
  const grants = [];
  for (const m of f.members)
    grants.push({
      recipientWorkspaceMembershipId: m.member.id,
      recipientMembershipKeyId: m.key.id,
      recipientMembershipKeyVersion: 1,
      sealedPrivateKey: await grant(f, g, m.pair, m.member),
      envelopeVersion: 1,
      keySuite: "x25519",
    });
  return {
    vaultId: f.vault.id,
    actorUserProfileId: f.members[0].profile.id,
    idempotencyKey: randomUUID(),
    expectedRosterRevision: current.rosterRevision,
    sourceGenerationId: current.currentGenerationId,
    targetGenerationId: id,
    generationNumber: g.generationNumber,
    generationKeyId: g.keyId,
    publicKey: g.publicKey,
    grants,
  };
}
async function run(name, fn, classification = "satisfied property") {
  await fn();
  rows.push({
    name,
    status: "passed",
    classification,
    layer:
      "real application functions and committed migrations on disposable PostgreSQL",
  });
}
try {
  const f = await seed(2);
  const valid = await input(f);
  await run("complete generation activation", async () => {
    const r = await activate(valid);
    assert.equal(
      await db.vaultKeyGrant.count({ where: { generationId: r.generationId } }),
      2,
    );
    const v = await db.vault.findUnique({ where: { id: f.vault.id } });
    assert.equal(v.currentGenerationId, r.generationId);
    assert.equal(v.writesFrozenAt, null);
    assert.equal(
      (
        await db.vaultKeyGeneration.findUnique({
          where: { id: valid.sourceGenerationId },
        })
      ).state,
      "retiring",
    );
  });
  await run("activation idempotency", async () =>
    assert.equal((await activate(valid)).idempotent, true),
  );
  await db.vault.update({
    where: { id: f.vault.id },
    data: {
      writesFrozenAt: new Date(),
      writesFrozenReason: "research_rotation",
    },
  });
  const stale = await input(f);
  stale.expectedRosterRevision++;
  await run("stale roster rejected", async () =>
    assert.rejects(
      () => activate(stale),
      (e) => e.code === "STALE_ROSTER_REVISION",
    ),
  );
  const malformed = await input(f);
  malformed.grants[1].sealedPrivateKey = "invalid";
  const before = await db.vaultKeyGeneration.count({
    where: { vaultId: f.vault.id },
  });
  await run("invalid envelope leaves generation state unchanged", async () => {
    await assert.rejects(() => activate(malformed));
    assert.equal(
      await db.vaultKeyGeneration.count({ where: { vaultId: f.vault.id } }),
      before,
    );
    assert.ok(
      (await db.vault.findUnique({ where: { id: f.vault.id } })).writesFrozenAt,
    );
  });
  const duplicate = await input(f);
  duplicate.grants = [duplicate.grants[0], duplicate.grants[0]];
  await run(
    "duplicate recipients activate an incomplete persisted grant set",
    async () => {
      const r = await activate(duplicate);
      const grants = await db.vaultKeyGrant.findMany({
        where: { generationId: r.generationId },
      });
      assert.equal(grants.length, 1);
      assert.equal(grants[0].recipientMembershipKeyId, f.members[0].key.id);
      assert.equal(
        await db.vaultKeyGrant.count({
          where: {
            generationId: r.generationId,
            recipientMembershipKeyId: f.members[1].key.id,
          },
        }),
        0,
      );
    },
    "confirmed implementation defect; exact-roster coverage fails",
  );
  await run(
    "stored passkey wrap and rotation filtering",
    async () => {
      const p = f.members[0].profile,
        rotation = randomUUID(),
        root = c.generateDek(),
        prf = c.generateDek();
      await db.userProfile.update({
        where: { id: p.id },
        data: { lastKeyRotationId: rotation },
      });
      await db.passkeyCredential.create({
        data: {
          userProfileId: p.id,
          credentialId: randomUUID(),
          publicKey: "disposable-public-key",
          prfSalt: "disposable-prf-salt",
          wrappedMasterKey: await wrapMasterKeyForPasskey(root, prf),
          lastKeyRotationId: rotation,
          signCount: 0,
          deviceLabel: "Disposable research fixture",
          transports: ["internal"],
        },
      });
      const credentials = await listCurrentPasskeyCredentials(p.id, rotation);
      assert.equal(credentials.length, 1);
      assert.deepEqual(
        await unwrapMasterKeyWithPasskey(credentials[0].wrappedMasterKey, prf),
        root,
      );
      assert.equal(
        (await listCurrentPasskeyCredentials(p.id, randomUUID())).length,
        0,
      );
    },
    "satisfied storage/filter property; PRF fixture, no authenticator ceremony",
  );
  for (const count of [1, 10, 50]) {
    const b = await seed(count);
    for (let i = 0; i < 100; i++) {
      await db.vault.update({
        where: { id: b.vault.id },
        data: {
          writesFrozenAt: new Date(),
          writesFrozenReason: "research_rotation",
        },
      });
      const prepared = await input(b);
      const start = performance.now();
      try {
        await activate(prepared);
        trials.push({
          name: "application.activation." + count,
          mode: "initialized",
          session: Math.floor(i / 34),
          trial: i,
          ms: performance.now() - start,
          error: null,
        });
      } catch (e) {
        trials.push({
          name: "application.activation." + count,
          mode: "initialized",
          session: Math.floor(i / 34),
          trial: i,
          ms: performance.now() - start,
          error: String(e),
        });
        throw e;
      }
    }
  }
  await writeFile(
    process.argv[2],
    JSON.stringify(
      {
        date: new Date().toISOString(),
        applicationCommit: "a103da282e2cec6351f28f04db67b22d16fdd75b",
        database:
          "disposable local PostgreSQL; all committed migrations; empty auth.users bootstrap",
        authentication:
          "service function authorization against real membership/grant rows; no full Supabase login or browser journey",
        rows,
        trials,
        limitations: [
          "No live email delivery",
          "No password-rotation route persistence check yet",
          "No complete retrieval-route revocation coverage",
          "No authenticated WebAuthn PRF ceremony",
          "Activation timings include authorization and transaction; no phase instrumentation or network timing",
          "Initialized activation contexts share a process and database; session labels are trial blocks, not fresh processes",
        ],
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await db.$disconnect();
}
