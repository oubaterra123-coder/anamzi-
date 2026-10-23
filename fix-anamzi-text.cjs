const fs = require("fs");
const p = "src/app/page.tsx";
let s = fs.readFileSync(p, "utf8");

const fixes = [
  ["DÃƒÆ’Ã‚Â©connexion", "D\u00e9connexion"],
  ["Discover Ãƒâ€šÃ‚Â· Watch Ãƒâ€šÃ‚Â· Shop", "Discover \u00b7 Watch \u00b7 Shop"],
  ["Ãƒâ€šÃ‚Â© 2026 ANAMZI", "\u00a9 2026 ANAMZI"]
];

for (const [bad, good] of fixes) {
  if (s.includes(bad)) {
    s = s.replace(bad, good);
    console.log("Fixed:", JSON.stringify(bad));
  } else {
    console.log("Not found:", JSON.stringify(bad));
  }
}

fs.writeFileSync(p, s, "utf8");
