const gymExercises = window.gymExercises || [];
const homeExercises = window.homeExercises || [];
const exercises = gymExercises; // default reference kept for modal compatibility

// Gym mandatory, Home optional
let selectedTypes = new Set(["Gym"]);
let gymSelectedSet = new Set();
let homeSelectedSet = new Set();

// Which set is the modal currently operating on
let activeSet = gymSelectedSet;
let activeGridId = "gymTargetGrid";
let activeGrouped = {};

// ── DOM REFS ──────────────────────────────────────────────
const dot1 = document.getElementById("dot1");
const dot2 = document.getElementById("dot2");
const dot3 = document.getElementById("dot3");
const line1 = document.getElementById("line1");
const line2 = document.getElementById("line2");
const stepLabel = document.getElementById("stepLabel");
const targetModal = document.getElementById("targetModal");
const closeTargetModal = document.getElementById("closeTargetModal");
const targetTitle = document.getElementById("targetTitle");
const targetExerciseList = document.getElementById("targetExerciseList");
const exerciseSearch = document.getElementById("exerciseSearch");
const noResults = document.getElementById("noResults");
const modal = document.getElementById("exerciseModal");
const closeModal = document.getElementById("closeModal");
const modalExName = document.getElementById("modalExName");
const modalGif = document.getElementById("modalGif");
const modalInstructions = document.getElementById("modalInstructions");
const toggleInstructions = document.getElementById("toggleInstructions");

// ── SHOW / HIDE STEPS ─────────────────────────────────────
function showStep(id) {
  ["step-type", "step-gym", "step-home"].forEach((s) => {
    document.getElementById(s).classList.remove("visible");
  });
  document.getElementById(id).classList.add("visible");
}

// ── STEP 1: TYPE TOGGLE ───────────────────────────────────
function toggleType(type) {
  if (type === "Gym") return; // locked

  if (selectedTypes.has(type)) {
    selectedTypes.delete(type);
  } else {
    selectedTypes.add(type);
  }

  document
    .getElementById("typeHome")
    .classList.toggle("active", selectedTypes.has("Home"));
  document.getElementById("typeGym").classList.add("active");
}

// ── STEP 1 → STEP 2 ──────────────────────────────────────
function proceedToGym() {
  gymSelectedSet = new Set();
  homeSelectedSet = new Set();

  // Step indicator
  dot1.classList.remove("active");
  dot1.classList.add("done");
  dot2.classList.add("active");
  line1.classList.add("done");
  stepLabel.textContent = "Gym Exercises";

  // Build gym grid — all exercises (admin-curated in future)
  activeSet = gymSelectedSet;
  activeGrouped = buildGrouped(gymExercises);
  renderTargetGrid("gymTargetGrid", activeGrouped, gymSelectedSet);

  // Update Next button label
  const gymNextLabel = document.getElementById("gymNextLabel");
  gymNextLabel.textContent = selectedTypes.has("Home")
    ? "Next: Home Exercises"
    : "Create Plan";

  showStep("step-gym");
}

// ── STEP 2 BACK → STEP 1 ─────────────────────────────────
function goBackToType() {
  dot1.classList.add("active");
  dot1.classList.remove("done");
  dot2.classList.remove("active");
  line1.classList.remove("done");
  stepLabel.textContent = "Where will you work out?";
  showStep("step-type");
}

// ── STEP 2 → STEP 3 (or submit if Gym only) ──────────────
function proceedFromGym() {
  if (gymSelectedSet.size === 0) {
    document.getElementById("gymMessage").textContent =
      "Please select at least one gym exercise.";
    return;
  }
  document.getElementById("gymMessage").textContent = "";

  // If Home not selected — submit directly
  if (!selectedTypes.has("Home")) {
    submitPlans();
    return;
  }

  // Go to Step 3
  dot2.classList.remove("active");
  dot2.classList.add("done");
  dot3.classList.add("active");
  line2.classList.add("done");
  stepLabel.textContent = "Home Exercises";

  // Build home grid — home equipment only
  activeSet = homeSelectedSet;
  activeGrouped = buildGrouped(homeExercises);
  renderTargetGrid("homeTargetGrid", activeGrouped, homeSelectedSet);

  showStep("step-home");
}

// ── STEP 3 BACK → STEP 2 ─────────────────────────────────
function goBackToGym() {
  dot2.classList.add("active");
  dot2.classList.remove("done");
  dot3.classList.remove("active");
  line2.classList.remove("done");
  stepLabel.textContent = "Gym Exercises";

  activeSet = gymSelectedSet;
  activeGrouped = buildGrouped(gymExercises);
  renderTargetGrid("gymTargetGrid", activeGrouped, gymSelectedSet);

  showStep("step-gym");
}

// ── BUILD GROUPED ─────────────────────────────────────────
function buildGrouped(exList) {
  const grouped = {};
  exList.forEach((ex, index) => {
    if (!grouped[ex.target]) grouped[ex.target] = [];
    grouped[ex.target].push({ ...ex, index });
  });
  return grouped;
}

// ── RENDER TARGET GRID ────────────────────────────────────
function renderTargetGrid(gridId, grouped, selectedSet) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = "";

  Object.keys(grouped).forEach((target) => {
    const card = document.createElement("div");
    card.className = "target-card";
    card.dataset.target = target;
    updateCardLabel(card, target, grouped, selectedSet);
    card.onclick = () => openTargetModal(target, grouped, selectedSet, gridId);
    grid.appendChild(card);
  });
}

function updateCardLabel(card, target, grouped, selectedSet) {
  const count = (grouped[target] || []).filter((ex) =>
    selectedSet.has(ex.exerciseId),
  ).length;
  card.innerHTML =
    `<span>${target}</span>` +
    (count > 0 ? `<span class="muscle-count">${count} selected</span>` : "");
  card.classList.toggle("active", count > 0);
}

// ── OPEN TARGET MODAL ────────────────────────────────────
let currentGridId = null;

function openTargetModal(target, grouped, selectedSet, gridId) {
  currentGridId = gridId;
  activeSet = selectedSet;
  activeGrouped = grouped;

  targetTitle.textContent = target;
  targetExerciseList.innerHTML = "";
  exerciseSearch.value = "";
  noResults.style.display = "none";

  (grouped[target] || []).forEach((ex) => {
    const isSelected = selectedSet.has(ex.exerciseId);
    const row = document.createElement("div");
    row.className = "exercise-row" + (isSelected ? " selected" : "");
    row.dataset.name = ex.name.toLowerCase();

    row.innerHTML = `
      <div class="exercise-left">
        <input type="checkbox" value="${ex.exerciseId}" ${isSelected ? "checked" : ""}>
        <div class="exercise-info">
          ${ex.gifURL ? `<img class="exercise-gif" src="${ex.gifURL}" alt="${ex.name}" loading="lazy">` : ""}
          <span class="exercise-name">${ex.name}</span>
        </div>
      </div>
      <button class="info-btn" data-index="${ex.index}" type="button" title="View instructions">i</button>
    `;

    const checkbox = row.querySelector("input");

    row.onclick = (e) => {
      if (e.target.classList.contains("info-btn")) return;
      if (selectedSet.has(ex.exerciseId)) {
        selectedSet.delete(ex.exerciseId);
        checkbox.checked = false;
        row.classList.remove("selected");
      } else {
        selectedSet.add(ex.exerciseId);
        checkbox.checked = true;
        row.classList.add("selected");
      }
      const card = document.querySelector(
        `#${currentGridId} [data-target="${target}"]`,
      );
      if (card) updateCardLabel(card, target, grouped, selectedSet);
    };

    checkbox.onclick = (e) => e.stopPropagation();
    checkbox.onchange = () => {
      if (checkbox.checked) {
        selectedSet.add(ex.exerciseId);
        row.classList.add("selected");
      } else {
        selectedSet.delete(ex.exerciseId);
        row.classList.remove("selected");
      }
      const card = document.querySelector(
        `#${currentGridId} [data-target="${target}"]`,
      );
      if (card) updateCardLabel(card, target, grouped, selectedSet);
    };

    targetExerciseList.appendChild(row);
  });

  attachInfoButtons();
  targetModal.classList.remove("hidden");
  exerciseSearch.focus();
}

// ── SEARCH ───────────────────────────────────────────────
exerciseSearch.addEventListener("input", () => {
  const q = exerciseSearch.value.toLowerCase().trim();
  const rows = targetExerciseList.querySelectorAll(".exercise-row");
  let visible = 0;
  rows.forEach((row) => {
    const match = row.dataset.name.includes(q);
    row.classList.toggle("hidden", !match);
    if (match) visible++;
  });
  noResults.style.display = visible === 0 ? "block" : "none";
});

// ── INFO BUTTON ───────────────────────────────────────────
function attachInfoButtons() {
  document.querySelectorAll(".info-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const ex = exercises[btn.dataset.index];
      if (!ex) return;
      modalExName.textContent = ex.name;
      if (ex.gifURL) {
        modalGif.src = ex.gifURL;
        modalGif.style.display = "block";
      } else {
        modalGif.style.display = "none";
      }
      const steps = ex.instructions || [];
      modalInstructions.innerHTML = steps.length
        ? "<ul>" + steps.map((s) => `<li>${s}</li>`).join("") + "</ul>"
        : "<p>No instructions available.</p>";
      modalInstructions.classList.add("hidden");
      toggleInstructions.textContent = "Show Instructions";
      toggleInstructions.classList.remove("open");
      modal.classList.remove("hidden");
    };
  });
}

toggleInstructions.addEventListener("click", () => {
  const isHidden = modalInstructions.classList.toggle("hidden");
  toggleInstructions.textContent = isHidden
    ? "Show Instructions"
    : "Hide Instructions";
  toggleInstructions.classList.toggle("open", !isHidden);
});

// ── CLOSE MODALS ─────────────────────────────────────────
closeTargetModal.onclick = () => targetModal.classList.add("hidden");
closeModal.onclick = () => modal.classList.add("hidden");
targetModal.onclick = (e) => {
  if (e.target === targetModal) targetModal.classList.add("hidden");
};
modal.onclick = (e) => {
  if (e.target === modal) modal.classList.add("hidden");
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    targetModal.classList.add("hidden");
    modal.classList.add("hidden");
  }
});

// ── SUBMIT ────────────────────────────────────────────────
async function submitPlans() {
  const msgEl = selectedTypes.has("Home")
    ? document.getElementById("homeMessage")
    : document.getElementById("gymMessage");

  if (gymSelectedSet.size === 0) {
    document.getElementById("gymMessage").textContent =
      "Please select at least one gym exercise.";
    return;
  }

  if (selectedTypes.has("Home") && homeSelectedSet.size === 0) {
    document.getElementById("homeMessage").textContent =
      "Please select at least one home exercise.";
    return;
  }

  msgEl.textContent = "";

  // Build plans array
  const plans = [{ type: "Gym", exerciseIds: Array.from(gymSelectedSet) }];
  if (selectedTypes.has("Home")) {
    plans.push({ type: "Home", exerciseIds: Array.from(homeSelectedSet) });
  }

  try {
    const res = await fetch("/api/v1/workout-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plans }),
    });
    const data = await res.json();

    if (data.status === "success") {
      msgEl.style.color = "#16a34a";
      msgEl.textContent = `Workout plan${plans.length > 1 ? "s" : ""} created!`;
      setTimeout(() => {
        window.location.href = "/workoutPlan";
      }, 700);
    } else {
      msgEl.style.color = "var(--red)";
      msgEl.textContent = data.message || "Something went wrong.";
    }
  } catch (err) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "Network error. Please try again.";
  }
}
