export function quantile(values, q) {
  if (!values.length) return null;
  const a = [...values].sort((x, y) => x - y),
    p = (a.length - 1) * q,
    i = Math.floor(p);
  return a[i] + (a[Math.ceil(p)] - a[i]) * (p - i);
}
export function summary(rows) {
  const a = rows
    .filter((r) => !r.error && Number.isFinite(r.ms))
    .map((r) => r.ms);
  if (!a.length)
    return {
      n: 0,
      failures: rows.length,
      median: null,
      p95: null,
      medianCI: null,
      p95CI: null,
    };
  let seed = 1729;
  const rand = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const meds = [],
    tails = [];
  for (let b = 0; b < 1000; b++) {
    const sample = Array.from(
      { length: a.length },
      () => a[Math.floor(rand() * a.length)],
    );
    meds.push(quantile(sample, 0.5));
    tails.push(quantile(sample, 0.95));
  }
  return {
    n: a.length,
    failures: rows.length - a.length,
    median: quantile(a, 0.5),
    p95: quantile(a, 0.95),
    medianCI: [quantile(meds, 0.025), quantile(meds, 0.975)],
    p95CI: [quantile(tails, 0.025), quantile(tails, 0.975)],
  };
}
