document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#createChallengeForm");
  const formMessage = document.querySelector("#formMessage");

  if (!form) return; // safety

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    formMessage.textContent = "";
    formMessage.style.color = "red";

    const name = document.querySelector("#name").value.trim();
    const startTime = document.querySelector("#startTime").value;
    const endTime = document.querySelector("#endTime").value;

    const checked = document.querySelectorAll(
      'input[name="exerciseIds"]:checked',
    );

    // =========================
    // Basic Validation
    // =========================
    if (!name || !startTime || !endTime) {
      formMessage.textContent = "Please fill in all fields.";
      return;
    }

    if (checked.length === 0) {
      formMessage.textContent = "Please select at least one exercise.";
      return;
    }

    const exerciseIds = Array.from(checked).map((input) => input.value);

    // Prevent double submit
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating...";

    try {
      const res = await fetch("/api/v1/challenges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // 🔥 important for auth cookies
        body: JSON.stringify({
          name,
          startTime,
          endTime,
          exerciseIds,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        formMessage.textContent = data.message || "Failed to create challenge.";
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Challenge";
        return;
      }

      formMessage.style.color = "green";
      formMessage.textContent = "Challenge created successfully!";

      setTimeout(() => {
        window.location.href = "/challenges";
      }, 800);
    } catch (err) {
      console.error(err);
      formMessage.textContent = "Network error. Please check your connection.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Challenge";
    }
  });
});
