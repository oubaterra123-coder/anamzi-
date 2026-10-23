const fs = require("fs");
const p = "src/app/page.tsx";
let s = fs.readFileSync(p, "utf8");

const linePattern = /(<div className="text-8xl drop-shadow-lg">)[\s\S]*?(<\/div>)/;
if (!linePattern.test(s)) {
  console.log("Target not found; file unchanged.");
  process.exit(1);
}

s = s.replace(linePattern, "$1🛍️$2");
fs.writeFileSync(p, s, "utf8");
console.log("Emoji replaced.");
