const form = document.querySelector("#editProfileForm");
const formMessage = document.querySelector("#formMessage");
const pfpInput = document.querySelector("#pfp");
const previewImg = document.querySelector("#previewImg");

/* ── Live avatar preview ── */
pfpInput.addEventListener("change", () => {
  const file = pfpInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

/* ── Password visibility toggles ── */
document.querySelectorAll(".pw-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    btn.style.color = input.type === "text" ? "#d25353" : "#bbb";
  });
});

/* ── Health conditions toggle ── */
const healthCheckbox = document.getElementById("hasHealthConditions");
const healthNotesWrap = document.getElementById("healthNotesWrap");

if (healthCheckbox) {
  healthCheckbox.addEventListener("change", () => {
    healthNotesWrap.classList.toggle("show", healthCheckbox.checked);
    if (!healthCheckbox.checked) {
      document.getElementById("healthNotes").value = "";
    }
  });
}

/* ── Submit ── */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = form.querySelector("button[type='submit']");
  const btnText = submitBtn.querySelector("span");

  const formData = new FormData(form);
  const username = formData.get("username")?.trim();
  const file = formData.get("pfp");
  const currentPassword = formData.get("currentPassword")?.trim();
  const newPassword = formData.get("newPassword")?.trim();
  const newPasswordConfirm = formData.get("newPasswordConfirm")?.trim();
  const fitnessGoal = formData.get("fitnessGoal");
  const intensity = formData.get("intensity");
  const experienceLevel = formData.get("experienceLevel");
  const hasHealthConditions = healthCheckbox ? healthCheckbox.checked : false;
  const healthNotes = document.getElementById("healthNotes")?.value || "";

  const usernameChanged = username !== "";
  const fileChanged = file && file.size > 0;
  const passwordChanged = currentPassword || newPassword || newPasswordConfirm;
  const fitnessChanged = fitnessGoal || intensity || experienceLevel;
  const healthChanged = healthCheckbox !== null;

  if (
    !usernameChanged &&
    !fileChanged &&
    !passwordChanged &&
    !fitnessChanged &&
    !healthChanged
  ) {
    formMessage.textContent = "Nothing to update.";
    formMessage.className = "form-message";
    return;
  }

  // Validate password fields if any are filled
  if (passwordChanged) {
    if (!currentPassword) {
      formMessage.textContent = "Please enter your current password.";
      formMessage.className = "form-message";
      return;
    }
    if (!newPassword) {
      formMessage.textContent = "Please enter a new password.";
      formMessage.className = "form-message";
      return;
    }
    if (newPassword.length < 8) {
      formMessage.textContent = "New password must be at least 8 characters.";
      formMessage.className = "form-message";
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      formMessage.textContent = "New passwords do not match.";
      formMessage.className = "form-message";
      return;
    }
  }

  submitBtn.disabled = true;
  btnText.textContent = "Saving...";
  formMessage.textContent = "";

  try {
    // ── 1. Update profile (username + photo + fitness + health) ──
    if (usernameChanged || fileChanged || fitnessChanged || healthChanged) {
      const profileData = new FormData();
      if (usernameChanged) profileData.append("username", username);
      if (fileChanged) profileData.append("pfp", file);
      if (fitnessGoal) profileData.append("fitnessGoal", fitnessGoal);
      if (intensity) profileData.append("intensity", intensity);
      if (experienceLevel)
        profileData.append("experienceLevel", experienceLevel);

      // Always send health fields so they can be cleared too
      if (healthCheckbox) {
        profileData.append("hasHealthConditions", hasHealthConditions);
        profileData.append("healthNotes", healthNotes);
      }

      const res = await fetch("/api/v1/users/updateMe", {
        method: "PATCH",
        body: profileData,
      });
      const data = await res.json();

      if (data.status !== "success") {
        formMessage.textContent = data.message || "Profile update failed.";
        formMessage.className = "form-message";
        return;
      }
    }

    // ── 2. Change password ──
    if (passwordChanged) {
      const res = await fetch("/api/v1/users/updateMyPassword", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passwordCurrent: currentPassword,
          password: newPassword,
          passwordConfirm: newPasswordConfirm,
        }),
      });
      const data = await res.json();

      if (data.status !== "success") {
        formMessage.textContent = data.message || "Password update failed.";
        formMessage.className = "form-message";
        return;
      }
    }

    formMessage.textContent = "Profile updated successfully!";
    formMessage.className = "form-message success";
    setTimeout(() => location.reload(), 900);
  } catch (err) {
    console.error(err);
    formMessage.textContent = "Network error. Please try again.";
    formMessage.className = "form-message";
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = "Save Changes";
  }
});
