// Static reference data: product categories, account types, Egypt's
// governorates (Arabic/English labels), and ad placements. No Firebase here.

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
  "product-detail",
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
