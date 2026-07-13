import { initLayout } from "../layout.js";
import { guardAdmin } from "../admin-shell.js";
import { t, onLocaleChange } from "../i18n.js";
import { Admin, OWNER_EMAIL } from "../firebase.js";
import { authState } from "../state.js";
import { ACCOUNT_TYPES } from "../constants.js";

let contentEl;

const STAT_COLORS = {
  totalUsers: "#2e7d32",
  activeListings: "#1976d2",
  pendingReports: "#dc2626",
  totalComments: "#d97706",
  activeAds: "#7c3aed",
};

// Categorical palette for the 4 account types — validated with
// scripts/validate_palette.js (dataviz skill) for both light and dark chart
// surfaces: fixed hue order, never reassigned by value.
const ROLE_COLORS = {
  farmer: "var(--chart-role-farmer)",
  trader: "var(--chart-role-trader)",
  factory: "var(--chart-role-factory)",
  consumer: "var(--chart-role-consumer)",
};

let data = null;

function animateCount(el, target) {
  const duration = 900;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Renders a horizontal bar-chart row set. `items`: [{ label, value, sub?, color? }].
// Bars start at 0 width and are animated to their target percentage on the next
// frame so the CSS transition actually plays instead of snapping to place.
function renderBarChart(items, { emptyText } = {}) {
  if (items.length === 0) {
    return `<p class="empty-state">${emptyText || ""}</p>`;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return `
    <div class="chart-bars">
      ${items
        .map(
          (item, i) => `
        <div class="chart-bar-row" style="animation-delay:${i * 60}ms">
          <div class="chart-bar-label">
            <span>${item.label}</span>
            ${item.sub ? `<span class="chart-bar-sublabel">${item.sub}</span>` : ""}
          </div>
          <div class="chart-bar-track" title="${item.value.toLocaleString()}">
            <div class="chart-bar-fill" data-target-pct="${(item.value / max) * 100}" style="--chart-bar-color:${item.color || "var(--primary)"}"></div>
          </div>
          <div class="chart-bar-value">${item.value.toLocaleString()}</div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

function playBarAnimations(root) {
  requestAnimationFrame(() => {
    root.querySelectorAll(".chart-bar-fill").forEach((fill) => {
      fill.style.setProperty("--chart-bar-pct", `${fill.dataset.targetPct}%`);
    });
  });
}

function render() {
  if (!data) return;
  const { analytics, mostActive, farmerRanking } = data;

  const roleItems = ACCOUNT_TYPES.map((role) => ({
    label: t(`roles.${role}`),
    value: analytics.usersByRole[role] ?? 0,
    color: ROLE_COLORS[role],
  }));
  const activeItems = mostActive.map((u) => ({
    label: u.fullName,
    sub: t(`roles.${u.accountType}`),
    value: u.score,
  }));
  const dealsItems = farmerRanking.map((f) => ({
    label: f.fullName,
    value: f.dealsCount,
  }));

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
          ([key, value, label], i) => `
          <div class="card stat-card" style="border-inline-start:3px solid ${STAT_COLORS[key]};animation-delay:${i * 70}ms">
            <div class="stat-value" data-count="${value}">0</div>
            <div class="stat-label">${label}</div>
          </div>
        `,
        )
        .join("")}
    </div>

    <h2 class="heading" style="font-size:1.1rem;margin-top:2rem">${t("admin.usersByRole")}</h2>
    <div class="card" style="margin-top:0.75rem;padding:1.25rem 1rem">
      ${renderBarChart(roleItems)}
    </div>

    <div class="grid-2 admin-rankings-grid" style="gap:1.5rem;margin-top:2rem">
      <div>
        <h2 class="heading" style="font-size:1.1rem">${t("admin.mostActiveUsers")}</h2>
        <div class="card" style="margin-top:0.75rem;padding:1.25rem 1rem">
          ${renderBarChart(activeItems, { emptyText: t("admin.noData") })}
        </div>
      </div>
      <div>
        <h2 class="heading" style="font-size:1.1rem">${t("admin.farmerDealsRanking")}</h2>
        <div class="card" style="margin-top:0.75rem;padding:1.25rem 1rem">
          ${renderBarChart(dealsItems, { emptyText: t("admin.noData") })}
        </div>
      </div>
    </div>
  `;

  contentEl.querySelectorAll("[data-count]").forEach((el) => {
    animateCount(el, Number(el.dataset.count));
  });
  playBarAnimations(contentEl);
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
