const fs = require("fs");
const p = "src/app/page.tsx";
let s = fs.readFileSync(p, "utf8");

const oldClass = 'rounded-full bg-[#111513] px-4 py-2 text-sm font-bold text-black';
const newClass = 'rounded-full bg-[#111513] px-4 py-2 text-sm font-bold text-white';

if (!s.includes(oldClass)) {
  console.log("Exact button style not found. No changes made.");
  process.exit(1);
}

s = s.replace(oldClass, newClass);
fs.writeFileSync(p, s, "utf8");
console.log("Shop product text changed to white.");
