
"use client";


import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  category: string;
  price: string;
  color: string;
  emoji: string;
  description: string;
  video_url: string;
  whatsapp_number: string;
};


export default function Home() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerCity, setBuyerCity] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [active, setActive] = useState("For you");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      setUserEmail(error ? null : data.session?.user.email ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUserEmail(session?.user.email ?? null);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      const { data, error } = await supabase.rpc("get_approved_products_with_whatsapp");

      if (!mounted) return;

      if (error) {
        console.error("Could not load products:", error.message);
        setProducts([]);
      } else {
        setProducts((data ?? []).map((item: {
          id: string;
          title: string;
          description: string | null;
          price: number;
          currency: string | null;
          video_url: string | null;
          whatsapp_number: string | null;
        }) => ({
          id: item.id,
          name: item.title,
          category: "Products",
          price: `${Number(item.price).toFixed(2)} ${item.currency ?? ""}`.trim(),
          color: "from-neutral-700 to-neutral-950",
          emoji: "🛍️",
          description: item.description ?? "",
          video_url: item.video_url ?? "",
          whatsapp_number: item.whatsapp_number ?? "",
        })));
      }

      setProductsLoading(false);
    }

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);
  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);

    if (error) {
      alert("Could not sign out. Please try again.");
      return;
    }

    setUserEmail(null);
  }

  function handleWhatsAppOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) return;

    const sellerPhone = selectedProduct.whatsapp_number.replace(/\D/g, "");

    if (!sellerPhone) {
      alert("This seller has not added a WhatsApp number yet.");
      return;
    }

    const message = [
      "Hello! I'd like to order this product from ANAMZI:",
      `Product: ${selectedProduct.name}`,
      `Price: ${selectedProduct.price}`,
      `Quantity: ${quantity}`,
      `Name: ${buyerName.trim()}`,
      `Phone: ${buyerPhone.trim()}`,
      `City: ${buyerCity.trim()}`,
      `Address: ${buyerAddress.trim()}`,
      "Please confirm availability and delivery details."
    ].join("\n");

    window.open(
      `https://wa.me/${sellerPhone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );

    setSelectedProduct(null);
    setBuyerName("");
    setBuyerPhone("");
    setBuyerCity("");
    setBuyerAddress("");
    setQuantity(1);
  }
  const filtered = products.filter((product) =>
    `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#050706] text-[#e5e7eb]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#050706]/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <a href="/" className="flex items-center">
            <img src="/logo.png?v=2" alt="ANAMZI" width={320} height={112} className="h-20 w-auto object-contain" />
          </a>
          <div className="hidden items-center gap-7 text-sm font-medium md:flex">
            <a href="#discover" className="hover:text-[#b7ff35]">Discover</a>
            <a href="#products" className="hover:text-[#b7ff35]">Products</a>
            <a href="/seller" className="hover:text-[#b7ff35]">Become a seller</a>
          </div>
          <div className="flex items-center gap-2">
            <a href="#discover" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-[#111513]">Explore</a>
            {authLoading ? (
  <span className="px-4 py-2 text-sm text-gray-400">Loading...</span>
) : userEmail ? (
  <div className="flex items-center gap-2">
    <span title={userEmail} className="hidden max-w-36 truncate text-xs text-gray-400 sm:block">{userEmail}</span>
    <button type="button" onClick={handleSignOut} disabled={signingOut} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold hover:border-[#b7ff35] disabled:opacity-50">
      {signingOut ? "Signing out..." : "Déconnexion"}
    </button>
  </div>
) : (
  <Link href="/signup" className="rounded-full bg-[#d8dedb] px-4 py-2 text-sm font-semibold text-[#080a09] hover:bg-[#9de51f]">
    Join us
  </Link>
)}
          </div>
        </nav>
      </header>

      <section id="discover" className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 md:py-20 lg:grid-cols-2 lg:px-8">
        <div>
          <span className="inline-flex rounded-full border border-[#b7ff35]/30 bg-[#b7ff35]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#b7ff35]">
            Discover · Watch · Shop
          </span>
          <h1 className="mt-6 max-w-2xl text-6xl font-black leading-[1.06] tracking-tight sm:text-6xl lg:text-7xl">
            See it.<br />Love it.<br /><span className="text-[#b7ff35]">Shop it.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-neutral-300 sm:text-lg">
            Discover products through short videos from creators, independent brands and sellers around the world.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#products" className="rounded-full bg-[#b7ff35] px-6 py-3.5 font-bold text-[#080a09] transition hover:bg-[#9de51f]">Explore products ↗</a>
            <a href="/seller" className="rounded-full border border-white/10 bg-[#111513] px-6 py-3.5 font-bold hover:border-[#b7ff35]/70">Start selling</a>
          </div>
          <div className="mt-10 flex gap-8 border-t border-white/10 pt-6">
            <div><p className="text-2xl font-black">Video</p><p className="mt-1 text-xs text-neutral-400">Product discovery</p></div>
            <div><p className="text-2xl font-black">Global</p><p className="mt-1 text-xs text-neutral-400">Creators & brands</p></div>
            <div><p className="text-2xl font-black">Direct</p><p className="mt-1 text-xs text-neutral-400">Shop from content</p></div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-5 rounded-[3rem] bg-[#b7ff35]/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.5rem] border-[7px] border-[#222] bg-neutral-900 p-2 shadow-2xl">
            <div className="relative flex aspect-[9/15] flex-col justify-between overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#f6c7a7] via-[#d97757] to-[#6c302b] p-5 text-[#080a09]">
              <div className="flex items-center justify-between">
                <span className="font-black tracking-wide">ANAMZI</span>
                <span className="rounded-full bg-black/20 px-3 py-1 text-xs backdrop-blur">For you</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl drop-shadow-lg">🛍️</div>
                  <p className="mt-5 text-sm font-semibold tracking-[0.2em]">THE EVERYDAY EDIT</p>
                  <p className="mt-2 text-4xl font-black tracking-tight">Made to move.</p>
                </div>
              </div>
              <div className="relative z-10 flex items-end justify-between">
                <div>
                  <p className="text-sm font-semibold">@urbanstudio</p>
                  <p className="mt-1 text-xs text-[#080a09]/80">Your next everyday favorite.</p>
                  <button onClick={() => alert("Product details and checkout will be connected in a later stage.")} className="mt-3 rounded-full bg-[#111513] px-4 py-2 text-sm font-bold text-white">Shop product ↗</button>
                </div>
                <div className="space-y-4 text-center text-lg">
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
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 top-16 hidden rounded-2xl border border-white/10 bg-[#111513] p-4 shadow-xl sm:block">
            <p className="text-xs text-neutral-400">Creator pick</p>
            <p className="mt-1 font-bold">Fresh finds ✨</p>
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b7ff35]">The discovery feed</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight sm:text-4xl">Find your next favorite.</h2>
            <p className="mt-2 text-sm text-neutral-400">A first look at products worth discovering.</p>
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products..." className="w-full rounded-full border border-white/10 bg-[#111513] px-5 py-3 text-sm outline-none focus:border-[#b7ff35] sm:max-w-xs" />
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          {["For you", "Products"].map((category) => (
            <button key={category} onClick={() => setActive(category)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active === category ? "bg-[#d8dedb] text-[#080a09]" : "border border-white/10 bg-[#111513] hover:border-[#b7ff35]/70"}`}>
              {category}
            </button>
          ))}
        </div>

        {productsLoading ? (
          <p className="py-12 text-center text-neutral-400">Loading products...</p>
        ) : (
          <>
            <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filtered
                .filter((product) => active === "For you" || product.category === active)
                .map((product) => (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-3xl border border-white/10 bg-[#111513] transition hover:-translate-y-1 hover:border-[#b7ff35]/40"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-950">
                      {product.video_url ? (
                        <video
                          src={product.video_url}
                          controls
                          playsInline
                          muted
                          preload="none"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-6xl text-[#b7ff35]">▶</span>
                        </div>
                      )}
                      <span className="absolute bottom-3 left-3 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold">
                        ANAMZI product
                      </span>
                    </div>

                    <div className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#b7ff35]">
                        Product
                      </p>
                      <h3 className="mt-2 text-lg font-bold">{product.name}</h3>

                      {product.description && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-400">
                          {product.description}
                        </p>
                      )}

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className="font-black">{product.price}</span>

                        <button
                          type="button"
                          onClick={() => setSelectedProduct(product)}
                          className="rounded-full bg-[#b7ff35] px-4 py-2.5 text-sm font-bold text-[#080a09] transition hover:bg-[#9de51f]"
                        >
                          Order
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
            </div>

            {filtered.filter(
              (product) => active === "For you" || product.category === active
            ).length === 0 && (
              <div className="my-8 rounded-3xl border border-white/10 bg-[#111513] px-6 py-14 text-center">
                <p className="text-lg font-bold">No products available yet</p>
                <p className="mt-2 text-sm text-neutral-400">
                  Approved products from sellers will appear here.
                </p>
              </div>
            )}
          </>
        )}

        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-title"
              className="my-auto w-full max-w-lg rounded-3xl border border-white/10 bg-[#111513] p-6 shadow-2xl sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b7ff35]">
                    WhatsApp checkout
                  </p>
                  <h3 id="order-title" className="mt-2 text-2xl font-black">
                    Order {selectedProduct.name}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-400">{selectedProduct.price}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  aria-label="Close order form"
                  className="rounded-full border border-white/10 px-3 py-2 hover:border-[#b7ff35]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleWhatsAppOrder} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="buyer-name" className="mb-1.5 block text-sm font-medium">
                    Full name
                  </label>
                  <input
                    id="buyer-name"
                    autoComplete="name"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#050706] px-4 py-3 outline-none focus:border-[#b7ff35]"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label htmlFor="buyer-phone" className="mb-1.5 block text-sm font-medium">
                    Phone number
                  </label>
                  <input
                    id="buyer-phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#050706] px-4 py-3 outline-none focus:border-[#b7ff35]"
                    placeholder="+212..."
                  />
                </div>

                <div>
                  <label htmlFor="buyer-city" className="mb-1.5 block text-sm font-medium">
                    City / Country
                  </label>
                  <input
                    id="buyer-city"
                    autoComplete="address-level2"
                    required
                    value={buyerCity}
                    onChange={(e) => setBuyerCity(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#050706] px-4 py-3 outline-none focus:border-[#b7ff35]"
                    placeholder="City and country"
                  />
                </div>

                <div>
                  <label htmlFor="buyer-address" className="mb-1.5 block text-sm font-medium">
                    Delivery address
                  </label>
                  <textarea
                    id="buyer-address"
                    autoComplete="street-address"
                    required
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    className="min-h-20 w-full rounded-xl border border-white/10 bg-[#050706] px-4 py-3 outline-none focus:border-[#b7ff35]"
                    placeholder="Street, building, postcode..."
                  />
                </div>

                <div>
                  <label htmlFor="buyer-quantity" className="mb-1.5 block text-sm font-medium">
                    Quantity
                  </label>
                  <input
                    id="buyer-quantity"
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#050706] px-4 py-3 outline-none focus:border-[#b7ff35]"
                  />
                </div>

                <p className="text-xs leading-5 text-neutral-400">
                  Your order details will open in WhatsApp addressed to the seller.
                  Review the message and press Send in WhatsApp to submit your order.
                  ANAMZI does not store this order.
                </p>

                <button
                  type="submit"
                  className="w-full rounded-full bg-[#b7ff35] px-5 py-3.5 font-bold text-[#080a09] transition hover:bg-[#9de51f]"
                >
                  Continue to WhatsApp ↗
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      <section id="sell" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] border border-white/10 bg-[#111513] p-8 text-[#e5e7eb] sm:flex-row sm:items-center sm:p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b7ff35]">Your products, your audience</p>
            <h2 className="mt-3 max-w-xl text-4xl font-black tracking-tight sm:text-4xl">Turn your content into commerce.</h2>
            <p className="mt-3 max-w-lg leading-7 text-[#c3c9c5]">Join a new way to showcase products, reach customers and grow your business.</p>
          </div>
          <a href="/seller" className="shrink-0 rounded-full bg-[#b7ff35] px-6 py-3.5 font-bold text-black transition hover:bg-[#9de51f]">Become a seller ↗</a>
        </div>
      </section>

      <footer className="mt-8 border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-neutral-400 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <a href="/" className="flex items-center">
            <img src="/logo.png?v=2" alt="ANAMZI" width={260} height={92} className="h-14 w-auto object-contain" />
          </a>
          <p>Discover products. Support creators. Shop your way.</p>
          <p>© 2026 ANAMZI</p>
        </div>
      </footer>
    </main>
  );
}
