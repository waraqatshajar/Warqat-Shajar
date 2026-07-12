// Static reference data: product categories, account types, Egypt's
// governorates (Arabic/English labels), and ad placements.
import { t } from "./i18n.js";
import { SiteSettings } from "./firebase.js";

export const CATEGORIES = [
  "vegetables",
  "fruits",
  "wheat",
  "cotton",
  "barley",
  "rice",
  "organic",
];

export const ACCOUNT_TYPES = ["farmer", "trader", "factory", "consumer"];

export const GOVERNORATES = [
  { id: "cairo", ar: "القاهرة", en: "Cairo" },
  { id: "giza", ar: "الجيزة", en: "Giza" },
  { id: "alexandria", ar: "الإسكندرية", en: "Alexandria" },
  { id: "qalyubia", ar: "القليوبية", en: "Qalyubia" },
  { id: "port-said", ar: "بورسعيد", en: "Port Said" },
  { id: "suez", ar: "السويس", en: "Suez" },
  { id: "dakahlia", ar: "الدقهلية", en: "Dakahlia" },
  { id: "sharqia", ar: "الشرقية", en: "Sharqia" },
  { id: "qena", ar: "قنا", en: "Qena" },
  { id: "aswan", ar: "أسوان", en: "Aswan" },
  { id: "assiut", ar: "أسيوط", en: "Assiut" },
  { id: "beheira", ar: "البحيرة", en: "Beheira" },
  { id: "beni-suef", ar: "بني سويف", en: "Beni Suef" },
  { id: "faiyum", ar: "الفيوم", en: "Faiyum" },
  { id: "gharbia", ar: "الغربية", en: "Gharbia" },
  { id: "ismailia", ar: "الإسماعيلية", en: "Ismailia" },
  { id: "kafr-el-sheikh", ar: "كفر الشيخ", en: "Kafr El Sheikh" },
  { id: "luxor", ar: "الأقصر", en: "Luxor" },
  { id: "matrouh", ar: "مطروح", en: "Matrouh" },
  { id: "minya", ar: "المنيا", en: "Minya" },
  { id: "monufia", ar: "المنوفية", en: "Monufia" },
  { id: "new-valley", ar: "الوادي الجديد", en: "New Valley" },
  { id: "north-sinai", ar: "شمال سيناء", en: "North Sinai" },
  { id: "south-sinai", ar: "جنوب سيناء", en: "South Sinai" },
  { id: "red-sea", ar: "البحر الأحمر", en: "Red Sea" },
  { id: "sohag", ar: "سوهاج", en: "Sohag" },
  { id: "damietta", ar: "دمياط", en: "Damietta" },
];

export const AD_PLACEMENTS = [
  "home-top",
  "home-mid",
  "home-bottom",
  "products-top",
  "products-sidebar",
  "product-detail",
  "product-detail-sidebar",
];

export const CATEGORY_IMAGES = {
  vegetables: "images/categories/vegetables.jpg",
  fruits: "images/categories/fruits.jpg",
  wheat: "images/categories/wheat.jpg",
  cotton: "images/categories/cotton.jpg",
  barley: "images/categories/barley.jpg",
  rice: "images/categories/rice.jpg",
  organic: "images/categories/organic.jpg",
};

export function governorateLabel(id, locale) {
  const gov = GOVERNORATES.find((g) => g.id === id);
  return gov ? gov[locale] : id;
}

// ---------------------------------------------------------------------------
// Admin-managed categories (settings/categories in Firestore) — a live cache
// owned by this module (same module-level-subscription pattern as i18n.js's
// locale/state.js's auth state), so every consumer can just call the plain
// functions below instead of each managing its own Firestore listener.
// Built-ins in CATEGORIES above are never mutated — hiding only affects
// display, never existing product/registration data.
// ---------------------------------------------------------------------------
let categoriesConfigCache = { extra: [], hidden: [] };
const categoryChangeListeners = new Set();

SiteSettings.subscribeCategoriesConfig((config) => {
  categoriesConfigCache = config;
  categoryChangeListeners.forEach((fn) => fn());
});

export function onCategoriesChange(fn) {
  categoryChangeListeners.add(fn);
  return () => categoryChangeListeners.delete(fn);
}

export function mergeCategories() {
  const hidden = new Set(categoriesConfigCache.hidden || []);
  const builtins = CATEGORIES.filter((id) => !hidden.has(id)).map((id) => ({
    id,
    isCustom: false,
    image: CATEGORY_IMAGES[id],
  }));
  const extras = (categoriesConfigCache.extra || [])
    .filter((c) => !hidden.has(c.id))
    .map((c) => ({ id: c.id, isCustom: true, ar: c.ar, en: c.en, image: c.imageUrl }));
  return [...builtins, ...extras];
}

export function categoryLabel(category, locale) {
  if (category.isCustom) return category[locale] || category.en;
  return t(`categories.${category.id}`);
}

// For places that only have a bare category id string (a product's stored
// category, a sourcing request's category, etc.) rather than a full merged
// category object — resolves correctly whether it's built-in or custom, and
// keeps working even if that category has since been hidden or renamed.
export function categoryLabelById(id, locale) {
  if (CATEGORIES.includes(id)) return t(`categories.${id}`);
  const custom = (categoriesConfigCache.extra || []).find((c) => c.id === id);
  return custom ? custom[locale] || custom.en : id;
}
