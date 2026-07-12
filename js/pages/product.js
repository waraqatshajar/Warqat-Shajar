import { initLayout } from "../layout.js";
import { t, getLocale, onLocaleChange } from "../i18n.js";
import { Products, Chat, Ads } from "../firebase.js";
import { governorateLabel, categoryLabelById, onCategoriesChange } from "../constants.js";
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
          ? photos
              .map((url, i) =>
                i === 0
                  ? `
                    <div class="product-gallery-zoom-outer">
                      <div class="product-gallery-zoom" id="gallery-zoom-box">
                        <img src="${url}" alt="" id="gallery-hero-img">
                        <div class="gallery-zoom-lens" id="gallery-zoom-lens"></div>
                      </div>
                      <div class="gallery-zoom-result" id="gallery-zoom-result"></div>
                    </div>
                  `
                  : `<img src="${url}" alt="">`,
              )
              .join("")
          : `<div style="grid-column:span 3;aspect-ratio:16/9;background:var(--muted);border-radius:var(--radius-lg)"></div>`
      }
      ${product.videoUrl ? `<video src="${product.videoUrl}" controls style="grid-column:span 3;border-radius:var(--radius-lg);width:100%"></video>` : ""}
    </div>
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
        <h1 class="heading" style="font-size:1.5rem">${categoryLabelById(product.category, getLocale())}</h1>
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
      <div class="card product-qty-calc" style="margin-top:1rem;padding:1rem">
        <label class="label" for="qty-calc-input">${t("products.calcQuantityLabel")}</label>
        <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;margin-top:0.5rem">
          <input class="input" id="qty-calc-input" type="number" min="${product.minOrderQuantity}" max="${product.quantity}" step="1" value="${product.minOrderQuantity}" style="max-width:8rem">
          <span class="text-muted">${unitLabel}</span>
          <span class="product-qty-calc-total" id="qty-calc-total"></span>
        </div>
        ${
          isOwner
            ? ""
            : `<button type="button" class="btn btn-default" id="order-now-btn" style="margin-top:0.75rem">${icon("message-square")} ${t("products.orderNow")}</button>`
        }
      </div>
      <p style="margin-top:1rem;white-space:pre-line">${product.description}</p>
      <div class="text-muted" style="margin-top:1rem;font-size:0.875rem">${product.ownerName}</div>
      ${
        isOwner
          ? ""
          : `<div class="product-detail-actions" style="margin-top:1.5rem">
              <button type="button" class="btn btn-default" id="negotiate-btn">${icon("message-square")} ${t("featured.negotiateNow")}</button>
              <span id="report-mount"></span>
            </div>`
      }
    </div>
  `;

  document.getElementById("fav-btn-mount").innerHTML = favoriteButtonHTML(product.id, "is-static");
  wireFavoriteButtons(detailEl);

  const qtyInput = document.getElementById("qty-calc-input");
  const qtyTotalEl = document.getElementById("qty-calc-total");
  function updateQtyTotal() {
    const qty = Number(qtyInput.value) || 0;
    qtyTotalEl.textContent = `${t("products.calcTotalLabel")}: ${(qty * product.price).toLocaleString(getLocale())} ${t("products.currency")}`;
  }
  qtyInput.addEventListener("input", updateQtyTotal);
  updateQtyTotal();

  initGalleryZoom();

  if (!isOwner) {
    const negotiateBtn = document.getElementById("negotiate-btn");
    negotiateBtn.addEventListener("click", handleNegotiate);
    document.getElementById("order-now-btn").addEventListener("click", () => handleOrderNow(Number(qtyInput.value)));
    initReportDialog(document.getElementById("report-mount"), product.ownerId, product.ownerName);
  }
}

function initGalleryZoom() {
  const zoomBox = document.getElementById("gallery-zoom-box");
  if (!zoomBox) return;
  const img = document.getElementById("gallery-hero-img");
  const lens = document.getElementById("gallery-zoom-lens");
  const result = document.getElementById("gallery-zoom-result");
  const zoomFactor = 2.5;

  function positionResult() {
    result.style.backgroundImage = `url('${img.src}')`;
    result.style.backgroundSize = `${img.clientWidth * zoomFactor}px ${img.clientHeight * zoomFactor}px`;
    lens.style.width = `${result.offsetWidth / zoomFactor}px`;
    lens.style.height = `${result.offsetHeight / zoomFactor}px`;
  }

  function moveLens(e) {
    const rect = img.getBoundingClientRect();
    let x = e.clientX - rect.left - lens.offsetWidth / 2;
    let y = e.clientY - rect.top - lens.offsetHeight / 2;
    x = Math.max(0, Math.min(x, img.clientWidth - lens.offsetWidth));
    y = Math.max(0, Math.min(y, img.clientHeight - lens.offsetHeight));
    lens.style.left = `${x}px`;
    lens.style.top = `${y}px`;
    result.style.backgroundPosition = `-${x * zoomFactor}px -${y * zoomFactor}px`;
  }

  zoomBox.addEventListener("mouseenter", () => {
    positionResult();
    lens.style.display = "block";
    result.style.display = "block";
  });
  zoomBox.addEventListener("mousemove", moveLens);
  zoomBox.addEventListener("mouseleave", () => {
    lens.style.display = "none";
    result.style.display = "none";
  });
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
      contextLabel: categoryLabelById(product.category, getLocale()),
    });
    location.href = `dashboard-chat.html?id=${chatId}`;
  } finally {
    starting = false;
  }
}

async function handleOrderNow(quantity) {
  if (!authState.user || !authState.profile) {
    location.href = "login.html";
    return;
  }
  if (starting) return;
  starting = true;
  try {
    const qty = quantity || product.minOrderQuantity;
    const chatId = await Chat.findOrCreateChat({
      currentUid: authState.user.uid,
      currentName: authState.profile.fullName,
      currentPhone: authState.profile.phone,
      otherUid: product.ownerId,
      otherName: product.ownerName,
      otherPhone: product.ownerPhone,
      contextType: "product",
      contextId: product.id,
      contextLabel: categoryLabelById(product.category, getLocale()),
    });
    await Chat.sendOfferMessage(chatId, authState.user.uid, {
      quantity: qty,
      unit: product.unit,
      pricePerUnit: product.price,
      totalPrice: qty * product.price,
      buyerAccountType: authState.profile.accountType,
    });
    await Products.incrementProductOffers(product.id).catch(() => {});
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
  renderAdSlot(document.getElementById("ad-product-detail-sidebar"), "product-detail-sidebar", Ads, 160, 600);
  initProductComments(document.getElementById("comments-section"), productId);

  subscribe(render);
  onLocaleChange(render);
  onCategoriesChange(render);
}

main();
