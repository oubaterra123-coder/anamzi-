"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Language = "fr" | "en" | "ar";

const translations = {
  fr: {
    discover: "Découvrir",
    products: "Produits",
    becomeSeller: "Devenir vendeur",
    explore: "Explorer",
    loading: "Chargement...",
    signingOut: "Déconnexion...",
    logout: "Déconnexion",
    joinUs: "Nous rejoindre",
    feed: "Fil de découverte",
    favorite: "Trouvez votre prochain coup de cœur.",
    feedDescription: "Découvrez des produits qui méritent votre attention.",
    search: "Rechercher des produits...",
    loadingProducts: "Chargement des produits...",
    noProductsDescription: "Les produits approuvés des vendeurs apparaîtront ici.",
    noProducts: "Aucun produit disponible pour le moment",
    forYou: "Pour vous",
    product: "Produit",
    chooseColor: "Choisir une couleur",
    selectColor: "Sélectionner une couleur",
    chooseSize: "Choisir une taille",
    selectSize: "Sélectionner une taille",
    fullName: "Nom complet",
    phone: "Numéro de téléphone",
    country: "Pays de destination",
    city: "Ville / Pays",
    address: "Adresse de livraison",
    quantity: "Quantité",
    continueWhatsApp: "Continuer sur WhatsApp",
    orderNote: "Les détails de votre commande s'ouvriront dans WhatsApp. Vérifiez le message et appuyez sur Envoyer. ANAMZI ne stocke pas cette commande.",
    yourProducts: "Vos produits, votre audience",
    commerce: "Transformez votre contenu en commerce.",
    grow: "Présentez vos produits, touchez vos clients et développez votre activité.",
    footer: "Découvrez des produits. Soutenez les créateurs. Achetez à votre façon.",
    login: "Connexion",
    signup: "Créer un compte",
    email: "Adresse e-mail",
    password: "Mot de passe",
    name: "Nom",
    submit: "Envoyer",
    checking: "Vérification de votre compte...",
    admin: "Panneau d'administration",
    viewStore: "Voir la boutique",
    published: "Produits publiés",
    productVideos: "Produits et vidéos",
    refresh: "Actualiser les produits",
    delete: "Supprimer le produit",
    deleting: "Suppression...",
    noDescription: "Aucune description fournie.",
    sellerId: "Identifiant vendeur",
    publishedAt: "Publié le",
    chooseVideo: "Choisir une vidéo",
    price: "Prix",
    currency: "Devise",
    description: "Description",
    directSeller: "Vendeur direct — commandes WhatsApp",
    affiliate: "Affilié — lien d'achat externe",
    colors: "Couleurs disponibles (facultatif)",
    clothingSizes: "Tailles de vêtements (facultatif)",
    shoeSizes: "Pointures EU (facultatif)",
    productType: "Type de produit",
    videoProgress: "Progression du téléversement vidéo",
    keepOpen: "Gardez cette page ouverte jusqu'à la fin du téléversement.",
    buy: "Acheter",
    order: "Commander",
    affiliateDisclosure: "Lien affilié : le créateur peut toucher une commission sans frais supplémentaires pour vous.",    selectLanguage: "Langue",
  },
  en: {
    discover: "Discover",
    products: "Products",
    becomeSeller: "Become a seller",
    explore: "Explore",
    loading: "Loading...",
    signingOut: "Signing out...",
    logout: "Log out",
    joinUs: "Join us",
    feed: "The discovery feed",
    favorite: "Find your next favorite.",
    feedDescription: "Discover products worth your attention.",
    search: "Search products...",
    loadingProducts: "Loading products...",
    noProductsDescription: "Approved products from sellers will appear here.",
    noProducts: "No products available yet",
    forYou: "For you",
    product: "Product",
    chooseColor: "Choose color",
    selectColor: "Select a color",
    chooseSize: "Choose size",
    selectSize: "Select a size",
    fullName: "Full name",
    phone: "Phone number",
    country: "Destination country",
    city: "City / Country",
    address: "Delivery address",
    quantity: "Quantity",
    continueWhatsApp: "Continue to WhatsApp",
    orderNote: "Your order details will open in WhatsApp. Review the message and press Send. ANAMZI does not store this order.",
    yourProducts: "Your products, your audience",
    commerce: "Turn your content into commerce.",
    grow: "Showcase products, reach customers and grow your business.",
    footer: "Discover products. Support creators. Shop your way.",
    login: "Log in",
    signup: "Create an account",
    email: "Email address",
    password: "Password",
    name: "Name",
    submit: "Submit",
    checking: "Checking your account...",
    admin: "Admin panel",
    viewStore: "View store",
    published: "Published products",
    productVideos: "Products & videos",
    refresh: "Refresh products",
    delete: "Delete product",
    deleting: "Deleting...",
    noDescription: "No description provided.",
    sellerId: "Seller ID",
    publishedAt: "Published",
    chooseVideo: "Choose a video",
    price: "Price",
    currency: "Currency",
    description: "Description",
    directSeller: "Direct seller — WhatsApp orders",
    affiliate: "Affiliate — external purchase link",
    colors: "Available colors (optional)",
    clothingSizes: "Available clothing sizes (optional)",
    shoeSizes: "Available shoe sizes EU (optional)",
    productType: "Product type",
    videoProgress: "Video upload progress",
    keepOpen: "Keep this page open until the upload finishes.",
    buy: "Buy",
    order: "Order",
    affiliateDisclosure: "Affiliate link: the creator may earn a commission at no extra cost to you.",    selectLanguage: "Language",
  },
  ar: {
    discover: "اكتشف",
    products: "المنتجات",
    becomeSeller: "كن بائعًا",
    explore: "استكشف",
    loading: "جارٍ التحميل...",
    signingOut: "جارٍ تسجيل الخروج...",
    logout: "تسجيل الخروج",
    joinUs: "انضم إلينا",
    feed: "خلاصة اكتشاف المنتجات",
    favorite: "اعثر على منتجك المفضّل التالي.",
    feedDescription: "اكتشف منتجات تستحق اهتمامك.",
    search: "ابحث عن المنتجات...",
    loadingProducts: "جارٍ تحميل المنتجات...",
    noProductsDescription: "ستظهر هنا المنتجات التي تمت الموافقة عليها للبائعين.",
    noProducts: "لا توجد منتجات متاحة حاليًا",
    forYou: "مقترحة لك",
    product: "المنتج",
    chooseColor: "اختر لونًا",
    selectColor: "حدّد لونًا",
    chooseSize: "اختر مقاسًا",
    selectSize: "حدّد مقاسًا",
    fullName: "الاسم الكامل",
    phone: "رقم الهاتف",
    country: "بلد التوصيل",
    city: "المدينة / البلد",
    address: "عنوان التوصيل",
    quantity: "الكمية",
    continueWhatsApp: "المتابعة عبر واتساب",
    orderNote: "ستُفتح تفاصيل طلبك في واتساب. راجع الرسالة واضغط على إرسال. لا تحتفظ ANAMZI ببيانات هذا الطلب.",
    yourProducts: "منتجاتك وجمهورك",
    commerce: "حوّل محتواك إلى تجارة.",
    grow: "اعرض منتجاتك، وتواصل مع العملاء، وطوّر نشاطك التجاري.",
    footer: "اكتشف المنتجات. ادعم صُنّاع المحتوى. تسوّق بطريقتك.",
    login: "تسجيل الدخول",
    signup: "إنشاء حساب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    name: "الاسم",
    submit: "إرسال",
    checking: "جارٍ التحقق من حسابك...",
    admin: "لوحة الإدارة",
    viewStore: "عرض المتجر",
    published: "المنتجات المنشورة",
    productVideos: "المنتجات والفيديوهات",
    refresh: "تحديث المنتجات",
    delete: "حذف المنتج",
    deleting: "جارٍ الحذف...",
    noDescription: "لم يُقدَّم وصف.",
    sellerId: "معرّف البائع",
    publishedAt: "تاريخ النشر",
    chooseVideo: "اختر فيديو",
    price: "السعر",
    currency: "العملة",
    description: "الوصف",
    directSeller: "بائع مباشر — الطلبات عبر واتساب",
    affiliate: "مسوّق بالعمولة — رابط شراء خارجي",
    colors: "الألوان المتاحة (اختياري)",
    clothingSizes: "مقاسات الملابس (اختياري)",
    shoeSizes: "مقاسات الأحذية الأوروبية (اختياري)",
    productType: "نوع المنتج",
    videoProgress: "تقدّم رفع الفيديو",
    keepOpen: "أبقِ هذه الصفحة مفتوحة حتى يكتمل رفع الفيديو.",
    buy: "شراء",
    order: "طلب",
    affiliateDisclosure: "رابط تسويق بالعمولة: قد يحصل صانع المحتوى على عمولة دون أي تكلفة إضافية عليك.",    selectLanguage: "اللغة",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("anamzi-language");
      if (saved === "fr" || saved === "en" || saved === "ar") {
        setLanguageState(saved);
      }
    } catch {
      // Keep the default language if storage is unavailable.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "ar" ? "ar" : language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem("anamzi-language", next);
    } catch {
      // The language still works for the current session.
    }
  }, []);

  const t = useCallback((key: TranslationKey) => {
    return translations[language][key] ?? translations.en[key];
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}





