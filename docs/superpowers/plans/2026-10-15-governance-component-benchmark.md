# Governance Component Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce reproducible raw timing and artifact-size samples for the pinned pure-TypeScript authority library without implying app, observer or browser performance.

**Architecture:** Pin the same public authority commit as the current app/observer. One Node experiment measures Merkle root/proof creation and verification at fixed leaf counts, plus the four browser/server stages of one RSA-4096 blind proof-access token. Key generation and fixture creation are outside timed regions. Store raw per-trial samples and method/environment metadata in a JSON artifact for the later benchmark article.

**Tech Stack:** Node 22+, pnpm, `@drvillo/1bridge-authority` at Git commit `b48c9989b59f243b22c655b3d55b4ce0ae814f06`, Node built-in crypto/performance/test runner. No extra measurement library.

---

## Ground truth and scope

- This repo already has `experiments/protocol-bench.mjs`, `results/`, `test/*.test.mjs`, `pnpm test` and `scripts/statistics.mjs`. Its current `@drvillo/webcrypto-seal` samples predate governance (`package.json`, `experiments/protocol-bench.mjs`, `docs/governance-repository-map.md`).
- The authority package exports `merkleRoot`, `inclusionProof`, `verifyInclusion`, browser blind/finalize/verify functions, and the Node server signing subpath (`1bridge-authority/src/index.ts:3,15`; `src/blind-proof-access-server.ts:8-23`). Its history proof is bounded by the supplied leaf array (`src/history.ts:14-84`); a measured proof-generation time includes construction from that array, not an app's persisted-tree query.
- This experiment is a component benchmark. It makes no claim about network latency, Supabase transaction time, end-to-end share/recovery journeys, third-party observer throughput, browser memory, anonymity, or peer review. Those remain later measurements/claims.

## File responsibilities and names

| File | Responsibility | Name-strain check |
|---|---|---|
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` | Pin/build the exact authority dependency and expose `governance:bench`. | Existing package files; no new function name. |
| `experiments/governance-component-bench.mjs` | Parse bounded run options, generate fixtures, time the exact component operations, verify each result, emit raw JSON. | One experiment; stages are separately named in output. |
| `test/governance-component-bench.test.mjs` | Run a tiny benchmark and assert valid proof/token outputs, sample counts and metadata. | Behavioral test, not a timing threshold. |
| `results/governance-component-benchmark.json` | Raw measured run on this host with source/method metadata. | Data artifact; no extrapolated claim. |
| `README.md` and `docs/governance-research-traceability.md` | Give reproduction command and the precise component-only interpretation. | Existing documentation locations. |

## Task 1: dependency and red test

- [x] Add `@drvillo/1bridge-authority` as a Git-pinned dependency at `b48c9989b59f243b22c655b3d55b4ce0ae814f06`; allow only its Git `prepare` build as the observer repo does. Run `pnpm install --frozen-lockfile` and a compiled-package import check.
- [x] Write `test/governance-component-bench.test.mjs` to spawn the CLI with `--trials=2 --warmup=0 --sizes=8,16 --out=<temporary path>`. Assert two valid samples per size and blind stage, independently verified inclusion/token, finite nonnegative timings, logarithmic proof hash counts, and exact pinned dependency metadata. Also assert zero trials is rejected.
- [x] Run `pnpm test` and observe failure because the experiment does not yet exist.

## Task 2: minimal benchmark implementation

- [x] Implement bounded options: 1–100 trials, 0–20 warmups, positive power-of-two sizes 8–16384, explicit output path. The default run uses 30 trials, 3 warmups and 256/1024/4096 leaves. Reject unknown options rather than silently changing methods.
- [x] Use deterministic 32-byte leaf fixtures and a fixed target index per size. For every measured trial, time root generation, proof generation and proof verification separately; assert verification true, and record proof hash count/UTF-8 JSON bytes. Fixture construction is outside timings.
- [x] Generate one RSA-4096 key outside timings; import its public SPKI through the library. For every measured trial, create a fresh blind request, time blind, server sign, finalize and verify separately; assert the result true and record blinded request/token byte lengths. Do not include private key material in output.
- [x] Emit the exact Git dependency string, Node/platform/CPU metadata, UTC timestamp, options, raw trials and explicit limitations. Write the output only after all checks pass; do not emit a success-looking partial file.
- [x] Run the focused test and `pnpm test`; investigate any failure before changing the implementation.

## Task 3: measured artifact and review

- [x] Run `pnpm governance:bench` with defaults, inspect all sample counts and verification flags, and record the raw JSON under `results/`.
- [x] Update README and traceability with reproduction instructions and the conditional interpretation. Do not update the four manuscripts yet; their final update follows completed D1–D4 code and additional app/observer measurements.
- [x] Run `pnpm test`, `git diff --check`, inspect package lock and output for private key leakage and inaccurate claims, then commit the experiment and raw artifact. No browser or database test applies to this pure component harness.
