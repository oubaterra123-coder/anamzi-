const fs = require("fs");
const p = "src/app/page.tsx";
let s = fs.readFileSync(p, "utf8");

const oldText = "Explore products ";
const lineStart = s.indexOf(oldText);

if (lineStart === -1) {
  console.log("Text not found; file unchanged.");
  process.exit(0);
}

const lineEnd = s.indexOf("\n", lineStart);
const end = lineEnd === -1 ? s.length : lineEnd;
const line = s.slice(lineStart, end);

if (!line.includes("Ãƒ")) {
  console.log("No mojibake found in target text; file unchanged.");
  process.exit(0);
}

s = s.slice(0, lineStart) +
     line.replace(/Explore products .*/, "Explore products ↗") +
     s.slice(end);

fs.writeFileSync(p, s, "utf8");
console.log("Arrow fixed.");
