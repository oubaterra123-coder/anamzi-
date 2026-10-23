const fs = require("fs");
const p = "src/app/page.tsx";
let s = fs.readFileSync(p, "utf8");

const fixes = [
  {
    pattern: /emoji: "[^"\r\n]*"/,
    replacement: 'emoji: "\\u{1F6CD}\\u{FE0F}"',
    label: "Product category emoji"
  },
  {
    pattern: /<div className="text-8xl drop-shadow-lg">[^<]*<\/div>/,
    replacement: '<div className="text-8xl drop-shadow-lg">\\u{1F6CD}\\u{FE0F}</div>',
    label: "Empty products emoji"
  },
  {
    pattern: /Shop product [^<\r\n]*/,
    replacement: "Shop product ↗",
    label: "Shop product arrow"
  }
];

for (const fix of fixes) {
  if (fix.pattern.test(s)) {
    s = s.replace(fix.pattern, fix.replacement);
    console.log("Fixed:", fix.label);
  } else {
    console.log("Not found, skipped:", fix.label);
  }
}

fs.writeFileSync(p, s, "utf8");
