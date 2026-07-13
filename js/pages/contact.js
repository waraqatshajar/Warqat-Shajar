import { initLayout } from "../layout.js";
import { t, onLocaleChange } from "../i18n.js";
import { Admin, Chat } from "../firebase.js";
import { authState, subscribe } from "../state.js";
import { btnClass, renderAvatar } from "../ui.js";

const contentEl = document.getElementById("contact-content");
let supportAdmins = [];
let starting = false;

function render() {
  if (authState.loading) {
    contentEl.innerHTML = "";
    return;
  }

  if (!authState.user) {
    contentEl.innerHTML = `
      <p class="empty-state">${t("contact.loginRequired")}</p>
      <a href="login.html" class="${btnClass("default")}" style="align-self:flex-start">${t("header.login")}</a>
    `;
    return;
  }

  if (supportAdmins.length === 0) {
    contentEl.innerHTML = `<p class="empty-state">${t("contact.noneAvailable")}</p>`;
    return;
  }

  contentEl.innerHTML = `
    <div class="card" style="padding:0 1rem">
      ${supportAdmins
        .map(
          (a) => `
        <div class="list-row">
          ${renderAvatar(a.fullName || a.email)}
          <div class="list-row-main">
            <div style="font-weight:600">${a.fullName || a.email}</div>
          </div>
          <button type="button" class="${btnClass("default", "sm")}" data-start-chat="${a.uid}" data-name="${a.fullName || a.email}">${t("contact.startChat")}</button>
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  contentEl.querySelectorAll("[data-start-chat]").forEach((btn) => {
    btn.addEventListener("click", () => startSupportChat(btn.dataset.startChat, btn.dataset.name));
  });
}

async function startSupportChat(adminUid, adminName) {
  if (starting) return;
  starting = true;
  try {
    const chatId = await Chat.findOrCreateChat({
      currentUid: authState.user.uid,
      currentName: authState.profile.fullName,
      currentPhone: authState.profile.phone,
      otherUid: adminUid,
      otherName: adminName,
      otherPhone: null,
      contextType: "support",
      contextId: "support",
      contextLabel: t("contact.chatContextLabel"),
    });
    location.href = `dashboard-chat.html?id=${chatId}`;
  } finally {
    starting = false;
  }
}

async function main() {
  await initLayout();
  supportAdmins = await Admin.listSupportAdmins().catch(() => []);
  render();
  subscribe(render);
  onLocaleChange(render);
}

main();
