import { initLayout } from "../layout.js";
import { tRaw, onLocaleChange } from "../i18n.js";

const sectionsEl = document.getElementById("terms-sections");

function render() {
  const sections = tRaw("terms.sections") || [];
  sectionsEl.innerHTML = sections
    .map(
      (s) => `
      <section>
        <h2 class="heading" style="font-size:1.1rem">${s.heading}</h2>
        <p style="margin-top:0.5rem;color:var(--foreground)">${s.body}</p>
      </section>
    `,
    )
    .join("");
}

async function main() {
  await initLayout();
  render();
  onLocaleChange(render);
}

main();
