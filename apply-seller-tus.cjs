const fs = require("fs");

const file = "src/app/seller/page.tsx";
let s = fs.readFileSync(file, "utf8");

function replaceOnce(oldText, newText, label) {
  const first = s.indexOf(oldText);
  if (first < 0 || s.indexOf(oldText, first + oldText.length) >= 0) {
    throw new Error("Cannot safely replace: " + label);
  }
  s = s.slice(0, first) + newText + s.slice(first + oldText.length);
}

replaceOnce(
  'import { supabase } from "@/lib/supabase";',
  'import { supabase } from "@/lib/supabase";\nimport * as tus from "tus-js-client";',
  "TUS import"
);

replaceOnce(
  '  const [loading, setLoading] = useState(false);',
  '  const [loading, setLoading] = useState(false);\n  const [uploadProgress, setUploadProgress] = useState(0);',
  "progress state"
);

replaceOnce(
  '    setLoading(true);\n    setMessage("Sending product... Please wait up to 30 seconds.");\n    const submitTimeout = window.setTimeout(() => {\n      setLoading(false);\n      setMessage("The request is taking too long. Please refresh the page and try again.");\n    }, 30000);',
  '    setLoading(true);\n    setUploadProgress(0);\n    setMessage("Preparing your product...");',
  "remove 30-second timeout"
);

const start = s.indexOf('      console.log("[ANAMZI] Uploading video", video.size);');
const end = s.indexOf('      console.log("[ANAMZI] Saving product");', start);

if (start < 0 || end < 0) {
  throw new Error("Upload section not found; original file not written.");
}

const uploadLines = [
'      console.log("[ANAMZI] Uploading video", video.size);',
'      setMessage("Step 2/3: Uploading your video...");',
'',
'      try {',
'        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();',
'        if (sessionError) throw sessionError;',
'',
'        const accessToken = sessionData.session?.access_token;',
'        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;',
'        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;',
'',
'        if (!accessToken || !supabaseUrl || !supabaseKey) {',
'          throw new Error("Your session expired or Supabase configuration is missing. Sign in again.");',
'        }',
'',
'        await new Promise<void>((resolve, reject) => {',
'          const upload = new tus.Upload(video, {',
'            endpoint: supabaseUrl.replace(/\\/$/, "") + "/storage/v1/upload/resumable",',
'            retryDelays: [0, 3000, 5000, 10000, 20000],',
'            headers: {',
'              authorization: "Bearer " + accessToken,',
'              apikey: supabaseKey,',
'              "x-upsert": "false",',
'            },',
'            uploadDataDuringCreation: true,',
'            removeFingerprintOnSuccess: true,',
'            chunkSize: 6 * 1024 * 1024,',
'            metadata: {',
'              bucketName: "products",',
'              objectName: uploadedPath,',
'              contentType: video.type || "video/mp4",',
'              cacheControl: "3600",',
'            },',
'            onError(error) { reject(error); },',
'            onProgress(bytesUploaded, bytesTotal) {',
'              const percent = bytesTotal > 0 ? Math.round(bytesUploaded * 100 / bytesTotal) : 0;',
'              setUploadProgress(percent);',
'              setMessage("Uploading video... " + percent + "%");',
'            },',
'            onSuccess() {',
'              setUploadProgress(100);',
'              resolve();',
'            },',
'          });',
'          upload.start();',
'        });',
'      } catch (error) {',
'        const reason = error instanceof Error ? error.message : String(error);',
'        console.error("[ANAMZI] Resumable upload failed:", error);',
'        setMessage("Video upload failed: " + reason);',
'        return;',
'      }',
'',
].join("\n");

s = s.slice(0, start) + uploadLines + s.slice(end);

const cleanupPattern =
  /\}\s*finally\s*\{\s*window\.clearTimeout\(submitTimeout\);\s*setLoading\(false\);\s*\}/;

if (!cleanupPattern.test(s)) {
  throw new Error("Cannot safely locate timeout cleanup.");
}

s = s.replace(
  cleanupPattern,
  '} finally {\n      setLoading(false);\n    }'
);

const oldMessage = [
'          {message && (',
'            <p',
'              role="status"',
'              className="rounded-xl border border-white/10 bg-black p-4 text-sm text-[#b7ff35]"',
'            >',
'              {message}',
'            </p>',
'          )}',
].join("\n");

const newMessage = [
'          {message && (',
'            <p',
'              role="status"',
'              aria-live="polite"',
'              className="rounded-xl border border-white/10 bg-black p-4 text-sm text-[#b7ff35]"',
'            >',
'              {message}',
'            </p>',
'          )}',
'',
'          {loading && message.startsWith("Uploading video") && (',
'            <div className="space-y-2 rounded-xl border border-white/10 bg-black p-4">',
'              <div className="flex items-center justify-between text-sm">',
'                <span className="text-neutral-300">Video upload progress</span>',
'                <span className="font-bold text-[#b7ff35]">{uploadProgress}%</span>',
'              </div>',
'              <div',
'                className="h-2 w-full overflow-hidden rounded-full bg-white/10"',
'                role="progressbar"',
'                aria-label="Video upload progress"',
'                aria-valuemin={0}',
'                aria-valuemax={100}',
'                aria-valuenow={uploadProgress}',
'              >',
'                <div className="h-full rounded-full bg-[#b7ff35] transition-[width] duration-200" style={{ width: uploadProgress + "%" }} />',
'              </div>',
'              <p className="text-xs text-neutral-500">Keep this page open until the upload finishes.</p>',
'            </div>',
'          )}',
].join("\n");

replaceOnce(oldMessage, newMessage, "progress UI");

if (s.includes("submitTimeout") || s.includes("Promise.race")) {
  throw new Error("Old timeout code remains; original file not written.");
}

const backup = file + ".backup-before-tus-final-" + Date.now();
fs.copyFileSync(file, backup);
fs.writeFileSync(file, s, "utf8");

console.log("Seller page updated.");
console.log("Backup:", backup);
console.log("TUS:", s.includes('import * as tus from "tus-js-client";'));
console.log("Progress state:", s.includes("uploadProgress"));
console.log("Old timeout removed:", !s.includes("submitTimeout") && !s.includes("Promise.race"));
