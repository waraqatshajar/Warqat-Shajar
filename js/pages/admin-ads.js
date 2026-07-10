import { initLayout } from "../layout.js";
import { guardAdmin } from "../admin-shell.js";
import { t, onLocaleChange } from "../i18n.js";
import { Ads, SiteSettings } from "../firebase.js";
import { AD_PLACEMENTS } from "../constants.js";
import { badgeClass, btnClass, showMessage, renderImageInput } from "../ui.js";

let contentEl;
let ads = [];
let placements = {};

const PLACEMENT_KEY = {
  "home-top": "ads.placementHomeTop",
  "home-mid": "ads.placementHomeMid",
  "home-bottom": "ads.placementHomeBottom",
  "products-top": "ads.placementProductsTop",
  "product-detail": "ads.placementProductDetail",
};

const PLACEMENT_DESC_KEY = {
  "home-top": "ads.descHomeTop",
  "home-mid": "ads.descHomeMid",
  "home-bottom": "ads.descHomeBottom",
  "products-top": "ads.descProductsTop",
  "product-detail": "ads.descProductDetail",
};

const PLACEMENT_DESC_FALLBACK = {
  "home-top": "Homepage, right below the hero banner.",
  "home-mid": "Homepage, between categories and featured listings.",
  "home-bottom": "Homepage, after the farmer CTA banner, just before the footer.",
  "products-top": "Browse Products page, above the product grid.",
  "product-detail": "Product detail page, below the description.",
};

let photoInput;

function render() {
  contentEl.innerHTML = `
    <h1 class="heading" style="font-size:1.5rem">${t("ads.title")}</h1>

    <form id="add-ad-form" class="form-stack card" style="padding:1.5rem;margin-top:1rem">
      <h2 class="card-title" style="font-size:1rem">${t("ads.addAd")}</h2>
      <div class="field">
        <label class="label">${t("ads.imageLabel")}</label>
        <div id="ad-image-input-mount"></div>
      </div>
      <div class="field">
        <label class="label">${t("ads.linkLabel")}</label>
        <input class="input force-ltr" id="ad-link-url" dir="ltr" placeholder="https://...">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="field">
          <label class="label">${t("ads.placementLabel")}</label>
          <select class="select" id="ad-placement">
            ${AD_PLACEMENTS.map((p) => `<option value="${p}">${t(PLACEMENT_KEY[p])}</option>`).join("")}
          </select>
          <p class="text-muted" id="ad-placement-desc" style="font-size:0.75rem;margin-top:0.25rem"></p>
        </div>
        <div class="field">
          <label class="label">${t("ads.orderLabel")}</label>
          <input class="input" id="ad-order" type="number" value="0">
        </div>
      </div>
      <p id="add-ad-error" class="error-text" style="display:none"></p>
      <button type="submit" class="${btnClass("default")}" style="align-self:flex-start">${t("ads.save")}</button>
    </form>

    <h2 class="heading" style="font-size:1.1rem;margin-top:2rem">${t("ads.placementsTitle", "Placements")}</h2>
    <p class="text-muted" style="font-size:0.8rem">${t("ads.placementsHint", "Fully hide a placement — no ad and no placeholder box will show there.")}</p>
    <div class="card" style="margin-top:0.75rem;padding:0 1rem">
      ${AD_PLACEMENTS.map((p) => {
        const enabled = placements[p] !== false;
        return `
        <div class="placement-row">
          <div class="placement-row-main">
            <div style="font-weight:600">${t(PLACEMENT_KEY[p])}</div>
            <div class="placement-row-desc">${t(PLACEMENT_DESC_KEY[p], PLACEMENT_DESC_FALLBACK[p])}</div>
          </div>
          <button type="button" class="${btnClass(enabled ? "outline" : "default", "sm")}" data-toggle-placement="${p}" data-enabled="${enabled}">
            ${enabled ? t("ads.disablePlacement", "Disable") : t("ads.enablePlacement", "Enable")}
          </button>
        </div>
      `;
      }).join("")}
    </div>

    <div class="card" style="margin-top:1.5rem;padding:0 1rem">
      ${
        ads.length === 0
          ? `<p class="empty-state">${t("ads.noAds")}</p>`
          : ads
              .map(
                (a) => `
              <div class="list-row">
                <img src="${a.imageUrl}" alt="" style="width:5rem;height:2.5rem;object-fit:cover;border-radius:var(--radius-md);flex-shrink:0">
                <div class="list-row-main">
                  <div style="font-weight:600">${t(PLACEMENT_KEY[a.placement] || "")}</div>
                  <span class="${badgeClass(a.active ? "default" : "secondary")}">${a.active ? t("ads.activeLabel") : t("admin.statusSuspended")}</span>
                </div>
                <button type="button" class="${btnClass("outline", "sm")}" data-toggle="${a.id}" data-active="${a.active}">${a.active ? t("admin.suspend") : t("ads.activeLabel")}</button>
                <button type="button" class="${btnClass("destructive", "sm")}" data-delete="${a.id}">${t("ads.delete")}</button>
              </div>
            `,
              )
              .join("")
      }
    </div>
  `;

  photoInput = renderImageInput(contentEl.querySelector("#ad-image-input-mount"), {
    uploadPathPrefix: "ads/",
    accept: "image/*",
  });

  const placementSelect = contentEl.querySelector("#ad-placement");
  const placementDescEl = contentEl.querySelector("#ad-placement-desc");
  function updatePlacementDesc() {
    placementDescEl.textContent = t(PLACEMENT_DESC_KEY[placementSelect.value], PLACEMENT_DESC_FALLBACK[placementSelect.value]);
  }
  placementSelect.addEventListener("change", updatePlacementDesc);
  updatePlacementDesc();

  contentEl.querySelector("#add-ad-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = contentEl.querySelector("#add-ad-error");
    showMessage(errorEl, "");
    const imageUrl = photoInput.getValue();
    const linkUrl = contentEl.querySelector("#ad-link-url").value.trim();
    if (!imageUrl || !linkUrl) {
      showMessage(errorEl, t("products.required"));
      return;
    }
    try {
      await Ads.createAd({
        imageUrl,
        linkUrl,
        placement: placementSelect.value,
        order: Number(contentEl.querySelector("#ad-order").value) || 0,
        active: true,
      });
      await reload();
    } catch (err) {
      showMessage(errorEl, err.message);
    }
  });

  contentEl.querySelectorAll("[data-toggle-placement]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const enabled = btn.dataset.enabled === "true";
      await SiteSettings.updateAdPlacementEnabled(btn.dataset.togglePlacement, !enabled);
    });
  });

  contentEl.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await Ads.updateAd(btn.dataset.toggle, { active: btn.dataset.active !== "true" });
      await reload();
    });
  });
  contentEl.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await Ads.deleteAd(btn.dataset.delete);
      await reload();
    });
  });
}

async function reload() {
  ads = await Ads.listAllAds();
  render();
}

async function main() {
  await initLayout();
  await guardAdmin("admin-ads.html");
  contentEl = document.getElementById("admin-content");
  await reload();
  SiteSettings.subscribeAdPlacements((data) => {
    placements = data;
    render();
  });
  onLocaleChange(render);
}

main();
