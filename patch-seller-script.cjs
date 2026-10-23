const fs = require("fs");
const file = "apply-seller-tus.cjs";
let s = fs.readFileSync(file, "utf8");

const oldBlock = /replaceOnce\(\s*'    \} finally \{\\n      window\.clearTimeout\(submitTimeout\);\\n      setLoading\(false\);\\n    \}',\s*'    \} finally \{\\n      setLoading\(false\);\\n    \}',\s*"remove timeout cleanup"\s*\);/;

if (!oldBlock.test(s)) {
  console.error("Could not locate the old cleanup block. No changes made.");
  process.exit(1);
}

const newBlock = String.raw`const cleanupPattern =
  /\}\s*finally\s*\{\s*window\.clearTimeout\(submitTimeout\);\s*setLoading\(false\);\s*\}/;

if (!cleanupPattern.test(s)) {
  throw new Error("Cannot safely locate timeout cleanup.");
}

s = s.replace(
  cleanupPattern,
  '} finally {\n      setLoading(false);\n    }'
);`;

s = s.replace(oldBlock, () => newBlock);

const backup = file + ".backup-" + Date.now();
fs.copyFileSync(file, backup);
fs.writeFileSync(file, s, "utf8");

console.log("Cleanup patch applied.");
console.log("Backup:", backup);
