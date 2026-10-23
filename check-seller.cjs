const fs = require("fs");

const file = "src/app/seller/page.tsx";
const s = fs.readFileSync(file, "utf8");

const checks = [
  ['import { supabase } from "@/lib/supabase";', "Supabase import"],
  ["const [loading, setLoading] = useState(false);", "Loading state"],
  ['console.log("[ANAMZI] Uploading video", video.size);', "Upload section"],
  ['console.log("[ANAMZI] Saving product");', "Product section"],
  ["submitTimeout", "Existing timeout"],
  ["Promise.race", "Existing race timeout"],
];

for (const [needle, label] of checks) {
  console.log((s.includes(needle) ? "FOUND: " : "MISSING: ") + label);
}

console.log("No application files changed.");
