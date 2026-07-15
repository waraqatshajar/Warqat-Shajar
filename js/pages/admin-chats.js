// Read-only chat oversight for admins. Every function here only ever reads
// (Chat.listAllChats / Chat.subscribeChatMessages) — never call anything that
// writes to a chat or its messages, so opening a conversation stays
// completely invisible to its participants (no read-receipt system exists
// in this app to begin with, so a plain subscribe is already silent).
import { initLayout } from "../layout.js";
import { guardAdmin } from "../admin-shell.js";
import { t, getLocale, onLocaleChange } from "../i18n.js";
import { Chat } from "../firebase.js";
import { btnClass, badgeClass } from "../ui.js";

let contentEl;
let chats = [];
let activeChat = null;
let messages = [];
let unsubMessages = null;

const STATUS_KEY = {
  pending: "chat.offerStatusPending",
  accepted: "chat.offerStatusAccepted",
  declined: "chat.offerStatusDeclined",
  countered: "chat.offerStatusCountered",
  cancelled: "chat.offerStatusCancelled",
};

function formatDate(ts) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleString(getLocale() === "ar" ? "ar-EG" : "en-US");
}

function renderList() {
  contentEl.innerHTML = `
    <h1 class="heading" style="font-size:1.5rem">${t("chats.title")}</h1>
    <p class="text-muted" style="font-size:0.85rem;margin-top:0.25rem">${t("chats.hint")}</p>
    <div class="card" style="margin-top:1rem;padding:0 1rem">
      ${
        chats.length === 0
          ? `<p class="empty-state">${t("chats.empty")}</p>`
          : chats
              .map((c) => {
                const names = Object.values(c.participantNames || {}).join(" / ");
                return `
                <div class="list-row" data-open-chat="${c.id}" style="cursor:pointer">
                  <div class="list-row-main">
                    <div style="font-weight:600">${names}</div>
                    <div class="text-muted" style="font-size:0.8rem">${c.contextLabel || ""}</div>
                    ${c.lastMessage ? `<p style="margin:0.15rem 0;font-size:0.85rem" class="text-muted">${c.lastMessage}</p>` : ""}
                  </div>
                  <span class="text-muted" style="font-size:0.75rem;white-space:nowrap">${formatDate(c.lastMessageAt)}</span>
                </div>
              `;
              })
              .join("")
      }
    </div>
  `;
  contentEl.querySelectorAll("[data-open-chat]").forEach((row) => {
    row.addEventListener("click", () => openChat(row.dataset.openChat));
  });
}

function renderMessages() {
  const listEl = contentEl.querySelector("#admin-chat-messages");
  if (!listEl) return;
  listEl.innerHTML =
    messages.length === 0
      ? `<p class="empty-state">${t("chat.noMessages")}</p>`
      : messages
          .map((m) => {
            const senderName = activeChat.participantNames?.[m.senderId] || "";
            if (m.type === "text") {
              return `
              <div class="chat-row">
                <div class="text-muted" style="font-size:0.7rem;margin-bottom:0.15rem">${senderName}</div>
                <div class="chat-bubble">${m.text}</div>
              </div>`;
            }
            const o = m.offer;
            return `
            <div class="chat-row">
              <div class="text-muted" style="font-size:0.7rem;margin-bottom:0.15rem">${senderName}</div>
              <div class="card offer-card">
                <span class="${badgeClass(o.status === "accepted" ? "default" : "outline")}" style="align-self:flex-start">${t(STATUS_KEY[o.status] || STATUS_KEY.pending)}</span>
                <dl class="offer-grid">
                  <dt>${t("chat.offerQuantity")}</dt><dd>${o.quantity} ${o.unit}</dd>
                  <dt>${t("chat.offerPrice")}</dt><dd>${o.pricePerUnit}</dd>
                  <dt class="offer-total">${t("chat.offerTotal")}</dt><dd class="offer-total">${o.totalPrice}</dd>
                </dl>
              </div>
            </div>`;
          })
          .join("");
}

function renderViewer() {
  contentEl.innerHTML = `
    <button type="button" class="${btnClass("ghost", "sm")}" id="back-btn">${t("chats.back")}</button>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap">
      <div>
        <h1 class="heading" style="font-size:1.25rem">${Object.values(activeChat.participantNames || {}).join(" / ")}</h1>
        <div class="text-muted" style="font-size:0.85rem">${activeChat.contextLabel || ""}</div>
      </div>
      <span class="${badgeClass("outline")}">${t("chats.viewOnly")}</span>
    </div>
    <div class="chat-shell" style="margin-top:1rem">
      <div class="chat-messages" id="admin-chat-messages"></div>
    </div>
  `;
  contentEl.querySelector("#back-btn").addEventListener("click", closeChat);
  renderMessages();
}

function openChat(chatId) {
  activeChat = chats.find((c) => c.id === chatId);
  if (!activeChat) return;
  renderViewer();
  if (unsubMessages) unsubMessages();
  unsubMessages = Chat.subscribeChatMessages(chatId, (msgs) => {
    messages = msgs;
    renderMessages();
  });
}

function closeChat() {
  if (unsubMessages) unsubMessages();
  unsubMessages = null;
  activeChat = null;
  messages = [];
  renderList();
}

async function reload() {
  try {
    chats = await Chat.listAllChats();
    if (activeChat) {
      renderViewer();
    } else {
      renderList();
    }
  } catch {
    contentEl.innerHTML = `<p class="empty-state">${t("admin.loadError")}</p>`;
  }
}

async function main() {
  await initLayout();
  await guardAdmin("admin-chats.html");
  contentEl = document.getElementById("admin-content");
  await reload();
  onLocaleChange(() => (activeChat ? renderViewer() : renderList()));
}

main();
