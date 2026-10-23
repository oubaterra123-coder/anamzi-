const fs = require("fs");
const p = "src/app/page.tsx";
let s = fs.readFileSync(p, "utf8");

const start = s.indexOf('<div className="space-y-4 text-center text-lg">');
if (start < 0) {
  console.log("Social section not found. File unchanged.");
  process.exit(1);
}

const end = s.indexOf("</div>", s.indexOf('aria-label="Comment"', start));
if (end < 0) {
  console.log("Social section end not found. File unchanged.");
  process.exit(1);
}

const section = s.slice(start, end + 6);
if (!section.includes('aria-label="Like"') ||
    !section.includes('aria-label="Comment"')) {
  console.log("Expected buttons not found. File unchanged.");
  process.exit(1);
}

const replacement = String.raw`<div className="space-y-4 text-center text-lg">
                  <button onClick={() => alert("Likes will be saved after accounts are implemented.")} aria-label="Like">
                    <span className="block text-xl">{"\u2661"}</span>
                    <span className="block text-[10px]">Like</span>
                  </button>
                  <button onClick={() => alert("Comments will be added in a later stage.")} aria-label="Comment">
                    <span className="block text-xl">{"\u25EF"}</span>
                    <span className="block text-[10px]">Comment</span>
                  </button>
                  <button onClick={() => alert("Sharing will be available in a future stage.")} aria-label="Share">
                    <span className="block text-xl">{"\u2197"}</span>
                    <span className="block text-[10px]">Share</span>
                  </button>
                </div>`;

fs.writeFileSync(p, s.slice(0, start) + replacement + s.slice(end + 6), "utf8");
console.log("Like, Comment and Share section repaired.");
