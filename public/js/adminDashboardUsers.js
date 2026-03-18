// ============================================================
// ADMIN DASHBOARD — inline user table
// Fetches /api/v1/users, renders table, wires button actions
// via event delegation so dynamically added rows always work.
// The attendance drawer logic lives in users.js — this file
// just triggers it by calling the shared helpers exposed there.
// ============================================================

(async function () {
  const container = document.getElementById("userTableContainer");
  const statTotal = document.getElementById("statTotal");
  const statCoaches = document.getElementById("statCoaches");
  const statAdmins = document.getElementById("statAdmins");
  const statMembers = document.getElementById("statMembers");

  // ── Fetch ────────────────────────────────────────────────
  let users = [];
  try {
    const res = await fetch("/api/v1/users", { credentials: "include" });
    const json = await res.json();
    users = json.data?.users || json.data || json.users || [];
  } catch (err) {
    container.innerHTML = `<p style="color:#d25353;font-size:0.85rem;padding:1rem 0;">⚠️ Could not load users.</p>`;
    return;
  }

  // ── Stats ────────────────────────────────────────────────
  statTotal.textContent = users.length;
  statCoaches.textContent = users.filter((u) => u.userType === "coach").length;
  statAdmins.textContent = users.filter((u) => u.userType === "admin").length;
  statMembers.textContent = users.filter((u) => u.userType === "user").length;

  // ── Render ───────────────────────────────────────────────
  if (!users.length) {
    container.innerHTML = `<p class="empty-state" style="padding:1.5rem 0;">No users found.</p>`;
    return;
  }

  function gymStatusHtml(u) {
    if (u.gymStatus && u.gymStatus !== "offline") {
      const label = u.gymStatus === "logging" ? "🏋️ Logging" : "📍 At Gym";
      return `<span class="gym-status-badge at-gym"><span class="pulse-dot"></span>${label}</span>`;
    }
    return `<span class="gym-status-badge offline">Offline</span>`;
  }

  const rows = users
    .map(
      (u) => `
    <tr data-user-id="${u._id}">
      <td>
        <div class="avatar-wrap">
          <img class="profile-small"
            src="${u.pfpUrl || "/img/default-user.png"}"
            alt="${u.username}"
            onerror="this.onerror=null;this.src='/img/default-user.png'">
          <span class="status-dot ${u.gymStatus && u.gymStatus !== "offline" ? "online" : "offline"}"></span>
        </div>
      </td>
      <td>
        <div class="user-info">
          <span class="user-name">${u.username}</span>
          <span class="user-email">${u.email || ""}</span>
        </div>
      </td>
      <td><span class="role-badge role-${u.userType}">${u.userType}</span></td>
      <td>${gymStatusHtml(u)}</td>
      <td>
        <div class="action-btns">
          <button class="action-btn attendance-btn"
            data-user-id="${u._id}"
            data-username="${u.username}"
            data-pfp="${u.pfpUrl || "/img/default-user.png"}"
            title="View Attendance">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
            </svg>
            <span>Attendance</span>
          </button>
          <button class="action-btn delete-user-btn"
            data-user-id="${u._id}"
            title="Deactivate User">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
            <span>Deactivate</span>
          </button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");

  container.innerHTML = `
    <div class="table-wrapper">
      <table class="user-table">
        <thead>
          <tr>
            <th>Profile</th>
            <th>User</th>
            <th>Role</th>
            <th>Gym Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  // ── Event delegation — works for all dynamically added rows ──
  container.addEventListener("click", async (e) => {
    // ── Attendance ──
    const attBtn = e.target.closest(".attendance-btn");
    if (attBtn) {
      const { userId, username, pfp } = attBtn.dataset;
      // users.js exposes loadAttendance via the drawer — call it directly
      if (typeof window._loadAttendance === "function") {
        window._loadAttendance(userId, username, pfp);
      }
      return;
    }

    // ── Delete / Deactivate ──
    const delBtn = e.target.closest(".delete-user-btn");
    if (delBtn) {
      const userId = delBtn.dataset.userId;
      if (typeof window._showConfirm === "function") {
        window._showConfirm(
          "Are you sure you want to deactivate this user?",
          async () => {
            await doDelete(userId);
          },
        );
      } else if (confirm("Are you sure you want to deactivate this user?")) {
        await doDelete(userId);
      }
    }
  });

  async function doDelete(userId) {
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to deactivate user.");
        return;
      }
      // Remove row from DOM instantly
      const row = container.querySelector(`tr[data-user-id="${userId}"]`);
      if (row) row.remove();
      // Update stats
      const remaining = container.querySelectorAll("tbody tr").length;
      statTotal.textContent = remaining;
    } catch (err) {
      alert("Network error.");
    }
  }

  // ── Expose loadAttendance so the delegation above can call it ──
  // users.js wraps everything in DOMContentLoaded — after it runs,
  // its internal helpers aren't on window. We patch the drawer here.
  const drawer = document.getElementById("attendanceDrawer");
  const drawerOverlay = document.getElementById("drawerOverlay");
  const drawerPfp = document.getElementById("drawerPfp");
  const drawerUsername = document.getElementById("drawerUsername");
  const drawerBody = document.getElementById("drawerBody");
  const drawerTotalVisits = document.getElementById("drawerTotalVisits");
  const drawerThisMonth = document.getElementById("drawerThisMonth");
  const drawerAvgDuration = document.getElementById("drawerAvgDuration");

  if (drawer) {
    window._loadAttendance = async function (userId, username, pfp) {
      if (drawerPfp) {
        drawerPfp.src = pfp || "/img/default-user.png";
      }
      if (drawerUsername) drawerUsername.textContent = username;
      if (drawerTotalVisits) drawerTotalVisits.textContent = "—";
      if (drawerThisMonth) drawerThisMonth.textContent = "—";
      if (drawerAvgDuration) drawerAvgDuration.textContent = "—";
      if (drawerBody)
        drawerBody.innerHTML = `
        <div class="drawer-loading">
          <div class="spinner"></div>
          <p>Loading attendance...</p>
        </div>`;

      drawer.classList.add("open");
      drawerOverlay && drawerOverlay.classList.add("open");
      document.body.style.overflow = "hidden";

      try {
        const res = await fetch(`/api/v1/users/${userId}/attendance`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        renderAttendance(data.data || []);
      } catch {
        if (drawerBody)
          drawerBody.innerHTML = `<div class="no-attendance"><p>⚠️ Could not load attendance.</p></div>`;
      }
    };

    function renderAttendance(records) {
      const now = new Date();
      const thisMonth = records.filter((r) => {
        const d = new Date(r.checkinTime);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
      const withDur = records.filter((r) => r.durationMinutes > 0);
      const avg = withDur.length
        ? Math.round(
            withDur.reduce((s, r) => s + r.durationMinutes, 0) / withDur.length,
          )
        : null;

      if (drawerTotalVisits) drawerTotalVisits.textContent = records.length;
      if (drawerThisMonth) drawerThisMonth.textContent = thisMonth.length;
      if (drawerAvgDuration)
        drawerAvgDuration.textContent = avg != null ? avg : "—";

      if (!records.length) {
        if (drawerBody)
          drawerBody.innerHTML = `<div class="no-attendance"><p>No gym visits recorded yet.</p></div>`;
        return;
      }

      if (drawerBody)
        drawerBody.innerHTML = records
          .map((r) => {
            const ci = new Date(r.checkinTime);
            const co = r.checkoutTime ? new Date(r.checkoutTime) : null;
            const dateStr = ci.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const ciStr = ci.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
            const coStr = co
              ? co.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : "Still at gym";
            const dur =
              r.durationMinutes != null
                ? `${r.durationMinutes} min`
                : co
                  ? "< 1 min"
                  : "Ongoing";
            const icon = r.source === "workout" ? "🏋️" : "📍";
            return `
          <div class="attendance-record">
            <div class="record-icon ${r.source}">${icon}</div>
            <div class="record-info">
              <div class="record-date">${dateStr}</div>
              <div class="record-time">${ciStr} → ${coStr}</div>
              <div class="record-meta">
                <span class="record-source source-${r.source}">${r.source}</span>
                <span class="record-duration">⏱ ${dur}</span>
              </div>
            </div>
          </div>`;
          })
          .join("");
    }
  }

  // ── Expose confirm helper so delete btn can use the styled modal ──
  // users.js defines showConfirm internally — mirror it here
  window._showConfirm = function (message, onConfirm) {
    const existing = document.getElementById("confirmModal");
    if (existing) existing.remove();
    const overlay = document.createElement("div");
    overlay.id = "confirmModal";
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9998;padding:1rem;`;
    overlay.innerHTML = `
      <div style="background:white;border-radius:16px;padding:1.5rem;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:'DM Sans',Arial,sans-serif;">
        <p style="margin:0 0 1.2rem;font-size:0.9rem;color:#1a1a1a;line-height:1.5;">${message}</p>
        <div style="display:flex;gap:0.6rem;justify-content:flex-end;">
          <button id="confirmCancel" style="padding:0.45rem 1rem;border-radius:8px;border:1.5px solid #ddd;background:white;color:#555;font-weight:700;font-size:0.82rem;cursor:pointer;font-family:inherit;">Cancel</button>
          <button id="confirmOk" style="padding:0.45rem 1rem;border-radius:8px;border:none;background:linear-gradient(135deg,#d25353,#b11226);color:white;font-weight:700;font-size:0.82rem;cursor:pointer;font-family:inherit;">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#confirmOk").addEventListener("click", () => {
      overlay.remove();
      onConfirm();
    });
    overlay
      .querySelector("#confirmCancel")
      .addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
  };
})();
