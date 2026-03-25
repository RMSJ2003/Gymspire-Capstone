const exercises = window.exercises || [];
const targetGrid = document.getElementById("targetGrid");
const targetModal = document.getElementById("targetModal");
const closeBtn = document.getElementById("closeTargetModal");
const targetTitle = document.getElementById("targetTitle");
const modalBody = document.getElementById("modalBody");
const muscleCount = document.getElementById("muscleCount");
const exerciseCount = document.getElementById("exerciseCount");
const pillMuscles = document.getElementById("pillMuscles");
const pillExercises = document.getElementById("pillExercises");
const searchInput = document.getElementById("prSearch");
const filterBtns = document.querySelectorAll(".pr-filter-btn");
const emptyState = document.getElementById("prEmptyState");
const sectionLabel = document.getElementById("sectionLabel");

let activeFilter = "all";
let searchQuery = "";

/* ── GROUP BY TARGET ── */
const grouped = {};
exercises.forEach((ex) => {
  if (!grouped[ex.target]) grouped[ex.target] = [];
  grouped[ex.target].push(ex);
});

/* ── BUILD CARDS ── */
const cardMap = {};
Object.keys(grouped)
  .sort()
  .forEach((target) => {
    const card = document.createElement("div");
    card.className = "target-card loading-pr";
    card.dataset.target = target;
    card.innerHTML = `
    <span class="card-trophy">🏆</span>
    <span class="card-muscle-name">${target}</span>
    <span class="card-pr-count" id="prCount-${target.replace(/\s+/g, "-")}">— PRs</span>
    <span class="card-no-pr">No PRs yet</span>
  `;
    card.addEventListener("click", () => openTargetModal(target));
    targetGrid.appendChild(card);
    cardMap[target] = card;
  });

/* ── PR CACHE ── */
const prCache = {};

/* ── LOAD ALL PRs — single request ── */
async function loadAllPRs() {
  try {
    const res = await fetch("/api/v1/prs/my-prs", { credentials: "include" });
    const data = await res.json();
    if (data.status === "success") {
      data.data.forEach((pr) => {
        prCache[pr.exercise] = pr;
      });
    }
  } catch {
    /* silent */
  }

  let totalWithPR = 0;
  const musclesWithPR = new Set();

  Object.keys(grouped).forEach((target) => {
    const card = cardMap[target];
    if (!card) return;
    card.classList.remove("loading-pr");

    const prCount = grouped[target].filter((ex) => prCache[ex.name]).length;
    if (prCount > 0) {
      card.classList.add("has-pr");
      const countEl = card.querySelector(
        `#prCount-${target.replace(/\s+/g, "-")}`,
      );
      if (countEl)
        countEl.textContent = `${prCount} PR${prCount !== 1 ? "s" : ""}`;
      musclesWithPR.add(target);
      totalWithPR += prCount;
    }
  });

  muscleCount.textContent = musclesWithPR.size;
  exerciseCount.textContent = totalWithPR;
  pillMuscles.classList.remove("loading");
  pillExercises.classList.remove("loading");
  applyFilters();
}

loadAllPRs();

/* ── SEARCH + FILTER ── */
function applyFilters() {
  const q = searchQuery.toLowerCase().trim();
  let visible = 0;

  Object.entries(cardMap).forEach(([target, card]) => {
    const matchesSearch =
      !q ||
      target.toLowerCase().includes(q) ||
      (grouped[target] || []).some((ex) => ex.name.toLowerCase().includes(q));

    const hasPR = card.classList.contains("has-pr");
    const matchesFilter =
      activeFilter === "has-pr"
        ? hasPR
        : activeFilter === "no-pr"
          ? !hasPR
          : true;

    const show = matchesSearch && matchesFilter;
    card.classList.toggle("pr-hidden", !show);
    if (show) visible++;
  });

  emptyState.classList.toggle("show", visible === 0);
  sectionLabel.textContent =
    visible === 0
      ? ""
      : activeFilter === "has-pr"
        ? "Muscles with personal records"
        : activeFilter === "no-pr"
          ? "Muscles without personal records yet"
          : q
            ? `Results for "${searchQuery}"`
            : "Select a muscle group";
}

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value;
  applyFilters();
});

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    applyFilters();
  });
});

/* ── OPEN MODAL ── */
function openTargetModal(target) {
  targetTitle.textContent = target;
  targetModal.classList.remove("hidden");
  renderExerciseList(target);
}

function renderExerciseList(target) {
  const exList = grouped[target] || [];
  modalBody.innerHTML = "";

  if (exList.length === 0) {
    modalBody.innerHTML = `<div class="empty-modal"><div class="icon">🏋️</div><p>No exercises found for <strong>${target}</strong>.</p></div>`;
    return;
  }

  const sorted = [...exList].sort(
    (a, b) => !!prCache[b.name] - !!prCache[a.name],
  );

  sorted.forEach((ex) => {
    const pr = prCache[ex.name];
    const row = document.createElement("div");
    row.className = "exercise-row" + (pr ? " has-pr-row" : "");
    row.innerHTML = `
      <span class="ex-row-icon">${pr ? "🏆" : "🏋️"}</span>
      <div class="ex-row-info">
        <div class="ex-row-name">${ex.name}</div>
        <div class="ex-row-sub ${pr ? "has-data" : ""}">
          ${pr ? `${pr.weight} ${pr.unit || "LB"} × ${pr.reps} reps` : "No PR yet"}
        </div>
      </div>
      <span class="ex-row-arrow">${pr ? "›" : ""}</span>
    `;
    if (pr)
      row.addEventListener("click", () => showPRCard(pr, ex.name, target));
    modalBody.appendChild(row);
  });
}

/* ── SHOW PR CARD ── */
function showPRCard(pr, exerciseName, target) {
  const date = new Date(pr.date).toDateString();
  modalBody.innerHTML = `
    <button class="back-btn-modal" id="backToList">← Back</button>
    <div class="pr-card">
      <div class="pr-card-top">
        <span class="trophy">🏆</span>
        <strong>Personal Record</strong>
      </div>
      <div class="pr-card-exercise">${pr.exercise || exerciseName}</div>
      <div class="pr-stats">
        <div class="pr-stat">
          <span class="pr-stat-label">Weight</span>
          <span class="pr-stat-value">${pr.weight}<span class="pr-stat-unit">${pr.unit || "LB"}</span></span>
        </div>
        <div class="pr-stat">
          <span class="pr-stat-label">Reps</span>
          <span class="pr-stat-value">${pr.reps}</span>
        </div>
        <div class="pr-stat">
          <span class="pr-stat-label">Est. 1RM</span>
          <span class="pr-stat-value">${Math.round(pr.weight * (1 + pr.reps / 30))}<span class="pr-stat-unit">${pr.unit || "LB"}</span></span>
        </div>
      </div>
      <div class="pr-date">📅 ${date}</div>
    </div>
  `;
  document
    .getElementById("backToList")
    .addEventListener("click", () => renderExerciseList(target));
}

/* ── CLOSE MODAL ── */
closeBtn.addEventListener("click", () => {
  targetModal.classList.add("hidden");
  modalBody.innerHTML = "";
});
targetModal.addEventListener("click", (e) => {
  if (e.target === targetModal) {
    targetModal.classList.add("hidden");
    modalBody.innerHTML = "";
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    targetModal.classList.add("hidden");
    modalBody.innerHTML = "";
  }
});
