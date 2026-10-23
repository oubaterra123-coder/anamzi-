const fs = require("fs");
const p = "src/app/page.tsx";
let s = fs.readFileSync(p, "utf8");

const oldText = '<span className="text-6xl text-[#b7ff35]">â–¶</span>';
const newText = '<span className="text-6xl text-[#b7ff35]">{"\\u25B6"}</span>';

if (!s.includes(oldText)) {
  console.log("Old video symbol not found. File unchanged.");
  process.exit(1);
}

s = s.replace(oldText, newText);
fs.writeFileSync(p, s, "utf8");
console.log("Video play symbol repaired.");
