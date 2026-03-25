// ── DATA ──────────────────────────────────────────────────
const gymExercises = JSON.parse(
  document.getElementById("gymExercisesData").textContent,
);
const homeExercises = JSON.parse(
  document.getElementById("homeExercisesData").textContent,
);

const GYM_LAT = window.GYM_LAT;
const GYM_LNG = window.GYM_LNG;
const GYM_RADIUS = window.GYM_RADIUS;
const HAS_HOME_PLAN = window.HAS_HOME_PLAN;
const USER_IS_AT_GYM = window.USER_IS_AT_GYM;

// ── STATE ─────────────────────────────────────────────────
let selectedWorkoutType = null;
let selectedMuscles = new Set();
let exerciseChoices = {};
let userLat = null,
  userLng = null;
let userAtGym = false;
let userCheckedIn = USER_IS_AT_GYM;

// ── DOM REFS ──────────────────────────────────────────────
const gpsBanner = document.getElementById("gpsBanner");
const gpsSpinner = document.getElementById("gpsSpinner");
const gpsText = document.getElementById("gpsText");
const gymCard = document.getElementById("gymCard");
const homeCard = document.getElementById("homeCard");
const gymStatus = document.getElementById("gymStatus");
const homeStatus = document.getElementById("homeStatus");
const checkinBtn = document.getElementById("checkinBtn");
const step0Msg = document.getElementById("step0Message");
const step0NextBtn = document.getElementById("step0NextBtn");
const step0Card = document.getElementById("step0Card");
const step1Card = document.getElementById("step1Card");
const step2Card = document.getElementById("step2Card");
const muscleGrid = document.getElementById("muscleGrid");
const nextBtn = document.getElementById("nextBtn");
const step1Msg = document.getElementById("step1Message");
const exercisePickers = document.getElementById("exercisePickers");
const step2Msg = document.getElementById("step2Message");
const startBtn = document.getElementById("startBtn");
const backBtn = document.getElementById("backBtn");
const backToStep0 = document.getElementById("backToStep0Btn");
const stepDot0 = document.getElementById("stepDot0");
const stepDot1 = document.getElementById("stepDot1");
const stepDot2 = document.getElementById("stepDot2");
const stepLine1 = document.getElementById("stepLine1");
const stepLine2 = document.getElementById("stepLine2");

// ── HELPERS ───────────────────────────────────────────────
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function showCard(card) {
  [step0Card, step1Card, step2Card].forEach((c) => c.classList.add("hidden"));
  card.classList.remove("hidden");
}

// ── GYM HOURS CHECK — only used for gym-specific actions ──
function fmt12(h) {
  if (h === 0) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

function isGymOpenNow() {
  const today = window.GYM_TODAY;
  if (!today) return { open: false, reason: "Gym schedule unavailable." };
  if (!today.isOpen)
    return { open: false, reason: `The gym is closed today (${today.day}).` };
  const hour = new Date().getHours();
  if (hour < today.openingHour || hour >= today.closingHour) {
    return {
      open: false,
      reason: `The gym is currently closed. Today's hours: ${fmt12(today.openingHour)} — ${fmt12(today.closingHour)}.`,
    };
  }
  return { open: true, reason: "" };
}

// ── STEP 0: GPS + TYPE SELECTION ─────────────────────────
function initGPS() {
  if (!navigator.geolocation) {
    gpsText.textContent = "Geolocation not supported on this device.";
    gpsSpinner.style.display = "none";
    lockGymCard("Location required");
    enableHomeIfAvailable();
    attachTypeCardClicks();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;

      const dist = getDistanceMeters(userLat, userLng, GYM_LAT, GYM_LNG);
      userAtGym = dist <= GYM_RADIUS;

      gpsSpinner.style.display = "none";

      if (userAtGym) {
        gpsBanner.classList.add("gps-banner--success");
        gpsText.textContent = "📍 You are at the gym!";

        // ── Check gym hours ONLY for gym card ──────────
        const gymHours = isGymOpenNow();
        if (!gymHours.open) {
          // Gym is closed — lock gym card, hide check-in
          lockGymCard(gymHours.reason, "error");
          checkinBtn.classList.add("hidden");
        } else if (!userCheckedIn) {
          // Gym open, not checked in yet
          checkinBtn.classList.remove("hidden");
          lockGymCard("Check in first to unlock", "warning");
        } else {
          // Gym open + checked in
          unlockGymCard();
        }
      } else {
        gpsBanner.classList.add("gps-banner--warning");
        gpsText.textContent = `📍 You are ${Math.round(dist)}m away from the gym`;
        lockGymCard(`${Math.round(dist)}m away — go to gym to unlock`, "error");
      }

      // ── Home is ALWAYS independent of gym hours ───────
      enableHomeIfAvailable();
      attachTypeCardClicks();
    },
    () => {
      gpsSpinner.style.display = "none";
      gpsText.textContent = "Could not get location. Home workout available.";
      gpsBanner.classList.add("gps-banner--warning");
      lockGymCard("Location required", "error");
      enableHomeIfAvailable();
      attachTypeCardClicks();
    },
    { timeout: 8000 },
  );
}

function lockGymCard(message, type = "error") {
  gymCard.classList.add("workout-type-card--locked");
  gymStatus.textContent = message;
  gymStatus.className = `workout-type-status status--${type}`;
}

function unlockGymCard() {
  gymCard.classList.remove("workout-type-card--locked");
  gymStatus.textContent = "✅ Checked in";
  gymStatus.className = "workout-type-status status--success";
}

function enableHomeIfAvailable() {
  if (HAS_HOME_PLAN) {
    homeCard.classList.remove("workout-type-card--locked");
    homeStatus.textContent = "Available";
    homeStatus.className = "workout-type-status status--success";
  } else {
    homeCard.classList.add("workout-type-card--locked");
    homeStatus.textContent = "No home plan yet";
    homeStatus.className = "workout-type-status status--error";
  }
}

function attachTypeCardClicks() {
  gymCard.addEventListener("click", () => {
    if (gymCard.classList.contains("workout-type-card--locked")) return;
    selectType("Gym");
  });
  homeCard.addEventListener("click", () => {
    if (homeCard.classList.contains("workout-type-card--locked")) return;
    selectType("Home");
  });
}

function selectType(type) {
  selectedWorkoutType = type;
  gymCard.classList.toggle("workout-type-card--selected", type === "Gym");
  homeCard.classList.toggle("workout-type-card--selected", type === "Home");
  step0NextBtn.disabled = false;
  step0Msg.textContent = "";
}

// ── CHECK-IN ─────────────────────────────────────────────
checkinBtn.addEventListener("click", async () => {
  if (!userLat || !userLng) return;

  // Client-side hours guard
  const gymHours = isGymOpenNow();
  if (!gymHours.open) {
    step0Msg.textContent = gymHours.reason;
    return;
  }

  checkinBtn.disabled = true;
  checkinBtn.textContent = "Checking in...";

  try {
    const res = await fetch("/api/v1/users/gymCheckin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "atGym",
        latitude: userLat,
        longitude: userLng,
      }),
    });
    const data = await res.json();

    if (data.status === "success") {
      userCheckedIn = true;
      checkinBtn.classList.add("hidden");
      unlockGymCard();
      step0Msg.textContent = "";
    } else {
      checkinBtn.disabled = false;
      checkinBtn.innerHTML = `<span>Check In to Gym</span>`;
      step0Msg.textContent = data.message || "Check-in failed. Try again.";
    }
  } catch {
    checkinBtn.disabled = false;
    step0Msg.textContent = "Network error. Try again.";
  }
});

// ── STEP 0 → STEP 1 ──────────────────────────────────────
step0NextBtn.addEventListener("click", () => {
  if (!selectedWorkoutType) return;
  stepDot0.classList.remove("active");
  stepDot0.classList.add("done");
  stepDot1.classList.add("active");
  stepLine1.classList.add("done");
  buildMuscleGrid();
  showCard(step1Card);
});

// ── STEP 1: MUSCLE GROUPS ────────────────────────────────
function getActiveExercises() {
  return selectedWorkoutType === "Gym" ? gymExercises : homeExercises;
}

function buildMuscleGrid() {
  const exercises = getActiveExercises();
  muscleGrid.innerHTML = "";
  selectedMuscles = new Set();
  nextBtn.disabled = true;

  const targets = [...new Set(exercises.map((e) => e.target))];

  if (targets.length === 0) {
    muscleGrid.innerHTML = `<p class="empty-muscles">No exercises in your ${selectedWorkoutType} plan.</p>`;
    return;
  }

  targets.forEach((target) => {
    const chip = document.createElement("button");
    chip.className = "muscle-chip";
    chip.dataset.target = target;
    chip.textContent = target;
    chip.type = "button";

    chip.addEventListener("click", () => {
      if (selectedMuscles.has(target)) {
        selectedMuscles.delete(target);
        chip.classList.remove("active");
      } else {
        selectedMuscles.add(target);
        chip.classList.add("active");
      }
      nextBtn.disabled = selectedMuscles.size === 0;
      step1Msg.textContent = "";
    });

    muscleGrid.appendChild(chip);
  });
}

backToStep0.addEventListener("click", () => {
  stepDot0.classList.add("active");
  stepDot0.classList.remove("done");
  stepDot1.classList.remove("active");
  stepLine1.classList.remove("done");
  showCard(step0Card);
});

nextBtn.addEventListener("click", () => {
  if (selectedMuscles.size === 0) {
    step1Msg.textContent = "Please select at least one muscle group.";
    return;
  }
  stepDot1.classList.remove("active");
  stepDot1.classList.add("done");
  stepDot2.classList.add("active");
  stepLine2.classList.add("done");
  buildExercisePickers();
  showCard(step2Card);
});

// ── STEP 2: EXERCISE PICKERS ─────────────────────────────
function buildExercisePickers() {
  exercisePickers.innerHTML = "";
  exerciseChoices = {};

  selectedMuscles.forEach((m) => {
    exerciseChoices[m] = [];
  });

  const exercises = getActiveExercises();

  selectedMuscles.forEach((target) => {
    const muscleExercises = exercises.filter((e) => e.target === target);
    const safeId =
      "pickerList-" + target.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");

    const section = document.createElement("div");
    section.className = "picker-section";
    section.innerHTML = `
      <div class="picker-muscle-label">${target}</div>
      <input class="picker-search" type="text" placeholder="Search ${target} exercises..." data-target="${target}">
      <div class="picker-list" id="${safeId}"></div>
    `;

    exercisePickers.appendChild(section);

    const listEl = document.getElementById(safeId);
    const searchEl = section.querySelector(".picker-search");

    renderPickerList(listEl, muscleExercises, target);

    searchEl.addEventListener("input", () => {
      const q = searchEl.value.toLowerCase().trim();
      const filtered = muscleExercises.filter((e) =>
        e.name.toLowerCase().includes(q),
      );
      renderPickerList(listEl, filtered, target);
    });
  });
}

function renderPickerList(listEl, exercises, target) {
  listEl.innerHTML = "";

  if (exercises.length === 0) {
    listEl.innerHTML = `<p class="picker-empty">No exercises found.</p>`;
    return;
  }

  if (!exerciseChoices[target]) exerciseChoices[target] = [];

  exercises.forEach((ex) => {
    const isSelected = exerciseChoices[target].includes(ex.exerciseId);
    const row = document.createElement("div");
    row.className = "picker-row" + (isSelected ? " selected" : "");

    row.innerHTML = `
      <input type="checkbox" name="exercise-${target}" value="${ex.exerciseId}" ${isSelected ? "checked" : ""}>
      <div class="picker-row-info">
        ${ex.gifURL ? `<img class="picker-gif" src="${ex.gifURL}" alt="${ex.name}" loading="lazy">` : ""}
        <span class="picker-name">${ex.name}</span>
      </div>
    `;

    row.addEventListener("click", () => {
      const checkbox = row.querySelector("input[type=checkbox]");
      const id = ex.exerciseId;
      if (exerciseChoices[target].includes(id)) {
        exerciseChoices[target] = exerciseChoices[target].filter(
          (e) => e !== id,
        );
        checkbox.checked = false;
        row.classList.remove("selected");
      } else {
        exerciseChoices[target].push(id);
        checkbox.checked = true;
        row.classList.add("selected");
      }
      step2Msg.textContent = "";
    });

    listEl.appendChild(row);
  });
}

backBtn.addEventListener("click", () => {
  stepDot1.classList.add("active");
  stepDot1.classList.remove("done");
  stepDot2.classList.remove("active");
  stepLine2.classList.remove("done");
  showCard(step1Card);
});

// ── START WORKOUT ─────────────────────────────────────────
startBtn.addEventListener("click", async () => {
  const muscles = Array.from(selectedMuscles);
  const missing = muscles.filter(
    (m) => !exerciseChoices[m] || exerciseChoices[m].length === 0,
  );

  if (missing.length > 0) {
    step2Msg.textContent = `Please choose at least one exercise for: ${missing.join(", ")}`;
    return;
  }

  step2Msg.textContent = "";
  startBtn.disabled = true;
  startBtn.innerHTML = `<span>Starting...</span>`;

  const activeExercises = getActiveExercises();
  const targets = [];

  muscles.forEach((m) => {
    exerciseChoices[m].forEach((exerciseId) => {
      const found = activeExercises.find((e) => e.exerciseId === exerciseId);
      if (found) targets.push({ muscle: m, exercise: found.name });
    });
  });

  try {
    const res = await fetch("/api/v1/workout-logs/solo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targets, workoutType: selectedWorkoutType }),
    });
    const data = await res.json();

    if (data.status === "success") {
      window.location.href = `/workoutLogs/${data.data._id}`;
    } else {
      step2Msg.textContent = data.message || "Failed to start workout.";
      startBtn.disabled = false;
      startBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <span>Start Workout</span>`;
    }
  } catch {
    step2Msg.textContent = "Network error. Please try again.";
    startBtn.disabled = false;
  }
});

// ── INIT ──────────────────────────────────────────────────
initGPS();
