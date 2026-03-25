// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function showToast(message, type = "info") {
  const existing = document.getElementById("exMgmtToast");
  if (existing) existing.remove();
  const colors = {
    error: { bg: "#d25353", icon: "✕" },
    success: { bg: "#22c55e", icon: "✓" },
    info: { bg: "#3b82f6", icon: "ℹ" },
    warning: { bg: "#f59e0b", icon: "⚠" },
  };
  const { bg, icon } = colors[type] || colors.info;
  const toast = document.createElement("div");
  toast.id = "exMgmtToast";
  toast.style.cssText = `
    position:fixed;bottom:1.5rem;left:50%;
    transform:translateX(-50%) translateY(20px);
    background:${bg};color:white;
    padding:0.75rem 1.4rem;border-radius:10px;
    font-family:'DM Sans',Arial,sans-serif;font-size:0.88rem;font-weight:600;
    display:flex;align-items:center;gap:0.55rem;
    box-shadow:0 8px 28px rgba(0,0,0,0.22);z-index:9999;
    max-width:90vw;opacity:0;
    transition:opacity 0.25s ease,transform 0.25s ease;pointer-events:none;
  `;
  toast.innerHTML = `<span style="font-size:1rem;flex-shrink:0">${icon}</span><span>${message}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

function showConfirm(
  message,
  onConfirm,
  { danger = false, requireText = null } = {},
) {
  const existing = document.getElementById("exMgmtConfirmModal");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "exMgmtConfirmModal";
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9998;padding:1rem;`;
  const inputHTML = requireText
    ? `
    <div style="margin-bottom:1rem;">
      <label style="font-size:0.8rem;color:#888;display:block;margin-bottom:4px;">
        Type <strong>${requireText}</strong> to confirm:
      </label>
      <input id="exMgmtConfirmInput" type="text" autocomplete="off"
        style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #ddd;border-radius:8px;font-size:0.88rem;font-family:'DM Sans',Arial,sans-serif;outline:none;box-sizing:border-box;"
        placeholder="${requireText}"/>
    </div>`
    : "";
  overlay.innerHTML = `
    <div style="background:white;border-radius:16px;padding:1.5rem;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:'DM Sans',Arial,sans-serif;">
      <p style="margin:0 0 1.2rem;font-size:0.92rem;color:#1a1a1a;line-height:1.5;">${message}</p>
      ${inputHTML}
      <p id="exMgmtConfirmError" style="color:#d25353;font-size:0.8rem;margin:0 0 0.75rem;display:none;"></p>
      <div style="display:flex;gap:0.6rem;justify-content:flex-end;">
        <button id="exMgmtCancel" style="padding:0.5rem 1.1rem;border-radius:8px;border:1.5px solid #ddd;background:white;color:#555;font-weight:700;font-size:0.85rem;cursor:pointer;font-family:'DM Sans',Arial,sans-serif;">Cancel</button>
        <button id="exMgmtOk" style="padding:0.5rem 1.1rem;border-radius:8px;border:none;background:linear-gradient(135deg,#d25353,#b11226);color:white;font-weight:700;font-size:0.85rem;cursor:pointer;font-family:'DM Sans',Arial,sans-serif;">Confirm</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const errorEl = overlay.querySelector("#exMgmtConfirmError");
  overlay.querySelector("#exMgmtOk").addEventListener("click", () => {
    if (requireText) {
      const input = overlay.querySelector("#exMgmtConfirmInput");
      if (input.value !== requireText) {
        errorEl.textContent = `Type exactly: ${requireText}`;
        errorEl.style.display = "block";
        return;
      }
    }
    overlay.remove();
    onConfirm();
  });
  overlay
    .querySelector("#exMgmtCancel")
    .addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // ── IMPORT ───────────────────────────────────────────────
  const importBtn = document.querySelector("#importExercisesBtn");
  const importMessage = document.querySelector("#importMessage");

  if (importBtn) {
    importBtn.addEventListener("click", () => {
      showConfirm(
        "This will call the ExerciseDB API.<br><br>• Takes several minutes<br>• Subject to rate limits<br><br>Do you want to continue?",
        async () => {
          importBtn.disabled = true;
          importBtn.textContent = "Importing...";
          importMessage.textContent = "Import started. Please wait...";
          importMessage.className = "msg";
          try {
            const res = await fetch("/api/v1/exercise-db-api", {
              method: "GET",
              credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) {
              importMessage.textContent =
                data.message || "Failed to import exercises.";
              importMessage.className = "msg error";
              importBtn.disabled = false;
              importBtn.textContent = "Import All Exercises";
              return;
            }
            importMessage.textContent = `Import completed! ${data.imported} exercises imported.`;
            importMessage.className = "msg success";
            showToast(`Imported ${data.imported} exercises.`, "success");
            setTimeout(() => window.location.reload(), 1200);
          } catch (err) {
            importMessage.textContent = "Network error during import.";
            importMessage.className = "msg error";
            importBtn.disabled = false;
            importBtn.textContent = "Import All Exercises";
          }
        },
      );
    });
  }

  // ── GYM EXERCISE SELECTOR ─────────────────────────────────
  const exercises = JSON.parse(
    document.getElementById("exercisesData")?.textContent || "[]",
  );
  const grid = document.getElementById("exerciseGrid");
  const gymSearch = document.getElementById("gymSearch");
  const muscleFilter = document.getElementById("muscleFilter");
  const equipFilter = document.getElementById("equipFilter");
  const selectedCount = document.getElementById("selectedCount");
  const gymStats = document.getElementById("gymStats");
  const saveGymBtn = document.getElementById("saveGymBtn");
  const gymMessage = document.getElementById("gymMessage");
  const noResults = document.getElementById("noResults");
  const selectAllCheck = document.getElementById("selectAllCheck");

  if (!grid || exercises.length === 0) {
    if (grid)
      grid.innerHTML = `<p style="color:#bbb;font-size:0.85rem;padding:1rem 0;grid-column:1/-1;">No exercises found. Import exercises first.</p>`;
  } else {
    // Populate filter dropdowns
    const muscles = [
      ...new Set(exercises.map((e) => e.target).filter(Boolean)),
    ].sort();
    const equips = [
      ...new Set(exercises.map((e) => e.equipment).filter(Boolean)),
    ].sort();

    muscles.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      muscleFilter.appendChild(opt);
    });
    equips.forEach((eq) => {
      const opt = document.createElement("option");
      opt.value = eq;
      opt.textContent = eq;
      equipFilter.appendChild(opt);
    });

    // Track selected
    const selectedSet = new Set(
      exercises.filter((e) => e.isGymExercise).map((e) => e.exerciseId),
    );

    function updateCount() {
      selectedCount.textContent = selectedSet.size;
      gymStats.innerHTML = `<span>${selectedSet.size}</span> selected`;
    }

    // Build cards
    exercises.forEach((ex) => {
      const card = document.createElement("div");
      card.className =
        "ex-card" + (selectedSet.has(ex.exerciseId) ? " selected" : "");
      card.dataset.name = (ex.name || "").toLowerCase();
      card.dataset.muscle = (ex.target || "").toLowerCase();
      card.dataset.equip = (ex.equipment || "").toLowerCase();
      card.dataset.id = ex.exerciseId;

      card.innerHTML = `
        <input type="checkbox" ${selectedSet.has(ex.exerciseId) ? "checked" : ""}>
        ${ex.gifURL ? `<img class="ex-card-gif" src="${ex.gifURL}" alt="${ex.name}" loading="lazy">` : ""}
        <div class="ex-card-info">
          <div class="ex-card-name">${ex.name || "Unnamed"}</div>
          <div class="ex-card-target">${ex.target || ""}</div>
          ${ex.equipment ? `<span class="ex-card-equip">${ex.equipment}</span>` : ""}
        </div>
        <button class="ex-card-info-btn" data-ex-id="${ex.exerciseId}" title="View Instructions"></button>`;

      const checkbox = card.querySelector("input[type=checkbox]");

      card.addEventListener("click", (e) => {
        if (e.target.type === "checkbox") return;
        checkbox.checked = !checkbox.checked;
        toggleCard(card, checkbox, ex.exerciseId);
      });
      checkbox.addEventListener("change", () => {
        toggleCard(card, checkbox, ex.exerciseId);
      });

      grid.appendChild(card);
    });

    function toggleCard(card, checkbox, id) {
      if (checkbox.checked) {
        selectedSet.add(id);
        card.classList.add("selected");
      } else {
        selectedSet.delete(id);
        card.classList.remove("selected");
      }
      // Keep checkbox in sync with card state
      checkbox.checked = selectedSet.has(id);
      updateCount();
    }

    updateCount();

    // ── FILTER / SEARCH ──────────────────────────────────
    function applyFilters() {
      const q = gymSearch.value.toLowerCase().trim();
      const muscle = muscleFilter.value.toLowerCase();
      const equip = equipFilter.value.toLowerCase();
      const cards = grid.querySelectorAll(".ex-card");
      let visible = 0;

      cards.forEach((card) => {
        const nameMatch = !q || card.dataset.name.includes(q);
        const muscleMatch = !muscle || card.dataset.muscle === muscle;
        const equipMatch = !equip || card.dataset.equip === equip;
        const show = nameMatch && muscleMatch && equipMatch;
        card.classList.toggle("hidden", !show);
        if (show) visible++;
      });

      noResults.style.display = visible === 0 ? "block" : "none";
      gymStats.innerHTML = `<span>${selectedSet.size}</span> selected`;
    }

    gymSearch.addEventListener("input", applyFilters);
    muscleFilter.addEventListener("change", applyFilters);
    equipFilter.addEventListener("change", applyFilters);

    // ── SELECT ALL VISIBLE ────────────────────────────────
    selectAllCheck.addEventListener("change", () => {
      const visibleCards = Array.from(
        grid.querySelectorAll(".ex-card:not(.hidden)"),
      );
      visibleCards.forEach((card) => {
        const checkbox = card.querySelector("input[type=checkbox]");
        checkbox.checked = selectAllCheck.checked;
        if (selectAllCheck.checked) {
          selectedSet.add(card.dataset.id);
          card.classList.add("selected");
        } else {
          selectedSet.delete(card.dataset.id);
          card.classList.remove("selected");
        }
      });
      updateCount();
    });

    // ── SAVE GYM EXERCISES ────────────────────────────────
    saveGymBtn.addEventListener("click", async () => {
      saveGymBtn.disabled = true;
      gymMessage.textContent = "Saving...";
      gymMessage.className = "msg";

      try {
        const res = await fetch("/api/v1/exercises/gym-exercises", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ gymExerciseIds: Array.from(selectedSet) }),
        });
        const data = await res.json();

        if (data.status === "success") {
          gymMessage.textContent = `✓ Saved ${selectedSet.size} gym exercises.`;
          gymMessage.className = "msg success";
          showToast(`${selectedSet.size} gym exercises saved.`, "success");
        } else {
          gymMessage.textContent = data.message || "Save failed.";
          gymMessage.className = "msg error";
        }
      } catch (err) {
        gymMessage.textContent = "Network error.";
        gymMessage.className = "msg error";
      } finally {
        saveGymBtn.disabled = false;
      }
    });
  }

  // ── EXERCISE INFO MODAL ───────────────────────────────
  const overlay = document.getElementById("exInfoOverlay");
  const closeBtn = document.getElementById("exInfoClose");
  const infoGif = document.getElementById("exInfoGif");
  const infoName = document.getElementById("exInfoName");
  const infoTarget = document.getElementById("exInfoTarget");
  const infoEquip = document.getElementById("exInfoEquip");
  const infoSteps = document.getElementById("exInfoSteps");

  // Build a lookup map
  const exMap = {};
  exercises.forEach((ex) => {
    exMap[ex.exerciseId] = ex;
  });

  function openExInfo(exerciseId) {
    const ex = exMap[exerciseId];
    if (!ex) return;

    infoGif.src = ex.gifURL || "";
    infoName.textContent = ex.name || "Unknown";
    infoTarget.textContent = ex.target || "";
    infoEquip.textContent = ex.equipment || "";
    infoEquip.style.display = ex.equipment ? "" : "none";

    if (ex.instructions && ex.instructions.length) {
      infoSteps.innerHTML = ex.instructions
        .map((step) => `<li>${step}</li>`)
        .join("");
      infoSteps.className = "ex-info-steps";
    } else {
      infoSteps.innerHTML = `<p class="ex-info-no-steps">No instructions available.</p>`;
    }

    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeExInfo() {
    overlay.classList.add("hidden");
    document.body.style.overflow = "";
    infoGif.src = ""; // stop GIF animation
  }

  closeBtn.addEventListener("click", closeExInfo);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeExInfo();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeExInfo();
  });

  // Event delegation for info buttons
  grid.addEventListener("click", (e) => {
    const infoBtn = e.target.closest(".ex-card-info-btn");
    if (!infoBtn) return;
    e.stopPropagation();
    openExInfo(infoBtn.dataset.exId);
  });

  // ── DELETE ALL ────────────────────────────────────────────
  const deleteBtn = document.querySelector("#deleteAllExercisesBtn");
  const deleteMessage = document.querySelector("#deleteMessage");

  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      showConfirm(
        "⚠️ This will <strong>DELETE ALL exercises</strong>.<br>This cannot be undone.",
        async () => {
          try {
            const res = await fetch("/api/v1/exercises", {
              method: "DELETE",
              credentials: "include",
            });
            if (res.status === 204 || res.ok) {
              deleteMessage.textContent = "All exercises deleted.";
              deleteMessage.className = "msg success";
              showToast("All exercises deleted.", "success");
              setTimeout(() => window.location.reload(), 800);
            } else {
              const data = await res.json();
              deleteMessage.textContent = data.message || "Failed.";
              deleteMessage.className = "msg error";
            }
          } catch (err) {
            deleteMessage.textContent = "Network error.";
            deleteMessage.className = "msg error";
          }
        },
        { danger: true, requireText: "DELETE ALL" },
      );
    });
  }
});
