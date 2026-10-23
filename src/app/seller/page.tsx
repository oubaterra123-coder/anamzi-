"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as tus from "tus-js-client";

export default function SellerPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [whatsapp, setWhatsapp] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setUserId(data.user.id);
      setChecking(false);
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!userId) {
      setMessage("Please sign in before submitting a product.");
      return;
    }

    if (!video) {
      setMessage("Please choose a product video.");
      return;
    }

    if (!video.type.startsWith("video/")) {
      setMessage("Please select a valid video file.");
      return;
    }

    if (video.size > 100 * 1024 * 1024) {
      setMessage("The video must be smaller than 100 MB.");
      return;
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setMessage("Enter a valid price.");
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setMessage("Preparing your product...");
    console.log("[ANAMZI] Submission started");

    let uploadedPath = "";

    try {
      console.log("[ANAMZI] Saving profile");
      setMessage("Step 1/3: Saving your profile...");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          whatsapp_number: whatsapp.trim(),
        })
        .select("id")
        .single();

      if (profileError || !profile) {
        setMessage(`Profile error: ${profileError?.message ?? "No profile row returned."}`);
        return;
      }

      const extension = video.name.split(".").pop()?.toLowerCase() || "mp4";
      uploadedPath = `${userId}/${crypto.randomUUID()}.${extension}`;

      console.log("[ANAMZI] Uploading video", video.size);
      setMessage("Step 2/3: Uploading your video...");

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const accessToken = sessionData.session?.access_token;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

        if (!accessToken || !supabaseUrl || !supabaseKey) {
          throw new Error("Your session expired or Supabase configuration is missing. Sign in again.");
        }

        await new Promise<void>((resolve, reject) => {
          const upload = new tus.Upload(video, {
            endpoint: supabaseUrl.replace(/\/$/, "") + "/storage/v1/upload/resumable",
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
              authorization: "Bearer " + accessToken,
              apikey: supabaseKey,
              "x-upsert": "false",
            },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            chunkSize: 6 * 1024 * 1024,
            metadata: {
              bucketName: "products",
              objectName: uploadedPath,
              contentType: video.type || "video/mp4",
              cacheControl: "3600",
            },
            onError(error) { reject(error); },
            onProgress(bytesUploaded, bytesTotal) {
              const percent = bytesTotal > 0 ? Math.round(bytesUploaded * 100 / bytesTotal) : 0;
              setUploadProgress(percent);
              setMessage("Uploading video... " + percent + "%");
            },
            onSuccess() {
              setUploadProgress(100);
              resolve();
            },
          });
          upload.start();
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error("[ANAMZI] Resumable upload failed:", error);
        setMessage("Video upload failed: " + reason);
        return;
      }
      console.log("[ANAMZI] Saving product");
      setMessage("Step 3/3: Saving your product...");
      const { error: productError } = await supabase
        .from("products")
        .insert({
          seller_id: userId,
          title: title.trim(),
          description: description.trim(),
          price: numericPrice,
          currency,
          video_url: uploadedPath,
          status: "pending",
        });

      if (productError) {
        await supabase.storage.from("products").remove([uploadedPath]);
        setMessage(`Product submission failed: ${productError.message}`);
        return;
      }

      setMessage("Product submitted successfully! It is waiting for review.");
      setTitle("");
      setDescription("");
      setPrice("");
      setVideo(null);

      const fileInput = document.getElementById("product-video") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    } catch {
      if (uploadedPath) {
        await supabase.storage.from("products").remove([uploadedPath]);
      }
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050706] text-[#b7ff35]">
        Checking your account...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050706] px-4 py-10 text-[#e5e7eb] sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#b7ff35] hover:underline">
          ← Back to ANAMZI
        </Link>

        <header className="mb-8 mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b7ff35]">
            ANAMZI CREATOR STUDIO
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Sell your products.
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            Upload a product video and share your offer with shoppers around the world.
            Your product will be reviewed before it appears publicly.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-white/10 bg-[#0b0f0c] p-5 sm:p-8"
        >
          <div>
            <label htmlFor="product-title" className="mb-2 block text-sm font-semibold">
              Product name
            </label>
            <input
              id="product-title"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Everyday sneakers"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]"
            />
          </div>

          <div>
            <label htmlFor="product-description" className="mb-2 block text-sm font-semibold">
              Description
            </label>
            <textarea
              id="product-description"
              required
              maxLength={2000}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product..."
              className="w-full resize-y rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="product-price" className="mb-2 block text-sm font-semibold">
                Price
              </label>
              <input
                id="product-price"
                required
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="29.99"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]"
              />
            </div>

            <div>
              <label htmlFor="product-currency" className="mb-2 block text-sm font-semibold">
                Currency
              </label>
              <select
                id="product-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]"
              >
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="MAD">MAD — Moroccan Dirham</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="seller-whatsapp" className="mb-2 block text-sm font-semibold">
              WhatsApp number
            </label>
            <input
              id="seller-whatsapp"
              required
              type="tel"
              maxLength={30}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+212 600 000 000"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]"
            />
            <p className="mt-2 text-xs text-neutral-500">
              Include your country code so customers can contact you internationally.
            </p>
          </div>

          <div>
            <label htmlFor="product-video" className="mb-2 block text-sm font-semibold">
              Product video
            </label>
            <input
              id="product-video"
              required
              type="file"
              accept="video/*"
              onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border border-white/10 bg-black p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#b7ff35] file:px-4 file:py-2 file:font-bold file:text-black"
            />
            <p className="mt-2 text-xs text-neutral-500">
              Maximum file size: 100 MB.
            </p>
          </div>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className="rounded-xl border border-white/10 bg-black p-4 text-sm text-[#b7ff35]"
            >
              {message}
            </p>
          )}

          {loading && message.startsWith("Uploading video") && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-300">Video upload progress</span>
                <span className="font-bold text-[#b7ff35]">{uploadProgress}%</span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label="Video upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadProgress}
              >
                <div className="h-full rounded-full bg-[#b7ff35] transition-[width] duration-200" style={{ width: uploadProgress + "%" }} />
              </div>
              <p className="text-xs text-neutral-500">Keep this page open until the upload finishes.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#b7ff35] px-5 py-4 font-black text-black transition hover:bg-[#caff70] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit product for review"}
          </button>

          <p className="text-center text-xs leading-5 text-neutral-500">
            Submission does not guarantee publication. Products remain pending until approved.
          </p>
        </form>
      </div>
    </main>
  );
}








