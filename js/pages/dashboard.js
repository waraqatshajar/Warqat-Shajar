import { initLayout } from "../layout.js";
import { guardDashboard } from "../dashboard-shell.js";
import { t, getLocale, onLocaleChange } from "../i18n.js";
import { Products, Sourcing, Chat } from "../firebase.js";
import { governorateLabel, categoryLabelById, onCategoriesChange } from "../constants.js";
import { badgeClass, btnClass, icon } from "../ui.js";
import { initHelpTour } from "../help-tour.js";

const welcomeEl = document.getElementById("welcome-heading");
const contentEl = document.getElementById("overview-content");

let myProducts = [];
let currentProfile = null;
let fulfilling = false;

function renderOverview(profile) {
  welcomeEl.textContent = `${t("dashboardOverview.welcome")}, ${profile.fullName}`;

  if (profile.accountType !== "farmer") {
    contentEl.innerHTML = "";
    return;
  }

  const totalViews = myProducts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const totalOffers = myProducts.reduce((sum, p) => sum + (p.offersCount || 0), 0);
  const activeCount = myProducts.filter((p) => p.status === "active").length;

  contentEl.innerHTML = `
    <div class="stat-grid" id="stat-grid" style="margin-top:1.5rem">
      <div class="card stat-card">
        <div class="stat-value">${totalViews}</div>
        <div class="stat-label">${t("dashboardOverview.totalViews")}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">${totalOffers}</div>
        <div class="stat-label">${t("dashboardOverview.totalOffers")}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">${activeCount}</div>
        <div class="stat-label">${t("dashboardOverview.totalProducts")}</div>
      </div>
    </div>
    <div id="matching-sourcing" style="margin-top:2rem">
      <h2 class="heading" style="font-size:1.1rem">${t("dashboardOverview.matchingSourcing")}</h2>
      <div id="matching-sourcing-list" class="card" style="margin-top:0.75rem;padding:0.5rem 1rem"></div>
    </div>
  `;

  loadMatches(profile);
}

async function loadMatches(profile) {
  const listEl = document.getElementById("matching-sourcing-list");
  if (!listEl) return;
  const requests = await Sourcing.listMatchingSourcingRequests(profile.crops || [], profile.governorate).catch(() => []);
  if (requests.length === 0) {
    listEl.innerHTML = `<p class="empty-state">${t("sourcing.noRequests")}</p>`;
    return;
  }
  listEl.innerHTML = requests
    .map(
      (r) => `
      <div class="list-row">
        <div class="list-row-main">
          <div style="font-weight:600">${categoryLabelById(r.category, getLocale())}</div>
          <div class="text-muted" style="font-size:0.875rem">${r.quantity} — ${t("sourcing.postedBy")}: ${r.ownerName}</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.375rem;margin-top:0.375rem">
            ${r.governorates.map((g) => `<span class="${badgeClass("outline")}">${governorateLabel(g, getLocale())}</span>`).join("")}
          </div>
        </div>
        <div class="list-row-actions">
          <button type="button" class="${btnClass("default", "sm")}" data-fulfill="${r.id}">${icon("message-square")} ${t("sourcing.respond")}</button>
        </div>
      </div>
    `,
    )
    .join("");

  listEl.querySelectorAll("[data-fulfill]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const request = requests.find((r) => r.id === btn.dataset.fulfill);
      if (request) handleFulfillRequest(request);
    });
  });
}

async function handleFulfillRequest(request) {
  if (fulfilling || !currentProfile) return;
  fulfilling = true;
  try {
    const chatId = await Chat.findOrCreateChat({
      currentUid: currentProfile.uid,
      currentName: currentProfile.fullName,
      currentPhone: currentProfile.phone,
      otherUid: request.ownerId,
      otherName: request.ownerName,
      otherPhone: request.ownerPhone,
      contextType: "sourcing",
      contextId: request.id,
      contextLabel: categoryLabelById(request.category, getLocale()),
    });
    location.href = `dashboard-chat.html?id=${chatId}`;
  } finally {
    fulfilling = false;
  }
}

async function main() {
  await initLayout();
  const profile = await guardDashboard("dashboard.html");
  currentProfile = profile;

  if (profile.accountType === "farmer") {
    Products.subscribeMyProducts(profile.uid, (products) => {
      myProducts = products;
      renderOverview(profile);
    });
    initHelpTour("farmer-overview", [
      { target: "#stat-grid", text: t("dashboardOverview.tourStats") },
      { target: "#matching-sourcing", text: t("dashboardOverview.tourMatches") },
    ]);
  } else {
    renderOverview(profile);
  }

  onLocaleChange(() => renderOverview(profile));
  onCategoriesChange(() => renderOverview(profile));
}

main();
