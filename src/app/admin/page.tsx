"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Product = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  video_url: string | null;
  image_url: string | null;
  category: string | null;
  status: string;
  created_at: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function AdminPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/products", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
        return;
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load products.");

      setProducts(result.products ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Delete "${product.title}" permanently? It will disappear from the store.`)) {
      return;
    }

    setBusyId(product.id);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Could not delete product.");

      setProducts((current) => current.filter((item) => item.id !== product.id));
      setMessage("Product deleted from the store.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Deletion failed.");
    } finally {
      setBusyId(null);
    }
  }

  function getVideoUrl(path: string) {
    if (/^https?:\/\//i.test(path)) return path;
    return supabase.storage.from("products").getPublicUrl(path).data.publicUrl;
  }

  return (
    <main className="min-h-screen bg-[#080a08] text-white">
      <header className="border-b border-white/10 bg-black/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <a href="/" className="text-xl font-black tracking-[0.22em]">
            ANA<span className="text-[#b7ff35]">MZI</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[#b7ff35]/30 px-3 py-1 text-xs font-semibold text-[#b7ff35]">
              ADMIN PANEL
            </span>
            <button onClick={() => router.push("/")} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:border-[#b7ff35] hover:text-[#b7ff35]">
              View store
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[#b7ff35]">
              Published content
            </p>
            <h1 className="text-3xl font-black sm:text-5xl">Products & videos</h1>
            <p className="mt-3 max-w-xl text-sm text-white/50">
              View published products and remove anything that should no longer appear in the store.
            </p>
          </div>
          <button onClick={() => void loadProducts()} disabled={loading} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold hover:border-[#b7ff35] disabled:opacity-50">
            {loading ? "Loading..." : "Refresh products"}
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-white/50">Published products</p>
          <p className="mt-2 text-3xl font-black text-[#b7ff35]">{products.length}</p>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/80">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 p-12 text-center text-white/50">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
            <p className="text-lg font-bold">No published products yet</p>
            <p className="mt-2 text-sm text-white/45">Published products will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#101210] transition hover:border-[#b7ff35]/40">
                <div className="aspect-[4/5] bg-black">
                  {product.image_url ? (
                    <img
                      src={getVideoUrl(product.image_url)}
                      alt={product.title}
                      className="h-full w-full object-contain"
                    />
                  ) : product.video_url ? (
                    <video
                      src={getVideoUrl(product.video_url)}
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/50">No media</div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-bold">{product.title}</h2>
                  <p className="mt-2 line-clamp-3 min-h-12 text-sm leading-6 text-white/50">
                    {product.description || "No description provided."}
                  </p>
                  <p className="mt-3 text-xl font-black text-[#b7ff35]">
                    {Number(product.price).toLocaleString()} {product.currency}
                  </p>
                  <p className="mt-2 text-xs text-white/40">Category: {product.category || "Other"}</p>
                  <p className="mt-2 break-all text-xs text-white/30">Seller ID: {product.seller_id}</p>
                  <p className="mt-1 text-xs text-white/30">
                    Published: {new Date(product.created_at).toLocaleString()}
                  </p>
                  <button
                    onClick={() => void deleteProduct(product)}
                    disabled={busyId === product.id}
                    className="mt-5 w-full rounded-xl border border-red-400/40 px-3 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyId === product.id ? "Deleting..." : "Delete product"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
