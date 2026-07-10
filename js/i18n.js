// Loads i18n/{ar,en}.json, applies to [data-i18n="dot.path"] elements, sets
// <html lang>/dir, persists the chosen locale in localStorage, swaps the
// active font (Cairo for ar, Inter for en) — the vanilla replacement for
// next-intl's URL-prefixed routing.
const LOCALE_KEY = "wsj-locale";
const DEFAULT_LOCALE = "ar";

let dictionary = {};
let currentLocale = DEFAULT_LOCALE;
const listeners = new Set();

function lookup(key) {
  return key.split(".").reduce((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), dictionary);
}

export function t(key, fallback = "") {
  const value = lookup(key);
  return typeof value === "string" ? value : fallback || key;
}

export function tRaw(key) {
  return lookup(key);
}

export function getLocale() {
  return currentLocale;
}

export function onLocaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = t(el.getAttribute("data-i18n"));
    if (value) el.textContent = value;
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const value = t(el.getAttribute("data-i18n-placeholder"));
    if (value) el.setAttribute("placeholder", value);
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const value = t(el.getAttribute("data-i18n-title"));
    if (value) el.setAttribute("title", value);
  });
}

function applyDocumentAttrs() {
  const dir = currentLocale === "ar" ? "rtl" : "ltr";
  document.documentElement.setAttribute("lang", currentLocale);
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.style.setProperty(
    "--font-sans",
    currentLocale === "ar" ? "var(--font-cairo)" : "var(--font-inter)",
  );
}

async function loadDictionary(locale) {
  const res = await fetch(`i18n/${locale}.json`);
  return res.json();
}

export async function setLocale(locale) {
  currentLocale = locale === "en" ? "en" : "ar";
  localStorage.setItem(LOCALE_KEY, currentLocale);
  dictionary = await loadDictionary(currentLocale);
  applyDocumentAttrs();
  applyTranslations(document);
  listeners.forEach((fn) => fn(currentLocale));
}

export async function initI18n() {
  const stored = localStorage.getItem(LOCALE_KEY);
  await setLocale(stored === "en" ? "en" : DEFAULT_LOCALE);
}

export function refreshTranslations(root) {
  applyTranslations(root);
}
