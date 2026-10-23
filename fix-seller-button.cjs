const fs = require("fs");
const p = "src/app/page.tsx";
let s = fs.readFileSync(p, "utf8");

const oldText = 'className="shrink-0 rounded-full bg-[#b7ff35] px-6 py-3.5 font-bold transition hover:bg-[#9de51f]">Become a seller ↗';
const newText = 'className="shrink-0 rounded-full bg-[#b7ff35] px-6 py-3.5 font-bold text-black transition hover:bg-[#9de51f]">Become a seller ↗';

if (!s.includes(oldText)) {
  console.log("Exact button style not found. No changes made.");
  process.exit(1);
}

s = s.replace(oldText, newText);
fs.writeFileSync(p, s, "utf8");
console.log("Become a seller text is now black.");
