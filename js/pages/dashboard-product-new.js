import { initLayout } from "../layout.js";
import { guardDashboard } from "../dashboard-shell.js";
import { renderProductForm } from "./dashboard-product-form.js";

async function main() {
  await initLayout();
  const profile = await guardDashboard("dashboard-products.html");
  renderProductForm(document.getElementById("product-form-mount"), profile, null);
}

main();
