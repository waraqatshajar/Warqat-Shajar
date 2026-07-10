import { initLayout } from "../layout.js";
import { guardDashboard } from "../dashboard-shell.js";
import { Products } from "../firebase.js";
import { renderProductForm } from "./dashboard-product-form.js";

async function main() {
  await initLayout();
  const profile = await guardDashboard("dashboard-products.html");

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const product = id ? await Products.getProduct(id) : null;

  if (!product || product.ownerId !== profile.uid) {
    location.replace("dashboard-products.html");
    return;
  }

  renderProductForm(document.getElementById("product-form-mount"), profile, product);
}

main();
