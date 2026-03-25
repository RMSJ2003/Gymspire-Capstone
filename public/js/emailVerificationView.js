(async () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const stateLoading = document.getElementById("stateLoading");
  const stateConfirm = document.getElementById("stateConfirm");
  const stateSuccess = document.getElementById("stateSuccess");
  const stateError = document.getElementById("stateError");
  const errorMsg = document.getElementById("errorMsg");
  const confirmBtn = document.getElementById("confirmBtn");

  function show(state) {
    [stateLoading, stateConfirm, stateSuccess, stateError].forEach((s) => {
      s.classList.remove("active");
    });
    state.classList.add("active");
  }

  // ── No token in URL ──────────────────────────────────
  if (!token) {
    errorMsg.textContent = "No verification token found in the link.";
    show(stateError);
    return;
  }

  // ── Step 1: Preview token — check if valid, get user info ──
  try {
    const res = await fetch(`/previewToken/${token}`);
    const data = await res.json();

    if (data.status !== "success") {
      errorMsg.textContent = data.message || "Token is invalid or has expired.";
      show(stateError);
      return;
    }

    // ── Step 2: Show confirmation — "Is this you?" ──────
    document.getElementById("confirmUsername").textContent = data.data.username;
    document.getElementById("confirmEmail").textContent = data.data.email;
    show(stateConfirm);

    // ── Step 3: User clicks confirm ─────────────────────
    confirmBtn.addEventListener("click", async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Verifying...";

      try {
        const verifyRes = await fetch(`/api/v1/auth/verifyEmail/${token}`, {
          method: "POST",
        });
        const verifyData = await verifyRes.json();

        if (verifyData.status === "success") {
          show(stateSuccess);
        } else {
          errorMsg.textContent = verifyData.message || "Verification failed.";
          show(stateError);
        }
      } catch (err) {
        errorMsg.textContent = "Network error. Please try again.";
        show(stateError);
      }
    });
  } catch (err) {
    errorMsg.textContent = "Something went wrong. Please try again.";
    show(stateError);
  }
})();
