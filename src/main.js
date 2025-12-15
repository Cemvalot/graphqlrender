import { login, getToken } from "./auth.js";

function redirectIfLoggedIn() {
  const token = getToken();
  if (token) {
    window.location.href = "/profile.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  redirectIfLoggedIn();

  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");
  const submitBtn = document.getElementById("login-submit");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorEl) errorEl.textContent = "";

    const identifier = form.identifier.value.trim();
    const password = form.password.value;

    if (!identifier || !password) {
      if (errorEl) {
        errorEl.textContent = "Please fill in both fields.";
      }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in...";

    try {
      await login(identifier, password);
      window.location.href = "/profile.html";
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || "Login failed.";
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
    }
  });
});


