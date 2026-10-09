# Publication and evidence status — 9 October 2026

These are four separate **working technical reports**. They are prepared for 1Bridge; independent review has not occurred. Public availability is not a claim of peer review, deployment certification, or established academic novelty.

The manuscript drafts remain private pending the publication plan's independent-review requirement. The public repository releases experiments and raw evidence, not papers represented as reviewed or publication-ready.

| Artifact | Completed in this revision | Remaining publication threshold |
|---|---|---|
| System companion | Implementation-grounded workflow specification; explicit trust boundaries; selected actual-function and persisted evidence; citations and compiled PDF | Independent source-access review; full browser/storage journeys; unresolved lifecycle interleavings |
| Benchmark report | 2860 headless Chromium observations across 22 workloads; 300 local activation observations; raw data, conditional intervals and analysis | Native Chrome/Firefox/Safari and actual Android/iOS coverage; controlled repeat sessions; network and workflow phase instrumentation; reviewer replication |
| Comparative study | Common event vocabulary and outcome classes; actual 1Bridge pilot and persisted recipient-coverage counterexample; primary-source assessment | Executed common scenarios on a second actual implementation; affected/fixed calibration; comparison with existing methods; substantive transferable finding |
| Protocol specification | Established signed-envelope baseline; both bootstrap profiles; five adversarial/correctness tests; 100 local timing observations | Practical authenticated bootstrap; durable/concurrent state; explicit game-based model and reviewed proof; baseline comparisons; independently sufficient new result |

The comparative and protocol manuscripts are **not ready to be presented as novel academic papers**. The former has only one executed application pilot. The latter implements standard mechanisms and explicitly documents their limits. If further work does not establish a gap and a sufficient contribution, keep them as technical reports.

## Evidence already collected

- 252 selected existing private-application assertions passed. This is not the full application test suite.
- Seven existing database integration cases passed with declared identity, SMTP, object-storage and request-context doubles. The initial environment failure is retained in the summary.
- Six isolated actual-function cases passed their assertions, including the expected counterexample: two duplicate entries activate a generation with one persisted grant for two required operators.
- Eleven public-library checks passed, including expected acceptance of complete anonymous ciphertext/key replacement and retained-key opening.
- Browser trials include 100 initialized and 30 fresh-context observations per workload. Cold means fresh browser context with module/fixture setup outside the timer, not cold browser process or completely cold cryptographic state. No failures were recorded in this collection.
- Three activation workloads have 100 observations each. Their blocks share a process/database; they are not independently restarted services.
- Five protocol tests and two analysis tests passed. Protocol measurements cover 100 disposable instances on Node.js, not deployed application flows.

No engineering release gates are claimed or required for these research-only changes. No production code, schema, API, wire format, or homepage change was made. Database work was limited to the accepted plan's evidence questions and a separate disposable local database; it was not a deployment test programme.

## Prioritized next experiments

1. Independent reproduction of recipient coverage, guarded retrieval and the named source claims at the pinned revision.
2. Actual browser journeys for intake reservation/commit and request revocation/generation activation interleavings, using disposable local storage and real application routes.
3. Password rotation and authenticator-based passkey re-enrollment; do not treat disposable PRF bytes as an authenticator test.
4. Native browser and mobile measurements, controlling background work and recording power/thermal conditions. Collect phase instrumentation rather than infer phase costs by subtraction.
5. Execute the known Nextcloud file-drop scope calibration on pinned affected and patched versions; adapt common scope/transition cases without making operator grants a purported shared capability.
6. Finish full-text/model/artifact comparison, especially Group Key Progression and formal encrypted storage, before any academic novelty statement.

Do not fill missing coverage with emulated mobile devices, mock product policy, or favourable assumptions. Newly discovered third-party defects require coordinated disclosure before public traces or findings are released. Participant usability studies remain deferred.

## Independent reviewer checklist

The reviewer report should identify affiliation/funding, exact application and artifact revisions, installed dependency versions, source access, executed commands, boundary doubles, positive and negative results, excluded scenarios, and whether each claim is supported within its stated threat model. Source hashes identify examined artifacts; they do not prove correctness. A public library reproduction cannot be described as reproduction of the private application.

Before release as reviewed papers: resolve citations, compile each manuscript, inspect every PDF page, reconcile numerical summaries with raw observations, and attach the review report. Compilation and visual review do not satisfy independent technical review.
