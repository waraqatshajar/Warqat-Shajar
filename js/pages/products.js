import { initLayout } from "../layout.js";
import { t, getLocale, onLocaleChange } from "../i18n.js";
import { Products, Ads } from "../firebase.js";
import { CATEGORIES, GOVERNORATES, governorateLabel } from "../constants.js";
import { renderAdSlot, wireFavoriteButtons, productCardHTML } from "../ui.js";
import { subscribe } from "../state.js";

const categorySelect = document.getElementById("filter-category");
const governorateSelect = document.getElementById("filter-governorate");
const listEl = document.getElementById("products-list");

function populateFilters() {
  const category = categorySelect.value;
  const governorate = governorateSelect.value;
  categorySelect.innerHTML =
    `<option value="">${t("categories.title", "All categories")}</option>` +
    CATEGORIES.map((c) => `<option value="${c}">${t(`categories.${c}`)}</option>`).join("");
  governorateSelect.innerHTML =
    `<option value="">${t("auth.register.governorateLabel", "Governorate")}</option>` +
    GOVERNORATES.map((g) => `<option value="${g.id}">${g[getLocale()]}</option>`).join("");
  categorySelect.value = category;
  governorateSelect.value = governorate;
}

async function loadProducts() {
  listEl.innerHTML = "";
  const products = await Products.listActiveProducts({
    category: categorySelect.value || undefined,
    governorate: governorateSelect.value || undefined,
  }).catch(() => []);

  if (products.length === 0) {
    listEl.innerHTML = `<p class="empty-state">${getLocale() === "ar" ? "ما في منتجات مطابقة" : "No matching products"}</p>`;
    return;
  }

  listEl.innerHTML = `<div class="product-grid">${products
    .map((p) => productCardHTML(p, t(`categories.${p.category}`), governorateLabel(p.governorate, getLocale()), t("featured.perKg", "EGP/kg")))
    .join("")}</div>`;
  wireFavoriteButtons(listEl);
}

async function main() {
  await initLayout();
  populateFilters();

  const params = new URLSearchParams(location.search);
  const initialCategory = params.get("category");
  if (initialCategory && CATEGORIES.includes(initialCategory)) {
    categorySelect.value = initialCategory;
  }

  await loadProducts();
  renderAdSlot(document.getElementById("ad-products-top"), "products-top", Ads);

  categorySelect.addEventListener("change", loadProducts);
  governorateSelect.addEventListener("change", loadProducts);
  onLocaleChange(() => {
    populateFilters();
    loadProducts();
  });
  subscribe(() => loadProducts());
}

main();
