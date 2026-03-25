const exercises = window.exercises || [];
const selectedIds = window.selectedIds || [];
const planType = window.planType || "Gym";

const targetGrid = document.getElementById("targetGrid");
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
const form = document.getElementById("editWorkoutPlanForm");
const formMessage = document.getElementById("formMessage");

let selectedSet = new Set(selectedIds);

// ── GROUP BY TARGET ──────────────────────────────────────
const grouped = {};
exercises.forEach((ex, index) => {
  if (!grouped[ex.target]) grouped[ex.target] = [];
  grouped[ex.target].push({ ...ex, index });
});

// ── BUILD TARGET CARDS ───────────────────────────────────
Object.keys(grouped).forEach((target) => {
  const card = document.createElement("div");
  card.className = "target-card";
  card.dataset.target = target;
  updateCardLabel(card, target);
  card.onclick = () => openTargetModal(target);
  targetGrid.appendChild(card);
});

function updateCardLabel(card, target) {
  const count = grouped[target].filter((ex) =>
    selectedSet.has(ex.exerciseId),
  ).length;
  card.innerHTML =
    `<span>${target}</span>` +
    (count > 0 ? `<span class="muscle-count">${count} selected</span>` : "");
  card.classList.toggle("active", count > 0);
}

// ── OPEN TARGET MODAL ────────────────────────────────────
function openTargetModal(target) {
  targetTitle.textContent = target;
  targetExerciseList.innerHTML = "";
  exerciseSearch.value = "";
  noResults.style.display = "none";

  grouped[target].forEach((ex) => {
    const isSelected = selectedSet.has(ex.exerciseId);
    const row = document.createElement("div");
    row.className = "exercise-row" + (isSelected ? " selected" : "");
    row.dataset.name = ex.name.toLowerCase();

    row.innerHTML = `
      <div class="exercise-left">
        <input type="checkbox" name="exercise-${target}" value="${ex.exerciseId}" ${isSelected ? "checked" : ""}>
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
      const card = document.querySelector(`[data-target="${target}"]`);
      if (card) updateCardLabel(card, target);
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
      const card = document.querySelector(`[data-target="${target}"]`);
      if (card) updateCardLabel(card, target);
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

// ── TOGGLE INSTRUCTIONS ──────────────────────────────────
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
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const exerciseIds = Array.from(selectedSet);

  if (exerciseIds.length === 0) {
    formMessage.textContent = "Please select at least one exercise.";
    return;
  }

  formMessage.textContent = "";

  try {
    const res = await fetch("/api/v1/workout-plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: planType, exerciseIds }),
    });
    const data = await res.json();

    if (data.status === "success") {
      formMessage.style.color = "#16a34a";
      formMessage.textContent = `${planType} plan updated!`;
      setTimeout(() => {
        location.href = "/workoutPlan";
      }, 700);
    } else {
      formMessage.style.color = "var(--red)";
      formMessage.textContent = data.message || "Something went wrong.";
    }
  } catch (err) {
    formMessage.style.color = "var(--red)";
    formMessage.textContent = "Network error. Please try again.";
  }
});
