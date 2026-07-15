import { initLayout } from "../layout.js";
import { guardAdmin } from "../admin-shell.js";
import { t, getLocale, onLocaleChange } from "../i18n.js";
import { PhoneAttempts } from "../firebase.js";
import { badgeClass } from "../ui.js";

let contentEl;
let attempts = [];

const CONTEXT_KEY = {
  chat: "phoneAttempts.contextChat",
  comment: "phoneAttempts.contextComment",
};

function formatDate(ts) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleString(getLocale() === "ar" ? "ar-EG" : "en-US");
}

function render() {
  contentEl.innerHTML = `
    <h1 class="heading" style="font-size:1.5rem">${t("admin.phoneAttempts")}</h1>
    <p class="text-muted" style="font-size:0.85rem;margin-top:0.25rem">${t("phoneAttempts.hint")}</p>
    <div class="card" style="margin-top:1rem;padding:0 1rem">
      ${
        attempts.length === 0
          ? `<p class="empty-state">${t("phoneAttempts.empty")}</p>`
          : attempts
              .map(
                (a) => `
              <div class="list-row" style="align-items:flex-start;flex-direction:column;gap:0.4rem">
                <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
                  <span class="${badgeClass("outline")}">${t(CONTEXT_KEY[a.context] || CONTEXT_KEY.chat)}</span>
                  <span class="text-muted" style="font-size:0.8rem">${formatDate(a.createdAt)}</span>
                </div>
                <div style="font-size:0.85rem">
                  <strong>${t("phoneAttempts.attemptedBy")}:</strong> ${a.name}
                  ${a.targetName ? ` &rarr; <strong>${t("phoneAttempts.target")}:</strong> ${a.targetName}` : ""}
                </div>
                <p style="margin:0;font-size:0.85rem" class="text-muted force-ltr" dir="ltr">${a.snippet}</p>
              </div>
            `,
              )
              .join("")
      }
    </div>
  `;
}

async function reload() {
  try {
    attempts = await PhoneAttempts.listAll();
    render();
  } catch {
    contentEl.innerHTML = `<p class="empty-state">${t("admin.loadError")}</p>`;
  }
}

async function main() {
  await initLayout();
  await guardAdmin("admin-phone-attempts.html");
  contentEl = document.getElementById("admin-content");
  await reload();
  onLocaleChange(render);
}

main();
