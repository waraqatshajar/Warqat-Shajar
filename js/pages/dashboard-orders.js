import { initLayout } from "../layout.js";
import { guardDashboard } from "../dashboard-shell.js";
import { t, onLocaleChange } from "../i18n.js";
import { Chat, Products } from "../firebase.js";
import { badgeClass, btnClass, icon } from "../ui.js";
import { initHelpTour } from "../help-tour.js";

const listEl = document.getElementById("orders-list");
let orders = [];
let profileRef = null;
let tourStarted = false;

const STATUS_KEY = {
  pending: "chat.offerStatusPending",
  accepted: "chat.offerStatusAccepted",
  declined: "chat.offerStatusDeclined",
  countered: "chat.offerStatusCountered",
};

function render() {
  if (orders.length === 0) {
    listEl.innerHTML = `<p class="empty-state">${t("orders.empty")}</p>`;
    return;
  }

  let firstPendingFound = false;
  listEl.innerHTML = `<div class="card" style="padding:0 1rem">${orders
    .map((o) => {
      const isFirstPending = o.status === "pending" && !firstPendingFound;
      if (o.status === "pending") firstPendingFound = true;
      return `
      <div class="list-row">
        <div class="list-row-main">
          <div style="display:flex;align-items:center;gap:0.5rem">
            <a href="product.html?id=${o.productId}" style="font-weight:600;color:var(--foreground)">${o.productLabel}</a>
            <span class="${badgeClass(o.status === "accepted" ? "default" : "outline")}">${t(STATUS_KEY[o.status] || STATUS_KEY.pending)}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.5rem;margin-top:0.5rem;font-size:0.875rem" class="text-muted">
            <div>${t("orders.quantity")}: ${o.quantity} ${o.unit}</div>
            <div>${t("orders.buyerType")}: ${o.buyerAccountType ? t(`roles.${o.buyerAccountType}`) : ""}</div>
            <div>${t("orders.contact")}: ${o.buyerName} (<a href="tel:${o.buyerPhone}" class="force-ltr" style="display:inline-block">${o.buyerPhone}</a>)</div>
            ${o.deliveryNotes ? `<div>${t("orders.delivery")}: ${o.deliveryNotes}</div>` : ""}
          </div>
        </div>
        <div class="list-row-actions" ${isFirstPending ? 'data-order-actions="first-pending"' : ""}>
          ${
            o.status === "pending"
              ? `
              <button type="button" class="${btnClass("default", "sm")}" data-accept="${o.chatId}:${o.messageId}:${o.productId}">${icon("check")} ${t("chat.acceptOffer")}</button>
              <button type="button" class="${btnClass("ghost", "sm")}" data-decline="${o.chatId}:${o.messageId}">${icon("x")} ${t("chat.declineOffer")}</button>
            `
              : ""
          }
          <a href="dashboard-chat.html?id=${o.chatId}" class="${btnClass("outline", "sm")}">${t("orders.openChat")}</a>
        </div>
      </div>
    `;
    })
    .join("")}</div>`;

  listEl.querySelectorAll("[data-accept]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const [chatId, messageId, productId] = btn.dataset.accept.split(":");
      await Chat.respondToOffer(chatId, messageId, "accepted");
      await Products.incrementProductDeals(productId).catch(() => {});
      await reload();
    });
  });
  listEl.querySelectorAll("[data-decline]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const [chatId, messageId] = btn.dataset.decline.split(":");
      await Chat.respondToOffer(chatId, messageId, "declined");
      await reload();
    });
  });

  if (!tourStarted && orders.some((o) => o.status === "pending")) {
    tourStarted = true;
    initHelpTour("farmer-orders", [
      { target: "#orders-list", text: t("orders.tourList") },
      { target: '[data-order-actions="first-pending"]', text: t("orders.tourActions") },
    ]);
  }
}

async function reload() {
  orders = await Chat.listIncomingOffers(profileRef.uid).catch(() => []);
  render();
}

async function main() {
  await initLayout();
  profileRef = await guardDashboard("dashboard-orders.html");
  await reload();
  onLocaleChange(render);
}

main();
