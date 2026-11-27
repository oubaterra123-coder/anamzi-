import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";


export const instant = false;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://anamzi-xi.vercel.app";

type ProductData = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  video_url: string | null;
  category: string | null;
};

async function getProduct(id: string): Promise<ProductData | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("get_approved_products_with_gallery");

    if (error) {
      console.error("Product share page error:", error.message);
      return null;
    }

    const product = (data ?? []).find((item: ProductData) => item.id === id);
    return product ?? null;
  } catch (error) {
    console.error("Product share page error:", error);
    return null;
  }
}

function publicUrl(value: string | null | undefined) {
  if (!value) return "";
  if (value.startsWith("http")) return value;

  const supabase = createSupabaseAdminClient();
  return supabase.storage.from("products").getPublicUrl(value).data.publicUrl;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: "Product | ANAMZI",
      description: "Discover products on ANAMZI.",
    };
  }

  const title = product.title || "ANAMZI Product";
  const description = product.description?.trim() || `Discover ${title} on ANAMZI.`;
  const imagePath =
    product.image_url ||
    product.image_urls?.find((url) => Boolean(url)) ||
    "";
  const image = imagePath ? publicUrl(imagePath) : `${siteUrl}/logo.png`;
  const url = `${siteUrl}/product/${encodeURIComponent(id)}`;

  return {
    title: `${title} | ANAMZI`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "ANAMZI",
      title,
      description,
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function SharedProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) notFound();

  const imagePath =
    product.image_url ||
    product.image_urls?.find((url) => Boolean(url)) ||
    "";
  const image = imagePath ? publicUrl(imagePath) : "";
  const video = publicUrl(product.video_url);
  const price = `${Number(product.price).toFixed(2)} ${product.currency ?? ""}`.trim();

  return (
    <main className="min-h-screen bg-[#050706] px-5 py-10 text-white">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="mb-8 inline-block text-xl font-bold tracking-wide text-[#b7ff35]">
          ANAMZI
        </Link>

        <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#111513]">
          {image ? (
            <img src={image} alt={product.title} className="max-h-[520px] w-full object-contain" />
          ) : video ? (
            <video src={video} controls playsInline className="max-h-[520px] w-full" />
          ) : null}

          <div className="space-y-4 p-6">
            {product.category && (
              <p className="text-sm text-[#b7ff35]">{product.category}</p>
            )}
            <h1 className="text-2xl font-bold">{product.title}</h1>
            <p className="text-xl font-semibold">{price}</p>
            {product.description && (
              <p className="whitespace-pre-wrap text-sm leading-6 text-white/70">
                {product.description}
              </p>
            )}
            <Link
              href="/"
              className="inline-flex rounded-xl bg-[#b7ff35] px-6 py-3 font-semibold text-black"
            >
              Discover on ANAMZI
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}