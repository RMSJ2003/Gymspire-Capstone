// ── TOAST ─────────────────────────────────────────────────
function showToast(message, type = "warning") {
  const existing = document.getElementById("gymToast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "gymToast";

  const colors = {
    error: { bg: "#d25353", icon: "✕" },
    success: { bg: "#22c55e", icon: "✓" },
    info: { bg: "#3b82f6", icon: "ℹ" },
    warning: { bg: "#f59e0b", icon: "⚠" },
  };
  const { bg, icon } = colors[type] || colors.warning;

  toast.style.cssText = `
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: ${bg};
    color: white;
    padding: 0.75rem 1.4rem;
    border-radius: 0.75rem;
    font-family: Arial, sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
    z-index: 9999;
    max-width: 90vw;
    text-align: center;
    opacity: 0;
    transition: opacity 0.25s ease, transform 0.25s ease;
    pointer-events: none;
  `;

  toast.innerHTML = `
    <span style="font-size:1rem;flex-shrink:0">${icon}</span>
    <span>${message}</span>
  `;

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

// ── GYM STATUS CHECK ──────────────────────────────────────
async function checkGymStatus() {
  try {
    const res = await fetch("/api/v1/users/me");
    const data = await res.json();
    return data?.data?.data?.gymStatus || "offline";
  } catch (e) {
    return "offline";
  }
}

// ==============================
// JOIN CHALLENGE
// ==============================
const joinButtons = document.querySelectorAll(".join-btn");
const joinMessage = document.querySelector("#joinMessage");

joinButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const joinCode = btn.dataset.joinCode;
    try {
      const res = await fetch(`/api/v1/challenges/${joinCode}/join`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast("Successfully joined the challenge!", "success");
        setTimeout(() => window.location.reload(), 700);
      } else {
        showToast(data.message || "Failed to join challenge.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Something went wrong while joining.", "error");
    }
  });
});

// ==============================
// LEADERBOARD (Two-Tier)
// ==============================
const leaderboardButtons = document.querySelectorAll(".leaderboard-btn");

// Returns the correct status badge HTML for a leaderboard row
function buildStatusBadge(row) {
  if (row.judgeStatus === "approved" && row.videoUrl) {
    return `<span class="lb-badge lb-verified">✔ Verified</span>`;
  }
  if (row.judgeStatus === "incomplete") {
    return `<span class="lb-badge lb-incomplete">✗ Incomplete</span>`;
  }
  if (row.videoUrl) {
    return `<span class="lb-badge lb-pending">⏳ Pending</span>`;
  }
  return `<span class="lb-badge lb-no-video">No Video</span>`;
}

leaderboardButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const challengeId = btn.dataset.challengeId;
    const container = document.querySelector(`#leaderboard-${challengeId}`);
    if (container.style.display === "block") {
      container.style.display = "none";
      btn.textContent = "🏆 Leaderboard";
      return;
    }
    try {
      const res = await fetch(`/api/v1/challenges/${challengeId}/leaderboard`);
      const data = await res.json();
      if (data.status !== "success") {
        container.innerHTML =
          "<p style='color:red'>Failed to load leaderboard.</p>";
        container.style.display = "block";
        return;
      }

      const leaderboard = data.data;
      if (leaderboard.length === 0) {
        container.innerHTML = "<p>No leaderboard data yet.</p>";
        container.style.display = "block";
        btn.textContent = "Hide Leaderboard";
        return;
      }

      const verified = leaderboard.filter(
        (r) => r.judgeStatus === "approved" && r.videoUrl,
      );
      const unverified = leaderboard.filter(
        (r) => !(r.judgeStatus === "approved" && r.videoUrl),
      );

      const buildRows = (rows, startRank) =>
        rows
          .map(
            (row, i) => `
          <tr>
            <td>#${startRank + i}</td>
            <td>${row.username}</td>
            <td>${row.strengthScore != null ? row.strengthScore.toFixed(2) : "—"}</td>
            <td>${buildStatusBadge(row)}</td>
          </tr>
        `,
          )
          .join("");

      let html = `
        <h4>Leaderboard</h4>
        <p class="lb-disclaimer">⚠️ Scores are estimated 1RM in KG using the Epley formula. LB weights are automatically converted for fair comparison.</p>
      `;

      if (verified.length) {
        html += `
          <p class="lb-tier-label lb-tier-verified">✔ Verified Submissions</p>
          <table>
            <tr><th>Rank</th><th>Username</th><th>Score</th><th>Status</th></tr>
            ${buildRows(verified, 1)}
          </table>`;
      }

      if (unverified.length) {
        html += `
          <p class="lb-tier-label lb-tier-unverified">⏳ Unverified Submissions</p>
          <table>
            <tr><th>Rank</th><th>Username</th><th>Score</th><th>Status</th></tr>
            ${buildRows(unverified, 1)}
          </table>`;
      }

      container.innerHTML = html;
      container.style.display = "block";
      btn.textContent = "Hide Leaderboard";
    } catch (err) {
      console.error(err);
      container.innerHTML =
        "<p style='color:red'>Error loading leaderboard.</p>";
      container.style.display = "block";
    }
  });
});

// ==============================
// START CHALLENGE
// ==============================
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("start-btn")) {
    const challengeId = e.target.dataset.challengeId;

    // ── GYM WARNING ──
    const gymStatus = await checkGymStatus();
    if (gymStatus !== "atGym" && gymStatus !== "logging") {
      showToast(
        "You are not checked in at the gym. Check in first so your attendance is recorded.",
        "warning",
      );
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    try {
      const res = await fetch(`/api/v1/workout-logs/challenge/${challengeId}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.status === "success") {
        window.location.href = `/workoutLogs/${data.data._id}`;
      } else if (
        data.message &&
        data.message.toLowerCase().includes("already have a workout log")
      ) {
        // Ongoing log exists — fetch it and redirect
        showToast("Redirecting to your ongoing workout...", "info");
        try {
          const logsRes = await fetch("/api/v1/workout-logs/my", {
            credentials: "include",
          });
          const logsData = await logsRes.json();
          const logs = logsData.data || [];
          const ongoing = logs.find(
            (l) =>
              l.challengeId &&
              l.challengeId.toString() === challengeId &&
              l.status === "ongoing",
          );
          if (ongoing) {
            setTimeout(() => {
              window.location.href = `/workoutLogs/${ongoing._id}`;
            }, 800);
          } else {
            showToast(data.message || "Cannot start challenge.", "error");
          }
        } catch {
          showToast(data.message || "Cannot start challenge.", "error");
        }
      } else {
        showToast(data.message || "Cannot start challenge.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Something went wrong while starting the challenge.", "error");
    }
  }
});
