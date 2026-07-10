// Leaf-mascot guided tour, ported line-by-line from src/components/help.tsx.
// Highlights one DOM node per step and points a curved dashed arrow at it.
// Steps whose target never appears are skipped. Seen tours are remembered
// in localStorage so they only show once per id.
import { t } from "./i18n.js";
import { btnClass } from "./ui.js";

export function initHelpTour(id, steps) {
  setTimeout(() => {
    if (!localStorage.getItem(`tour-seen:${id}`)) {
      runStep(id, steps, 0);
    }
  }, 500);
}

function finish(id) {
  localStorage.setItem(`tour-seen:${id}`, "1");
  const overlay = document.getElementById("tour-overlay");
  if (overlay) overlay.remove();
}

function runStep(id, steps, stepIndex) {
  let attempts = 0;
  const poll = setInterval(() => {
    const el = document.querySelector(steps[stepIndex]?.target ?? "");
    attempts += 1;
    if (el) {
      clearInterval(poll);
      showStep(id, steps, stepIndex, el);
    } else if (attempts >= 12) {
      clearInterval(poll);
      if (stepIndex < steps.length - 1) {
        runStep(id, steps, stepIndex + 1);
      } else {
        finish(id);
      }
    }
  }, 250);
}

function showStep(id, steps, stepIndex, targetEl) {
  const existing = document.getElementById("tour-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "tour-overlay";
  overlay.className = "tour-overlay";
  document.body.appendChild(overlay);

  const isLast = stepIndex === steps.length - 1;
  const cardWidth = 288;

  function render() {
    const r = targetEl.getBoundingClientRect();
    const box = { top: r.top, left: r.left, width: r.width, height: r.height };

    const below = box.top + box.height + 190 < window.innerHeight;
    const cardTop = below ? box.top + box.height + 20 : Math.max(16, box.top - 175);
    const cardLeft = Math.min(
      Math.max(box.left + box.width / 2 - cardWidth / 2, 16),
      window.innerWidth - cardWidth - 16,
    );
    const anchorX = cardLeft + cardWidth / 2;
    const anchorY = below ? cardTop : cardTop + 150;
    const targetX = box.left + box.width / 2;
    const targetY = box.top + box.height / 2;
    const midY = (anchorY + targetY) / 2 + (below ? -30 : 30);

    overlay.innerHTML = `
      <div class="tour-ring" style="top:${box.top - 4}px;left:${box.left - 4}px;width:${box.width + 8}px;height:${box.height + 8}px"></div>
      <svg class="tour-arrow">
        <defs>
          <marker id="tour-arrow-head" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="var(--primary)" />
          </marker>
        </defs>
        <path d="M ${anchorX} ${anchorY} Q ${(anchorX + targetX) / 2} ${midY} ${targetX} ${targetY}"
          stroke-linecap="round" marker-end="url(#tour-arrow-head)" />
      </svg>
      <div class="tour-card" style="top:${cardTop}px;left:${cardLeft}px;width:${cardWidth}px">
        <button type="button" class="tour-dismiss" data-tour-skip aria-label="${t("tour.skip", "Skip")}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
        </button>
        <div style="display:flex;align-items:flex-start;gap:0.5rem">
          <img src="images/logo-icon.png" class="tour-mascot" alt="">
          <p class="tour-text" style="margin:0">${steps[stepIndex].text}</p>
        </div>
        <div class="tour-actions">
          <button type="button" class="tour-skip" data-tour-skip>${t("tour.skip", "Skip")}</button>
          <button type="button" class="${btnClass("default", "sm")}" data-tour-next>${isLast ? t("tour.done", "Done") : t("tour.next", "Next")}</button>
        </div>
      </div>
    `;

    overlay.querySelectorAll("[data-tour-skip]").forEach((btn) => {
      btn.addEventListener("click", () => finish(id));
    });
    const nextBtn = overlay.querySelector("[data-tour-next]");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        window.removeEventListener("resize", render);
        window.removeEventListener("scroll", render, true);
        if (isLast) {
          finish(id);
        } else {
          overlay.remove();
          runStep(id, steps, stepIndex + 1);
        }
      });
    }
  }

  render();
  window.addEventListener("resize", render);
  window.addEventListener("scroll", render, true);
}
