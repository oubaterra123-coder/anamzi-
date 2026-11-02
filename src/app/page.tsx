
"use client";


import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

type Product = {
  id: string;
  name: string;
  category: string;
  price: string;
  color: string;
  emoji: string;
  description: string;
  video_url: string;
  image_url: string;
  whatsapp_number: string;
  colors: string[];
  sizes: string[];
  product_type: "direct" | "affiliate";
  affiliate_url: string;
};


export default function Home() {
  const { language, setLanguage, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerCity, setBuyerCity] = useState("");
  const [buyerCountry, setBuyerCountry] = useState("MA");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerColor, setBuyerColor] = useState("");
  const [buyerSize, setBuyerSize] = useState("");
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
      const { data, error } = await supabase.rpc("get_approved_products_with_affiliate");

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
          image_url: string | null;
          category: string | null;
          whatsapp_number: string | null;
          colors: string[] | null;
          sizes: string[] | null;
          product_type: string | null;
          affiliate_url: string | null;
        }) => ({
          id: item.id,
          name: item.title,
          category: item.category ?? "Other",
          price: `${Number(item.price).toFixed(2)} ${item.currency ?? ""}`.trim(),
          color: "from-neutral-700 to-neutral-950",
          emoji: "\uD83D\uDCE6",
          description: item.description ?? "",
          video_url: item.video_url ? (item.video_url.startsWith("http") ? item.video_url : supabase.storage.from("products").getPublicUrl(item.video_url).data.publicUrl) : "",
          image_url: item.image_url ? (item.image_url.startsWith("http") ? item.image_url : supabase.storage.from("products").getPublicUrl(item.image_url).data.publicUrl) : "",
          whatsapp_number: item.whatsapp_number ?? "",
          colors: item.colors ?? [],
          sizes: item.sizes ?? [],
          product_type: item.product_type === "affiliate" ? "affiliate" : "direct",
          affiliate_url: item.affiliate_url ?? "",
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

    const languages: Record<string, {
      intro: string;
      product: string;
      price: string;
      quantity: string;
      name: string;
      phone: string;
      city: string;
      address: string;
      ending: string;
    }> = {
      MA: {
        intro: "\u0627\u0644\u0633\u0644\u0627\u0645\u0020\u0639\u0644\u064a\u0643\u0645\u060c\u0020\u0628\u063a\u064a\u062a\u0020\u0646\u0637\u0644\u0628\u0020\u0647\u0627\u062f\u0020\u0627\u0644\u0645\u0646\u062a\u0648\u062c\u0020\u0645\u0646\u0020\u0041\u004e\u0041\u004d\u005a\u0049\u003a",
        product: "\u0627\u0644\u0645\u0646\u062a\u0648\u062c",
        price: "\u0627\u0644\u062b\u0645\u0646",
        quantity: "\u0627\u0644\u0643\u0645\u064a\u0629",
        name: "\u0627\u0644\u0627\u0633\u0645",
        phone: "\u0627\u0644\u0647\u0627\u062a\u0641",
        city: "\u0627\u0644\u0645\u062f\u064a\u0646\u0629",
        address: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646",
        ending: "\u0639\u0627\u0641\u0627\u0643\u0645\u0020\u0623\u0643\u062f\u0648\u0627\u0020\u0644\u064a\u0627\u0020\u0648\u0627\u0634\u0020\u0627\u0644\u0645\u0646\u062a\u0648\u062c\u0020\u0645\u062a\u0648\u0641\u0631\u0020\u0648\u062a\u0641\u0627\u0635\u064a\u0644\u0020\u0627\u0644\u062a\u0648\u0635\u064a\u0644\u002e"
      },
      FR: {
        intro: "Bonjour ! Je souhaite commander ce produit sur ANAMZI :",
        product: "Produit",
        price: "Prix",
        quantity: "Quantit\u00E9",
        name: "Nom",
        phone: "T\u00E9l\u00E9phone",
        city: "Ville",
        address: "Adresse",
        ending: "Merci de confirmer la disponibilit\u00E9 et les modalit\u00E9s de livraison."
      },      GB: {
        intro: "Hello! I'd like to order this product from ANAMZI:",
        product: "Product",
        price: "Price",
        quantity: "Quantity",
        name: "Name",
        phone: "Phone",
        city: "City",
        address: "Address",
        ending: "Please confirm availability and delivery details."
      },
      US: {
        intro: "Hello! I'd like to order this product from ANAMZI:",
        product: "Product",
        price: "Price",
        quantity: "Quantity",
        name: "Name",
        phone: "Phone",
        city: "City",
        address: "Address",
        ending: "Please confirm availability and shipping details."
      },
      ES: {
        intro: "\u00A1Hola! Quiero pedir este producto de ANAMZI:",
        product: "Producto",
        price: "Precio",
        quantity: "Cantidad",
        name: "Nombre",
        phone: "Tel\u00E9fono",
        city: "Ciudad",
        address: "Direcci\u00F3n",
        ending: "Por favor, confirma la disponibilidad y los detalles de entrega."
      },      SA: {
        intro: "\u0627\u0644\u0633\u0644\u0627\u0645\u0020\u0639\u0644\u064a\u0643\u0645\u060c\u0020\u0623\u0631\u063a\u0628\u0020\u0641\u064a\u0020\u0637\u0644\u0628\u0020\u0647\u0630\u0627\u0020\u0627\u0644\u0645\u0646\u062a\u062c\u0020\u0645\u0646\u0020\u0041\u004e\u0041\u004d\u005a\u0049\u003a",
        product: "\u0627\u0644\u0645\u0646\u062a\u062c",
        price: "\u0627\u0644\u0633\u0639\u0631",
        quantity: "\u0627\u0644\u0643\u0645\u064a\u0629",
        name: "\u0627\u0644\u0627\u0633\u0645",
        phone: "\u0627\u0644\u0647\u0627\u062a\u0641",
        city: "\u0627\u0644\u0645\u062f\u064a\u0646\u0629",
        address: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646",
        ending: "\u064a\u0631\u062c\u0649\u0020\u062a\u0623\u0643\u064a\u062f\u0020\u062a\u0648\u0641\u0631\u0020\u0627\u0644\u0645\u0646\u062a\u062c\u0020\u0648\u062a\u0641\u0627\u0635\u064a\u0644\u0020\u0627\u0644\u062a\u0648\u0635\u064a\u0644\u002e"
      },
      DE: {
        intro: "Hallo! Ich m\u00F6chte dieses Produkt bei ANAMZI bestellen:",
        product: "Produkt",
        price: "Preis",
        quantity: "Menge",
        name: "Name",
        phone: "Telefon",
        city: "Stadt",
        address: "Adresse",
        ending: "Bitte best\u00E4tigen Sie die Verf\u00FCgbarkeit und die Lieferdetails."
      },      IT: {
        intro: "Ciao! Vorrei ordinare questo prodotto da ANAMZI:",
        product: "Prodotto",
        price: "Prezzo",
        quantity: "Quantit\u00E0",
        name: "Nome",
        phone: "Telefono",
        city: "Citt\u00E0",
        address: "Indirizzo",
        ending: "Conferma la disponibilit\u00E0 e i dettagli della consegna, per favore."
      },      PT: {
        intro: "Ol\u00E1! Gostaria de encomendar este produto da ANAMZI:",
        product: "Produto",
        price: "Pre\u00E7o",
        quantity: "Quantidade",
        name: "Nome",
        phone: "Telefone",
        city: "Cidade",
        address: "Morada",
        ending: "Por favor, confirme a disponibilidade e os detalhes da entrega."
      },      NL: {
        intro: "Hallo! Ik wil dit product bestellen bij ANAMZI:",
        product: "Product",
        price: "Prijs",
        quantity: "Aantal",
        name: "Naam",
        phone: "Telefoon",
        city: "Stad",
        address: "Adres",
        ending: "Bevestig alstublieft de beschikbaarheid en bezorggegevens."
      },
      TR: {
        intro: "Merhaba! ANAMZI \u00FCzerinden bu \u00FCr\u00FCn\u00FC sipari\u015F etmek istiyorum:",
        product: "\u00DCr\u00FCn",
        price: "Fiyat",
        quantity: "Adet",
        name: "Ad",
        phone: "Telefon",
        city: "\u015Eehir",
        address: "Adres",
        ending: "L\u00FCtfen \u00FCr\u00FCn\u00FCn mevcut oldu\u011Funu ve teslimat ayr\u0131nt\u0131lar\u0131n\u0131 onaylay\u0131n."
      },      RU: {
        intro: "\u041F\u0440\u0438\u0432\u0435\u0442! \u042F \u0445\u043E\u0447\u0443 \u0437\u0430\u043A\u0430\u0437\u0430\u0442\u044C \u044D\u0442\u043E\u0442 \u0442\u043E\u0432\u0430\u0440 \u043D\u0430 ANAMZI:",
        product: "\u0422\u043E\u0432\u0430\u0440",
        price: "\u0426\u0435\u043D\u0430",
        quantity: "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E",
        name: "\u0418\u043C\u044F",
        phone: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D",
        city: "\u0413\u043E\u0440\u043E\u0434",
        address: "\u0410\u0434\u0440\u0435\u0441",
        ending: "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043D\u0430\u043B\u0438\u0447\u0438\u0435 \u0442\u043E\u0432\u0430\u0440\u0430 \u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438."
      },
      CN: {
        intro: "\u4F60\u597D\uFF01\u6211\u60F3\u5728 ANAMZI \u8BA2\u8D2D\u8FD9\u4EF6\u5546\u54C1\uFF1A",
        product: "\u5546\u54C1",
        price: "\u4EF7\u683C",
        quantity: "\u6570\u91CF",
        name: "\u59D3\u540D",
        phone: "\u7535\u8BDD",
        city: "\u57CE\u5E02",
        address: "\u5730\u5740",
        ending: "\u8BF7\u786E\u8BA4\u5546\u54C1\u662F\u5426\u6709\u8D27\u4EE5\u53CA\u914D\u9001\u8BE6\u60C5\u3002"
      },
      JP: {
        intro: "\u3053\u3093\u306B\u3061\u306F\uFF01ANAMZI\u3067\u3053\u306E\u5546\u54C1\u3092\u6CE8\u6587\u3057\u305F\u3044\u3067\u3059\uFF1A",
        product: "\u5546\u54C1",
        price: "\u4FA1\u683C",
        quantity: "\u6570\u91CF",
        name: "\u6C0F\u540D",
        phone: "\u96FB\u8A71\u756A\u53F7",
        city: "\u5E02\u533A\u753A\u6751",
        address: "\u4F4F\u6240",
        ending: "\u5546\u54C1\u306E\u5728\u5EAB\u72B6\u6CC1\u3068\u914D\u9001\u306E\u8A73\u7D30\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002"
      },
      IN: {
        intro: "Hello! I'd like to order this product from ANAMZI:",
        product: "Product",
        price: "Price",
        quantity: "Quantity",
        name: "Name",
        phone: "Phone",
        city: "City",
        address: "Address",
        ending: "Please confirm availability and delivery details."
      }
    };

    const language = languages[buyerCountry] ?? languages.GB;

    const message = [
      language.intro,
      `${language.product}: ${selectedProduct.name}`,
...(selectedProduct.video_url ? [`Product video / Lien de la vid\u00E9o: ${selectedProduct.video_url}`] : []),
      ...(selectedProduct.colors.length && buyerColor ? [`Color: ${buyerColor}`] : []),
      ...(selectedProduct.sizes.length && buyerSize ? [`Size: ${buyerSize}`] : []),
      `${language.price}: ${selectedProduct.price}`,
      `${language.quantity}: ${quantity}`,
      `${language.name}: ${buyerName.trim()}`,
      `${language.phone}: ${buyerPhone.trim()}`,
      `${language.city}: ${buyerCity.trim()}`,
      `${language.address}: ${buyerAddress.trim()}`,
      language.ending
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
    setBuyerColor("");
    setBuyerSize("");
    setQuantity(1);
  }
  useEffect(() => {
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(
      "#products video"
    ));

    if (!("IntersectionObserver" in window)) {
      videos.forEach((video) => {
        video.muted = true;
        video.play().catch(() => {});
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            videos.forEach((other) => {
              if (other !== video) other.pause();
            });
            video.muted = true;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: [0, 0.6, 1] }
    );

    videos.forEach((video) => observer.observe(video));

    return () => observer.disconnect();
  }, [products]);
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
            <a href="#discover" className="hover:text-[#b7ff35]">{t("discover")}</a>
            <a href="#products" className="hover:text-[#b7ff35]">{t("products")}</a>
            <a href="/seller" className="hover:text-[#b7ff35]">{t("becomeSeller")} ↗</a>
          </div>
          <div className="flex items-center gap-2">
            <a href="#discover" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-[#111513]">{t("explore")}</a>
            {authLoading ? (
  <span className="px-4 py-2 text-sm text-gray-400">{t("loading")}</span>
) : userEmail ? (
  <div className="flex items-center gap-2">
    <span title={userEmail} className="hidden max-w-36 truncate text-xs text-gray-400 sm:block">{userEmail}</span>
    <div className="flex items-center gap-2">
      <label htmlFor="anamzi-language" className="sr-only">{t("selectLanguage")}</label>
      <select
        id="anamzi-language"
        aria-label={t("selectLanguage")}
        value={language}
        onChange={(event) => setLanguage(event.target.value as "fr" | "en" | "ar")}
        className="cursor-pointer rounded-full border border-white/10 bg-[#0b0f0c] px-3 py-2 text-sm font-semibold text-white outline-none hover:border-[#b7ff35]"
      >
        <option value="fr">Français</option>
        <option value="en">English</option>
        <option value="ar">العربية</option>
      </select>
      <button type="button" onClick={handleSignOut} disabled={signingOut} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold hover:border-[#b7ff35] disabled:opacity-50">
      {signingOut ? t("signingOut") : t("logout")}
    </button>
    </div>
  </div>
) : (
  <Link href="/signup" className="rounded-full bg-[#d8dedb] px-4 py-2 text-sm font-semibold text-[#080a09] hover:bg-[#9de51f]">
    Join us
  </Link>
)}
          </div>
        </nav>
      </header>
<section id="products" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b7ff35]">{t("feed")}</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight sm:text-4xl">{t("favorite")}</h2>
            <p className="mt-2 text-sm text-neutral-400">{t("feedDescription")}</p>
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} className="w-full rounded-full border border-white/10 bg-[#111513] px-5 py-3 text-sm outline-none focus:border-[#b7ff35] sm:max-w-xs" />
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          {["For you", "Gadgets", "Women", "Men", "Kids", "Shoes", "Accessories", "Other"].map((category) => (
            <button key={category} onClick={() => setActive(category)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active === category ? "bg-[#d8dedb] text-[#080a09]" : "border border-white/10 bg-[#111513] hover:border-[#b7ff35]/70"}`}>
              {category === "For you" ? t("forYou") : category === "Gadgets" ? t("gadgets") : category === "Women" ? t("women") : category === "Men" ? t("men") : category === "Kids" ? t("kids") : category === "Shoes" ? t("shoes") : category === "Accessories" ? t("accessories") : t("other")}
            </button>
          ))}
        </div>

        {productsLoading ? (
          <p className="py-12 text-center text-neutral-400">{t("loadingProducts")}</p>
        ) : (
          <>
            <div className="relative mt-7">
  
              <div className="pointer-events-none absolute inset-0 z-20">
                <button
                  type="button"
                  aria-label="Scroll products left"
                  onClick={() => document.getElementById("products-feed-scroll")?.scrollBy({ left: -400, behavior: "smooth" })}
                  className="pointer-events-auto absolute left-2 top-[38%] -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#b7ff35] bg-[#050706]/90 text-3xl font-bold text-[#b7ff35] shadow-lg hover:bg-[#b7ff35] hover:text-black"
                >&#x2039;</button>
                <button
                  type="button"
                  aria-label="Scroll products right"
                  onClick={() => document.getElementById("products-feed-scroll")?.scrollBy({ left: 400, behavior: "smooth" })}
                  className="pointer-events-auto absolute right-2 top-[38%] -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#b7ff35] bg-[#050706]/90 text-3xl font-bold text-[#b7ff35] shadow-lg hover:bg-[#b7ff35] hover:text-black"
                >&#x203A;</button>
              </div>
<div id="products-feed-scroll" tabIndex={0} onKeyDown={(event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      event.currentTarget.scrollBy({ left: event.key === "ArrowRight" ? 400 : -400, behavior: "smooth" });
    }
  }} className="flex snap-x snap-mandatory flex-row items-start gap-5 overflow-x-auto overflow-y-hidden scroll-smooth pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {filtered
                .filter((product) => Boolean(product.video_url) && (active === "For you" || active === "Products" || product.category === active))
                .map((product) => (
                  <article
                    key={product.id}
                    className="group w-[86vw] max-w-md flex-none snap-start overflow-hidden rounded-3xl border border-white/10 bg-[#111513] transition hover:border-[#b7ff35]/40 sm:w-[360px]"
                  >
                    <div className="relative aspect-[9/16] overflow-hidden bg-black">
                      {product.video_url ? (
                        <video
                          src={product.video_url}
                          playsInline
                          autoPlay
                          loop
                          muted
                          controls
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-6xl text-[#b7ff35]">\u25B6</span>
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
                          onClick={() => {
                            if (product.product_type === "affiliate") {
                              try {
                                const url = new URL(product.affiliate_url);
                                if (url.protocol !== "https:" && url.protocol !== "http:") {
                                  throw new Error("Invalid URL protocol");
                                }
                                window.open(url.href, "_blank", "noopener,noreferrer");
                              } catch {
                                alert("This affiliate purchase link is invalid or unavailable.");
                              }
                              return;
                            }

                            setBuyerColor("");
                            setBuyerSize("");
                            setSelectedProduct(product);
                          }}
                          className="rounded-full bg-[#b7ff35] px-4 py-2.5 text-sm font-bold text-[#080a09] transition hover:bg-[#9de51f]"
                        >
                          {product.product_type === "affiliate" ? `${t("buy")} ↗` : t("order")}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
</div>

            {filtered.filter(
              (product) => (Boolean(product.video_url) || Boolean(product.image_url)) &&
                (active === "For you" || active === "Products" || product.category === active)
            ).length === 0 && (
              <div className="my-8 rounded-3xl border border-white/10 bg-[#111513] px-6 py-14 text-center">
                <p className="text-lg font-bold">{t("noProducts")}</p>
                <p className="mt-2 text-sm text-neutral-400">
                  {t("noProductsDescription")}
                </p>
              </div>
            )}
          </>
        )}

        {!productsLoading && filtered.some((product) => Boolean(product.image_url) &&
          (active === "For you" || active === "Products" || product.category === active)) && (
          <div className="mt-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b7ff35]">{t("imageProducts")}</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered
                .filter((product) => Boolean(product.image_url) &&
                  (active === "For you" || active === "Products" || product.category === active))
                .map((product) => (
                  <article key={product.id} className="overflow-hidden rounded-3xl border border-white/10 bg-[#111513] transition hover:border-[#b7ff35]/40">
                    <div className="aspect-[4/5] overflow-hidden bg-black">
                      <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-contain" />
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#b7ff35]">{product.category}</p>
                      <h3 className="mt-2 text-lg font-bold">{product.name}</h3>
                      {product.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-400">{product.description}</p>}
                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className="font-black">{product.price}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (product.product_type === "affiliate") {
                              try {
                                const url = new URL(product.affiliate_url);
                                if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Invalid URL protocol");
                                window.open(url.href, "_blank", "noopener,noreferrer");
                              } catch {
                                alert("This affiliate purchase link is invalid or unavailable.");
                              }
                              return;
                            }
                            setBuyerColor("");
                            setBuyerSize("");
                            setSelectedProduct(product);
                          }}
                          className="rounded-full bg-[#b7ff35] px-4 py-2.5 text-sm font-bold text-[#080a09] transition hover:bg-[#9de51f]"
                        >
                          {product.product_type === "affiliate" ? `${t("buy")} ?` : t("order")}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </div>
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
                    {t("order")} {selectedProduct.name}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-400">{selectedProduct.price}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  aria-label={t("close")}
                  className="rounded-full border border-white/10 px-3 py-2 hover:border-[#b7ff35]"
                >
                  \u00D7
                </button>
              </div>

              <form onSubmit={handleWhatsAppOrder} className="mt-6 space-y-4">
                {selectedProduct.colors.length > 0 && (
                  <div>
                    <label htmlFor="buyer-color" className="mb-1.5 block text-sm font-medium">{t("chooseColor")}</label>
                    <select id="buyer-color" required value={buyerColor} onChange={(e) => setBuyerColor(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#050706] px-4 py-3 outline-none focus:border-[#b7ff35]">
                      <option value="">{t("selectColor")}</option>
                      {selectedProduct.colors.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                )}
                {selectedProduct.sizes.length > 0 && (
                  <div>
                    <label htmlFor="buyer-size" className="mb-1.5 block text-sm font-medium">{t("chooseSize")}</label>
                    <select id="buyer-size" required value={buyerSize} onChange={(e) => setBuyerSize(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#050706] px-4 py-3 outline-none focus:border-[#b7ff35]">
                      <option value="">{t("selectSize")}</option>
                      {selectedProduct.sizes.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label htmlFor="buyer-name" className="mb-1.5 block text-sm font-medium">
                    {t("fullName")}
                  </label>
                  <input
                    id="buyer-name"
                    autoComplete="name"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#050706] px-4 py-3 outline-none focus:border-[#b7ff35]"
                    placeholder={t("fullName")}
                  />
                </div>

                <div>
                  <label htmlFor="buyer-phone" className="mb-1.5 block text-sm font-medium">
                    {t("phone")}
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
                  <label htmlFor="buyer-country" className="mb-1.5 block text-sm font-medium">
                    {t("country")}
                  </label>
                  <select
                    id="buyer-country"
                    required
                    value={buyerCountry}
                    onChange={(e) => setBuyerCountry(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#050706] px-4 py-3 outline-none focus:border-[#b7ff35]"
                  >
                    <option value="MA">{"Morocco \u2014 ???????"}</option>
                    <option value="FR">{"France \u2014 Fran?ais"}</option>
                    <option value="GB">{"United Kingdom \u2014 English"}</option>
                    <option value="US">{"United States \u2014 English"}</option>
                    <option value="ES">{"Spain \u2014 Espa?ol"}</option>
                    <option value="SA">{"Saudi Arabia \u2014 ???????"}</option>
                    <option value="DE">{"Germany \u2014 Deutsch"}</option>
                    <option value="IT">{"Italy \u2014 Italiano"}</option>
                    <option value="PT">{"Portugal \u2014 Portugu?s"}</option>
                    <option value="NL">{"Netherlands \u2014 Nederlands"}</option>
                    <option value="TR">{"Turkey \u2014 T?rk?e"}</option>
                    <option value="RU">{"Russia \u2014 ???????"}</option>
                    <option value="CN">{"China \u2014 ??"}</option>
                    <option value="JP">{"Japan \u2014 ???"}</option>
                    <option value="IN">{"India \u2014 English"}</option>
                    <option value="OTHER">{"Other country \u2014 English"}</option>
</select>
                </div>

                <div>
                  <label htmlFor="buyer-city" className="mb-1.5 block text-sm font-medium">
                    {t("city")}
                  </label>
                  <input
                    id="buyer-city"
                    autoComplete="address-level2"
                    required
                    value={buyerCity}
                    onChange={(e) => setBuyerCity(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#050706] px-4 py-3 outline-none focus:border-[#b7ff35]"
                    placeholder={t("city")}
                  />
                </div>

                <div>
                  <label htmlFor="buyer-address" className="mb-1.5 block text-sm font-medium">
                    {t("address")}
                  </label>
                  <textarea
                    id="buyer-address"
                    autoComplete="street-address"
                    required
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    className="min-h-20 w-full rounded-xl border border-white/10 bg-[#050706] px-4 py-3 outline-none focus:border-[#b7ff35]"
                    placeholder={t("address")}
                  />
                </div>

                <div>
                  <label htmlFor="buyer-quantity" className="mb-1.5 block text-sm font-medium">
                    {t("quantity")}
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
                  {t("orderNote")}
                  
                  
                </p>

                <button
                  type="submit"
                  className="w-full rounded-full bg-[#b7ff35] px-5 py-3.5 font-bold text-[#080a09] transition hover:bg-[#9de51f]"
                >
                  {t("continueWhatsApp")} ↗
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      <section id="sell" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] border border-white/10 bg-[#111513] p-8 text-[#e5e7eb] sm:flex-row sm:items-center sm:p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b7ff35]">{t("yourProducts")}</p>
            <h2 className="mt-3 max-w-xl text-4xl font-black tracking-tight sm:text-4xl">{t("commerce")}</h2>
            <p className="mt-3 max-w-lg leading-7 text-[#c3c9c5]">{t("grow")}</p>
          </div>
          <a href="/seller" className="shrink-0 rounded-full bg-[#b7ff35] px-6 py-3.5 font-bold text-black transition hover:bg-[#9de51f]">{t("becomeSeller")} ↗</a>
        </div>
      </section>

      <footer className="mt-8 border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-neutral-400 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <a href="/" className="flex items-center">
            <img src="/logo.png?v=2" alt="ANAMZI" width={260} height={92} className="h-14 w-auto object-contain" />
          </a>
          <p>{t("footer")}</p>
          <p>© 2026 ANAMZI</p>
        </div>
      </footer>
    </main>
  );
}

















