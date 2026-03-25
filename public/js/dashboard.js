// ==================================================
// DASHBOARD JS — shared across user / coach / admin
//
// Sections:
//   [SHARED]  Modal open/close
//   [SHARED]  Card routing
//   [SHARED]  Live congestion badge (user dashboard only)
//   [USER]    Gym check-in (gymCheckin.js handles this separately)
//   [COACH]   Fatigue table → handled entirely by coachFatigue.js
//             coachFatigue.js is loaded ONLY on coachDashboard.pug
//             Nothing in this file touches check-in or fatigue for coaches
// ==================================================

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("modal");
  const modalText = document.getElementById("modalText");
  const closeModal = document.getElementById("closeModal");

  const dashboardEl = document.querySelector(".dashboard");
  const type = dashboardEl ? dashboardEl.dataset.type : "user";

  let infoData = [];

  // ── [USER] info modal content ──────────────────────────────────
  if (type === "user") {
    infoData = [
      {
        text: `
          <h2>Challenge Information & Instructions</h2>
          <ul style="text-align:left; margin-top:10px; line-height:1.6;">
            <li><strong>Weekly Challenges:</strong> Challenges are created once every week and must be completed within the given week.</li>
            <li><strong>Workout Video Submission:</strong> You may upload a workout video, but it is optional.</li>
            <li><strong>Coach Assessment:</strong> The coach will assess your submitted challenge performance.</li>
            <li><strong>Purpose:</strong> Challenges help you stay consistent and improve your fitness journey.</li>
            <li><strong>⚠ Reminder:</strong> Always exercise safely and rest when needed.</li>
          </ul>
        `,
      },
      {
        text: `
          <h2>Workout Plan Instructions</h2>
          <ul style="text-align:left; margin-top:10px; line-height:1.6;">
            <li><strong>Plan your workouts effectively:</strong> Use this section to organize your weekly exercises according to your goals.</li>
            <li><strong>Edit your workout:</strong> Customize your workouts based on your personal preferences and fitness level.</li>
            <li><strong>Follow instructions:</strong> Each exercise comes with recommended sets, reps, and proper form guidance to maximize results.</li>
            <li><strong>Stay consistent:</strong> Completing your planned workouts regularly is key to achieving your fitness goals.</li>
            <li><strong>⚠ Safety first:</strong> Warm up before exercises and rest as needed to avoid injuries.</li>
          </ul>
        `,
      },
      {
        text: `
          <h2>Workout Logs Instructions</h2>
          <ul style="text-align:left; margin-top:10px; line-height:1.6;">
            <li><strong>View your logs:</strong> Check all your completed workouts for the current week and previous weeks.</li>
            <li><strong>Search your progress:</strong> Monitor your progress over time.</li>
            <li><strong>Record details:</strong> Ensure each exercise is logged accurately to get a clear picture of your performance.</li>
            <li><strong>Set goals:</strong> Use your logs to identify areas of improvement and adjust future workouts accordingly.</li>
            <li><strong>⚠ Stay consistent:</strong> Regularly logging workouts helps you stay on track with your fitness goals.</li>
          </ul>
        `,
      },
      {
        text: `
          <h2>Start Workout Instructions</h2>
          <ul style="text-align:left; margin-top:10px; line-height:1.6;">
            <li><strong>Start anytime:</strong> Begin a solo workout whenever you have free time.</li>
            <li><strong>Choose exercises:</strong> Select the exercises you want to perform for your session.</li>
            <li><strong>Customize intensity:</strong> Adjust weights, reps, or time according to your fitness level and goals.</li>
          </ul>
        `,
      },
      // index 4 — Gym Congestion
      {
        text: `
          <h2>🏋️ Gym Congestion Predictions</h2>
          <ul style="text-align:left; margin-top:10px; line-height:1.6;">
            <li><strong>Real data, not estimates:</strong> Predictions are based on actual verified check-ins from Gymspire members — not crowd-sourced guesses.</li>
            <li><strong>Best time for you:</strong> The system finds the quietest hour you haven't already been visiting, so you get a genuinely personalized recommendation.</li>
            <li><strong>Hour-by-hour view:</strong> See today's predicted busyness for every open gym hour at a glance.</li>
            <li><strong>Weekly heatmap:</strong> Find out which days of the week are historically quiet vs. busy.</li>
            <li><strong>⚠ Note:</strong> Predictions improve as more members use the gym check-in feature.</li>
          </ul>
        `,
      },
    ];

    // ── [ADMIN] info modal content ─────────────────────────────────
  } else if (type === "admin") {
    infoData = [
      {
        text: `
        <h2>Exercises Management</h2>
        <ul style="text-align:left; margin-top:10px; line-height:1.6;">
          <li><strong>Import exercises:</strong> Import exercises from external API to expand the exercise database.</li>
          <li><strong>Delete exercises:</strong> Delete existing exercise details.</li>
        </ul>
      `,
      },
      {
        text: `
        <h2>🏋️ Gym Congestion Data</h2>
        <ul style="text-align:left; margin-top:10px; line-height:1.6;">
          <li><strong>Real check-in data:</strong> View busyness predictions based on actual member check-ins.</li>
          <li><strong>Hour-by-hour view:</strong> See today's predicted busyness for every open gym hour.</li>
          <li><strong>Weekly heatmap:</strong> Find out which days are historically quiet vs. busy.</li>
        </ul>
      `,
      },
    ];

    // ── [COACH] info modal content ─────────────────────────────────
    // NOTE: Check-in is NOT present on the coach dashboard.
    // Coach fatigue table is handled entirely by coachFatigue.js.
    // This section only defines the modal text for the Challenges card.
  } else if (type === "coach") {
    infoData = [
      {
        text: `
          <h2>Coach Challenges</h2>
          <ul style="text-align:left; margin-top:10px; line-height:1.6;">
            <li><strong>Assign challenges:</strong> Set weekly challenges for users to improve their fitness.</li>
            <li><strong>Monitor progress:</strong> Track user performance on assigned challenges.</li>
          </ul>
        `,
      },
    ];

    // ── [CLINIC] info modal content ────────────────────────────────
  } else if (type === "clinic") {
    infoData = [
      {
        text: `
          <h2>Users</h2>
          <ul style="text-align:left; margin-top:10px; line-height:1.6;">
            <li><strong>View users:</strong> See all registered users in the system.</li>
            <li><strong>Manage users:</strong> Edit, delete, or assign roles to users as needed.</li>
            <li><strong>Track activity:</strong> Monitor user engagement and workout activity.</li>
          </ul>
        `,
      },
    ];
  }

  // ── [SHARED] Open modal ────────────────────────────────────────
  document.querySelectorAll(".info-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.dataset.index, 10);
      const data = infoData[index];
      if (!data) return;
      modal.classList.remove("hidden");
      modalText.innerHTML = data.text;
    });
  });

  closeModal.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });

  // ── [SHARED] Card routing ──────────────────────────────────────
  const routes = {
    Challenges: "/challenges",
    "Workout Plan": "/workoutPlan",
    "Workout Logs": "/workoutLogs",
    "Solo Workout": "/startSoloWorkout",
    "Gym Congestion": "/congestion",
    Users: "/users",
    "Exercises Management": "/exercisesManagement",
  };

  document.querySelectorAll(".card").forEach((card) => {
    const link = card.querySelector(".card-link");
    if (!link) return;
    const text = link.textContent.trim();
    if (routes[text]) link.href = routes[text];
  });

  // ── [USER ONLY] Live congestion badge ─────────────────────────
  // Only present on user dashboard — coach dashboard has no congestion card
  const congestionLive = document.getElementById("congestionLive");
  if (congestionLive) {
    fetch("/api/v1/congestion/now")
      .then((r) => r.json())
      .then((json) => {
        const d = json.data;
        congestionLive.textContent = `${d.tier.emoji} ${d.tier.label}`;
        congestionLive.style.setProperty("--badge-color", d.tier.color);
        congestionLive.classList.add("loaded");
      })
      .catch(() => {
        congestionLive.textContent = "";
      });
  }
});

const hamburger = document.querySelector(".hamburger");
const panel = document.querySelector(".panel");

if (hamburger && panel) {
  hamburger.addEventListener("click", () => {
    panel.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && e.target !== hamburger) {
      panel.classList.remove("open");
    }
  });
}
// ── GYM HOURS EDITOR ──────────────────────────────────────
// ── GYM WEEKLY SCHEDULE EDITOR (admin) ───────────────────
const saveGymHoursBtn = document.getElementById("saveGymHoursBtn");
if (saveGymHoursBtn) {
  // Toggle open/closed per day
  document.querySelectorAll(".gym-day-open").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const idx = this.dataset.index;
      const hoursRow = document.getElementById(`hoursRow${idx}`);
      if (hoursRow) hoursRow.classList.toggle("hidden", !this.checked);
    });
  });

  saveGymHoursBtn.addEventListener("click", async () => {
    const msg = document.getElementById("gymHoursMsg");
    const rows = document.querySelectorAll(".gym-schedule-edit-row");
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const schedule = [];

    let hasError = false;
    rows.forEach((row, i) => {
      const isOpen = row.querySelector(".gym-day-open").checked;
      const selects = row.querySelectorAll(".gym-hour-select");
      const openingHour = parseInt(selects[0]?.value ?? 6);
      const closingHour = parseInt(selects[1]?.value ?? 23);
      if (isOpen && openingHour >= closingHour) {
        msg.style.color = "#d25353";
        msg.textContent = `${days[i]}: Opening must be before closing.`;
        hasError = true;
      }
      schedule.push({ day: days[i], isOpen, openingHour, closingHour });
    });

    if (hasError) return;

    saveGymHoursBtn.disabled = true;
    saveGymHoursBtn.textContent = "Saving...";

    try {
      const res = await fetch("/api/v1/admin/gymHours", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schedule }),
      });
      const data = await res.json();
      if (data.status === "success") {
        msg.style.color = "#16a34a";
        msg.textContent = "✓ Schedule saved successfully.";
      } else {
        msg.style.color = "#d25353";
        msg.textContent = data.message || "Failed to update.";
      }
    } catch (e) {
      msg.style.color = "#d25353";
      msg.textContent = "Network error.";
    } finally {
      saveGymHoursBtn.disabled = false;
      saveGymHoursBtn.textContent = "Save Schedule";
    }
  });
}
// ── GYM LOCATION EDITOR ───────────────────────────────────
const saveGymLocationBtn = document.getElementById("saveGymLocationBtn");
if (saveGymLocationBtn) {
  saveGymLocationBtn.addEventListener("click", async () => {
    const msg = document.getElementById("gymLocationMsg");
    const gymName = document.getElementById("gymNameInput").value.trim();
    const gymLat = parseFloat(document.getElementById("gymLatInput").value);
    const gymLng = parseFloat(document.getElementById("gymLngInput").value);
    const gymRadiusMeters = parseInt(
      document.getElementById("gymRadiusInput").value,
    );

    if (!gymLat || !gymLng) {
      msg.style.color = "#d25353";
      msg.textContent = "Latitude and longitude are required.";
      return;
    }
    if (gymLat < -90 || gymLat > 90) {
      msg.style.color = "#d25353";
      msg.textContent = "Latitude must be between -90 and 90.";
      return;
    }
    if (gymLng < -180 || gymLng > 180) {
      msg.style.color = "#d25353";
      msg.textContent = "Longitude must be between -180 and 180.";
      return;
    }

    saveGymLocationBtn.disabled = true;
    saveGymLocationBtn.textContent = "Saving...";

    try {
      const res = await fetch("/api/v1/admin/gymLocation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gymName, gymLat, gymLng, gymRadiusMeters }),
      });
      const data = await res.json();
      if (data.status === "success") {
        msg.style.color = "#16a34a";
        msg.textContent = "✓ Gym location updated successfully.";
      } else {
        msg.style.color = "#d25353";
        msg.textContent = data.message || "Failed to update.";
      }
    } catch (e) {
      msg.style.color = "#d25353";
      msg.textContent = "Network error.";
    } finally {
      saveGymLocationBtn.disabled = false;
      saveGymLocationBtn.textContent = "Save Location";
    }
  });
}
