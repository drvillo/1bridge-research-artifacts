# [1Bridge](https://1bridgevault.com) research artifacts

Reproducible experiments supporting the [1Bridge](https://1bridgevault.com) Vault system companion, browser benchmark report, adversarial lifecycle study, and experimental guest-submission specification.

**Status: working technical reports and experimental artifacts; independent review and academic contribution gates remain open.** The original encryption whitepaper and private application are separate artifacts. This repository does not contain, replace, or certify the private application.

## Reproduce public experiments

Requires Node.js 26.5 (the recorded runtime) and pnpm 10.29.3.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm checks
pnpm protocol:bench
pnpm governance:bench
pnpm exec playwright install chromium firefox webkit
pnpm bench --browser chromium --warm 100 --cold 30
pnpm analyze
```

The browser command imports the actual published `@drvillo/webcrypto-seal@0.2.1` package. Package-level contextual-grant controls are labeled as controls; they do not reproduce the application's membership-grant orchestration. Playwright WebKit is not native Safari. The experimental protocol is a standard signed-envelope baseline, not deployed [1Bridge](https://1bridgevault.com) functionality or an established novel contribution.

`pnpm governance:bench` measures the exact Git-pinned `@drvillo/1bridge-authority` component. Before sampling, it compares the installed package manifest and compiled JavaScript digest against a clean build of authority commit `b48c998`; a different build fails. It writes 30 raw trials at each of 256, 1,024 and 4,096 Merkle leaves, plus 30 fresh RSA-4096 blind proof-access trials, after three discarded warmups. Key generation is excluded. Every measured inclusion proof and token is verified before the JSON artifact is written. The [raw result](results/governance-component-benchmark.json) records the build digest, Node/CPU, methods, timings and proof/token sizes; the [experiment](experiments/governance-component-bench.mjs) accepts bounded `--trials`, `--warmup`, `--sizes` and `--out` options for smaller checks. It measures pure library calls on one host, not browser, network, database, observer or whole-product latency.

The [observer catch-up result](results/observer-catchup-benchmark.json) measures the public [observer runner at `80095a9`](https://github.com/drvillo/1bridge-observer/tree/80095a942fdfce9f9834879aa5bffeb627edda63). To reproduce from a clean checkout of that commit with Docker, set `OBSERVER_BENCH_OUT` to an absolute result path and run `pnpm bench:observer` there. The runner creates disposable Postgres from a pinned image digest, replays one fixed seven-leaf/eight-checkpoint signed feed from loopback HTTP, and retains 30 cold and immediate up-to-date raw trials after three warmups. It checks persisted rows and the accepted signed head on every trial. On the recorded Apple M4 Pro/Node 26.5.0/Postgres 17.11 arm64 run, the sample medians were 38.81 ms for cold catch-up and 5.65 ms for the repeated poll; every cold trial used two HTTP requests, versus 15 in the [prior source revision's raw run](https://github.com/drvillo/1bridge-research-artifacts/blob/7e49eaf/results/observer-catchup-benchmark.json). These timings are separate samples under changed code, not a controlled paired speedup estimate. Schema installation and source/key setup are excluded. This is a one-feed local measurement, not shared-registry scheduling, Supabase pooler, Vercel, internet or whole-product latency.

The [observer scale result](results/observer-scale-benchmark.json) uses the clean [observer runner at `f918e09`](https://github.com/drvillo/1bridge-observer/tree/f918e09615cae5062d5eeb41bc80114a527758d3) with the same pinned authority build and Postgres image. One generated feed has a root-signed null-policy revision and a provider-signed checkpoint per leaf; fresh schemas replay its 100-, 1,000- and 10,000-leaf prefixes. All three targets were accepted with contiguous persisted rows and exact final checkpoint bytes. The respective runs used 2, 11 and 101 direct poll invocations; their summed timed polls took 0.303, 2.236 and 24.525 seconds, with 16, 142 and 1,402 HTTP requests. Crypto fixture generation (8.249 seconds), schema creation, source setup and SQL verification are excluded. These are single local runs, not latency distributions or Vercel/Supabase measurements. Reproduce from that clean observer commit with Docker by setting absolute `OBSERVER_SCALE_OUT` and running `pnpm bench:scale`. The direct runner budgets 100 checkpoint items per invocation; the deployed shared-route code budgets 12 per selected feed, so the recorded 10,001-checkpoint prefix requires **at least 834 selected route invocations** at that limit. A daily Hobby cron alone is therefore insufficient for timely large-backlog catch-up; additional operator-triggered invocations or a changed production scheduling/budget design would be needed. No 24-hour observation guarantee follows from this experiment.

The two retained registry-proof artifacts are historical full-prefix measurements: [15 October](results/registry-proof-microbenchmark.json) matched application revision `a1587aed` using observer `2fca1af` and authority `b48c998`; [16 October](results/governance-compact-registry-proof-20261016.json) used observer `8d75260` and authority `297f81d`. Both fetched the complete ordered prefix from local Postgres before calling the portable consistency-proof function. They did **not** execute the application route. In particular, the 100,000-entry 15 October sample (median 2,663.63 ms, last-trial RSS 534.3 MiB) does not characterize the current indexed proof implementation.

The [current-path benchmark runner](experiments/registry-node-store-bench.mjs) bundles the actual `readRegistryConsistency` and its Merkle node-store dependencies from clean application revision `f44a051a`. It populates a dedicated local Postgres database with synthetic 512-byte entries, indexed leaf hashes, and persisted aligned subtree hashes, then times the application function at 100, 1,000, 10,000 and 100,000 entries. Every returned proof is also checked against independently computed old and target roots. The output records raw timing, proof length, process RSS/heap snapshots, source hashes, host and Postgres version. Setup and independent root construction are excluded. The [30 October raw result](results/registry-node-store-benchmark-20261030.json) records five trials per size, with median local call times of 2.736, 3.737, 8.638 and 5.259 ms respectively. All 28 proofs (including two warmups per size) verified. The [provenance](results/registry-node-store-provenance-20261030.json) records the exact dependencies and one bundler-resolution fix. These noisy observations do not establish a monotonic scaling curve or hosted latency. See the [reconciliation and verification report](docs/governance-reconciliation-20261030.md).

```sh
# Create a new, empty local database named bridge_research_registry_bench and
# install dependencies in a clean checkout of drvillo/ubo-guard at f44a051a.
export ONEBRIDGE_SOURCE=/absolute/path/to/ubo-guard
export ONEBRIDGE_REGISTRY_DATABASE_URL='postgresql://...@127.0.0.1:54322/bridge_research_registry_bench'
pnpm registry-node-store:bench
# Smoke run: REGISTRY_NODE_STORE_SIZES=100,1000 REGISTRY_NODE_STORE_TRIALS=1 pnpm registry-node-store:bench
```

The runner refuses an existing `authority` schema and drops only the schema it creates. Use a fresh output path or remove an earlier local benchmark output before rerunning. These results will measure local Postgres and application source calls, not Next HTTP, deployed Supabase/Vercel, or production memory and latency.

## Verify actual [1Bridge](https://1bridgevault.com) application behavior

Authorized source access is required. Use a clean checkout of commit `a103da282e2cec6351f28f04db67b22d16fdd75b`, install its dependencies, and supply `ONEBRIDGE_SOURCE` to the external driver. `results/application-evidence.json` identifies inspected source hashes and existing test outcomes. Hashes identify artifacts; they are not proof of correctness or a replacement for source access.

Private lifecycle checks require a disposable local PostgreSQL database named with the `bridge_research_` prefix and the application's committed migrations. The driver refuses remote hosts and ordinary application database names. Authentication, SMTP, storage, and authenticator boundary substitutions are explicitly identified in each result; no whole-deployment certification is implied.

```sh
# Point to an authorized, clean application checkout; never commit credentials.
export ONEBRIDGE_SOURCE=/absolute/path/to/private-checkout
export ONEBRIDGE_DATABASE_URL='postgresql://...@127.0.0.1:54322/bridge_research_a103da282e2c'
pnpm verify:private
ONEBRIDGE_SOURCE="$ONEBRIDGE_SOURCE" pnpm bench --browser chromium --warm 100 --cold 30
```

Experiments use disposable documents and keys. Published test private keys are intentionally disposable inputs. Production records and private implementation source are not included. The external driver imports the actual application functions; it does not copy them into a surrogate implementation.

## Papers and evidence

`results/` contains raw trial observations, source provenance, and correctness outcomes. `docs/` records the literature assessment, claim-to-evidence mapping, and open publication gates. `scripts/` builds and analyzes the evidence. The manuscript source drafts remain in the private application repository. PR #137 merged on 26 October 2026 and brought its updated PDF assets into application `main`; deployed asset versions have not been verified. This artifact repository publishes neither those PDFs nor the source, and independent review remains open.

The [governance implementation map](docs/governance-repository-map.md) links the merged public authority-library and compact-observer revisions to the private application's [merged PR](https://github.com/drvillo/ubo-guard/pull/137), with pinned revisions and explicit evidence limits. The [research traceability map](docs/governance-research-traceability.md) connects those revisions to the four manuscript tracks and prior research. The [authority-history summary](results/governance-authority-history-20261016.json) contains four aggregate samples per operation without individual raw values. The two registry-proof files above contain three raw synthetic trials per size under their own pinned revisions. Neither measures deployed operation. Historical integrated app tests are pinned to the review branch and separate from this repository's baseline experiments. The Enterprise/Government availability and guided-setup follow-up was mapped at runtime `c471e6ba`: one deployment-owned observer profile, a retained public workspace trust file, separate offline recovery custody, and no release wait. Its local correctness/navigation checks add no timing samples; app PR #137 merged on 26 October 2026; deployment is not established by that merge.

The drafts cover system architecture and workflows, initial browser/activation benchmarking, the adversarial lifecycle method and [1Bridge](https://1bridgevault.com) pilot, and the experimental guest-submission baseline. None has yet passed independent review or the relevant academic contribution gate.

The initial collection contains 2860 headless Chromium observations on one Apple M4 Pro desktop, 300 actual server-function activation observations, 100 protocol-baseline observations, and the selected correctness evidence. It does **not** complete the planned cross-browser/mobile study or the second-system comparative evaluation. See [publication status](docs/publication-status.md), [literature assessment](docs/literature-review.md), [claim-to-evidence map](docs/evidence-map.md), and [private reproduction instructions](docs/private-reproduction.md).

Authorized reviewers can place the privately supplied `.tex` drafts in the ignored `papers/` directory and run `pnpm build:papers` using `pdflatex` and Python 3. The drafts have embedded numbered bibliographies; BibTeX is unnecessary. Edit prose directly in the `.tex` files. The builder refreshes only marked result sections from raw observations, preserves surrounding prose, compiles twice, and rejects unresolved citations/references. Building does not perform visual inspection or independent review.

Results about retained keys are expected limits of revocation. A successful adversarial counterexample is not a failed experiment. Timing intervals are conditional on the measured sessions and device; they do not establish population-wide performance or cryptographic strength.

## Affiliation and review

This work is produced for [1Bridge](https://1bridgevault.com). An independent technical review has not yet occurred. Any eventual reviewer report must identify its exact source revision, executed cases, exclusions, affiliation, and funding. Newly discovered third-party defects are withheld pending coordinated disclosure.
