const fs = require("fs");
const p = "src/app/page.tsx";
let s = fs.readFileSync(p, "utf8");

const oldLine = s.split(/\r?\n/).find(line =>
  line.includes('<a href="#products"') && line.includes("Explore products")
);

if (!oldLine) {
  console.log("Target line not found; file unchanged.");
  process.exit(1);
}

const newLine = oldLine.replace(
  />Explore products .*/,
  ">Explore products ↗</a>"
);

if (newLine === oldLine) {
  console.log("Replacement did not match; file unchanged.");
  process.exit(1);
}

s = s.replace(oldLine, newLine);
fs.writeFileSync(p, s, "utf8");
console.log("Explore products link repaired.");
