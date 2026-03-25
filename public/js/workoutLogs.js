const LOGS_PER_PAGE = 8;

const allCards = Array.from(document.querySelectorAll(".log-card"));
const noResults = document.getElementById("noResults");
const filterLabel = document.getElementById("filterLabel");
const pagination = document.getElementById("pagination");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");
const dateSearch = document.getElementById("dateSearch");
const clearDate = document.getElementById("clearDate");

let activeFilters = { type: "all", place: "all", status: "all" };
let activeDate = "";
let currentPage = 1;
let visibleCards = [];

// ── FILTER BUTTONS ────────────────────────────────────────
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const group = btn.dataset.group;
    const filter = btn.dataset.filter;

    // Update active state in group
    document
      .querySelectorAll(`.filter-btn[data-group="${group}"]`)
      .forEach((b) => {
        b.classList.remove("active");
      });
    btn.classList.add("active");

    activeFilters[group] = filter;
    currentPage = 1;
    applyFilters();
  });
});

// ── DATE FILTER ───────────────────────────────────────────
dateSearch.addEventListener("change", () => {
  activeDate = dateSearch.value;
  currentPage = 1;
  applyFilters();
});

clearDate.addEventListener("click", () => {
  dateSearch.value = "";
  activeDate = "";
  currentPage = 1;
  applyFilters();
});

// ── APPLY FILTERS ─────────────────────────────────────────
function applyFilters() {
  visibleCards = allCards.filter((card) => {
    const type = card.dataset.type;
    const place = card.dataset.place;
    const status = card.dataset.status;
    const date = card.dataset.date;

    if (activeFilters.type !== "all" && type !== activeFilters.type)
      return false;
    if (activeFilters.place !== "all" && place !== activeFilters.place)
      return false;
    if (activeFilters.status !== "all" && status !== activeFilters.status)
      return false;
    if (activeDate && date !== activeDate) return false;

    return true;
  });

  // Update label
  const total = visibleCards.length;
  filterLabel.textContent =
    total === allCards.length
      ? `Showing all ${total} log${total !== 1 ? "s" : ""}`
      : `Showing ${total} of ${allCards.length} log${allCards.length !== 1 ? "s" : ""}`;

  // Show/hide no results
  noResults.classList.toggle("hidden", total > 0);

  renderPage();
}

// ── RENDER PAGE ───────────────────────────────────────────
function renderPage() {
  const total = visibleCards.length;
  const totalPages = Math.max(1, Math.ceil(total / LOGS_PER_PAGE));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * LOGS_PER_PAGE;
  const end = start + LOGS_PER_PAGE;

  // Hide all cards first
  allCards.forEach((c) => c.classList.add("hidden"));

  // Show only current page cards
  visibleCards.forEach((c, i) => {
    if (i >= start && i < end) c.classList.remove("hidden");
  });

  // Pagination
  if (total <= LOGS_PER_PAGE) {
    pagination.classList.add("hidden");
  } else {
    pagination.classList.remove("hidden");
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  }
}

// ── PAGINATION BUTTONS ────────────────────────────────────
prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
nextBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(visibleCards.length / LOGS_PER_PAGE);
  if (currentPage < totalPages) {
    currentPage++;
    renderPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// ── INIT ─────────────────────────────────────────────────
applyFilters();

// ── FINISH MESSAGE ────────────────────────────────────────
const finishMessage = document.querySelector("#finishMessage");
const finishButtons = document.querySelectorAll(".finish-btn");

finishButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const workoutLogId = btn.dataset.logId;
    const isChallenge = btn.dataset.isChallenge === "true";
    const formData = new FormData();

    if (isChallenge) {
      const wantsVideo = confirm("Do you want to upload a video? (Optional)");
      if (wantsVideo) {
        const videoInput = document.querySelector(
          `.video-input[data-log-id="${workoutLogId}"]`,
        );
        videoInput.click();
        videoInput.onchange = async () => {
          if (videoInput.files.length)
            formData.append("video", videoInput.files[0]);
          await submitFinish(workoutLogId, formData);
        };
        return;
      }
    }
    await submitFinish(workoutLogId, formData);
  });
});

async function submitFinish(workoutLogId, formData) {
  try {
    const res = await fetch(`/api/v1/workout-logs/${workoutLogId}/finish`, {
      method: "PATCH",
      credentials: "include",
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      finishMessage.textContent = "Workout finished successfully!";
      finishMessage.style.color = "green";
      setTimeout(() => window.location.reload(), 700);
    } else {
      finishMessage.textContent = data.message || "Failed to finish workout.";
      finishMessage.style.color = "red";
    }
  } catch (err) {
    finishMessage.textContent = "Something went wrong.";
    finishMessage.style.color = "red";
  }
}
