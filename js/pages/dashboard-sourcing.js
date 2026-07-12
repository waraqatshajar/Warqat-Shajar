import { initLayout } from "../layout.js";
import { guardDashboard } from "../dashboard-shell.js";
import { t, getLocale, onLocaleChange } from "../i18n.js";
import { Sourcing } from "../firebase.js";
import { governorateLabel, categoryLabelById, onCategoriesChange } from "../constants.js";
import { badgeClass, btnClass, icon } from "../ui.js";

const listEl = document.getElementById("sourcing-list");
let lastRequests = [];

function render(requests) {
  lastRequests = requests;
  if (requests.length === 0) {
    listEl.innerHTML = `<p class="empty-state">${t("sourcing.noRequests")}</p>`;
    return;
  }

  listEl.innerHTML = `<div class="card" style="padding:0 1rem">${requests
    .map(
      (r) => `
      <div class="list-row">
        <div class="list-row-main">
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span style="font-weight:600">${categoryLabelById(r.category, getLocale())}</span>
            <span class="${badgeClass(r.status === "open" ? "default" : "secondary")}">${t(r.status === "open" ? "sourcing.statusOpen" : "sourcing.statusClosed")}</span>
          </div>
          <div class="text-muted" style="font-size:0.875rem">${r.quantity}${r.priceMin ? ` — ${r.priceMin}-${r.priceMax ?? ""}` : ""}</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.375rem;margin-top:0.375rem">
            ${r.governorates.map((g) => `<span class="${badgeClass("outline")}">${governorateLabel(g, getLocale())}</span>`).join("")}
          </div>
        </div>
        <div class="list-row-actions">
          ${r.status === "open" ? `<button type="button" class="${btnClass("outline", "sm")}" data-close="${r.id}">${t("sourcing.close")}</button>` : ""}
          <button type="button" class="${btnClass("destructive", "icon-sm")}" data-delete="${r.id}" aria-label="${t("sourcing.delete")}">${icon("trash")}</button>
        </div>
      </div>
    `,
    )
    .join("")}</div>`;

  listEl.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => Sourcing.closeSourcingRequest(btn.dataset.close));
  });
  listEl.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => Sourcing.deleteSourcingRequest(btn.dataset.delete));
  });
}

async function main() {
  await initLayout();
  const profile = await guardDashboard("dashboard-sourcing.html");
  Sourcing.subscribeMySourcingRequests(profile.uid, render);
  onLocaleChange(() => render(lastRequests));
  onCategoriesChange(() => render(lastRequests));
}

main();
