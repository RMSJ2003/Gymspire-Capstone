// ── DOM ───────────────────────────────────────────────────
const form = document.querySelector("#signupForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const passwordConfirmInput = document.querySelector("#passwordConfirm");
const pfpInput = document.querySelector("#pfp");
const agreeWaiverInput = document.querySelector("#agreeWaiver");
const formMessage = document.querySelector("#formMessage");
const submitBtn = document.querySelector("#submitBtn");
const btnText = submitBtn.querySelector(".btn-text");
const showPasswordCheckbox = document.getElementById("showPassword");
const openWaiverBtn = document.getElementById("openWaiverBtn");
const waiverModal = document.getElementById("waiverModal");
const closeWaiverBtn = document.getElementById("closeWaiverBtn");
const waiverDoneBtn = document.getElementById("waiverDoneBtn");
const waiverModalBackdrop = document.getElementById("waiverModalBackdrop");
const waiverCheckboxLabel = document.getElementById("waiverCheckboxLabel");

// Hide server-side messages once JS kicks in
const serverError = document.querySelector(".server-error");
const serverSuccess = document.querySelector(".server-success");
if (serverError) serverError.style.display = "none";
if (serverSuccess) serverSuccess.style.display = "none";

// ── WAIVER VIEWED FLAG — source of truth ─────────────────
let waiverViewed = false;

// ── WAIVER MODAL ──────────────────────────────────────────
function openWaiver() {
  waiverModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeWaiver() {
  waiverModal.classList.add("hidden");
  document.body.style.overflow = "";
}

openWaiverBtn.addEventListener("click", openWaiver);
closeWaiverBtn.addEventListener("click", closeWaiver);
waiverModalBackdrop.addEventListener("click", closeWaiver);

waiverDoneBtn.addEventListener("click", () => {
  waiverViewed = true;
  agreeWaiverInput.disabled = false;
  agreeWaiverInput.checked = true;
  waiverCheckboxLabel.textContent =
    "I have read and agree to the GymSpire waiver.";
  waiverCheckboxLabel.style.color = "";
  waiverCheckboxLabel.style.fontStyle = "";
  closeWaiver();
});

// ── AVATAR PREVIEW ────────────────────────────────────────
document.getElementById("pfp").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById("avatarImg");
    img.src = e.target.result;
    img.classList.add("visible");
    document.getElementById("avatarPlaceholder").style.display = "none";
    document.getElementById("avatarPreview").style.border =
      "2.5px solid #d25353";
  };
  reader.readAsDataURL(file);
});

// ── SHOW PASSWORD TOGGLE ──────────────────────────────────
showPasswordCheckbox.addEventListener("change", () => {
  const type = showPasswordCheckbox.checked ? "text" : "password";
  passwordInput.type = type;
  passwordConfirmInput.type = type;
});

// ── VALIDATION ────────────────────────────────────────────
const IACADEMY_EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@(iacademy\.ph|iacademy\.edu\.ph)$/;

function validateEmail() {
  emailInput.setCustomValidity(
    IACADEMY_EMAIL_REGEX.test(emailInput.value.trim().toLowerCase())
      ? ""
      : "Only iACADEMY emails (@iacademy.ph or @iacademy.edu.ph) are allowed.",
  );
}

function validatePasswords() {
  passwordConfirmInput.setCustomValidity(
    passwordInput.value !== passwordConfirmInput.value
      ? "Passwords do not match"
      : "",
  );
}

function validateWaiver() {
  if (!waiverViewed) {
    agreeWaiverInput.setCustomValidity(
      "You must view the waiver before agreeing.",
    );
  } else if (!agreeWaiverInput.checked) {
    agreeWaiverInput.setCustomValidity("You must agree to the waiver.");
  } else {
    agreeWaiverInput.setCustomValidity("");
  }
}

emailInput.addEventListener("input", validateEmail);
passwordInput.addEventListener("input", validatePasswords);
passwordConfirmInput.addEventListener("input", validatePasswords);
agreeWaiverInput.addEventListener("change", validateWaiver);

// ── SUBMIT ────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  validateEmail();
  validatePasswords();
  validateWaiver();
  formMessage.textContent = "";
  formMessage.classList.remove("signup__message--active", "success");

  // Hard block: waiver not viewed
  if (!waiverViewed) {
    formMessage.classList.add("signup__message--active");
    formMessage.textContent = "Please view the waiver first before agreeing.";
    openWaiverBtn.focus();
    return;
  }

  // Hard block: waiver not checked
  if (!agreeWaiverInput.checked) {
    formMessage.classList.add("signup__message--active");
    formMessage.textContent = "You must check the waiver agreement box.";
    return;
  }

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  submitBtn.disabled = true;
  btnText.textContent = "Creating account...";
  let success = false;

  try {
    const formData = new FormData();
    formData.append("email", emailInput.value);
    formData.append("username", document.querySelector("#username").value);
    formData.append("password", passwordInput.value);
    formData.append("passwordConfirm", passwordConfirmInput.value);
    formData.append("agreeWaiver", agreeWaiverInput.checked);
    if (pfpInput.files[0]) formData.append("pfp", pfpInput.files[0]);

    const res = await fetch("/api/v1/auth/signup", {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Signup failed");

    success = true;
    formMessage.classList.add("signup__message--active", "success");
    formMessage.textContent = "Account created! Redirecting to login...";
    setTimeout(() => {
      window.location.href = "/login?signup=success";
    }, 1000);
  } catch (err) {
    formMessage.classList.add("signup__message--active");
    formMessage.textContent = err.message || "Signup failed";
  } finally {
    if (!success) {
      submitBtn.disabled = false;
      btnText.textContent = "Create Account";
    }
  }
});
