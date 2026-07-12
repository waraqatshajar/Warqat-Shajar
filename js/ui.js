// Small hand-written replacement for the shadcn/base-ui component library —
// only what's actually used: button/badge class helpers (replaces CVA),
// Dialog/Dropdown open-close behavior, avatar-initial fallback, star-rating
// render helper.
import { authState, favoritesState, toggleFavorite } from "./state.js";
import { t, getLocale } from "./i18n.js";
import { Reports, Comments, SiteSettings, Storage } from "./firebase.js";

export function btnClass(variant = "default", size = "default", extra = "") {
  const variantClass = {
    default: "btn-default",
    outline: "btn-outline",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    destructive: "btn-destructive",
    link: "btn-link",
  }[variant] || "btn-default";

  const sizeClass = {
    default: "",
    sm: "btn-sm",
    lg: "btn-lg",
    icon: "btn-icon",
    "icon-sm": "btn-icon-sm",
  }[size] || "";

  return ["btn", variantClass, sizeClass, extra].filter(Boolean).join(" ");
}

export function badgeClass(variant = "default", extra = "") {
  const variantClass = {
    default: "",
    secondary: "badge-secondary",
    outline: "badge-outline",
    destructive: "badge-destructive",
  }[variant] || "";
  return ["badge", variantClass, extra].filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Phone-number detection — all direct contact is meant to stay in-app chat,
// so free-text fields (chat messages, comments) reject anything that looks
// like a phone number, including one typed with spaces/dashes/Arabic digits.
// ---------------------------------------------------------------------------
export function containsPhoneNumber(text) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const normalized = text.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
  const stripped = normalized.replace(/[\s\-.()]/g, "");
  return /\d{10,}/.test(stripped);
}

export function initials(name) {
  if (!name) return "U";
  return name.trim().charAt(0).toUpperCase();
}

export function renderAvatar(name, photoURL, sizeClass = "") {
  if (photoURL) {
    return `<span class="avatar ${sizeClass}"><img src="${photoURL}" alt="${name || ""}"></span>`;
  }
  return `<span class="avatar ${sizeClass}">${initials(name)}</span>`;
}

// ---------------------------------------------------------------------------
// Icons — inline SVGs ported from lucide-react (MIT), only the ~25 used here.
// ---------------------------------------------------------------------------
const ICON_PATHS = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  "log-out": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
  "map-pin": '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22V15"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  "shield-check": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  "bar-chart": '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  "message-square": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  headset: '<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><path d="M21 14a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h3z"/><path d="M3 14a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2H3z"/><path d="M21 19a4 4 0 0 1-4 4h-2"/>',
  "trending-up": '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  "message-circle": '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  "alert-triangle": '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  sparkles: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
  video: '<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>',
  whatsapp: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  tiktok: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>',
  youtube: '<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/>',
};

export function icon(name, extraClass = "") {
  const path = ICON_PATHS[name];
  if (!path) return "";
  return `<svg class="${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

// Replaces every <span data-icon="name"></span> found under root with its
// inline SVG — lets HTML files reference icons declaratively without a
// template engine.
export function renderIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.getAttribute("data-icon"));
  });
}

const STAR_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>';

export function renderStars(rating, max = 5) {
  let html = "";
  for (let i = 1; i <= max; i++) {
    html += `<span class="${i <= rating ? "is-filled" : ""}">${STAR_SVG}</span>`;
  }
  return html;
}

export function renderStarButtons(value, max = 5) {
  let html = "";
  for (let i = 1; i <= max; i++) {
    html += `<button type="button" data-star="${i}">${STAR_SVG.replace("<svg ", `<svg class="${i <= value ? "is-filled" : ""}" `)}</button>`;
  }
  return html;
}

// ---------------------------------------------------------------------------
// Dialog (hand-rolled fixed-overlay, no headless UI library)
// ---------------------------------------------------------------------------
export function openDialog(dialogEl) {
  const overlay = dialogEl.parentElement.querySelector(".dialog-overlay") || document.querySelector(`[data-dialog-overlay-for="${dialogEl.id}"]`);
  if (overlay) overlay.classList.add("is-open");
  dialogEl.classList.add("is-open");
}

export function closeDialog(dialogEl) {
  const overlay = dialogEl.parentElement.querySelector(".dialog-overlay") || document.querySelector(`[data-dialog-overlay-for="${dialogEl.id}"]`);
  if (overlay) overlay.classList.remove("is-open");
  dialogEl.classList.remove("is-open");
}

export function wireDialog(triggerEl, dialogId, onOpen) {
  const dialogEl = document.getElementById(dialogId);
  if (!dialogEl) return;
  const overlay = document.getElementById(dialogId + "-overlay");

  triggerEl.addEventListener("click", () => {
    openDialog(dialogEl);
    if (overlay) overlay.classList.add("is-open");
    if (onOpen) onOpen();
  });

  dialogEl.querySelectorAll("[data-dialog-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeDialog(dialogEl);
      if (overlay) overlay.classList.remove("is-open");
    });
  });

  if (overlay) {
    overlay.addEventListener("click", () => {
      closeDialog(dialogEl);
      overlay.classList.remove("is-open");
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dialogEl.classList.contains("is-open")) {
      closeDialog(dialogEl);
      if (overlay) overlay.classList.remove("is-open");
    }
  });
}

// ---------------------------------------------------------------------------
// Dropdown menu
// ---------------------------------------------------------------------------
export function wireDropdown(triggerEl, contentEl) {
  function close() {
    contentEl.classList.remove("is-open");
    document.removeEventListener("click", onDocClick);
  }
  function onDocClick(e) {
    if (!contentEl.contains(e.target) && e.target !== triggerEl && !triggerEl.contains(e.target)) {
      close();
    }
  }
  triggerEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = contentEl.classList.toggle("is-open");
    if (isOpen) {
      document.addEventListener("click", onDocClick);
    }
  });
  return { close };
}

// ---------------------------------------------------------------------------
// Favorite button — used on every product card + detail page
// ---------------------------------------------------------------------------
export function favoriteButtonHTML(productId, extraClass = "") {
  const isActive = favoritesState.favoriteIds.has(productId);
  return `<button type="button" class="favorite-btn ${isActive ? "is-active" : ""} ${extraClass}" data-favorite-btn data-product-id="${productId}">${icon("heart")}</button>`;
}

export function wireFavoriteButtons(root = document) {
  root.querySelectorAll("[data-favorite-btn]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!authState.user) {
        location.href = "login.html";
        return;
      }
      await toggleFavorite(btn.dataset.productId);
      btn.classList.toggle("is-active", favoritesState.favoriteIds.has(btn.dataset.productId));
    });
  });
}

// ---------------------------------------------------------------------------
// Ad slot — fetches active ads for a placement, falls back to placeholder
// ---------------------------------------------------------------------------
export async function renderAdSlot(containerEl, placement, AdsApi, width = 500, height = 72) {
  const placements = await SiteSettings.getAdPlacementsOnce().catch(() => ({}));
  if (placements[placement] === false) {
    containerEl.innerHTML = "";
    containerEl.style.display = "none";
    return;
  }
  containerEl.style.display = "";

  const ads = await AdsApi.listActiveAdsByPlacement(placement).catch(() => []);
  const ad = ads[0] ?? null;
  containerEl.style.maxWidth = width + "px";
  containerEl.style.minHeight = height + "px";
  if (ad) {
    containerEl.innerHTML = `<a class="ad-slot" href="${ad.linkUrl}" target="_blank" rel="noopener noreferrer sponsored"><img src="${ad.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover"></a>`;
  } else {
    containerEl.innerHTML = `<div class="ad-slot ad-slot-placeholder" style="min-height:${height}px" data-ad-slot>${t("ad.label", "Advertisement")} · ${width}&times;${height}</div>`;
  }
}

// ---------------------------------------------------------------------------
// Image input — paste a URL, or upload a file from device (Firebase Storage)
// ---------------------------------------------------------------------------
export function renderImageInput(mountEl, { value = "", uploadPathPrefix, accept = "image/*", onChange }) {
  mountEl.innerHTML = `
    <div class="image-input">
      <input class="input force-ltr image-input-url" dir="ltr" placeholder="https://..." value="${value}">
      <label class="btn btn-outline btn-sm image-input-upload-btn">
        ${icon("image")} <span>${t("branding.uploadFile", "Upload from device")}</span>
        <input type="file" accept="${accept}" class="image-input-file" style="display:none">
      </label>
      <span class="image-input-status text-muted" style="display:none"></span>
    </div>
  `;

  const urlInput = mountEl.querySelector(".image-input-url");
  const fileInput = mountEl.querySelector(".image-input-file");
  const statusEl = mountEl.querySelector(".image-input-status");

  urlInput.addEventListener("input", () => onChange?.(urlInput.value.trim()));

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    statusEl.style.display = "inline";
    statusEl.textContent = t("branding.uploading", "Uploading...");
    try {
      const path = `${uploadPathPrefix}${Date.now()}-${file.name}`;
      const url = await Storage.uploadFile(path, file);
      urlInput.value = url;
      onChange?.(url);
      statusEl.textContent = "";
      statusEl.style.display = "none";
    } catch (err) {
      statusEl.textContent = err.message;
    }
    fileInput.value = "";
  });

  return {
    getValue: () => urlInput.value.trim(),
    setValue: (v) => {
      urlInput.value = v;
    },
  };
}

// ---------------------------------------------------------------------------
// Product card — shared by home/products/favorites pages
// ---------------------------------------------------------------------------
export function productCardHTML(product, categoryLabel, governorateLabel, perKgLabel) {
  const photo = product.photoUrls?.[0];
  return `
    <a class="card card-flush product-card" href="product.html?id=${product.id}">
      <div class="product-card-media">
        ${photo ? `<img src="${photo}" alt="${categoryLabel}" loading="lazy">` : ""}
        ${favoriteButtonHTML(product.id)}
      </div>
      <div class="product-card-body">
        <div class="product-card-top">
          <h3 class="product-card-title">${categoryLabel}</h3>
          <span class="product-card-rating">${icon("star", "is-filled")} ${product.qualityRating}</span>
        </div>
        <p class="product-card-gov">${governorateLabel}</p>
        <p class="product-card-price">${product.price} ${perKgLabel}</p>
      </div>
    </a>
  `;
}

// ---------------------------------------------------------------------------
// Report-user dialog — flag icon button, used on product detail + chat pages
// ---------------------------------------------------------------------------
const REPORT_REASONS = ["quality", "payment", "abuse", "other"];

export function initReportDialog(mountEl, reportedUid, reportedName) {
  const dialogId = "report-dialog-" + reportedUid;
  mountEl.innerHTML = `
    <button type="button" class="${btnClass("ghost", "icon")}" id="${dialogId}-trigger">${icon("flag")}</button>
    <div class="dialog-overlay" id="${dialogId}-overlay"></div>
    <div class="dialog-content" id="${dialogId}">
      <div class="dialog-header">
        <h3 class="dialog-title">${t("report.title")}</h3>
      </div>
      <div id="${dialogId}-body">
        <div class="field">
          <label class="label">${t("report.reasonLabel")}</label>
          <div style="display:flex;flex-direction:column;gap:0.5rem">
            ${REPORT_REASONS.map(
              (r) => `<label class="checkbox-row"><input type="radio" name="${dialogId}-reason" value="${r}" ${r === "quality" ? "checked" : ""}> ${t(`report.reason${r[0].toUpperCase()}${r.slice(1)}`)}</label>`,
            ).join("")}
          </div>
          <textarea class="textarea" id="${dialogId}-details" data-i18n-placeholder="report.detailsLabel" placeholder="${t("report.detailsLabel")}" rows="3"></textarea>
        </div>
      </div>
      <div class="dialog-footer">
        <button type="button" class="${btnClass("default")}" id="${dialogId}-submit">${t("report.submit")}</button>
      </div>
      <button type="button" class="dialog-close btn ${btnClass("ghost", "icon-sm")}" data-dialog-close>${icon("x")}</button>
    </div>
  `;

  const trigger = mountEl.querySelector(`#${dialogId}-trigger`);
  const dialogEl = mountEl.querySelector(`#${dialogId}`);
  const overlay = mountEl.querySelector(`#${dialogId}-overlay`);
  const body = mountEl.querySelector(`#${dialogId}-body`);
  const footer = mountEl.querySelector(".dialog-footer");
  const submitBtn = mountEl.querySelector(`#${dialogId}-submit`);

  function open() {
    dialogEl.classList.add("is-open");
    overlay.classList.add("is-open");
  }
  function close() {
    dialogEl.classList.remove("is-open");
    overlay.classList.remove("is-open");
  }
  trigger.addEventListener("click", open);
  overlay.addEventListener("click", close);
  dialogEl.querySelectorAll("[data-dialog-close]").forEach((btn) => btn.addEventListener("click", close));

  submitBtn.addEventListener("click", async () => {
    if (!authState.user || !authState.profile) return;
    const reason = mountEl.querySelector(`input[name="${dialogId}-reason"]:checked`)?.value || "quality";
    const details = mountEl.querySelector(`#${dialogId}-details`).value;
    submitBtn.disabled = true;
    try {
      await Reports.createReport({
        reporterUid: authState.user.uid,
        reporterName: authState.profile.fullName,
        reportedUid,
        reportedName,
        reason,
        details,
      });
      body.innerHTML = `<p>${t("report.submitted")}</p>`;
      footer.style.display = "none";
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------------
// Product comments section
// ---------------------------------------------------------------------------
export function initProductComments(containerEl, productId) {
  containerEl.innerHTML = `
    <h2 class="card-title">${t("comments.title")}</h2>
    <div id="comments-form-area"></div>
    <div id="comments-list" style="margin-top:1.5rem"></div>
  `;
  const formArea = containerEl.querySelector("#comments-form-area");
  const listEl = containerEl.querySelector("#comments-list");

  function renderForm() {
    if (authState.user) {
      formArea.innerHTML = `
        <form id="comment-form" style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">
          <textarea class="textarea" id="comment-text" data-i18n-placeholder="comments.placeholder" placeholder="${t("comments.placeholder")}" rows="2"></textarea>
          <p id="comment-error" class="error-text" style="display:none"></p>
          <button type="submit" class="${btnClass("default", "sm")}" style="align-self:flex-start">${t("comments.submit")}</button>
        </form>
      `;
      formArea.querySelector("#comment-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const textEl = formArea.querySelector("#comment-text");
        const errorEl = formArea.querySelector("#comment-error");
        const text = textEl.value.trim();
        if (!text || !authState.profile) return;
        if (containsPhoneNumber(text)) {
          showMessage(errorEl, t("comments.phoneNotAllowed"));
          return;
        }
        showMessage(errorEl, "");
        await Comments.addProductComment({
          productId,
          uid: authState.user.uid,
          authorName: authState.profile.fullName,
          authorPhotoURL: authState.profile.photoURL ?? null,
          text,
        });
        textEl.value = "";
      });
    } else {
      formArea.innerHTML = `<a href="login.html" style="color:var(--primary);text-decoration:underline;font-size:0.875rem;display:inline-block;margin-top:1rem">${t("comments.loginToComment")}</a>`;
    }
  }

  renderForm();

  Comments.subscribeProductComments(productId, (comments) => {
    if (comments.length === 0) {
      listEl.innerHTML = `<p class="empty-state">${t("comments.noComments")}</p>`;
      return;
    }
    listEl.innerHTML = comments
      .map((c) => {
        const canDelete = c.uid === authState.user?.uid || authState.isAdmin;
        const date = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString(getLocale() === "ar" ? "ar-EG" : "en-US") : "";
        return `
        <div class="comment-row">
          ${renderAvatar(c.authorName, c.authorPhotoURL)}
          <div class="comment-body">
            <div class="comment-meta">
              <span class="comment-author">${c.authorName}</span>
              ${canDelete ? `<button type="button" class="btn btn-ghost btn-icon-sm" data-delete-comment="${c.id}" aria-label="${t("comments.delete")}">${icon("trash")}</button>` : ""}
            </div>
            <p class="comment-text">${c.text}</p>
            ${date ? `<span class="comment-date">${date}</span>` : ""}
          </div>
        </div>`;
      })
      .join("");
    listEl.querySelectorAll("[data-delete-comment]").forEach((btn) => {
      btn.addEventListener("click", () => Comments.deleteProductComment(btn.dataset.deleteComment));
    });
  });
}

// ---------------------------------------------------------------------------
// Toast / inline messages — just colored text, no library
// ---------------------------------------------------------------------------
export function showMessage(el, text, kind = "error") {
  el.textContent = text;
  el.className = kind === "error" ? "error-text" : "success-text";
  el.style.display = text ? "block" : "none";
}
