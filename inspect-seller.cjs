const fs = require("fs");
const s = fs.readFileSync("src/app/seller/page.tsx", "utf8");

const i = s.indexOf("window.clearTimeout(submitTimeout)");
console.log("Cleanup index:", i);
console.log("Exact surrounding text:");
console.log(JSON.stringify(s.slice(Math.max(0, i - 50), i + 100)));

console.log("Newlines:", s.includes("\r\n") ? "CRLF" : "LF");
console.log("Original file unchanged:", !s.includes("uploadProgress") && !s.includes('import * as tus'));
