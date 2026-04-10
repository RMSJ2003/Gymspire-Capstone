// ============================================================
// GYM CONGESTION — improved visualization
// ============================================================

const loadingState = document.getElementById("loadingState");
const contentWrap = document.getElementById("contentWrap");
const hourChart = document.getElementById("hourChart");
const dayChart = document.getElementById("dayChart");
const recTime = document.getElementById("recTime");
const recSub = document.getElementById("recSub");
const peakTimeEl = document.getElementById("peakTime");
const quietDayEl = document.getElementById("quietDay");
const totalRecordsEl = document.getElementById("totalRecords");
const lowDataBanner = document.getElementById("lowDataBanner");

const todayIdx = new Date().getDay();
const currentHour = new Date().getHours();

// ── Tier → color ─────────────────────────────────────────────
function tierColor(label) {
  return (
    {
      Empty: "#94a3b8",
      Light: "#22c55e",
      Moderate: "#f59e0b",
      Busy: "#f97316",
      Packed: "#ef4444",
    }[label] || "#94a3b8"
  );
}

// ── Tier → bg tint ───────────────────────────────────────────
function tierBg(label) {
  return (
    {
      Empty: "rgba(148,163,184,0.12)",
      Light: "rgba(34,197,94,0.10)",
      Moderate: "rgba(245,158,11,0.12)",
      Busy: "rgba(249,115,22,0.12)",
      Packed: "rgba(239,68,68,0.12)",
    }[label] || "rgba(148,163,184,0.08)"
  );
}

async function loadCongestion() {
  try {
    const res = await fetch("/api/v1/congestion");
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Failed to load");

    const d = json.data;

    // ── Low data warning ──────────────────────────────────
    if (!d.hasEnoughData) lowDataBanner.classList.remove("hidden");

    // ── Recommendation ────────────────────────────────────
    if (d.personalBest) {
      recTime.textContent = d.personalBest.time;
      recSub.textContent = `${d.personalBest.tier.emoji} ${d.personalBest.tier.label} — avg ${Math.max(0, d.personalBest.avgVisitors)} ${d.personalBest.avgVisitors === 1 ? "person" : "people"} at this time`;
    } else {
      recTime.textContent = "Not enough data";
      recSub.textContent =
        "Check in more often for a personalised recommendation";
    }

    // ── Hour chart ────────────────────────────────────────
    // Use openHour/closeHour from API (set by admin), not hardcoded
    const openHour = d.openHour ?? 6;
    const closeHour = d.closeHour ?? 23;

    const openHours = d.hourlyAvg.filter(
      (h) => h.hour >= openHour && h.hour < closeHour,
    );

    const maxVisitors = Math.max(
      ...openHours.map((h) => Math.max(0, h.avgVisitors)),
      1,
    );

    hourChart.innerHTML = "";

    openHours.forEach((h, idx) => {
      const isNow = h.hour === currentHour;
      const avg = Math.max(0, h.avgVisitors);
      const pct = avg > 0 ? Math.max((avg / maxVisitors) * 100, 4) : 3;
      const color = tierColor(h.tier.label);
      const bg = tierBg(h.tier.label);

      const row = document.createElement("div");
      row.className = "hour-row";
      row.style.animationDelay = `${idx * 0.035}s`;

      // Highlight current hour row
      if (isNow) {
        row.style.background = "rgba(210,83,83,0.04)";
        row.style.borderRadius = "8px";
        row.style.padding = "2px 0";
      }

      row.innerHTML = `
        <span class="hour-label ${isNow ? "current" : ""}">
  ${h.time}
</span>
        <div class="hour-bar-wrap" style="background:${bg};">
          <div class="hour-bar ${isNow ? "current-bar" : ""}"
               style="width:${pct}%; background: linear-gradient(90deg, ${color}dd, ${color}88);">
            ${avg >= 2 ? `<span class="hour-bar-label visible">${h.tier.label}</span>` : ""}
          </div>
        </div>
        <span class="hour-count" style="color:${avg > 0 ? color : "#ccc"};">
          ${avg > 0 ? `~${avg}` : "—"}
        </span>
      `;

      hourChart.appendChild(row);
    });

    // ── Weekly day bubbles ────────────────────────────────
    dayChart.innerHTML = "";

    d.dayMap.forEach((day, i) => {
      const isToday = i === todayIdx;
      const avg = Math.max(0, day.avgVisitors);
      const color = tierColor(day.tier.label);
      const isClosed = day.isOpen === false;

      const col = document.createElement("div");
      col.className = "day-col";

      col.innerHTML = `
        <span class="day-name ${isToday ? "today" : ""}"
              style="${isClosed ? "color:#ccc;" : ""}">
          ${day.name}
        </span>
        <div class="day-bubble"
             style="
               background: ${isClosed ? "#f4f4f5" : tierBg(day.tier.label)};
               border: 2px solid ${isClosed ? "#e5e5e5" : color + "66"};
               ${isToday ? `box-shadow: 0 0 0 3px ${color}33;` : ""}
               ${isClosed ? "opacity:0.45;" : ""}
             "
             title="${isClosed ? "Closed" : `${day.tier.label} — avg ${avg} people`}">
          ${isClosed ? "🔒" : day.tier.emoji}
        </div>
        <span class="day-avg" style="color:${isClosed ? "#ccc" : avg > 0 ? color : "#ccc"};">
          ${isClosed ? "Closed" : avg > 0 ? `~${avg}` : "—"}
        </span>
      `;

      dayChart.appendChild(col);
    });

    // ── Stats row ─────────────────────────────────────────
    peakTimeEl.textContent = d.peakHour?.time || "—";
    quietDayEl.textContent = d.bestDay?.name || "—";
    totalRecordsEl.textContent = d.totalRecords ?? "—";

    loadingState.classList.add("hidden");
    contentWrap.classList.remove("hidden");
  } catch (err) {
    console.error("Congestion load error:", err);
    loadingState.innerHTML = `
      <p style="color:#d25353;font-weight:600;font-size:0.85rem;">
        ⚠️ Could not load congestion data. Please try again.
      </p>`;
  }
}

loadCongestion();
