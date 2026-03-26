// ==================================================
// CREATE CHALLENGE JS
// Split-panel modal: left = live GIF preview
// Right = MULTIPLE exercises per muscle (checkbox)
// ==================================================

const exercises = window.exercises || [];
const selectedByTarget = {}; // target -> Set of exerciseIds

const targetGrid = document.getElementById("targetGrid");
const targetModal = document.getElementById("targetModal");
const closeTargetModal = document.getElementById("closeTargetModal");
const targetTitle = document.getElementById("targetTitle");
const targetExerciseList = document.getElementById("targetExerciseList");
const selectedCountBadge = document.getElementById("selectedCountBadge");

// Left preview
const previewGif = document.getElementById("previewGif");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const previewName = document.getElementById("previewName");
const previewBadge = document.getElementById("previewBadge");

const form = document.querySelector("#createChallengeForm");
const formMessage = document.querySelector("#formMessage");

/* ── GROUP BY TARGET ── */
const grouped = {};
exercises.forEach((ex, index) => {
  if (!grouped[ex.target]) grouped[ex.target] = [];
  grouped[ex.target].push({ ...ex, index });
});

/* ── BUILD TARGET CARDS ── */
Object.keys(grouped).forEach((target) => {
  selectedByTarget[target] = new Set();
  const card = document.createElement("div");
  card.className = "target-card";
  card.dataset.target = target;
  card.dataset.count = "0";
  card.innerHTML = `<span>${target}</span>`;
  card.addEventListener("click", () => openTargetModal(target));
  targetGrid.appendChild(card);
});

/* ── UPDATE LEFT PREVIEW ── */
function updatePreview(ex) {
  if (!ex) {
    previewGif.classList.remove("loaded");
    previewGif.src = "";
    previewPlaceholder.style.opacity = "1";
    previewName.textContent = "";
    return;
  }
  previewName.textContent = ex.name || "";
  previewBadge.textContent = ex.target || "";
  if (ex.gifURL) {
    previewPlaceholder.style.opacity = "0";
    previewGif.classList.remove("loaded");
    previewGif.src = ex.gifURL;
    previewGif.onload = () => previewGif.classList.add("loaded");
  } else {
    previewGif.classList.remove("loaded");
    previewPlaceholder.style.opacity = "1";
  }
}

/* ── UPDATE TARGET CARD BADGE ── */
function updateTargetCard(target) {
  const card = document.querySelector(`[data-target="${target}"]`);
  if (!card) return;
  const count = selectedByTarget[target].size;
  card.dataset.count = count;
  card.classList.toggle("has-selection", count > 0);
}

/* ── UPDATE SELECTED COUNT BADGE IN MODAL ── */
function updateCountBadge(target) {
  const count = selectedByTarget[target].size;
  selectedCountBadge.textContent =
    count === 0 ? "0 selected" : `${count} selected`;
  selectedCountBadge.classList.toggle("has-items", count > 0);
}

/* ── OPEN TARGET MODAL ── */
function openTargetModal(target) {
  targetTitle.textContent = target;
  targetExerciseList.innerHTML = "";
  previewBadge.textContent = target;
  updatePreview(null);
  updateCountBadge(target);

  // Show preview of first selected if any
  const firstSelectedId = [...selectedByTarget[target]][0];
  if (firstSelectedId) {
    const selEx = exercises.find((e) => e.exerciseId === firstSelectedId);
    if (selEx) updatePreview(selEx);
  }

  grouped[target].forEach((ex) => {
    const isSelected = selectedByTarget[target].has(ex.exerciseId);
    const row = document.createElement("div");
    row.className = "exercise-row" + (isSelected ? " checked" : "");

    const stepsHtml = ex.instructions?.length
      ? `<ul class="accordion-steps">${ex.instructions.map((s) => `<li>${s}</li>`).join("")}</ul>`
      : `<p style="font-size:.85rem;color:var(--text-muted)">No instructions available.</p>`;

    row.innerHTML = `
      <div class="exercise-row-main">
        <div class="exercise-left">
          <input type="checkbox" name="exercise-${target}" value="${ex.exerciseId}" ${isSelected ? "checked" : ""}>
          <span class="exercise-name">${ex.name}</span>
        </div>
        <button class="instructions-toggle" type="button" aria-expanded="false">
          Instructions <span class="toggle-chevron">▾</span>
        </button>
      </div>
      <div class="exercise-accordion">
        <p class="accordion-label">How to perform</p>
        ${stepsHtml}
      </div>
    `;

    const checkbox = row.querySelector("input");
    const rowMain = row.querySelector(".exercise-row-main");
    const toggleBtn = row.querySelector(".instructions-toggle");
    const accordion = row.querySelector(".exercise-accordion");

    rowMain.addEventListener("mouseenter", () => updatePreview(ex));

    rowMain.addEventListener("click", (e) => {
      if (e.target === toggleBtn || toggleBtn.contains(e.target)) return;

      // Toggle selection
      if (selectedByTarget[target].has(ex.exerciseId)) {
        selectedByTarget[target].delete(ex.exerciseId);
        checkbox.checked = false;
        row.classList.remove("checked");
      } else {
        selectedByTarget[target].add(ex.exerciseId);
        checkbox.checked = true;
        row.classList.add("checked");
      }

      updatePreview(ex);
      updateTargetCard(target);
      updateCountBadge(target);
    });

    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = accordion.classList.toggle("open");
      toggleBtn.classList.toggle("open", isOpen);
      toggleBtn.setAttribute("aria-expanded", isOpen);
    });

    targetExerciseList.appendChild(row);
  });

  targetModal.classList.remove("hidden");

  // ── Reset search on modal open ──
  const searchInput = document.getElementById("exerciseSearch");
  if (searchInput) {
    searchInput.value = "";
    document
      .querySelectorAll(".exercise-row")
      .forEach((r) => r.classList.remove("ex-hidden"));
  }
}

/* ── CLOSE ── */
closeTargetModal.onclick = () => targetModal.classList.add("hidden");
targetModal.addEventListener("click", (e) => {
  if (e.target === targetModal) targetModal.classList.add("hidden");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") targetModal.classList.add("hidden");
});

/* ── EXERCISE SEARCH ── */
const exerciseSearch = document.getElementById("exerciseSearch");
if (exerciseSearch) {
  exerciseSearch.addEventListener("input", () => {
    const q = exerciseSearch.value.toLowerCase().trim();
    document.querySelectorAll(".exercise-row").forEach((row) => {
      const name =
        row.querySelector(".exercise-name")?.textContent.toLowerCase() || "";
      row.classList.toggle("ex-hidden", q !== "" && !name.includes(q));
    });
  });
}

/* ── SUBMIT ── */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;

  // Collect all selected exercise IDs across all targets
  const exerciseIds = Object.values(selectedByTarget).flatMap((set) => [
    ...set,
  ]);

  if (!name) {
    formMessage.textContent = "Please enter a challenge name.";
    return;
  }
  if (exerciseIds.length === 0) {
    formMessage.textContent = "Select at least one exercise.";
    return;
  }
  if (new Date(endTime) <= new Date(startTime)) {
    formMessage.textContent = "End time must be after start time.";
    return;
  }

  formMessage.textContent = "";

  try {
    const res = await fetch("/api/v1/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startTime, endTime, exerciseIds }),
    });

    const data = await res.json();

    if (data.status === "success") {
      formMessage.style.color = "#3a9e6a";
      formMessage.textContent = "Challenge created!";
      setTimeout(() => (location.href = "/challenges"), 700);
    } else {
      formMessage.style.color = "var(--red)";
      formMessage.textContent = data.message || "Something went wrong.";
    }
  } catch {
    formMessage.style.color = "var(--red)";
    formMessage.textContent = "Network error. Please try again.";
  }
});
