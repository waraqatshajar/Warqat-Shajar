import { initLayout } from "../layout.js";
import { guardDashboard } from "../dashboard-shell.js";
import { t, getLocale, onLocaleChange } from "../i18n.js";
import { Sourcing, PhoneAttempts } from "../firebase.js";
import { GOVERNORATES, mergeCategories, categoryLabel, onCategoriesChange } from "../constants.js";
import { showMessage, containsPhoneNumber } from "../ui.js";

const categorySelect = document.getElementById("sf-category");
const govGrid = document.getElementById("sf-governorates");
let selectedGovernorates = [];

function renderOptions() {
  const currentCategory = categorySelect.value;
  categorySelect.innerHTML = mergeCategories()
    .map((c) => `<option value="${c.id}">${categoryLabel(c, getLocale())}</option>`)
    .join("");
  if (currentCategory) categorySelect.value = currentCategory;

  govGrid.innerHTML = GOVERNORATES.map(
    (g) => `<label><input type="checkbox" value="${g.id}" ${selectedGovernorates.includes(g.id) ? "checked" : ""}> ${g[getLocale()]}</label>`,
  ).join("");
  govGrid.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) {
        if (!selectedGovernorates.includes(cb.value)) selectedGovernorates.push(cb.value);
      } else {
        selectedGovernorates = selectedGovernorates.filter((id) => id !== cb.value);
      }
    });
  });
}

async function main() {
  await initLayout();
  const profile = await guardDashboard("dashboard-sourcing.html");
  renderOptions();
  onLocaleChange(renderOptions);
  onCategoriesChange(renderOptions);

  const form = document.getElementById("sourcing-form");
  const errorEl = document.getElementById("sf-error");
  const submitBtn = document.getElementById("sf-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showMessage(errorEl, "");

    const category = categorySelect.value;
    const quantity = Number(document.getElementById("sf-quantity").value);
    const priceMinValue = document.getElementById("sf-price-min").value;
    const priceMaxValue = document.getElementById("sf-price-max").value;
    const notes = document.getElementById("sf-notes").value.trim();

    if (!category || !quantity || selectedGovernorates.length === 0) {
      showMessage(errorEl, t("products.required"));
      return;
    }
    if (containsPhoneNumber(notes)) {
      showMessage(errorEl, t("products.phoneNotAllowed"));
      PhoneAttempts.logAttempt({
        uid: profile.uid,
        name: profile.fullName,
        context: "sourcingNotes",
        contextId: null,
        targetName: null,
        snippet: notes,
      }).catch(() => {});
      return;
    }

    submitBtn.disabled = true;
    try {
      await Sourcing.createSourcingRequest({
        ownerId: profile.uid,
        ownerName: profile.fullName,
        ownerPhone: profile.phone,
        category,
        quantity,
        priceMin: priceMinValue ? Number(priceMinValue) : null,
        priceMax: priceMaxValue ? Number(priceMaxValue) : null,
        governorates: selectedGovernorates,
        deliveryNotes: notes,
      });
      location.href = "dashboard-sourcing.html";
    } finally {
      submitBtn.disabled = false;
    }
  });
}

main();
