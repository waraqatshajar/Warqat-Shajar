import { initLayout } from "../layout.js";
import { guardDashboard } from "../dashboard-shell.js";
import { t, onLocaleChange } from "../i18n.js";
import { Chat } from "../firebase.js";

const listEl = document.getElementById("chats-list");
let profileRef = null;
let lastChats = [];

function render(chats) {
  lastChats = chats;
  if (chats.length === 0) {
    listEl.innerHTML = `<p class="empty-state">${t("chat.noChats")}</p>`;
    return;
  }
  listEl.innerHTML = `<div class="card" style="padding:0 1rem">${chats
    .map((c) => {
      const otherUid = c.participantIds.find((id) => id !== profileRef.uid);
      const otherName = c.participantNames[otherUid] || "";
      return `
      <a href="dashboard-chat.html?id=${c.id}" class="list-row" style="text-decoration:none;color:inherit">
        <div class="list-row-main">
          <div style="font-weight:600">${otherName}</div>
          <div class="text-muted" style="font-size:0.875rem">${c.contextLabel} — ${c.lastMessage || ""}</div>
        </div>
      </a>
    `;
    })
    .join("")}</div>`;
}

async function main() {
  await initLayout();
  profileRef = await guardDashboard("dashboard-messages.html");
  Chat.subscribeMyChats(profileRef.uid, render);
  onLocaleChange(() => render(lastChats));
}

main();
