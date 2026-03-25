document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("fatigueTbody");
  if (!tbody) return;
  loadFatigueTable();
  initFatigueControls();
});

async function loadFatigueTable() {
  const tbody = document.getElementById("fatigueTbody");

  try {
    const res = await fetch("/api/v1/workout-logs/members");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const members = json.data || [];

    if (!members.length) {
      tbody.innerHTML = `<tr class="fatigue-empty"><td colspan="4">No members found.</td></tr>`;
      return;
    }

    tbody.innerHTML = members.map(buildRow).join("");
  } catch (err) {
    console.error("[coachFatigue] Error:", err);
    tbody.innerHTML = `<tr class="fatigue-empty"><td colspan="4">Failed to load member data. Please refresh.</td></tr>`;
  }
}

/* ── Build a single <tr> ── */
function buildRow(member) {
  const avatar = `<img class="fatigue-avatar"
    src="${member.pfpUrl || "/img/default-user.png"}"
    alt="${member.username}"
    onerror="this.onerror=null;this.src='/img/default-user.png'">`;

  const logs = member.logs || [];

  const { lastText, lastClass } = computeLastSession(logs[0]);
  const { trendHTML } = computeTrend(logs);
  const { statusHTML, statusKey } = computeStatus(logs[0], logs);

  return `
    <tr data-member-name="${member.username.toLowerCase()}" data-status="${statusKey}">
      <td>
        <div class="fatigue-member">
          ${avatar}
          <span class="fatigue-name">${member.username}</span>
        </div>
      </td>
      <td><span class="fatigue-last ${lastClass}">${lastText}</span></td>
      <td>${trendHTML}</td>
      <td>${statusHTML}</td>
    </tr>
  `;
}

/* ── Last session label ── */
function computeLastSession(lastLog) {
  if (!lastLog) return { lastText: "No sessions yet", lastClass: "overdue" };

  const diffDays = Math.floor(
    (Date.now() - new Date(lastLog.date)) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return { lastText: "Today", lastClass: "" };
  if (diffDays === 1) return { lastText: "Yesterday", lastClass: "" };
  if (diffDays <= 3) return { lastText: `${diffDays} days ago`, lastClass: "" };
  return { lastText: `${diffDays} days ago`, lastClass: "overdue" };
}

/* ── Trend ── */
function computeTrend(logs) {
  if (!logs.length)
    return {
      trendHTML: `<span class="fatigue-trend trend-new">— No data</span>`,
    };
  if (logs.length === 1)
    return { trendHTML: `<span class="fatigue-trend trend-new">★ New</span>` };

  const vol = (log) =>
    log.totalVolume ?? (log.exercises ? log.exercises.length : 1);
  const recent = vol(logs[0]);
  const prev = vol(logs[1]);

  if (recent > prev)
    return {
      trendHTML: `<span class="fatigue-trend trend-up">↗ Improving</span>`,
    };
  if (recent < prev)
    return {
      trendHTML: `<span class="fatigue-trend trend-down">↘ Declining</span>`,
    };
  return {
    trendHTML: `<span class="fatigue-trend trend-flat">— Stalled</span>`,
  };
}

/* ── Status pill — now also returns statusKey for filtering ── */
function computeStatus(lastLog, logs) {
  if (!lastLog)
    return {
      statusHTML: `<span class="fatigue-status status-danger">🚨 Needs Attention</span>`,
      statusKey: "danger",
    };

  if (logs.length <= 1)
    return {
      statusHTML: `<span class="fatigue-status status-new">✦ Just Started</span>`,
      statusKey: "new",
    };

  const diffDays = Math.floor(
    (Date.now() - new Date(lastLog.date)) / (1000 * 60 * 60 * 24),
  );
  const vol = (log) =>
    log.totalVolume ?? (log.exercises ? log.exercises.length : 1);
  const recent = vol(logs[0]);
  const prev = vol(logs[1]);
  const isDeclining = recent < prev;

  if (diffDays > 5)
    return {
      statusHTML: `<span class="fatigue-status status-danger">🚨 Needs Attention</span>`,
      statusKey: "danger",
    };

  if (diffDays <= 2 && isDeclining)
    return {
      statusHTML: `<span class="fatigue-status status-warn">⚠️ Declining</span>`,
      statusKey: "warn",
    };

  if (diffDays <= 2)
    return {
      statusHTML: `<span class="fatigue-status status-ok">✅ On Track</span>`,
      statusKey: "ok",
    };

  return {
    statusHTML: `<span class="fatigue-status status-warn">⚠️ Check In</span>`,
    statusKey: "warn",
  };
}

/* ── Search + Filter + Pagination ── */
function initFatigueControls() {
  const ROWS = 8;
  const tbody = document.getElementById("fatigueTbody");
  const searchInput = document.getElementById("fatigueSearch");
  const statusFilter = document.getElementById("fatigueStatusFilter");
  const resultLabel = document.getElementById("fatigueResultLabel");
  const pagination = document.getElementById("fatiguePagination");
  const prevBtn = document.getElementById("fatiguePrevBtn");
  const nextBtn = document.getElementById("fatigueNextBtn");
  const pageInfo = document.getElementById("fatiguePageInfo");

  if (!tbody || !searchInput) return;

  let currentPage = 1;
  let visibleRows = [];

  function getRows() {
    return Array.from(tbody.querySelectorAll("tr[data-member-name]"));
  }

  function applyFilters() {
    const q = searchInput.value.toLowerCase().trim();
    const status = statusFilter.value;
    const rows = getRows();

    visibleRows = rows.filter((row) => {
      const name = (row.dataset.memberName || "").toLowerCase();
      const rowStatus = row.dataset.status || "";
      return (
        (!q || name.includes(q)) && (status === "all" || rowStatus === status)
      );
    });

    rows.forEach((r) => r.classList.add("f-hidden"));

    const total = visibleRows.length;
    const totalPages = Math.max(1, Math.ceil(total / ROWS));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * ROWS;
    const end = start + ROWS;

    visibleRows.forEach((r, i) => {
      if (i >= start && i < end) r.classList.remove("f-hidden");
    });

    if (resultLabel) {
      resultLabel.textContent =
        total === rows.length
          ? `${total} member${total !== 1 ? "s" : ""}`
          : `${total} of ${rows.length}`;
    }

    if (!pagination) return;
    if (total <= ROWS) {
      pagination.classList.add("hidden");
    } else {
      pagination.classList.remove("hidden");
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage === totalPages;
    }
  }

  searchInput.addEventListener("input", () => {
    currentPage = 1;
    applyFilters();
  });
  statusFilter.addEventListener("change", () => {
    currentPage = 1;
    applyFilters();
  });
  prevBtn?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      applyFilters();
    }
  });
  nextBtn?.addEventListener("click", () => {
    if (currentPage < Math.ceil(visibleRows.length / ROWS)) {
      currentPage++;
      applyFilters();
    }
  });

  // Re-run after table loads
  const observer = new MutationObserver(() => {
    currentPage = 1;
    applyFilters();
  });
  observer.observe(tbody, { childList: true });

  applyFilters();
}
