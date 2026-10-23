const fs = require("fs");

const file = "src/app/seller/page.tsx";
const source = fs.readFileSync(file, "utf8");

const start = source.indexOf('      console.log("[ANAMZI] Uploading video", video.size);');
const end = source.indexOf('      console.log("[ANAMZI] Saving product");', start);

if (start < 0 || end < 0 || !source.includes("submitTimeout")) {
  throw new Error("Expected upload handler not found. No changes made.");
}

const uploadBlock = [
'      console.log("[ANAMZI] Uploading video", video.size);',
'      setMessage("Step 2/3: Uploading your video...");',
'      // The upload implementation will be inserted after this script is verified.',
'',
].join("\n");

const updated = source.slice(0, start) + uploadBlock + source.slice(end);

if (updated === source) {
  throw new Error("No changes prepared.");
}

fs.writeFileSync("seller-upload-preview.txt", updated, "utf8");
console.log("Preview created: seller-upload-preview.txt");
console.log("Original page.tsx was NOT changed.");
