const REST_SECONDS = 180;
const CIRCUMFERENCE = 2 * Math.PI * 15;

const RIR_TARGET = window.rirTarget ?? 2;
const OVERLOAD_THRESHOLD = window.overloadThreshold || 8;

/* ── HEALTH WARNING DISMISS ── */
const healthDismissBtn = document.querySelector(".health-warning-dismiss");
if (healthDismissBtn) {
  healthDismissBtn.addEventListener("click", () => {
    const banner = document.querySelector(".health-warning-banner");
    if (banner) {
      banner.style.transition = "opacity 0.3s, transform 0.3s";
      banner.style.opacity = "0";
      banner.style.transform = "translateX(-50%) translateY(12px)";
      setTimeout(() => banner.remove(), 320);
    }
  });
}

/* ── TOAST ── */
function showToast(message, type = "error") {
  const existing = document.getElementById("gymToast");
  if (existing) existing.remove();
  const colors = {
    error: { bg: "#d25353", icon: "✕" },
    success: { bg: "#22c55e", icon: "✓" },
    info: { bg: "#3b82f6", icon: "ℹ" },
    warning: { bg: "#f59e0b", icon: "⚠" },
  };
  const { bg, icon } = colors[type] || colors.error;
  const toast = document.createElement("div");
  toast.id = "gymToast";
  toast.style.cssText = `
    position:fixed;bottom:1.5rem;left:50%;
    transform:translateX(-50%) translateY(20px);
    background:${bg};color:white;
    padding:0.75rem 1.4rem;border-radius:0.75rem;
    font-family:Arial,sans-serif;font-size:0.88rem;font-weight:600;
    display:flex;align-items:center;gap:0.55rem;
    box-shadow:0 8px 24px rgba(0,0,0,0.18);
    z-index:9999;max-width:90vw;
    opacity:0;transition:opacity 0.25s ease,transform 0.25s ease;
    pointer-events:none;
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
  }, 3500);
}

/* ── CONFIRM MODAL ── */
function showConfirm(message, onConfirm, onCancel) {
  const existing = document.getElementById("workoutConfirmModal");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "workoutConfirmModal";
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:9998;padding:1rem;`;
  overlay.innerHTML = `
    <div style="background:white;border-radius:16px;padding:1.5rem;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:Arial,sans-serif;">
      <p style="margin:0 0 1.2rem;font-size:0.92rem;color:#1a1a1a;line-height:1.5;">${message}</p>
      <div style="display:flex;gap:0.6rem;justify-content:flex-end;">
        <button id="wlConfirmCancel" style="padding:0.5rem 1.1rem;border-radius:8px;border:1.5px solid #ddd;background:white;color:#555;font-weight:700;font-size:0.85rem;cursor:pointer;">Cancel</button>
        <button id="wlConfirmOk" style="padding:0.5rem 1.1rem;border-radius:8px;border:none;background:linear-gradient(135deg,#d25353,#b11226);color:white;font-weight:700;font-size:0.85rem;cursor:pointer;">Confirm</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#wlConfirmOk").addEventListener("click", () => {
    overlay.remove();
    onConfirm();
  });
  overlay.querySelector("#wlConfirmCancel").addEventListener("click", () => {
    overlay.remove();
    if (onCancel) onCancel();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (onCancel) onCancel();
    }
  });
}

/* ── CHOICE MODAL ── */
function showChoice(message, yesLabel, noLabel, onYes, onNo) {
  const existing = document.getElementById("workoutChoiceModal");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "workoutChoiceModal";
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:9998;padding:1rem;`;
  overlay.innerHTML = `
    <div style="background:white;border-radius:16px;padding:1.5rem;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:Arial,sans-serif;">
      <p style="margin:0 0 1.2rem;font-size:0.92rem;color:#1a1a1a;line-height:1.6;">${message}</p>
      <div style="display:flex;gap:0.6rem;justify-content:flex-end;">
        <button id="wlChoiceNo"  style="padding:0.5rem 1.1rem;border-radius:8px;border:1.5px solid #ddd;background:white;color:#555;font-weight:700;font-size:0.85rem;cursor:pointer;">${noLabel}</button>
        <button id="wlChoiceYes" style="padding:0.5rem 1.1rem;border-radius:8px;border:none;background:linear-gradient(135deg,#d25353,#b11226);color:white;font-weight:700;font-size:0.85rem;cursor:pointer;">${yesLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#wlChoiceYes").addEventListener("click", () => {
    overlay.remove();
    onYes();
  });
  overlay.querySelector("#wlChoiceNo").addEventListener("click", () => {
    overlay.remove();
    onNo();
  });
}

/* ── SPINNER BUILDER ── */
function buildSpinner({ min, max, step, value, setId, field }) {
  const wrap = document.createElement("div");
  wrap.className = "set-input-wrap";
  wrap.dataset.setId = setId;
  wrap.dataset.field = field;
  wrap.dataset.disabled = "true";

  const up = document.createElement("button");
  up.type = "button";
  up.className = "spin-btn";
  up.textContent = "▲";
  const display = document.createElement("div");
  display.className = "spin-display";
  display.textContent = value;
  display.dataset.value = value;
  display.dataset.setId = setId;
  display.dataset.field = field;
  const down = document.createElement("button");
  down.type = "button";
  down.className = "spin-btn";
  down.textContent = "▼";

  function inc() {
    if (wrap.dataset.disabled === "true") return;
    let v = parseInt(display.dataset.value) + step;
    if (v > max) v = max;
    display.dataset.value = v;
    display.textContent = v;
  }
  function dec() {
    if (wrap.dataset.disabled === "true") return;
    let v = parseInt(display.dataset.value) - step;
    if (v < min) v = min;
    display.dataset.value = v;
    display.textContent = v;
  }

  let holdTimer = null,
    holdInterval = null;
  function startHold(fn) {
    fn();
    holdTimer = setTimeout(() => {
      holdInterval = setInterval(fn, 80);
    }, 400);
  }
  function stopHold() {
    clearTimeout(holdTimer);
    clearInterval(holdInterval);
  }

  up.addEventListener("mousedown", () => startHold(inc));
  up.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startHold(inc);
  });
  down.addEventListener("mousedown", () => startHold(dec));
  down.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startHold(dec);
  });
  ["mouseup", "mouseleave", "touchend"].forEach((ev) => {
    up.addEventListener(ev, stopHold);
    down.addEventListener(ev, stopHold);
  });
  display.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (wrap.dataset.disabled === "true") return;
      e.deltaY < 0 ? inc() : dec();
    },
    { passive: false },
  );

  wrap.appendChild(up);
  wrap.appendChild(display);
  wrap.appendChild(down);
  setSpinnerDisabled(wrap, true);
  return wrap;
}

function setSpinnerDisabled(wrap, disabled) {
  wrap.dataset.disabled = disabled ? "true" : "false";
  wrap.classList.toggle("spinner-disabled", disabled);
  wrap.querySelectorAll(".spin-btn").forEach((btn) => {
    btn.disabled = disabled;
  });
}

/* ── UNIT TOGGLE BUILDER ── */
function buildUnitToggle(initialUnit, setId) {
  const wrap = document.createElement("div");
  wrap.className = "unit-toggle-wrap";
  wrap.dataset.unit = initialUnit || "LB";
  wrap.dataset.setId = setId;
  const lb = document.createElement("button");
  lb.type = "button";
  lb.className = "unit-toggle-btn";
  lb.textContent = "LB";
  const kg = document.createElement("button");
  kg.type = "button";
  kg.className = "unit-toggle-btn";
  kg.textContent = "KG";
  function update(unit) {
    wrap.dataset.unit = unit;
    lb.classList.toggle("unit-active", unit === "LB");
    kg.classList.toggle("unit-active", unit === "KG");
  }
  update(wrap.dataset.unit);
  lb.addEventListener("click", () => update("LB"));
  kg.addEventListener("click", () => update("KG"));
  wrap.appendChild(lb);
  wrap.appendChild(kg);
  return wrap;
}

/* ── TIMER BUILDER ── */
function buildTimer(totalSeconds) {
  const secs = totalSeconds || REST_SECONDS;
  const circ = CIRCUMFERENCE;
  const container = document.createElement("div");
  container.className = "rest-timer";
  const ring = document.createElement("div");
  ring.className = "timer-ring";
  ring.innerHTML = `<svg viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="15"/><circle class="progress" cx="18" cy="18" r="15" stroke-dasharray="${circ}" stroke-dashoffset="0"/></svg>`;
  const countdown = document.createElement("div");
  countdown.className = "timer-countdown";
  countdown.textContent = formatTime(secs);
  const skipBtn = document.createElement("button");
  skipBtn.type = "button";
  skipBtn.className = "timer-skip";
  skipBtn.textContent = "Skip ▶";
  container.appendChild(ring);
  container.appendChild(countdown);
  container.appendChild(skipBtn);

  let interval = null,
    remaining = secs,
    onDone = null;
  const progressCircle = ring.querySelector(".progress");

  function formatTime(s) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  }
  function updateRing() {
    progressCircle.style.strokeDashoffset = circ * (1 - remaining / secs);
    countdown.textContent = formatTime(remaining);
  }
  function finish() {
    clearInterval(interval);
    container.classList.remove("active");
    remaining = secs;
    updateRing();
    if (onDone) {
      onDone();
      onDone = null;
    }
  }
  function start(callback) {
    onDone = callback || null;
    clearInterval(interval);
    remaining = secs;
    updateRing();
    container.classList.add("active");
    interval = setInterval(() => {
      remaining--;
      updateRing();
      if (remaining <= 0) {
        clearInterval(interval);
        container.classList.remove("active");
        countdown.textContent = "GO! 💪";
        setTimeout(() => {
          countdown.textContent = formatTime(secs);
          if (onDone) {
            onDone();
            onDone = null;
          }
        }, 1500);
      }
    }, 1000);
  }
  skipBtn.addEventListener("click", finish);
  return { el: container, start };
}

const savedSetIds = new Set();

function renumberRows(tbody) {
  if (!tbody) return;
  let count = 0;
  tbody.querySelectorAll("tr[data-set-id]").forEach((tr) => {
    const cell = tr.querySelector(".set-num-cell");
    if (cell) cell.textContent = ++count;
  });
}

function allRowsDoneInCard(tbody) {
  const rows = tbody.querySelectorAll("tr[data-set-id]");
  if (!rows.length) return true;
  return Array.from(rows).every((tr) => tr.classList.contains("row-done"));
}

/* ── EXPANDABLE INSTRUCTIONS ── */
document.querySelectorAll(".ex-expand-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const exIndex = btn.dataset.exIndex;
    const details = document.getElementById(`exDetails-${exIndex}`);
    if (!details) return;
    const isHidden = details.classList.contains("hidden");
    details.classList.toggle("hidden", !isHidden);
    btn.textContent = isHidden ? "▾ Instructions" : "▸ Instructions";
  });
});

/* ── WARM-UP WIRING ── */
document.querySelectorAll(".warmup-section").forEach((section) => {
  const exIndex = section.id.replace("warmupSection-", "");
  const skipBtn = section.querySelector(".skip-warmup-btn");
  const workingSection = document.getElementById(`workingSection-${exIndex}`);
  const warmupTable = document.getElementById(`warmupTable-${exIndex}`);
  const estForm = document.getElementById(`estWeightForm-${exIndex}`);

  lockWorkingSection(workingSection);

  if (estForm) {
    const submitBtn = estForm.querySelector(".est-weight-submit");
    const input = estForm.querySelector(".est-weight-input");
    submitBtn.addEventListener("click", () => {
      const est = parseFloat(input.value);
      if (!est || est <= 0) {
        showToast("Please enter a valid weight.", "warning");
        return;
      }
      const pcts = [0.25, 0.5, 0.75];
      warmupTable.querySelectorAll(".warmup-row").forEach((row, i) => {
        const wuWeight = Math.round((est * pcts[i]) / 5) * 5;
        const cell = row.querySelector(".wu-weight-val");
        if (cell) cell.textContent = wuWeight > 0 ? wuWeight : "—";
      });
      estForm.style.display = "none";
      warmupTable.classList.remove("hidden");
      activateWuRows(section, exIndex, workingSection);
    });
  } else {
    activateWuRows(section, exIndex, workingSection);
  }

  skipBtn.addEventListener("click", () => {
    section.classList.add("warmup-done");
    section.style.opacity = "0.5";
    skipBtn.textContent = "✓ Warm-ups skipped";
    skipBtn.disabled = true;
    if (estForm) estForm.style.display = "none";
    unlockWorkingSection(workingSection, exIndex);
    showToast("Warm-ups skipped. Starting working sets.", "info");
  });
});

function activateWuRows(section, exIndex, workingSection) {
  const rows = Array.from(section.querySelectorAll(".warmup-row"));
  let currentWuIdx = 0;
  let timerRunning = false;

  function activateWuRow(idx) {
    if (idx >= rows.length) {
      section.classList.add("warmup-done");
      unlockWorkingSection(workingSection, exIndex);
      showToast("Warm-ups complete! Start your working sets.", "success");
      return;
    }
    const row = rows[idx];
    const startBtn = row.querySelector(".wu-start-btn");
    const doneBtn = row.querySelector(".wu-done-btn");
    const restSecs = parseInt(row.dataset.restSeconds) || 60;

    startBtn.disabled = false;
    startBtn.classList.add("wu-btn-active");

    startBtn.addEventListener(
      "click",
      () => {
        startBtn.style.display = "none";
        doneBtn.style.display = "";
        row.classList.add("wu-row-active");
      },
      { once: true },
    );
    doneBtn.addEventListener(
      "click",
      () => {
        if (timerRunning) return;
        doneBtn.disabled = true;
        row.classList.remove("wu-row-active");
        row.classList.add("wu-row-done");
        const timer = buildTimer(restSecs);
        timer.el.style.marginTop = "0.4rem";
        row.querySelector(".wu-action-cell").appendChild(timer.el);
        timerRunning = true;
        timer.start(() => {
          timerRunning = false;
          currentWuIdx++;
          activateWuRow(currentWuIdx);
        });
        const skipInTimer = timer.el.querySelector(".timer-skip");
        if (skipInTimer) {
          skipInTimer.addEventListener(
            "click",
            () => {
              timerRunning = false;
            },
            { once: true },
          );
        }
      },
      { once: true },
    );
  }
  activateWuRow(0);
}

function lockWorkingSection(ws) {
  if (!ws) return;
  ws.style.opacity = "0.4";
  ws.style.pointerEvents = "none";
  const lbl = ws.querySelector(".working-section-label");
  if (lbl)
    lbl.innerHTML =
      '💪 Working Sets <span style="font-size:0.7rem;color:#aaa;">(complete warm-ups first)</span>';
}

function unlockWorkingSection(ws) {
  if (!ws) return;
  ws.style.opacity = "";
  ws.style.pointerEvents = "";
  const firstStartBtn = ws.querySelector(".row-start-btn");
  if (firstStartBtn) firstStartBtn.disabled = false;
}

/* ── WIRE WORKING ROWS ── */
document.querySelectorAll(".exercise-card").forEach((card) => {
  const tbody = card.querySelector(".working-section tbody");
  const logId = document.getElementById("finish-btn")?.dataset.logId || "";
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr[data-set-id]"));
  if (!rows.length) return;

  const hasWarmups = !!card.querySelector(".warmup-section");
  const isBodyweight = card.dataset.isBodyweight === "true";

  const rowData = rows.map((tr, idx) => {
    const setId = tr.dataset.setId;
    const actionTd = tr.querySelector("td.action-cell");
    const isBodyweightRow = tr.dataset.isBodyweight === "true" || isBodyweight;
    const weightTd = tr.querySelector("td.weight-cell");
    const repsTd = tr.querySelector("td.reps-cell");
    const unit = weightTd ? weightTd.dataset.unit || "LB" : "LB";
    const initWeight = weightTd
      ? parseInt(weightTd.dataset.initWeight) || 0
      : 0;
    const initReps = Math.min(
      100,
      Math.max(1, parseInt(repsTd?.dataset.initReps) || 8),
    );

    let wSpinner = null;

    if (!isBodyweightRow && weightTd) {
      const weightRow = document.createElement("div");
      weightRow.className = "weight-row";
      wSpinner = buildSpinner({
        min: 0,
        max: 500,
        step: 5,
        value: initWeight,
        setId,
        field: "weight",
      });
      const unitToggle = buildUnitToggle(unit, setId);
      weightRow.appendChild(wSpinner);
      weightRow.appendChild(unitToggle);
      weightTd.innerHTML = "";
      weightTd.appendChild(weightRow);
    } else if (weightTd) {
      weightTd.innerHTML = `<span style="color:#aaa;font-style:italic;font-size:0.8rem;">—</span>`;
    }

    const rSpinner = buildSpinner({
      min: 1,
      max: 100,
      step: 1,
      value: initReps,
      setId,
      field: "reps",
    });
    if (repsTd) {
      repsTd.innerHTML = "";
      repsTd.appendChild(rSpinner);
    }

    actionTd.innerHTML = "";

    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "row-start-btn";
    startBtn.textContent = "Start";
    startBtn.disabled = true;
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "row-save-btn";
    saveBtn.textContent = "Save Set";
    saveBtn.disabled = true;
    saveBtn.style.display = "none";

    let removeBtn = null;
    if (idx > 0) {
      removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "row-remove-btn";
      removeBtn.textContent = "✕";
      removeBtn.style.cssText =
        "font-size:0.75rem;color:#aaa;background:none;border:1px solid #ddd;border-radius:4px;padding:2px 8px;cursor:pointer;margin-left:4px;";
    }

    const rowRestSeconds = parseInt(tr.dataset.restSeconds) || REST_SECONDS;
    const timer = buildTimer(rowRestSeconds);
    actionTd.appendChild(startBtn);
    actionTd.appendChild(saveBtn);
    if (removeBtn) actionTd.appendChild(removeBtn);
    actionTd.appendChild(timer.el);

    const alreadySaved = tr.dataset.saved === "true";
    if (alreadySaved) {
      savedSetIds.add(setId);
      tr.classList.add("row-done");
      if (!isBodyweightRow && weightTd) {
        weightTd.innerHTML = `<div class="weight-row"><span style="color:#166534;font-weight:700;">${initWeight}</span><span class="unit-side-label" style="color:#16a34a;">${unit}</span></div>`;
      }
      if (repsTd)
        repsTd.innerHTML = `<span style="color:#166534;font-weight:700;">${initReps}</span>`;
      actionTd.innerHTML = `<span style="color:#16a34a;font-weight:800;">✓</span>`;
    }

    return {
      tr,
      wSpinner,
      rSpinner,
      startBtn,
      saveBtn,
      removeBtn,
      timer,
      setId,
      alreadySaved,
      isBodyweightRow,
    };
  });

  // ── Enable correct Start button on load ──────────────
  const lastSavedIdx = rowData.reduce(
    (last, r, i) => (r.alreadySaved ? i : last),
    -1,
  );

  if (!hasWarmups) {
    // No warmups — enable first unsaved
    const firstUnsaved = rowData.find((r) => !r.alreadySaved);
    if (firstUnsaved) firstUnsaved.startBtn.disabled = false;
  } else {
    const warmupSection = card.querySelector(".warmup-section");
    const warmupsComplete =
      !warmupSection || warmupSection.classList.contains("warmup-done");

    if (warmupsComplete) {
      // Warmups done — enable next unsaved after last saved
      if (lastSavedIdx >= 0) {
        const nextRow = rowData[lastSavedIdx + 1];
        if (nextRow && !nextRow.alreadySaved) nextRow.startBtn.disabled = false;
      } else {
        const firstUnsaved = rowData.find((r) => !r.alreadySaved);
        if (firstUnsaved) firstUnsaved.startBtn.disabled = false;
      }
    }
  }

  // If some sets saved but warmups not marked done yet — unlock working section
  if (lastSavedIdx >= 0) {
    const workingSection = document.getElementById(
      `workingSection-${card.dataset.exIndex}`,
    );
    if (workingSection) {
      workingSection.style.opacity = "";
      workingSection.style.pointerEvents = "";
    }
    // Enable next unsaved (covers no-warmup case too)
    const nextRow = rowData[lastSavedIdx + 1];
    if (nextRow && !nextRow.alreadySaved) nextRow.startBtn.disabled = false;
  }

  // If all sets saved, fade warmup section
  const allSaved = rowData.every((r) => r.alreadySaved);
  if (allSaved) {
    const warmupSection = card.querySelector(".warmup-section");
    if (warmupSection) {
      warmupSection.classList.add("warmup-done");
      warmupSection.style.opacity = "0.5";
    }
  }

  rowData.forEach((rowObj) => {
    wireRow({ ...rowObj, logId, isBodyweight });
  });

  /* ── ADD SET ── */
  const addSetBtn = card.querySelector(".add-set-btn");
  if (addSetBtn) {
    addSetBtn.addEventListener("click", async () => {
      if (!allRowsDoneInCard(tbody)) {
        showToast(
          "Finish all current sets before adding a new one.",
          "warning",
        );
        return;
      }
      addSetBtn.disabled = true;
      addSetBtn.textContent = "Adding...";
      const exIndex = card.dataset.exIndex;
      try {
        const res = await fetch(
          `/api/v1/workout-logs/${logId}/exercises/${exIndex}/sets`,
          { method: "POST", credentials: "include" },
        );
        const data = await res.json();
        if (data.status === "success") {
          const { setId, setNumber, weight, reps, unit } = data.data;
          const newTr = buildDynamicRow({
            setId,
            setNumber,
            weight,
            reps,
            unit: unit || "LB",
            logId,
            isBodyweight,
          });
          tbody.appendChild(newTr);
          // Only enable Start immediately if no timer is currently running.
          // If a timer IS running, its onDone callback will enable this row
          // when it finishes or is skipped.
          const hasActiveTimer = !!card.querySelector(".rest-timer.active");
          if (!hasActiveTimer) {
            const newStartBtn = newTr.querySelector(".row-start-btn");
            if (newStartBtn) newStartBtn.disabled = false;
          }
          newTr.scrollIntoView({ behavior: "smooth", block: "center" });
          showToast(`Set ${setNumber} added!`, "success");
        } else {
          showToast(data.message || "Could not add set.", "error");
        }
      } catch (e) {
        showToast("Network error.", "error");
      } finally {
        addSetBtn.disabled = false;
        addSetBtn.textContent = "+ Add Set";
      }
    });
  }
});

/* ── WIRE ROW ── */
function wireRow({
  tr,
  wSpinner,
  rSpinner,
  startBtn,
  saveBtn,
  removeBtn,
  timer,
  setId,
  alreadySaved,
  logId,
  isBodyweight,
  isBodyweightRow,
}) {
  if (alreadySaved) return;

  const prevWeight = tr.dataset.prevWeight;
  const prevReps = tr.dataset.prevReps;
  const prevUnit = tr.dataset.prevUnit || "LB";
  const hasPrev = prevWeight !== "" && prevReps !== "";

  startBtn.addEventListener("click", () => {
    startBtn.disabled = true;
    startBtn.style.display = "none";
    if (wSpinner) setSpinnerDisabled(wSpinner, false);
    setSpinnerDisabled(rSpinner, false);
    saveBtn.disabled = false;
    saveBtn.style.display = "";
    if (removeBtn) removeBtn.style.display = "none";
    tr.classList.add("row-active");

    // ── Prev performance hint ──
    if (hasPrev && !tr.querySelector(".prev-hint-row")) {
      const hintRow = document.createElement("tr");
      hintRow.className = "prev-hint-row";
      const hintTd = document.createElement("td");
      hintTd.colSpan = isBodyweightRow ? 3 : 4;
      hintTd.innerHTML = `<div class="prev-hint"><span class="prev-hint-icon">🏆</span><span>Last time: ${isBodyweightRow ? "" : `<strong>${prevWeight} ${prevUnit}</strong> × `}<strong>${prevReps} reps</strong> — beat it!</span></div>`;
      hintRow.appendChild(hintTd);
      tr.before(hintRow);
    }

    // ── RIR target hint ──
    if (!tr.querySelector(".rir-hint-row")) {
      const rirRow = document.createElement("tr");
      rirRow.className = "rir-hint-row";
      const rirTd = document.createElement("td");
      rirTd.colSpan = isBodyweightRow ? 3 : 4;
      rirTd.innerHTML = `
        <div class="prev-hint" style="background:rgba(210,83,83,0.07);border-color:rgba(210,83,83,0.2);">
          <span class="prev-hint-icon">🎯</span>
          <span>Target: <strong>${OVERLOAD_THRESHOLD} reps @ RIR ${RIR_TARGET}</strong> — stop when you have <strong>${RIR_TARGET} rep${RIR_TARGET !== 1 ? "s" : ""} left</strong> in the tank.</span>
        </div>`;
      rirRow.appendChild(rirTd);
      tr.before(rirRow);
    }
  });

  saveBtn.addEventListener("click", async () => {
    const weight = wSpinner
      ? parseInt(wSpinner.querySelector(".spin-display").dataset.value)
      : 0;
    const reps = parseInt(
      rSpinner.querySelector(".spin-display").dataset.value,
    );

    if (!isBodyweightRow && weight === 0) {
      const wDisplay = wSpinner.querySelector(".spin-display");
      wDisplay.classList.add("spin-error");
      const wtd = wSpinner.closest("td");
      if (wtd && !wtd.querySelector(".weight-zero-err")) {
        const msg = document.createElement("span");
        msg.className = "weight-zero-err";
        msg.textContent = "Weight cannot be 0";
        wtd.appendChild(msg);
      }
      setTimeout(() => {
        wDisplay.classList.remove("spin-error");
        wtd && wtd.querySelector(".weight-zero-err")?.remove();
      }, 2500);
      return;
    }

    if (savedSetIds.has(setId)) return;
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const unitToggle = tr.querySelector(".unit-toggle-wrap");
    const selectedUnit = unitToggle ? unitToggle.dataset.unit : "LB";

    try {
      const res = await fetch(`/api/v1/workout-logs/${logId}/sets/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          updates: [
            {
              setId,
              weight: isBodyweightRow ? 0 : weight,
              reps,
              unit: isBodyweightRow ? "LB" : selectedUnit,
            },
          ],
        }),
      });
      const data = await res.json();

      if (data.status === "success") {
        savedSetIds.add(setId);
        saveBtn.textContent = "✓ Done";
        saveBtn.classList.add("saved");
        tr.classList.remove("row-active");
        tr.classList.add("row-done");
        if (wSpinner) setSpinnerDisabled(wSpinner, true);
        setSpinnerDisabled(rSpinner, true);
        if (!isBodyweightRow) showOverloadTip(tr, weight, reps, selectedUnit);

        timer.start(() => {
          const tbody = tr.closest("tbody");
          const allRows = Array.from(tbody.querySelectorAll("tr[data-set-id]"));
          const myIdx = allRows.indexOf(tr);
          const nextTr = allRows[myIdx + 1];
          if (nextTr) {
            const nextStart = nextTr.querySelector(".row-start-btn");
            if (nextStart) nextStart.disabled = false;
            nextTr.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });
      } else {
        saveBtn.textContent = "Save Set";
        saveBtn.disabled = false;
        showToast(data.message || "Error saving set.", "error");
      }
    } catch (err) {
      saveBtn.textContent = "Save Set";
      saveBtn.disabled = false;
      showToast("Network error. Please try again.", "error");
    }
  });

  if (removeBtn) {
    removeBtn.addEventListener("click", async () => {
      const exIndex = tr.closest(".exercise-card").dataset.exIndex;
      try {
        const res = await fetch(
          `/api/v1/workout-logs/${logId}/exercises/${exIndex}/sets/${setId}`,
          { method: "DELETE", credentials: "include" },
        );
        const data = await res.json();
        if (data.status === "success") {
          tr.remove();
          renumberRows(
            document.querySelector(
              `.exercise-card[data-ex-index="${exIndex}"] tbody`,
            ),
          );
          showToast("Set removed.", "info");
        } else {
          showToast(data.message || "Cannot remove set.", "error");
        }
      } catch (e) {
        showToast("Network error.", "error");
      }
    });
  }
}

/* ── BUILD DYNAMIC ROW ── */
function buildDynamicRow({
  setId,
  setNumber,
  weight,
  reps,
  unit,
  logId,
  isBodyweight,
}) {
  const tr = document.createElement("tr");
  tr.dataset.setId = setId;
  tr.dataset.saved = "false";
  tr.dataset.prevWeight = "";
  tr.dataset.prevReps = "";
  tr.dataset.prevUnit = unit;
  tr.dataset.isBodyweight = isBodyweight ? "true" : "false";

  const setNumTd = document.createElement("td");
  setNumTd.className = "set-num-cell";
  setNumTd.textContent = setNumber;

  let weightTd = null,
    wSpinner = null;
  if (!isBodyweight) {
    weightTd = document.createElement("td");
    weightTd.className = "weight-cell";
    weightTd.dataset.initWeight = weight;
    weightTd.dataset.unit = unit;
    const weightRow = document.createElement("div");
    weightRow.className = "weight-row";
    wSpinner = buildSpinner({
      min: 0,
      max: 500,
      step: 5,
      value: weight,
      setId,
      field: "weight",
    });
    const unitToggle = buildUnitToggle(unit, setId);
    weightRow.appendChild(wSpinner);
    weightRow.appendChild(unitToggle);
    weightTd.appendChild(weightRow);
  }

  const repsTd = document.createElement("td");
  repsTd.className = "reps-cell";
  repsTd.dataset.initReps = reps;
  const rSpinner = buildSpinner({
    min: 1,
    max: 100,
    step: 1,
    value: reps,
    setId,
    field: "reps",
  });
  repsTd.appendChild(rSpinner);

  const actionTd = document.createElement("td");
  actionTd.className = "action-cell";
  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "row-start-btn";
  startBtn.textContent = "Start";
  startBtn.disabled = true;
  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "row-save-btn";
  saveBtn.textContent = "Save Set";
  saveBtn.disabled = true;
  saveBtn.style.display = "none";
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "row-remove-btn";
  removeBtn.textContent = "✕";
  removeBtn.style.cssText =
    "font-size:0.75rem;color:#aaa;background:none;border:1px solid #ddd;border-radius:4px;padding:2px 8px;cursor:pointer;margin-left:4px;";
  const timer = buildTimer(REST_SECONDS); // dynamic rows use profile default

  actionTd.appendChild(startBtn);
  actionTd.appendChild(saveBtn);
  actionTd.appendChild(removeBtn);
  actionTd.appendChild(timer.el);
  tr.appendChild(setNumTd);
  if (weightTd) tr.appendChild(weightTd);
  tr.appendChild(repsTd);
  tr.appendChild(actionTd);

  wireRow({
    tr,
    wSpinner,
    rSpinner,
    startBtn,
    saveBtn,
    removeBtn,
    timer,
    setId,
    alreadySaved: false,
    logId,
    isBodyweight,
    isBodyweightRow: isBodyweight,
  });
  return tr;
}

const saveSetsBtn = document.getElementById("saveSetsBtn");
if (saveSetsBtn) saveSetsBtn.style.display = "none";

/* ── PROGRESSIVE OVERLOAD TIP (RIR-aware + smart increment) ── */
function showOverloadTip(tr, weight, reps, unit = "LB") {
  // ── Bodyweight exercises — deload by reducing reps ────
  const isBodyweightRow = tr.dataset.isBodyweight === "true";
  if (isBodyweightRow) {
    const existing = tr.nextSibling;
    if (existing && existing.classList?.contains("overload-tip-row"))
      existing.remove();

    const deloadReps = Math.round(reps * 0.5);
    let icon, message, type;

    if (reps >= OVERLOAD_THRESHOLD) {
      icon = "🔥";
      type = "level-up";
      message = `Target reps hit! Next session: try adding <strong>2–3 more reps</strong> before moving to a harder variation.`;
    } else if (reps >= OVERLOAD_THRESHOLD - 2) {
      icon = "💪";
      type = "push";
      message = `Almost there! Push to <strong>${OVERLOAD_THRESHOLD} reps</strong> next session.`;
    } else {
      icon = "🎯";
      type = "steady";
      message = `Keep building! Aim for <strong>${OVERLOAD_THRESHOLD} reps @ RIR ${RIR_TARGET}</strong>. If deloading, target <strong>${deloadReps} reps</strong> this week.`;
    }

    const tip = document.createElement("div");
    tip.className = `overload-tip overload-${type}`;
    tip.innerHTML = `<span class="overload-icon">${icon}</span><span>${message}</span>`;
    const tipRow = document.createElement("tr");
    tipRow.className = "overload-tip-row";
    const tipTd = document.createElement("td");
    tipTd.colSpan = 3;
    tipTd.appendChild(tip);
    tipRow.appendChild(tipTd);
    tr.after(tipRow);
    return; // skip weighted logic below
  }

  const existing = tr.nextSibling;
  if (existing && existing.classList?.contains("overload-tip-row"))
    existing.remove();

  const threshold = OVERLOAD_THRESHOLD;
  const nearThreshold = threshold - 2;
  const nextRir = Math.max(0, RIR_TARGET - 1);

  function getIncrement(w, u) {
    if (u === "KG") {
      if (w < 20) return 1.25;
      if (w < 60) return 2.5;
      return 5;
    } else {
      if (w < 45) return 2.5;
      if (w < 135) return 5;
      return 10;
    }
  }

  const increment = getIncrement(weight, unit);
  const nextWeight = weight + increment;
  const incrementStr = Number.isInteger(increment)
    ? increment
    : increment.toFixed(2).replace(/\.?0+$/, "");
  const nextStr = Number.isInteger(nextWeight)
    ? nextWeight
    : nextWeight.toFixed(2).replace(/\.?0+$/, "");

  let icon, message, type;

  if (reps >= threshold) {
    icon = "🔥";
    type = "level-up";
    message = `Target reps hit at RIR ${RIR_TARGET}! Next session: try <strong>RIR ${nextRir}</strong> first, then add <strong>+${incrementStr} ${unit} → ${nextStr} ${unit}</strong> if RIR ${nextRir} feels manageable.`;
  } else if (reps >= nearThreshold) {
    icon = "💪";
    type = "push";
    message = `Almost there! Push to <strong>${threshold} reps @ RIR ${RIR_TARGET}</strong> next session before adding weight.`;
  } else if (reps === nearThreshold - 1) {
    icon = "📈";
    type = "push";
    message = `Good effort! Aim for <strong>${reps + 1} reps</strong> next session, keeping RIR at ${RIR_TARGET}.`;
  } else {
    icon = "🎯";
    type = "steady";
    message = `Keep going! Build up to <strong>${threshold} reps @ RIR ${RIR_TARGET}</strong> before increasing weight.`;
  }

  const tip = document.createElement("div");
  tip.className = `overload-tip overload-${type}`;
  tip.innerHTML = `<span class="overload-icon">${icon}</span><span>${message}</span>`;
  const tipRow = document.createElement("tr");
  tipRow.className = "overload-tip-row";
  const tipTd = document.createElement("td");
  tipTd.colSpan = 4;
  tipTd.appendChild(tip);
  tipRow.appendChild(tipTd);
  tr.after(tipRow);
}

/* ── FINISH WORKOUT ── */
const finishBtn = document.getElementById("finish-btn");
if (finishBtn) {
  finishBtn.addEventListener("click", () => {
    const logId = finishBtn.dataset.logId;
    if (!allSetsSaved()) {
      const total = document.querySelectorAll("tr[data-set-id]").length;
      const saved = document.querySelectorAll(
        "tr[data-set-id].row-done",
      ).length;
      showFinishError(`Complete all sets first — ${saved} of ${total} saved.`);
      return;
    }
    const isChallenge = finishBtn.dataset.isChallenge === "true";
    if (isChallenge) {
      showChoice(
        `<strong>Upload a workout video?</strong><br><br>
        📹 <strong>With video:</strong> Your submission will be placed in the <strong>Verified Leaderboard</strong> once a coach reviews and approves your video.<br><br>
        🏃 <strong>Without video:</strong> Your submission will appear in the <strong>Unverified Leaderboard</strong> even after coach review.`,
        "Upload Video",
        "Skip & Finish",
        () => {
          const videoInput = document.querySelector(
            `.video-input[data-log-id="${logId}"]`,
          );
          videoInput.click();
          videoInput.onchange = () => {
            if (videoInput.files.length) {
              const file = videoInput.files[0];
              const MAX = 100 * 1024 * 1024;
              const allowed = [
                "video/mp4",
                "video/quicktime",
                "video/webm",
                "video/x-msvideo",
              ];
              if (!allowed.includes(file.type)) {
                showToast(
                  "Invalid file type. Upload MP4, MOV, WebM, or AVI.",
                  "error",
                );
                videoInput.value = "";
                return;
              }
              if (file.size > MAX) {
                showToast(
                  `Video too large (${(file.size / 1048576).toFixed(1)} MB). Max 100 MB.`,
                  "error",
                );
                videoInput.value = "";
                return;
              }
              const formData = new FormData();
              formData.append("video", file);
              showConfirm("Finish this workout? This cannot be undone.", () =>
                submitFinish(logId, formData),
              );
            }
          };
        },
        () => {
          showConfirm(
            "Finish without video? You will be placed in the unverified leaderboard.",
            () => submitFinish(logId, new FormData()),
          );
        },
      );
    } else {
      showConfirm("Finish this workout? This cannot be undone.", () =>
        submitFinish(logId, new FormData()),
      );
    }
  });
}

async function submitFinish(logId, formData) {
  try {
    const res = await fetch(`/api/v1/workout-logs/${logId}/finish`, {
      method: "PATCH",
      credentials: "include",
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Workout finished! Great job 💪", "success");
      setTimeout(() => location.reload(), 1200);
    } else {
      showToast(data.message || "Failed to finish workout.", "error");
    }
  } catch (err) {
    showToast("Something went wrong while finishing workout.", "error");
  }
}

const deloadDismiss = document.querySelector(".deload-dismiss");
if (deloadDismiss) {
  deloadDismiss.addEventListener("click", () => {
    const banner = document.querySelector(".deload-banner");
    if (banner) {
      banner.style.transition = "opacity 0.3s";
      banner.style.opacity = "0";
      setTimeout(() => banner.remove(), 320);
    }
  });
}

function allSetsSaved() {
  const totalRows = document.querySelectorAll("tr[data-set-id]");
  const savedRows = document.querySelectorAll("tr[data-set-id].row-done");
  return totalRows.length > 0 && savedRows.length === totalRows.length;
}

function showFinishError(msg) {
  let err = document.getElementById("finish-error-msg");
  if (!err) {
    err = document.createElement("p");
    err.id = "finish-error-msg";
    err.className = "finish-error-msg";
    finishBtn.insertAdjacentElement("afterend", err);
  }
  err.textContent = msg;
  err.style.display = "block";
  setTimeout(() => {
    err.style.display = "none";
  }, 3000);
}
