import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

// A source archive can lack .git. Verify the recorded file hashes rather than
// assigning the pinned revision to an arbitrary caller-supplied directory.
export async function verifySource(source) {
  const manifest = JSON.parse(
    await readFile(
      new URL("../results/application-evidence.json", import.meta.url),
    ),
  );
  for (const [file, expected] of Object.entries(manifest.files)) {
    const actual = createHash("sha256")
      .update(await readFile(path.join(source, file)))
      .digest("hex");
    if (actual !== expected)
      throw Error(`Source differs from recorded baseline: ${file}`);
  }
  return manifest.applicationCommit;
}
