# 1Bridge research artifacts

Reproducible experiments supporting the 1Bridge Vault system companion, browser benchmark report, adversarial lifecycle study, and experimental guest-submission specification.

**Status: working technical reports and experimental artifacts; independent review and academic contribution gates remain open.** The original encryption whitepaper and private application are separate artifacts. This repository does not contain, replace, or certify the private application.

## Reproduce public experiments

Requires Node.js 26.5 (the recorded runtime) and pnpm 10.29.3.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm checks
pnpm protocol:bench
pnpm exec playwright install chromium firefox webkit
pnpm bench --browser chromium --warm 100 --cold 30
pnpm analyze
```

The browser command imports the actual published `@drvillo/webcrypto-seal@0.2.1` package. Package-level contextual-grant controls are labeled as controls; they do not reproduce the application's membership-grant orchestration. Playwright WebKit is not native Safari. The experimental protocol is a standard signed-envelope baseline, not deployed 1Bridge functionality or an established novel contribution.

## Verify actual 1Bridge application behavior

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

`results/` contains raw trial observations, source provenance, and correctness outcomes. `docs/` records the literature assessment, claim-to-evidence mapping, and open publication gates. `scripts/` builds and analyzes the evidence. Four manuscript drafts are maintained privately pending the independent review required by the publication plan; this repository does not publish their PDFs or source yet.

The drafts cover system architecture and workflows, initial browser/activation benchmarking, the adversarial lifecycle method and 1Bridge pilot, and the experimental guest-submission baseline. None has yet passed independent review or the relevant academic contribution gate.

The initial collection contains 2860 headless Chromium observations on one Apple M4 Pro desktop, 300 actual server-function activation observations, 100 protocol-baseline observations, and the selected correctness evidence. It does **not** complete the planned cross-browser/mobile study or the second-system comparative evaluation. See [publication status](docs/publication-status.md), [literature assessment](docs/literature-review.md), [claim-to-evidence map](docs/evidence-map.md), and [private reproduction instructions](docs/private-reproduction.md).

Authorized reviewers can place the privately supplied `.tex` drafts in the ignored `papers/` directory and run `pnpm build:papers` using `pdflatex` and Python 3. The drafts have embedded numbered bibliographies; BibTeX is unnecessary. Edit prose directly in the `.tex` files. The builder refreshes only marked result sections from raw observations, preserves surrounding prose, compiles twice, and rejects unresolved citations/references. Building does not perform visual inspection or independent review.

Results about retained keys are expected limits of revocation. A successful adversarial counterexample is not a failed experiment. Timing intervals are conditional on the measured sessions and device; they do not establish population-wide performance or cryptographic strength.

## Affiliation and review

This work is produced for 1Bridge. An independent technical review has not yet occurred. Any eventual reviewer report must identify its exact source revision, executed cases, exclusions, affiliation, and funding. Newly discovered third-party defects are withheld pending coordinated disclosure.
