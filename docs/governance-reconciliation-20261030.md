# Governance evidence reconciliation — 30 October 2026

## Decision

This report records the evidence and recommendation prepared before the owner authorized incorporation and merge on 30 October 2026. PR states below describe that initial review snapshot; consult the linked PRs for their final disposition.

Use research PR #1 as the sole consolidation PR. After its owner incorporates this local evidence patch and a reviewer checks the raw result, provenance and scoped wording, mark #1 ready and merge it as an evidence/technical-report update. Close PR #2 as superseded by #1; do not merge both independently. Until this patch is incorporated and reviewed, the remote #1 still lacks the completed evidence.

Verified from live GitHub metadata: #1 is open/draft at `c0fb0e7edf8da89a4474842eb3e2c36773218e4f`; #2 is open/draft at `ffa49e08f10d20191bad1af41c8eece03bc6b278`; both target `69c3907545c9abc28c0e897d2eeb6be5caa2b230`. `git merge-base --is-ancestor ffa49e08f10d20191bad1af41c8eece03bc6b278 c0fb0e7edf8da89a4474842eb3e2c36773218e4f` exits 0. #2 changes only README and the two governance maps, and its entire commit is already in #1. Both review-submission lists were empty when checked.

Application [PR #137](https://github.com/drvillo/ubo-guard/pull/137) merged on 26 October 2026 at 16:10:08 UTC, merge commit `d6c46df74985873ead73d84785049ed22d5f9221`. Its body still says to keep it draft, and research #2 still calls it unmerged; those descriptions are stale. Local research documentation now records the merge without inferring deployment.

## Source and method

The experiment uses clean application commit `f44a051a2539a2be930ad55f218002b25a9cd104`, installed with its frozen lockfile and pnpm 10.29.3. The runner checks the application HEAD and clean status before bundling. It calls `readRegistryConsistency` (`webapp/src/lib/authority/registry-source.ts:176`), which builds a range-hash proof and checks it against checkpoint roots. `registry-node-store.ts:19` reads indexed leaf hashes or aligned persisted subtree hashes, recursively combining remainders; `registry-merkle.ts:47` constructs the consistency path. The production node-table primary key is `(start_index, height)` in migration `20261020160000_authority_registry_merkle_nodes`.

The unchanged driver builds synthetic entries and persisted nodes in a dedicated loopback Postgres database, independently computes roots from entry bytes, and verifies every returned proof, including warmups. “Independently computed” refers to a separate computation from the bytes, not a different cryptographic implementation or independent reviewer. Timed calls include the application's internal verification; fixture construction and the driver's external verification are outside the timer.

The original runner failed its real smoke run with `ERR_MODULE_NOT_FOUND` for `next/server`. The local one-line esbuild alias to `next/server.js` follows the existing `scripts/verify-private.mjs` convention. With that fix, the same smoke case passed. No application source or benchmark driver logic was changed. The smoke timing is excluded from the final result.

The three measured application source files are byte-identical at #137's merge commit, but the merge uses authority npm `0.1.0` instead of the pinned checkout's Git dependency `297f81d11ed3cee75f01d561a71da15de8e75697`. These measurements therefore establish the requested pinned environment, not the current application or deployed runtime.

## Verification and limits

- Passed: research baseline 15/15 tests and final updated suite 16/16, including artifact/provenance validation; focused pinned application registry unit/route tests 14/14; complete pinned stable/stable-dom suite 643 files / 4,957 tests; lint with zero errors and 104 warnings; the `pnpm typecheck:gate` regression gate with three distinct known diagnostics and no regressions. Ordinary `pnpm typecheck` exits 1 with four error occurrences in tests: `phase-10-capability-contract.test.ts:221` and `workspace-authorization.test.ts:1241` reject `operator` where `delegate` is required; `phase-10-capability-contract.test.ts:289` and `:299` lack `activeWorkspaceOperators`. The gate strips positions and deduplicates the latter two occurrences, then compares all three normalized diagnostics with the unchanged committed baseline. This is not a clean ordinary typecheck. Advisory smell scan of the three measured source files found no findings.
- Failed then corrected: default pnpm 11 dependency setup (version/configuration incompatibility); original benchmark smoke run (Node module resolution). pnpm 10.29.3 frozen installation and the aliased runner succeeded.
- Unrun: full real-schema application integration suite, migration replay, browser E2E, production build, manuscript rebuild/visual inspection, hosted timings, hosted observer acceptance, and independent scientific/technical review. Historical evidence for these remains attributed to its original revisions and has not been represented as a new run.

This is a minimal local SQL experiment, with warm database/process state and synthetic fixed-size entries. It does not time Next routes, production distributions, concurrent traffic, Vercel or Supabase network calls. RSS/heap are process snapshots that include fixture state; they are neither peak memory nor per-request allocation. Five trials are descriptive observations, not an SLA or a robust population estimate. The old full-prefix measurements retain their original files and methodology; no controlled speedup comparison is claimed.

## Separate gates

An evidence-only research merge need not wait for hosted deployment or academic review if these exclusions remain explicit. It must not mark those gates complete. Hosted publisher/default-observer configuration, a nonempty independently operated observer run, independently delivered initial pins, representative Vercel Hobby performance, and safe legacy audit-mirror drain/reconciliation remain separate application deployment questions. The mirror must not be removed on the strength of this benchmark.

The four manuscript tracks remain working technical reports. Independent source-access review, reviewer replication, native browser/mobile coverage, the comparative study's second actual implementation, and protocol/academic contribution gates remain open as described in `publication-status.md`. Updating the private manuscript to cite this new local result, compiling it and inspecting its PDF would be a separate follow-up; no PDF publication is part of this patch.

At the time this evidence report was prepared, no PR had been pushed, approved, merged, closed or published. The existing `/workspace/ubo-guard` checkout was preserved; all application execution used `/workspace/ubo-guard-benchmark`.

## Completed benchmark

[Raw observations](../results/registry-node-store-benchmark-20261030.json) and [provenance](../results/registry-node-store-provenance-20261030.json) record Node v24.19.0, PostgreSQL 17.11, Linux x64, five reported CPUs, and the immutable Postgres image digest. The final run began after the application checks completed. All 20 measured and 8 warmup proofs verified.

| Entries | Median ms | Observed min–max ms | Proof hashes |
|---:|---:|---:|---:|
| 100 | 2.736 | 2.456–3.689 | 7 |
| 1,000 | 3.737 | 2.984–4.914 | 9 |
| 10,000 | 8.638 | 3.712–9.212 | 12 |
| 100,000 | 5.259 | 4.404–5.804 | 14 |

The slower 10,000-entry median than 100,000-entry median illustrates noise in this small local run. Do not fit a scaling claim, compare these medians as a controlled speedup over historical runs, or infer a hosted SLA. The driver successfully dropped its temporary authority schema; a subsequent namespace query returned zero rows for that schema. The dedicated container and its disposable volume were then removed. A mutation check confirmed that the new evidence test rejects an incomplete/corrupted result; the original raw bytes were restored and all 16 research tests passed.
