import { initLayout } from "../layout.js";
import { t, getLocale, onLocaleChange } from "../i18n.js";
import { Products, Chat, Ads } from "../firebase.js";
import { governorateLabel } from "../constants.js";
import { renderAdSlot, favoriteButtonHTML, wireFavoriteButtons, initReportDialog, initProductComments, icon } from "../ui.js";
import { authState, subscribe } from "../state.js";

const params = new URLSearchParams(location.search);
const productId = params.get("id");
const detailEl = document.getElementById("product-detail");

let product = null;
let starting = false;

function render() {
  if (!product) return;
  const isOwner = authState.user?.uid === product.ownerId;
  const unitLabel = t(product.unit === "kg" ? "products.unitKg" : "products.unitTon");
  const photos = product.photoUrls || [];

  detailEl.innerHTML = `
    <div class="product-gallery">
      ${
        photos.length > 0
          ? photos.map((url) => `<img src="${url}" alt="">`).join("")
          : `<div style="grid-column:span 3;aspect-ratio:16/9;background:var(--muted);border-radius:var(--radius-lg)"></div>`
      }
      ${product.videoUrl ? `<video src="${product.videoUrl}" controls style="grid-column:span 3;border-radius:var(--radius-lg);width:100%"></video>` : ""}
    </div>
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
        <h1 class="heading" style="font-size:1.5rem">${t(`categories.${product.category}`)}</h1>
        <div style="display:flex;align-items:center;gap:0.5rem">
          <span style="display:flex;align-items:center;gap:0.25rem;font-weight:600">${icon("star", "is-filled")} ${product.qualityRating}</span>
          <span id="fav-btn-mount"></span>
        </div>
      </div>
      <p class="text-muted" style="display:flex;align-items:center;gap:0.25rem;margin-top:0.25rem;font-size:0.875rem">${icon("map-pin")} ${governorateLabel(product.governorate, getLocale())}</p>
      <p class="product-detail-price" style="margin-top:1rem">${product.price} ${t("featured.perKg")}</p>
      <div class="product-detail-stats" style="margin-top:1rem">
        <div>
          <div class="product-detail-stat-label">${t("products.quantityLabel")}</div>
          <div class="product-detail-stat-value">${product.quantity} ${unitLabel}</div>
        </div>
        <div>
          <div class="product-detail-stat-label">${t("products.minOrderLabel")}</div>
          <div class="product-detail-stat-value">${product.minOrderQuantity} ${unitLabel}</div>
        </div>
      </div>
      <p style="margin-top:1rem;white-space:pre-line">${product.description}</p>
      <div class="text-muted" style="margin-top:1rem;font-size:0.875rem">${product.ownerName}</div>
      ${
        isOwner
          ? ""
          : `<div class="product-detail-actions" style="margin-top:1.5rem">
              <button type="button" class="btn btn-default" id="negotiate-btn">${icon("message-square")} ${t("featured.negotiateNow")}</button>
              <a href="tel:${product.ownerPhone}" class="btn btn-ghost btn-icon" style="background:var(--accent);color:var(--accent-foreground);border-radius:999px">${icon("phone")}</a>
              <span id="report-mount"></span>
            </div>`
      }
    </div>
  `;

  document.getElementById("fav-btn-mount").innerHTML = favoriteButtonHTML(product.id, "is-static");
  wireFavoriteButtons(detailEl);

  if (!isOwner) {
    const negotiateBtn = document.getElementById("negotiate-btn");
    negotiateBtn.addEventListener("click", handleNegotiate);
    initReportDialog(document.getElementById("report-mount"), product.ownerId, product.ownerName);
  }
}

async function handleNegotiate() {
  if (!authState.user || !authState.profile) {
    location.href = "login.html";
    return;
  }
  if (starting) return;
  starting = true;
  try {
    const chatId = await Chat.findOrCreateChat({
      currentUid: authState.user.uid,
      currentName: authState.profile.fullName,
      currentPhone: authState.profile.phone,
      otherUid: product.ownerId,
      otherName: product.ownerName,
      otherPhone: product.ownerPhone,
      contextType: "product",
      contextId: product.id,
      contextLabel: t(`categories.${product.category}`),
    });
    location.href = `dashboard-chat.html?id=${chatId}`;
  } finally {
    starting = false;
  }
}

async function main() {
  await initLayout();
  if (!productId) return;

  product = await Products.getProduct(productId);
  Products.incrementProductViews(productId);
  render();

  renderAdSlot(document.getElementById("ad-product-detail"), "product-detail", Ads);
  initProductComments(document.getElementById("comments-section"), productId);

  subscribe(render);
  onLocaleChange(render);
}

main();
