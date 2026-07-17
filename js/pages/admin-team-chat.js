import { initLayout } from "../layout.js";
import { guardAdmin } from "../admin-shell.js";
import { t, getLocale, onLocaleChange } from "../i18n.js";
import { AdminChat } from "../firebase.js";
import { authState } from "../state.js";
import { btnClass, showMessage } from "../ui.js";

let contentEl;
let messages = [];

function formatTime(ts) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleTimeString(getLocale() === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" });
}

function render() {
  contentEl.innerHTML = `
    <h1 class="heading" style="font-size:1.5rem">${t("admin.teamChat")}</h1>
    <p class="text-muted" style="font-size:0.85rem;margin-top:0.25rem">${t("teamChat.hint")}</p>
    <div class="chat-shell" style="margin-top:1rem">
      <div class="chat-messages" id="team-chat-messages"></div>
      <p id="team-chat-error" class="error-text" style="display:none;padding:0 0.75rem"></p>
      <div class="chat-composer">
        <input class="input" id="team-chat-input" placeholder="${t("chat.typeMessage")}">
        <button type="button" class="btn btn-default" id="team-chat-send">${t("chat.send")}</button>
      </div>
    </div>
  `;
  renderMessages();

  const input = contentEl.querySelector("#team-chat-input");
  const sendBtn = contentEl.querySelector("#team-chat-send");
  const errorEl = contentEl.querySelector("#team-chat-error");

  async function sendText() {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    try {
      await AdminChat.sendMessage({ senderId: authState.user.uid, senderName: authState.profile.fullName, text });
    } catch {
      showMessage(errorEl, t("teamChat.sendFailed"));
    }
  }
  sendBtn.addEventListener("click", sendText);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendText();
  });
}

function renderMessages() {
  const listEl = document.getElementById("team-chat-messages");
  if (!listEl) return;
  listEl.innerHTML =
    messages.length === 0
      ? `<p class="empty-state">${t("chat.noMessages")}</p>`
      : messages
          .map((m) => {
            const isMine = m.senderId === authState.user?.uid;
            const body = m.fileUrl
              ? `<a href="${m.fileUrl}" target="_blank" rel="noopener noreferrer"><img src="${m.fileUrl}" alt="${m.fileName || ""}" style="max-width:12rem;max-height:12rem;border-radius:var(--radius-lg);display:block"></a>`
              : m.text;
            return `
            <div class="chat-row ${isMine ? "is-mine" : ""}">
              <div>
                <div class="text-muted" style="font-size:0.7rem;margin-bottom:0.15rem">${m.senderName} · ${formatTime(m.createdAt)}</div>
                <div class="chat-bubble">${body}</div>
              </div>
            </div>`;
          })
          .join("");
  listEl.scrollTop = listEl.scrollHeight;
}

async function main() {
  await initLayout();
  await guardAdmin("admin-team-chat.html");
  contentEl = document.getElementById("admin-content");
  render();
  AdminChat.subscribeMessages((msgs) => {
    messages = msgs;
    renderMessages();
  });
  onLocaleChange(render);
}

main();
