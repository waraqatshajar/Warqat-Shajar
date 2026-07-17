// Shared shell behavior: splash screen, header auth-area render, language
// switcher, footer year. Markup itself is repeated per HTML file (see
// partials below used when authoring pages); this module only wires
// behavior against fixed IDs present identically on every page.
import { authState, favoritesState, cartState, notifState, subscribe, isUserThemeDark, setUserThemeDark } from "./state.js";
import { Auth, SiteSettings, Notifications } from "./firebase.js";
import { t, getLocale, setLocale, initI18n, onLocaleChange } from "./i18n.js";
import { icon, renderAvatar, wireDropdown, renderIcons, interpolate, showToast, btnClass } from "./ui.js";

const SOCIAL_ICON_KEY = {
  facebook: "facebook",
  instagram: "instagram",
  x: "x",
  twitter: "x",
  whatsapp: "whatsapp",
  tiktok: "tiktok",
  youtube: "youtube",
};

const SPLASH_KEY = "wsj-splash-shown";
const VISIBLE_MS = 1100;
const FADE_MS = 400;

export function initSplashScreen() {
  const splash = document.getElementById("splash-screen");
  if (!splash) return;
  if (sessionStorage.getItem(SPLASH_KEY)) {
    splash.classList.add("is-hidden");
    return;
  }
  sessionStorage.setItem(SPLASH_KEY, "1");
  splash.classList.remove("is-hidden");
  setTimeout(() => splash.classList.add("is-fading"), VISIBLE_MS);
  setTimeout(() => splash.classList.add("is-hidden"), VISIBLE_MS + FADE_MS);
}

function renderHeaderAuthArea() {
  const area = document.getElementById("header-auth-area");
  if (!area) return;

  if (authState.loading) {
    area.innerHTML = "";
    return;
  }

  if (!authState.user) {
    area.innerHTML = `
      <a class="btn btn-ghost btn-sm header-login-link" href="login.html">${t("header.login", "Login")}</a>
      <a class="btn btn-default btn-sm" href="register.html">${t("header.createAccount", "Create Account")}</a>
    `;
    return;
  }

  const name = authState.profile?.fullName || authState.user.email || "U";
  area.innerHTML = `
    <div class="dropdown">
      <button type="button" id="user-menu-trigger" class="btn btn-ghost btn-icon">${renderAvatar(name, authState.profile?.photoURL)}</button>
      <div class="dropdown-content" id="user-menu-content">
        <a class="dropdown-item" href="dashboard.html">${icon("bar-chart")} ${t("userMenu.dashboard", "Dashboard")}</a>
        <a class="dropdown-item" href="profile.html">${icon("user")} ${t("userMenu.profile", "Profile")}</a>
        ${authState.isAdmin ? `<a class="dropdown-item" href="admin.html">${icon("shield-check")} ${t("userMenu.adminMode", "Admin Mode")}</a>` : ""}
        <div class="dropdown-separator"></div>
        <button type="button" class="dropdown-item dropdown-item-destructive" id="logout-btn">${icon("log-out")} ${t("userMenu.logout", "Log Out")}</button>
      </div>
    </div>
  `;

  const trigger = document.getElementById("user-menu-trigger");
  const content = document.getElementById("user-menu-content");
  if (trigger && content) wireDropdown(trigger, content);

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await Auth.signOutUser();
      location.href = "index.html";
    });
  }
}

function renderWishlistBadge() {
  const badge = document.getElementById("header-wishlist-badge");
  if (!badge) return;
  const count = favoritesState.favoriteIds.size;
  badge.textContent = String(count);
  badge.style.display = count > 0 ? "flex" : "none";
}

function wireWishlistLink() {
  const link = document.getElementById("header-wishlist-link");
  if (!link) return;
  link.addEventListener("click", (e) => {
    if (!authState.user) {
      e.preventDefault();
      location.href = "login.html";
    }
  });
}

function renderCartBadge() {
  const badge = document.getElementById("header-cart-badge");
  if (!badge) return;
  const count = cartState.items.size;
  badge.textContent = String(count);
  badge.style.display = count > 0 ? "flex" : "none";
}

function wireCartLink() {
  const link = document.getElementById("header-cart-link");
  if (!link) return;
  link.addEventListener("click", (e) => {
    if (!authState.user) {
      e.preventDefault();
      location.href = "login.html";
    }
  });
}

let notifSeenIds = null; // null until the first snapshot has been captured

function formatNotifTime(ts) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleString(getLocale() === "ar" ? "ar-EG" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderNotifPanel(panelEl, items) {
  if (!panelEl) return;
  const hasUnread = items.some((n) => !n.read);
  panelEl.innerHTML = `
    <div class="notif-panel">
      <div class="notif-panel-header">
        <strong style="font-size:0.85rem">${t("notifications.title")}</strong>
        ${hasUnread ? `<button type="button" class="${btnClass("ghost", "sm")}" id="notif-mark-all">${t("notifications.markAllRead")}</button>` : ""}
      </div>
      ${
        items.length === 0
          ? `<p class="empty-state" style="font-size:0.8rem">${t("notifications.empty")}</p>`
          : items
              .map(
                (n) => `
            <a href="${n.link || "#"}" class="notif-row ${!n.read ? "is-unread" : ""}" data-notif-id="${n.id}">
              <div class="notif-row-title">${t(`notif.${n.key}.title`)}</div>
              <div class="notif-row-body">${interpolate(t(`notif.${n.key}.body`), n.params)}</div>
              <div class="notif-row-time">${formatNotifTime(n.createdAt)}</div>
            </a>
          `,
              )
              .join("")
      }
    </div>
  `;
  panelEl.querySelectorAll("[data-notif-id]").forEach((row) => {
    row.addEventListener("click", () => Notifications.markRead(row.dataset.notifId));
  });
  panelEl.querySelector("#notif-mark-all")?.addEventListener("click", (e) => {
    e.preventDefault();
    Notifications.markAllRead(items);
  });
}

function renderNotifBell() {
  const mount = document.getElementById("header-notif-area");
  if (!mount) return;

  if (!authState.user) {
    mount.innerHTML = "";
    notifSeenIds = null;
    return;
  }

  const items = notifState.items;

  if (notifSeenIds === null) {
    notifSeenIds = new Set(items.map((n) => n.id));
  } else {
    items.forEach((n) => {
      if (!notifSeenIds.has(n.id)) {
        notifSeenIds.add(n.id);
        showToast({ key: n.key, params: n.params, link: n.link });
      }
    });
  }

  if (!mount.querySelector("#notif-trigger")) {
    mount.innerHTML = `
      <div class="dropdown">
        <button type="button" id="notif-trigger" class="btn btn-ghost btn-icon icon-badge" aria-label="${t("notifications.title")}">
          ${icon("bell")}
          <span class="icon-badge-count" id="notif-badge" style="display:none">0</span>
        </button>
        <div class="dropdown-content" id="notif-content" style="inset-inline-end:0;inset-inline-start:auto"></div>
      </div>
    `;
    wireDropdown(mount.querySelector("#notif-trigger"), mount.querySelector("#notif-content"));
  }

  const unreadCount = items.filter((n) => !n.read).length;
  const badge = mount.querySelector("#notif-badge");
  badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
  badge.style.display = unreadCount > 0 ? "flex" : "none";

  renderNotifPanel(mount.querySelector("#notif-content"), items);
}

function updateThemeToggleIcon() {
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.innerHTML = icon(isUserThemeDark() ? "sun" : "moon");
}

function wireThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  updateThemeToggleIcon();
  btn.addEventListener("click", () => {
    setUserThemeDark(!isUserThemeDark());
    updateThemeToggleIcon();
  });
}

function wireLanguageSwitch() {
  const btn = document.getElementById("lang-switch");
  if (!btn) return;
  btn.textContent = t("language.switchTo", getLocale() === "ar" ? "English" : "العربية");
  btn.addEventListener("click", async () => {
    await setLocale(getLocale() === "ar" ? "en" : "ar");
    btn.textContent = t("language.switchTo");
  });
}

function renderFooterYear() {
  const el = document.getElementById("footer-year");
  if (el) el.textContent = String(new Date().getFullYear());
}

async function applyLogo() {
  const images = await SiteSettings.getSiteImagesOnce().catch(() => ({}));
  if (images.logoUrl) {
    document.querySelectorAll(".logo img, .splash-logo, .about-logo-badge img").forEach((img) => {
      img.src = images.logoUrl;
    });
  }
}

function applyBrandColor() {
  SiteSettings.subscribeSiteTheme((theme) => {
    if (!theme.primaryColor) return;
    document.documentElement.style.setProperty("--primary", theme.primaryColor);
    document.documentElement.style.setProperty("--brand", theme.primaryColor);
    document.documentElement.style.setProperty("--ring", theme.primaryColor);
  });
}

function renderFooterSocial() {
  const mount = document.getElementById("footer-social");
  const phoneMount = document.getElementById("footer-phone");
  const whatsappMount = document.getElementById("footer-whatsapp");
  if (!mount) return;
  SiteSettings.subscribeSocialLinks((data) => {
    const links = data.links || [];
    mount.innerHTML =
      links.length === 0
        ? ""
        : links
            .map(
              (l) =>
                `<a class="footer-social-link" href="${l.url}" target="_blank" rel="noopener noreferrer" aria-label="${l.platform}">${icon(SOCIAL_ICON_KEY[l.platform?.toLowerCase()] || "link")}</a>`,
            )
            .join("");

    if (phoneMount && data.phone) {
      phoneMount.querySelector("span:last-child").textContent = data.phone;
    }
    if (whatsappMount) {
      if (data.whatsapp) {
        whatsappMount.querySelector("span:last-child").textContent = data.whatsapp;
        whatsappMount.style.display = "flex";
      } else {
        whatsappMount.style.display = "none";
      }
    }
  });
}

// Local EG numbers ("0111...") need the country code and no leading zero to
// work as a wa.me deep link; numbers already given in international form are
// left as-is.
function toWhatsappDigits(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return digits;
}

let contactWidgetBuilt = false;
let contactWidgetData = { links: [], phone: null, whatsapp: null, email: null, policyLink: null };

function renderContactWidgetPanel() {
  const panel = document.getElementById("contact-widget-panel");
  if (!panel) return;
  const data = contactWidgetData;
  const waDigits = data.whatsapp ? toWhatsappDigits(data.whatsapp) : null;
  const items = [
    waDigits && { icon: "whatsapp", label: t("contactWidget.whatsapp"), href: `https://wa.me/${waDigits}`, external: true },
    { icon: "message-square", label: t("contactWidget.liveChat"), href: "contact.html" },
    data.phone && { icon: "phone", label: t("contactWidget.call"), href: `tel:${data.phone}` },
    data.email && { icon: "mail", label: t("contactWidget.email"), href: `mailto:${data.email}` },
    { icon: "book-open", label: t("contactWidget.policy"), href: data.policyLink || "terms.html" },
  ].filter(Boolean);

  panel.innerHTML = `
    <div class="contact-widget-header">${t("contactWidget.title")}</div>
    ${items
      .map(
        (it) => `
      <a class="contact-widget-item" href="${it.href}" ${it.external ? 'target="_blank" rel="noopener noreferrer"' : ""}>
        <span class="contact-widget-item-icon">${icon(it.icon)}</span>
        <span>${it.label}</span>
        ${icon("chevron-down", "contact-widget-chevron")}
      </a>
    `,
      )
      .join("")}
  `;
}

function renderContactWidget() {
  if (!contactWidgetBuilt) {
    contactWidgetBuilt = true;
    const wrapper = document.createElement("div");
    wrapper.className = "contact-widget";
    wrapper.innerHTML = `
      <div class="contact-widget-panel" id="contact-widget-panel"></div>
      <button type="button" class="contact-widget-fab" id="contact-widget-trigger" aria-label="${t("contactWidget.title")}">
        <img src="images/logo-icon.png" alt="">
      </button>
    `;
    document.body.appendChild(wrapper);
    wireDropdown(wrapper.querySelector("#contact-widget-trigger"), wrapper.querySelector("#contact-widget-panel"));
    SiteSettings.subscribeSocialLinks((data) => {
      contactWidgetData = data;
      renderContactWidgetPanel();
    });
    return;
  }
  renderContactWidgetPanel();
}

export async function initLayout() {
  await initI18n();
  renderIcons(document);
  initSplashScreen();
  wireThemeToggle();
  wireLanguageSwitch();
  renderFooterYear();
  wireWishlistLink();
  wireCartLink();
  renderHeaderAuthArea();
  renderWishlistBadge();
  renderCartBadge();
  renderNotifBell();
  applyLogo();
  applyBrandColor();
  renderFooterSocial();
  renderContactWidget();
  subscribe(() => {
    renderHeaderAuthArea();
    renderWishlistBadge();
    renderCartBadge();
    renderNotifBell();
  });
  onLocaleChange(() => {
    renderHeaderAuthArea();
    renderNotifBell();
    renderContactWidget();
  });
}
