import { initLayout } from "../layout.js";
import { getLocale, onLocaleChange } from "../i18n.js";
import { SiteSettings } from "../firebase.js";

// Distinct key namespace (aboutXxx) from home.js's FIELD_IDS (heroBadge,
// ctaTitle, ...) — both read/write the same settings/siteContent doc, so
// sharing a key would let editing one page's text silently overwrite the
// other's.
const FIELD_IDS = {
  aboutHeroBadge: "about-hero-badge",
  aboutHeroHeadline: "about-hero-headline",
  aboutHeroSubheadline: "about-hero-subheadline",
  aboutMissionTitle: "about-mission-title",
  aboutMissionBody: "about-mission-body",
  aboutCtaTitle: "about-cta-title",
  aboutCtaSubtitle: "about-cta-subtitle",
};

let siteContent = { ar: {}, en: {} };

function applySiteContent() {
  const overrides = siteContent[getLocale()] || {};
  Object.entries(FIELD_IDS).forEach(([key, id]) => {
    const value = overrides[key];
    if (value) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }
  });
}

async function main() {
  await initLayout();
  siteContent = await SiteSettings.getSiteContentOnce().catch(() => siteContent);
  applySiteContent();
  onLocaleChange(applySiteContent);
}

main();
