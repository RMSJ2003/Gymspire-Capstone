document.addEventListener("DOMContentLoaded", () => {
  // ─────────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────────
  function showToast(message, type = "info") {
    const existing = document.getElementById("adminToast");
    if (existing) existing.remove();
    const colors = {
      error: { bg: "#d25353", icon: "✕" },
      success: { bg: "#22c55e", icon: "✓" },
      info: { bg: "#3b82f6", icon: "ℹ" },
      warning: { bg: "#f59e0b", icon: "⚠" },
    };
    const { bg, icon } = colors[type] || colors.info;
    const toast = document.createElement("div");
    toast.id = "adminToast";
    toast.style.cssText = `
      position:fixed;bottom:1.5rem;left:50%;
      transform:translateX(-50%) translateY(20px);
      background:${bg};color:white;
      padding:0.75rem 1.4rem;border-radius:10px;
      font-family:'DM Sans',Arial,sans-serif;font-size:0.88rem;font-weight:600;
      display:flex;align-items:center;gap:0.55rem;
      box-shadow:0 8px 28px rgba(0,0,0,0.22);z-index:9999;
      max-width:90vw;opacity:0;
      transition:opacity 0.25s ease,transform 0.25s ease;
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
    }, 4000);
  }

  // ─────────────────────────────────────────────
  // CONFIRM MODAL (replaces confirm())
  // ─────────────────────────────────────────────
  function showConfirm(message, onConfirm) {
    const existing = document.getElementById("confirmModal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "confirmModal";
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      z-index:9998;padding:1rem;
    `;

    overlay.innerHTML = `
      <div style="
        background:white;border-radius:16px;padding:1.5rem;
        max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);
        font-family:'DM Sans',Arial,sans-serif;
      ">
        <p style="margin:0 0 1.2rem;font-size:0.95rem;color:#1a1a1a;line-height:1.5;">${message}</p>
        <div style="display:flex;gap:0.6rem;justify-content:flex-end;">
          <button id="confirmCancel" style="
            padding:0.5rem 1.1rem;border-radius:8px;border:1.5px solid #ddd;
            background:white;color:#555;font-weight:700;font-size:0.85rem;cursor:pointer;
            font-family:'DM Sans',Arial,sans-serif;
          ">Cancel</button>
          <button id="confirmOk" style="
            padding:0.5rem 1.1rem;border-radius:8px;border:none;
            background:linear-gradient(135deg,#d25353,#b11226);color:white;
            font-weight:700;font-size:0.85rem;cursor:pointer;
            font-family:'DM Sans',Arial,sans-serif;
          ">Confirm</button>
        </div>
      </div>
    `;

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
  }

  // ─────────────────────────────────────────────
  // DELETE USER
  // ─────────────────────────────────────────────
  document.querySelectorAll(".delete-user-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const userId = btn.dataset.userId;

      showConfirm(
        "Are you sure you want to deactivate this user?",
        async () => {
          try {
            const res = await fetch(`/api/v1/users/${userId}`, {
              method: "DELETE",
              credentials: "include",
            });
            const data = await res.json();

            if (!res.ok) {
              showToast(data.message || "Failed to deactivate user.", "error");
              return;
            }
            showToast("User deactivated.", "success");
            setTimeout(() => window.location.reload(), 1000);
          } catch (err) {
            console.error(err);
            showToast("Network error.", "error");
          }
        },
      );
    });
  });

  // ─────────────────────────────────────────────
  // CLINIC APPROVE / DECLINE
  // ─────────────────────────────────────────────
  document.addEventListener("click", async (e) => {
    const approveBtn = e.target.closest(".approve-user-btn");
    const declineBtn = e.target.closest(".decline-user-btn");

    if (approveBtn) {
      await fetch(`/api/v1/clinic/approve/${approveBtn.dataset.userId}`, {
        method: "PATCH",
      });
      location.reload();
    }

    if (declineBtn) {
      await fetch(`/api/v1/clinic/decline/${declineBtn.dataset.userId}`, {
        method: "PATCH",
      });
      location.reload();
    }
  });

  // ─────────────────────────────────────────────
  // ATTENDANCE DRAWER
  // ─────────────────────────────────────────────
  const drawer = document.getElementById("attendanceDrawer");
  const overlay = document.getElementById("drawerOverlay");
  const drawerClose = document.getElementById("drawerClose");
  const drawerPfp = document.getElementById("drawerPfp");
  const drawerUsername = document.getElementById("drawerUsername");
  const drawerBody = document.getElementById("drawerBody");

  const drawerTotalVisits = document.getElementById("drawerTotalVisits");
  const drawerThisMonth = document.getElementById("drawerThisMonth");
  const drawerAvgDuration = document.getElementById("drawerAvgDuration");

  function openDrawer() {
    drawer.classList.add("open");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  drawerClose.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  async function loadAttendance(userId, username, pfp) {
    drawerPfp.src = pfp || "/img/default-user.png";
    drawerPfp.onerror = function () {
      this.onerror = null;
      this.src = "/img/default-user.png";
    };
    drawerUsername.textContent = username;
    drawerTotalVisits.textContent = "—";
    drawerThisMonth.textContent = "—";
    drawerAvgDuration.textContent = "—";
    drawerBody.innerHTML = `
      <div class="drawer-loading">
        <div class="spinner"></div>
        <p>Loading attendance...</p>
      </div>`;
    openDrawer();

    try {
      const res = await fetch(`/api/v1/users/${userId}/attendance`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load attendance");
      renderAttendance(data.data || []);
    } catch (err) {
      console.error(err);
      drawerBody.innerHTML = `<div class="no-attendance"><p>⚠️ Could not load attendance data.</p></div>`;
    }
  }

  function renderAttendance(records) {
    const now = new Date();
    const thisMonth = records.filter((r) => {
      const d = new Date(r.checkinTime);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
    const withDuration = records.filter(
      (r) => r.durationMinutes != null && r.durationMinutes > 0,
    );
    const avgDuration = withDuration.length
      ? Math.round(
          withDuration.reduce((sum, r) => sum + r.durationMinutes, 0) /
            withDuration.length,
        )
      : null;

    drawerTotalVisits.textContent = records.length;
    drawerThisMonth.textContent = thisMonth.length;
    drawerAvgDuration.textContent =
      avgDuration != null ? `${avgDuration}` : "—";

    if (!records.length) {
      drawerBody.innerHTML = `<div class="no-attendance"><p>No gym visits recorded yet.</p></div>`;
      return;
    }

    drawerBody.innerHTML = records
      .map((r) => {
        const checkin = new Date(r.checkinTime);
        const checkout = r.checkoutTime ? new Date(r.checkoutTime) : null;
        const dateStr = checkin.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const checkinTimeStr = checkin.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        const checkoutTimeStr = checkout
          ? checkout.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : "Still at gym";
        const icon = r.source === "workout" ? "🏋️" : "📍";
        const durText =
          r.durationMinutes != null
            ? `${r.durationMinutes} min`
            : checkout
              ? "< 1 min"
              : "Ongoing";

        return `
        <div class="attendance-record">
          <div class="record-icon ${r.source}">${icon}</div>
          <div class="record-info">
            <div class="record-date">${dateStr}</div>
            <div class="record-time">${checkinTimeStr} → ${checkoutTimeStr}</div>
            <div class="record-meta">
              <span class="record-source source-${r.source}">${r.source}</span>
              <span class="record-duration">⏱ ${durText}</span>
            </div>
          </div>
        </div>`;
      })
      .join("");
  }

  document.querySelectorAll(".attendance-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { userId, username, pfp } = btn.dataset;
      loadAttendance(userId, username, pfp);
    });
  });
});
