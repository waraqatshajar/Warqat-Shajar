import { initLayout } from "../layout.js";
import { t } from "../i18n.js";
import { Auth, Profile } from "../firebase.js";
import { showMessage } from "../ui.js";

async function main() {
  await initLayout();

  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const formError = document.getElementById("form-error");
  const resetMessage = document.getElementById("reset-message");
  const submitBtn = document.getElementById("submit-btn");

  document.getElementById("forgot-password").addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email) {
      showMessage(formError, t("auth.errors.invalidEmail"));
      return;
    }
    showMessage(formError, "");
    try {
      await Auth.resetPassword(email);
      showMessage(resetMessage, t("auth.login.resetSent"), "success");
    } catch (error) {
      showMessage(formError, t(`auth.errors.${Auth.getAuthErrorKey(error)}`));
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showMessage(formError, "");
    submitBtn.disabled = true;
    try {
      await Auth.signInWithEmail(emailInput.value.trim(), passwordInput.value);
      location.href = "index.html";
    } catch (error) {
      showMessage(formError, t(`auth.errors.${Auth.getAuthErrorKey(error)}`));
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById("google-btn").addEventListener("click", async () => {
    showMessage(formError, "");
    try {
      const user = await Auth.signInWithGoogle();
      const existingProfile = await Profile.getUserProfile(user.uid);
      location.href = existingProfile ? "index.html" : "complete-profile.html";
    } catch (error) {
      showMessage(formError, t(`auth.errors.${Auth.getAuthErrorKey(error)}`));
    }
  });
}

main();
