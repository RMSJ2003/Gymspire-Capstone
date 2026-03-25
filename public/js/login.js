// ===== DOM ELEMENTS =====
const form = document.querySelector("#loginForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const formMessage = document.querySelector("#formMessage");
const loginBtn = document.querySelector("#loginBtn");
const btnText = loginBtn.querySelector(".btn-text");
const signupBtn = document.querySelector("#signupBtn");
const verifyEmailLink = document.querySelector(".login__verify-email");

// 🔹 Show Password checkbox
// Replace the show password section with this
const showPasswordCheckbox = document.getElementById("showPassword");
if (showPasswordCheckbox) {
  showPasswordCheckbox.addEventListener("change", () => {
    passwordInput.type = showPasswordCheckbox.checked ? "text" : "password";
  });
}
// ===============================
// Clear password on page load / back button
// ===============================
window.addEventListener("pageshow", (event) => {
  passwordInput.value = "";
  showPasswordCheckbox.checked = false;
  passwordInput.type = "password";

  const params = new URLSearchParams(window.location.search);
  if (params.get("signup") === "success") {
    formMessage.textContent =
      "Account created! Check your iACADEMY email to verify before logging in.";
    formMessage.classList.add("success");
    formMessage.classList.remove("error");
  }
  if (params.get("verified") === "true") {
    formMessage.textContent = "✓ Email verified! You can now log in.";
    formMessage.classList.add("success");
    formMessage.classList.remove("error");
  }
});

// ===============================
// Submit login form
// ===============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  formMessage.textContent = "";
  formMessage.classList.remove("error", "success");

  loginBtn.disabled = true;
  btnText.textContent = "Logging in...";

  try {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailInput.value,
        password: passwordInput.value,
      }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Invalid email or password");

    formMessage.textContent = "Login successful! Redirecting...";
    formMessage.classList.add("success");
    formMessage.classList.remove("error");

    setTimeout(() => {
      window.location.href = data.redirectTo || "/dashboard";
    }, 500);
  } catch (err) {
    formMessage.textContent = err.message || "Login failed";
    formMessage.classList.add("error");
    formMessage.classList.remove("success");

    // Show verify email link only if the error mentions verification
    if (err.message && err.message.toLowerCase().includes("verify")) {
      if (verifyEmailLink) verifyEmailLink.style.display = "";
    }
  } finally {
    loginBtn.disabled = false;
    btnText.textContent = "Log In";
  }
});

// Redirect Sign Up button
signupBtn.addEventListener("click", () => {
  window.location.href = "/signup";
});
