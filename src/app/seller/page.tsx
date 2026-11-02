"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as tus from "tus-js-client";
import { useLanguage } from "@/components/language-provider";

export default function SellerPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [whatsapp, setWhatsapp] = useState("");
  const [productType, setProductType] = useState<"direct" | "affiliate">("direct");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"video" | "image">("video");
  const [category, setCategory] = useState("Other");
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
      setMessage(t("signInBeforeProduct"));
      return;
    }

    const selectedMedia = mediaType === "video" ? video : image;

    if (!selectedMedia) {
      setMessage(mediaType === "video" ? t("chooseVideo") : t("chooseImage"));
      return;
    }

    if (mediaType === "video" && !selectedMedia.type.startsWith("video/")) {
      setMessage(t("validVideo"));
      return;
    }

    if (mediaType === "image" && !selectedMedia.type.startsWith("image/")) {
      setMessage(t("validImage"));
      return;
    }

    if (selectedMedia.size > 50 * 1024 * 1024) {
      setMessage(t("maxFileSize"));
      return;
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setMessage(t("validPrice"));
      return;
    }

    if (productType === "affiliate") {
      try {
        const parsedUrl = new URL(affiliateUrl.trim());
        if (!["https:", "http:"].includes(parsedUrl.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        setMessage(t("validAffiliateUrl"));
        return;
      }
    }

    setLoading(true);
    setUploadProgress(0);
    setMessage(t("preparingProduct"));
    console.log("[ANAMZI] Submission started");

    let uploadedPath = "";

    try {
      console.log("[ANAMZI] Saving profile");
      setMessage(t("savingProfile"));
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          whatsapp_number: whatsapp.trim(),
        })
        .select("id")
        .single();

      if (profileError || !profile) {
        setMessage(`${t("profileError")}${profileError?.message ?? "No profile row returned."}`);
        return;
      }

      const extension = selectedMedia.name.split(".").pop()?.toLowerCase() || (mediaType === "video" ? "mp4" : "jpg");
      uploadedPath = `${userId}/${crypto.randomUUID()}.${extension}`;

      console.log("[ANAMZI] Uploading " + mediaType, selectedMedia.size);
      setMessage(t("uploading") + " " + (mediaType === "video" ? t("video") : t("image")) + "...");

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
          const upload = new tus.Upload(selectedMedia, {
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
              contentType: selectedMedia.type || (mediaType === "video" ? "video/mp4" : "image/jpeg"),
              cacheControl: "3600",
            },
            onError(error) { reject(error); },
            onProgress(bytesUploaded, bytesTotal) {
              const percent = bytesTotal > 0 ? Math.round(bytesUploaded * 100 / bytesTotal) : 0;
              setUploadProgress(percent);
              setMessage(t("uploading") + " " + (mediaType === "video" ? t("video") : t("image")) + "... " + percent + "%");
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
        setMessage(mediaType + " upload failed: " + reason);
        return;
      }
      console.log("[ANAMZI] Saving product");
      setMessage(t("savingProduct"));
      const { error: productError } = await supabase
        .from("products")
        .insert({
          seller_id: userId,
          title: title.trim(),
          description: description.trim(),
          price: numericPrice,
          currency,
          colors,
          sizes,
          video_url: mediaType === "video" ? uploadedPath : null,
          image_url: mediaType === "image" ? uploadedPath : null,
          category,
          product_type: productType,
          affiliate_url: productType === "affiliate" ? affiliateUrl.trim() : null,
          status: "approved",
        });

      if (productError) {
        await supabase.storage.from("products").remove([uploadedPath]);
        setMessage(`Product submission failed: ${productError.message}`);
        return;
      }

      setMessage(t("submittedSuccess"));
      setTitle("");
      setDescription("");
      setPrice("");
      setProductType("direct");
      setAffiliateUrl("");
      setColors([]);
      setSizes([]);
      setVideo(null);
      setImage(null);
      setMediaType("video");
      setCategory("Other");

      const videoInput = document.getElementById("product-video") as HTMLInputElement | null;
      if (videoInput) videoInput.value = "";
      const imageInput = document.getElementById("product-image") as HTMLInputElement | null;
      if (imageInput) imageInput.value = "";
    } catch {
      if (uploadedPath) {
        await supabase.storage.from("products").remove([uploadedPath]);
      }
      setMessage(t("somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  const colorLabels: Record<string, string> = {
    Black: t("colorBlack"), White: t("colorWhite"), Grey: t("colorGrey"),
    "Light Grey": t("colorLightGrey"), "Dark Grey": t("colorDarkGrey"),
    Silver: t("colorSilver"), Red: t("colorRed"), Burgundy: t("colorBurgundy"),
    Maroon: t("colorMaroon"), "Wine Red": t("colorWineRed"), Blue: t("colorBlue"),
    "Navy Blue": t("colorNavyBlue"), "Sky Blue": t("colorSkyBlue"),
    "Light Blue": t("colorLightBlue"), Green: t("colorGreen"),
    "Dark Green": t("colorDarkGreen"), "Mint Green": t("colorMintGreen"),
    "Olive Green": t("colorOliveGreen"), Pink: t("colorPink"), Purple: t("colorPurple"),
    Lavender: t("colorLavender"), Lilac: t("colorLilac"), Magenta: t("colorMagenta"),
    Beige: t("colorBeige"), Cream: t("colorCream"), Ivory: t("colorIvory"),
    Brown: t("colorBrown"), Camel: t("colorCamel"), Khaki: t("colorKhaki"),
    Yellow: t("colorYellow"), Mustard: t("colorMustard"), Gold: t("colorGold"),
    Orange: t("colorOrange"), Coral: t("colorCoral"), Peach: t("colorPeach"),
    Salmon: t("colorSalmon"), Turquoise: t("colorTurquoise"), Cyan: t("colorCyan"),
    Teal: t("colorTeal"), Multicolor: t("colorMulticolor"),
  };
  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050706] text-[#b7ff35]">
        {t("checking")}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050706] px-4 py-10 text-[#e5e7eb] sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#b7ff35] hover:underline">
          ← {t("backHome")} ANAMZI
        </Link>

        <header className="mb-8 mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b7ff35]">
            {t("creatorStudio")}
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            {t("sellYourProducts")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            {t("sellerIntro")}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-white/10 bg-[#0b0f0c] p-5 sm:p-8"
        >
          <div>
            <label htmlFor="product-title" className="mb-2 block text-sm font-semibold">
              {t("productName")}
            </label>
            <input
              id="product-title"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("productTitle")}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]"
            />
          </div>

          <div>
            <label htmlFor="product-description" className="mb-2 block text-sm font-semibold">
              {t("description")}
            </label>
            <textarea
              id="product-description"
              required
              maxLength={2000}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("description")}
              className="w-full resize-y rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="product-price" className="mb-2 block text-sm font-semibold">
                {t("price")}
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
                {t("currency")}
              </label>
              <select
                id="product-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]"
              >
                <option value="USD">USD — {t("usDollar")}</option>
                <option value="EUR">EUR — {t("euro")}</option>
                <option value="MAD">MAD — {t("moroccanDirham")}</option>
                <option value="GBP">GBP — {t("britishPound")}</option>
              </select>
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-semibold">{t("colors")}</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { name: "Black", color: "#171717" },
                { name: "White", color: "#FFFFFF" },
                { name: "Grey", color: "#808080" },
                { name: "Light Grey", color: "#D3D3D3" },
                { name: "Dark Grey", color: "#404040" },
                { name: "Silver", color: "#C0C0C0" },
                { name: "Red", color: "#E53935" },
                { name: "Burgundy", color: "#800020" },
                { name: "Maroon", color: "#800000" },
                { name: "Wine Red", color: "#722F37" },
                { name: "Blue", color: "#246BFD" },
                { name: "Navy Blue", color: "#142D5E" },
                { name: "Sky Blue", color: "#87CEEB" },
                { name: "Light Blue", color: "#ADD8E6" },
                { name: "Green", color: "#259B50" },
                { name: "Dark Green", color: "#006400" },
                { name: "Mint Green", color: "#98FFB3" },
                { name: "Olive Green", color: "#808000" },
                { name: "Pink", color: "#F28CB8" },
                { name: "Purple", color: "#8E44AD" },
                { name: "Lavender", color: "#B57EDC" },
                { name: "Lilac", color: "#C8A2C8" },
                { name: "Magenta", color: "#FF00FF" },
                { name: "Beige", color: "#D9C3A0" },
                { name: "Cream", color: "#FFFDD0" },
                { name: "Ivory", color: "#FFFFF0" },
                { name: "Brown", color: "#795548" },
                { name: "Camel", color: "#C19A6B" },
                { name: "Khaki", color: "#C3B091" },
                { name: "Yellow", color: "#FDD835" },
                { name: "Mustard", color: "#D4A017" },
                { name: "Gold", color: "#D4AF37" },
                { name: "Orange", color: "#F28C28" },
                { name: "Coral", color: "#FF7F50" },
                { name: "Peach", color: "#FFCBA4" },
                { name: "Salmon", color: "#FA8072" },
                { name: "Turquoise", color: "#40E0D0" },
                { name: "Cyan", color: "#00FFFF" },
                { name: "Teal", color: "#008080" },
                { name: "Multicolor", color: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" },
              ].map((option) => (
                <label key={option.name} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${colors.includes(option.name) ? "border-[#b7ff35] bg-[#b7ff35]/10" : "border-white/10 hover:border-white/30"}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={colors.includes(option.name)}
                    onChange={(e) => setColors((current) => e.target.checked ? [...current, option.name] : current.filter((item) => item !== option.name))}
                  />
                  <span
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 rounded-full border border-white/30"
                    style={{ background: option.color }}
                  />
                  <span>{colorLabels[option.name] ?? option.name}</span>
                  {colors.includes(option.name) && <span className="ml-auto text-[#b7ff35]">?</span>}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-semibold">{t("clothingSizes")}</span>
            <div className="flex flex-wrap gap-2">
              {["S", "M", "L", "XL", "XXL"].map((option) => (
                <label key={option} className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm">
                  <input type="checkbox" checked={sizes.includes(option)} onChange={(e) => setSizes((current) => e.target.checked ? [...current, option] : current.filter((item) => item !== option))} />
                  {option}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-semibold">{t("shoeSizes")}</span>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 23 }, (_, i) => String(i + 20)).map((option) => (
                <label key={option} className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm">
                  <input type="checkbox" checked={sizes.includes(option)} onChange={(e) => setSizes((current) => e.target.checked ? [...current, option] : current.filter((item) => item !== option))} />
                  {option}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-semibold">{t("productType")}</span>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value as "direct" | "affiliate")}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]"
            >
              <option value="direct">{t("directSeller")}</option>
              <option value="affiliate">{t("affiliate")}</option>
            </select>
            <p className="mt-2 text-xs text-neutral-500">
              {t("sellerDirectHelp")}
            </p>
          </div>

          {productType === "affiliate" && (
            <div>
              <label htmlFor="affiliate-url" className="mb-2 block text-sm font-semibold">
                {t("affiliatePurchaseUrl")}
              </label>
              <input
                id="affiliate-url"
                type="url"
                required
                value={affiliateUrl}
                onChange={(e) => setAffiliateUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]"
              />
              <p className="mt-2 text-xs text-neutral-500">
                {t("affiliateTrackingHelp")}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="seller-whatsapp" className="mb-2 block text-sm font-semibold">
              {t("whatsappNumber")}
            </label>
            <input
              id="seller-whatsapp"
              required={productType === "direct"}
              type="tel"
              maxLength={30}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+212 600 000 000"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]"
            />
            <p className="mt-2 text-xs text-neutral-500">
              {t("whatsappHelp")}
            </p>
          </div>

          <div>
            <label htmlFor="product-media-type" className="mb-2 block text-sm font-semibold">
              {t("productMediaType")}
            </label>
            <select
              id="product-media-type"
              value={mediaType}
              onChange={(e) => {
                const nextType = e.target.value as "video" | "image";
                setMediaType(nextType);
                setVideo(null);
                setImage(null);
              }}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]"
            >
              <option value="video">{t("video")}</option>
              <option value="image">{t("image")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="product-category" className="mb-2 block text-sm font-semibold">
              {t("category")}
            </label>
            <select
              id="product-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]"
            >
              <option value="Gadgets">{t("gadgets")}</option>
              <option value="Women">{t("women")}</option>
              <option value="Men">{t("men")}</option>
              <option value="Kids">{t("kids")}</option>
              <option value="Shoes">{t("shoes")}</option>
              <option value="Accessories">{t("accessories")}</option>
              <option value="Other">{t("other")}</option>
            </select>
          </div>

          {mediaType === "video" ? (
            <div>
              <label htmlFor="product-video" className="mb-2 block text-sm font-semibold">
                {t("productVideo")}
              </label>
              <input
                id="product-video"
                required
                type="file"
                accept="video/*"
                onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
                className="block w-full rounded-xl border border-white/10 bg-black p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#b7ff35] file:px-4 file:py-2 file:font-bold file:text-black"
              />
              <p className="mt-2 text-xs text-neutral-500">{t("maxFileSize")}</p>
            </div>
          ) : (
            <div>
              <label htmlFor="product-image" className="mb-2 block text-sm font-semibold">
                {t("productImage")}
              </label>
              <input
                id="product-image"
                required
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                className="block w-full rounded-xl border border-white/10 bg-black p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#b7ff35] file:px-4 file:py-2 file:font-bold file:text-black"
              />
              <p className="mt-2 text-xs text-neutral-500">{t("maxFileSize")}</p>
            </div>
          )}

          {message && (
            <p
              role="status"
              aria-live="polite"
              className="rounded-xl border border-white/10 bg-black p-4 text-sm text-[#b7ff35]"
            >
              {message}
            </p>
          )}

          {loading && uploadProgress > 0 && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-300">{t("videoProgress")}</span>
                <span className="font-bold text-[#b7ff35]">{uploadProgress}%</span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label={t("videoProgress")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadProgress}
              >
                <div className="h-full rounded-full bg-[#b7ff35] transition-[width] duration-200" style={{ width: uploadProgress + "%" }} />
              </div>
              <p className="text-xs text-neutral-500">{t("keepOpen")}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#b7ff35] px-5 py-4 font-black text-black transition hover:bg-[#caff70] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t("submitting") : t("submitForReview")}
          </button>

          <p className="text-center text-xs leading-5 text-neutral-500">
            {t("productAvailable")}
          </p>
        </form>
      </div>
    </main>
  );
}








