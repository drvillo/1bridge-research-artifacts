# Reproducing restricted application evidence

This requires authorized source access. Public library commands in the README do not verify the full private application. Use a clean checkout/archive of the recorded application revision; drivers verify the recorded source hashes before bundling actual functions.

Install private dependencies using its own frozen pnpm lockfile. The initial run used already installed local dependencies and recorded versions; a reviewer should resolve the frozen lock afresh. Node 26.5.0 and pnpm 10.29.3 were used.

## Disposable database setup

Use a local PostgreSQL service and create a **new empty** database named `bridge_research_<your_run_id>`. Never use the ordinary application database or a hosted database. Before migrations, create the empty bootstrap schema/table required by the committed migrations:

```sql
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text);
```

Set both `DATABASE_URL` and `DIRECT_URL` to that disposable database and run `pnpm exec prisma migrate deploy` from the private checkout's `webapp/`. This uses actual migration SQL, not a reconstructed product schema. The bootstrap table is not a complete Supabase Auth service. Avoid copying production email, payment, OTP or session credentials into this environment.

From this repository:

```sh
export ONEBRIDGE_SOURCE=/absolute/path/to/authorized-clean-checkout
export ONEBRIDGE_DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:PORT/bridge_research_RUN'
pnpm verify:private
```

The driver uses local disposable identity rows and actual authorization/transaction functions. It explicitly supplies test mode and dummy service values; request-replacement emails are not sent to real recipients. It adds only a generated adapter/driver under the isolated checkout's `webapp/.research`, bundles the actual source, and writes public sanitized results. The six checks and activation timings share disposable records. Delete the research database after retaining the results if it is no longer needed.

## Existing integration cases

Use the same migrated disposable database, `NODE_ENV=test`, disposable `OTP_SECRET`, `VENDOR_SESSION_SECRET`, and `TOKEN_HASH_PEPPER`, local/dummy Supabase configuration and the pinned application's integration harness. Invoke the existing files:

```sh
pnpm exec vitest run --project integration \
  test/integration/passkey/round-trip.test.ts \
  test/integration/sharing/share-lifecycle.test.ts \
  test/integration/workspaces/required-generations.test.ts
```

The private harness supplies the declared identity/SMTP/storage/request-context doubles. The evidence JSON preserves the initial failure caused by missing disposable OTP/session secrets and the successful rerun. This command does not provide a live Supabase login, real SMTP/storage test, hardware PRF ceremony, or end-to-end browser journey.

## Actual application browser adapters

```sh
ONEBRIDGE_SOURCE="$ONEBRIDGE_SOURCE" pnpm bench --browser chromium --warm 100 --cold 30
```

The build imports actual account-root, generation-grant and upload adapters. It serves the private bundle only on localhost, keeps it in an ignored directory and publishes source hashes and measurements rather than source code. Runs without `ONEBRIDGE_SOURCE` are public-library experiments with different labels, not reproductions of those private adapters.
