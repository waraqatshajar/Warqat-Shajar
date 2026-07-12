import { initLayout } from "../layout.js";
import { t, getLocale, onLocaleChange } from "../i18n.js";
import { Reviews } from "../firebase.js";
import { governorateLabel, categoryLabelById, onCategoriesChange } from "../constants.js";
import { renderAvatar, renderStars, badgeClass, icon } from "../ui.js";
import { authState, subscribe } from "../state.js";

const viewEl = document.getElementById("profile-view");
let rating = { average: 0, count: 0 };
let ratingLoadedFor = null;

async function render() {
  if (authState.loading) {
    viewEl.innerHTML = "";
    return;
  }
  if (!authState.user) {
    location.replace("login.html");
    return;
  }
  if (!authState.profile) return;

  const profile = authState.profile;
  if (ratingLoadedFor !== profile.uid) {
    ratingLoadedFor = profile.uid;
    rating = await Reviews.getUserRatingSummary(profile.uid).catch(() => ({ average: 0, count: 0 }));
    render();
    return;
  }

  const categories = profile.crops?.length ? profile.crops : profile.sourcingCategories || [];

  viewEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem">
      ${renderAvatar(profile.fullName, profile.photoURL, "avatar-lg")}
      <div>
        <h1 class="heading" style="font-size:1.25rem">${profile.fullName}</h1>
        <span class="${badgeClass("secondary")}">${t(`roles.${profile.accountType}`)}</span>
      </div>
    </div>
    ${
      rating.count > 0
        ? `<div style="margin-top:1rem">
            <div class="label">${t("reviews.reputationTitle")}</div>
            <div style="display:flex;align-items:center;gap:0.5rem">
              <span class="star-rating">${renderStars(Math.round(rating.average))}</span>
              <span class="text-muted">${rating.average.toFixed(1)} (${rating.count})</span>
            </div>
          </div>`
        : ""
    }
    <div style="margin-top:1.5rem;display:flex;flex-direction:column;gap:0.75rem">
      <div>
        <div class="label">${t("auth.register.phoneLabel")}</div>
        <div class="force-ltr" style="text-align:end">${profile.phone}</div>
      </div>
      <div>
        <div class="label">${t("auth.register.governorateLabel")}</div>
        <div>${governorateLabel(profile.governorate, getLocale())}</div>
      </div>
      ${
        categories.length
          ? `<div>
              <div class="label">${t(profile.crops?.length ? "auth.register.cropsLabel" : "auth.register.sourcingLabel")}</div>
              <div style="display:flex;flex-wrap:wrap;gap:0.375rem;margin-top:0.25rem">
                ${categories.map((c) => `<span class="${badgeClass("outline")}">${categoryLabelById(c, getLocale())}</span>`).join("")}
              </div>
            </div>`
          : ""
      }
      <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="align-self:flex-start">
        ${icon("image")} ${getLocale() === "ar" ? "ارفع صورك واحصل على رابط" : "Upload your photos & get a link"}
      </a>
    </div>
  `;
}

async function main() {
  await initLayout();
  await render();
  subscribe(render);
  onLocaleChange(render);
  onCategoriesChange(render);
}

main();
