import { initLayout } from "../layout.js";
import { guardAdmin } from "../admin-shell.js";
import { t, getLocale, onLocaleChange } from "../i18n.js";
import { Admin } from "../firebase.js";
import { btnClass, icon, renderAvatar } from "../ui.js";

let contentEl;
let comments = [];

function render() {
  contentEl.innerHTML = `
    <h1 class="heading" style="font-size:1.5rem">${t("admin.comments")}</h1>
    <div class="card" style="margin-top:1rem;padding:0 1rem">
      ${
        comments.length === 0
          ? `<p class="empty-state">${t("comments.noComments")}</p>`
          : comments
              .map((c) => {
                const date = c.createdAt?.toDate
                  ? c.createdAt.toDate().toLocaleDateString(getLocale() === "ar" ? "ar-EG" : "en-US")
                  : "";
                return `
                <div class="list-row">
                  ${renderAvatar(c.authorName, c.authorPhotoURL)}
                  <div class="list-row-main">
                    <div style="font-weight:600">${c.authorName}</div>
                    <p style="margin:0.15rem 0">${c.text}</p>
                    <div class="text-muted" style="font-size:0.75rem">${date}</div>
                  </div>
                  <a href="product.html?id=${c.productId}" class="${btnClass("outline", "sm")}">${t("admin.viewProduct")}</a>
                  <button type="button" class="${btnClass("destructive", "icon-sm")}" data-remove="${c.id}" aria-label="${t("comments.delete")}">${icon("trash")}</button>
                </div>
              `;
              })
              .join("")
      }
    </div>
  `;

  contentEl.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await Admin.removeProductCommentAdmin(btn.dataset.remove);
      await reload();
    });
  });
}

async function reload() {
  comments = await Admin.listAllProductComments();
  render();
}

async function main() {
  await initLayout();
  await guardAdmin("admin-comments.html");
  contentEl = document.getElementById("admin-content");
  await reload();
  onLocaleChange(render);
}

main();
