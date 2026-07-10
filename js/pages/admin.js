import { initLayout } from "../layout.js";
import { guardAdmin } from "../admin-shell.js";
import { t, onLocaleChange } from "../i18n.js";
import { Admin, OWNER_EMAIL } from "../firebase.js";
import { authState } from "../state.js";
import { badgeClass } from "../ui.js";
import { ACCOUNT_TYPES } from "../constants.js";

let contentEl;

const STAT_COLORS = {
  totalUsers: "#2e7d32",
  activeListings: "#1976d2",
  pendingReports: "#dc2626",
  totalComments: "#d97706",
  activeAds: "#7c3aed",
};

let data = null;

function render() {
  if (!data) return;
  const { analytics, mostActive, farmerRanking } = data;

  contentEl.innerHTML = `
    <h1 class="heading" style="font-size:1.5rem">${t("admin.analytics")}</h1>
    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));margin-top:1rem">
      ${[
        ["totalUsers", analytics.totalUsers, t("admin.totalUsers")],
        ["activeListings", analytics.activeListings, t("admin.totalListings")],
        ["pendingReports", analytics.pendingReports, t("admin.pendingReports")],
        ["totalComments", analytics.totalComments, t("admin.totalComments")],
        ["activeAds", analytics.activeAds, t("admin.activeAds")],
      ]
        .map(
          ([key, value, label]) => `
          <div class="card stat-card" style="border-inline-start:3px solid ${STAT_COLORS[key]}">
            <div class="stat-value">${value}</div>
            <div class="stat-label">${label}</div>
          </div>
        `,
        )
        .join("")}
    </div>

    <h2 class="heading" style="font-size:1.1rem;margin-top:2rem">${t("admin.usersByRole")}</h2>
    <div class="stat-grid" style="margin-top:0.75rem">
      ${ACCOUNT_TYPES.map(
        (role) => `
        <div class="card stat-card">
          <div class="stat-value">${analytics.usersByRole[role] ?? 0}</div>
          <div class="stat-label">${t(`roles.${role}`)}</div>
        </div>
      `,
      ).join("")}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:2rem" class="admin-rankings-grid">
      <div>
        <h2 class="heading" style="font-size:1.1rem">${t("admin.mostActiveUsers")}</h2>
        <div class="card" style="margin-top:0.75rem;padding:0 1rem">
          ${
            mostActive.length === 0
              ? `<p class="empty-state">${t("admin.noData")}</p>`
              : mostActive
                  .map(
                    (u) => `
              <div class="list-row">
                <div class="list-row-main">
                  <div style="font-weight:600">${u.fullName}</div>
                  <div class="text-muted" style="font-size:0.8rem">${t(`roles.${u.accountType}`)}</div>
                </div>
                <span class="${badgeClass("secondary")}">${u.score} ${t("admin.activityScore")}</span>
              </div>
            `,
                  )
                  .join("")
          }
        </div>
      </div>
      <div>
        <h2 class="heading" style="font-size:1.1rem">${t("admin.farmerDealsRanking")}</h2>
        <div class="card" style="margin-top:0.75rem;padding:0 1rem">
          ${
            farmerRanking.length === 0
              ? `<p class="empty-state">${t("admin.noData")}</p>`
              : farmerRanking
                  .map(
                    (f) => `
              <div class="list-row">
                <div class="list-row-main"><div style="font-weight:600">${f.fullName}</div></div>
                <span class="${badgeClass("default")}">${f.dealsCount} ${t("admin.dealsCount")}</span>
              </div>
            `,
                  )
                  .join("")
          }
        </div>
      </div>
    </div>
  `;
}

async function loadData() {
  const [analytics, mostActiveRaw, farmerRankingRaw] = await Promise.all([
    Admin.getPlatformAnalytics(),
    Admin.listMostActiveUsers(10),
    Admin.listFarmerDealsRanking(10),
  ]);

  const filterOwner = (list) =>
    authState.isOwner ? list : list.filter((u) => u.email !== OWNER_EMAIL);

  data = {
    analytics,
    mostActive: filterOwner(mostActiveRaw).filter((u) => u.score > 0),
    farmerRanking: farmerRankingRaw.filter((f) => f.dealsCount > 0),
  };
  render();
}

async function main() {
  await initLayout();
  await guardAdmin("admin.html");
  contentEl = document.getElementById("admin-content");
  await loadData();
  onLocaleChange(render);
}

main();
