// Shared shell behavior: splash screen, header auth-area render, language
// switcher, footer year. Markup itself is repeated per HTML file (see
// partials below used when authoring pages); this module only wires
// behavior against fixed IDs present identically on every page.
import { authState, favoritesState, subscribe } from "./state.js";
import { Auth, SiteSettings } from "./firebase.js";
import { t, getLocale, setLocale, initI18n, onLocaleChange } from "./i18n.js";
import { icon, renderAvatar, wireDropdown, renderIcons } from "./ui.js";

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
    document.querySelectorAll(".logo img, .splash-logo").forEach((img) => {
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
  if (!mount) return;
  SiteSettings.subscribeSocialLinks((data) => {
    const links = data.links || [];
    if (links.length === 0) {
      mount.innerHTML = "";
      return;
    }
    mount.innerHTML = links
      .map(
        (l) =>
          `<a class="footer-social-link" href="${l.url}" target="_blank" rel="noopener noreferrer" aria-label="${l.platform}">${icon(SOCIAL_ICON_KEY[l.platform?.toLowerCase()] || "link")}</a>`,
      )
      .join("");
  });
}

export async function initLayout() {
  await initI18n();
  renderIcons(document);
  initSplashScreen();
  wireLanguageSwitch();
  renderFooterYear();
  wireWishlistLink();
  renderHeaderAuthArea();
  renderWishlistBadge();
  applyLogo();
  applyBrandColor();
  renderFooterSocial();
  subscribe(() => {
    renderHeaderAuthArea();
    renderWishlistBadge();
  });
  onLocaleChange(() => {
    renderHeaderAuthArea();
  });
}
