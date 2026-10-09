import test from "node:test";
import assert from "node:assert/strict";
import { quantile, summary } from "../scripts/statistics.mjs";
test("quantiles handle empty and singleton samples", () => {
  assert.equal(quantile([], 0.5), null);
  assert.equal(quantile([4], 0.95), 4);
  assert.equal(quantile([9, 1, 5], 0.5), 5);
});
test("failed and missing observations are counted rather than silently dropped", () => {
  const s = summary([
    { ms: 1, error: null },
    { ms: 3, error: null },
    { ms: null, error: "timeout" },
  ]);
  assert.equal(s.n, 2);
  assert.equal(s.failures, 1);
  assert.equal(s.median, 2);
  assert.equal(s.p95, 2.9);
  assert.ok(s.medianCI[0] <= s.median);
});
