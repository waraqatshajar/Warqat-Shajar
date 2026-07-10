import { initLayout } from "../layout.js";
import { t, getLocale, onLocaleChange } from "../i18n.js";
import { SiteSettings, Products, Ads } from "../firebase.js";
import { CATEGORIES, CATEGORY_IMAGES, governorateLabel } from "../constants.js";
import { renderAdSlot, wireFavoriteButtons, productCardHTML, icon } from "../ui.js";
import { subscribe } from "../state.js";

const TRUST_ITEMS = [
  { key: "support", icon: "headset" },
  { key: "ratings", icon: "star" },
  { key: "negotiation", icon: "trending-up" },
  { key: "communication", icon: "message-circle" },
];

let heroImages = ["images/hero-farmer.jpg"];
let heroTimer = null;
let activeSlide = 0;

function renderHero() {
  const slidesEl = document.getElementById("hero-slides");
  const dotsEl = document.getElementById("hero-dots");
  slidesEl.innerHTML = heroImages
    .map((src, i) => `<div class="hero-slide ${i === activeSlide ? "is-active" : ""}" style="background-image:url('${src}')"></div>`)
    .join("");
  dotsEl.innerHTML =
    heroImages.length > 1
      ? heroImages.map((_, i) => `<button type="button" class="hero-dot ${i === activeSlide ? "is-active" : ""}" data-slide="${i}"></button>`).join("")
      : "";
  dotsEl.querySelectorAll("[data-slide]").forEach((dot) => {
    dot.addEventListener("click", () => {
      activeSlide = Number(dot.dataset.slide);
      renderHero();
    });
  });
}

function startHeroRotation() {
  if (heroTimer) clearInterval(heroTimer);
  if (heroImages.length > 1) {
    heroTimer = setInterval(() => {
      activeSlide = (activeSlide + 1) % heroImages.length;
      renderHero();
    }, 5000);
  }
}

function renderTrustBadges() {
  const el = document.getElementById("trust-items");
  el.innerHTML = TRUST_ITEMS.map(
    (item) => `
    <div class="trust-item">
      <span class="trust-icon">${icon(item.icon)}</span>
      <span>
        <span class="trust-title" style="display:block">${t(`trust.${item.key}.title`)}</span>
        <span class="trust-subtitle">${t(`trust.${item.key}.subtitle`)}</span>
      </span>
    </div>`,
  ).join("");
}

function renderCategoryGrid(categoryImages) {
  const el = document.getElementById("category-grid");
  el.innerHTML = CATEGORIES.map(
    (cat) => `
    <a href="products.html?category=${cat}" class="category-card">
      <img src="${categoryImages[cat] || CATEGORY_IMAGES[cat]}" alt="${t(`categories.${cat}`)}" loading="lazy">
      <div class="category-card-overlay"></div>
      <div class="category-card-label">
        <div class="category-card-name">${t(`categories.${cat}`)}</div>
        <div class="category-card-hint">${t("categories.shopNow")}</div>
      </div>
    </a>`,
  ).join("");
}

function applySiteContent(content) {
  const locale = getLocale();
  const overrides = content?.[locale] || {};
  const FIELD_IDS = {
    heroBadge: "hero-badge",
    heroHeadline: "hero-headline",
    heroSubheadline: "hero-subheadline",
    ctaTitle: "cta-banner-title",
    ctaSubtitle: "cta-banner-subtitle",
  };
  Object.entries(FIELD_IDS).forEach(([key, id]) => {
    const value = overrides[key];
    if (value) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }
  });
}

async function renderFeaturedProducts() {
  const el = document.getElementById("featured-products");
  const products = await Products.listActiveProducts({ limitCount: 8 }).catch(() => []);
  if (products.length === 0) {
    el.innerHTML = `<p class="empty-state">${getLocale() === "ar" ? "لا توجد منتجات بعد" : "No products yet"}</p>`;
    return;
  }
  el.innerHTML = `<div class="product-grid">${products
    .map((p) => productCardHTML(p, t(`categories.${p.category}`), governorateLabel(p.governorate, getLocale()), t("featured.perKg", "EGP/kg")))
    .join("")}</div>`;
  wireFavoriteButtons(el);
}

async function loadSiteImages() {
  const images = await SiteSettings.getSiteImagesOnce().catch(() => ({ heroImages, categoryImages: {} }));
  heroImages = images.heroImages?.length ? images.heroImages : heroImages;
  activeSlide = 0;
  renderHero();
  startHeroRotation();
  renderCategoryGrid(images.categoryImages || {});
}

let siteContent = { ar: {}, en: {} };

async function main() {
  await initLayout();
  renderTrustBadges();
  await loadSiteImages();
  await renderFeaturedProducts();
  renderAdSlot(document.getElementById("ad-home-top"), "home-top", Ads);
  renderAdSlot(document.getElementById("ad-home-mid"), "home-mid", Ads);
  renderAdSlot(document.getElementById("ad-home-bottom"), "home-bottom", Ads);

  siteContent = await SiteSettings.getSiteContentOnce().catch(() => siteContent);
  applySiteContent(siteContent);

  onLocaleChange(() => {
    renderTrustBadges();
    renderHero();
    loadSiteImages();
    renderFeaturedProducts();
    applySiteContent(siteContent);
  });
  subscribe(() => renderFeaturedProducts());
}

main();
