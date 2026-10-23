const fs = require("fs");
const lines = fs.readFileSync("src/app/page.tsx", "utf8").split(/\r?\n/);
const line = lines[197] ?? "";

console.log("LINE 198:");
console.log(JSON.stringify(line));
console.log("CHAR CODES:");
console.log([...line].map(c => c.codePointAt(0).toString(16)).join(" "));
