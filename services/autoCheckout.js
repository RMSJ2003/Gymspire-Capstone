// ============================================================
// autoCheckout.js
// Place this file in: services/autoCheckout.js
//
// Automatically checks out users who forgot to leave the gym.
// Runs every hour via node-cron.
//
// INSTALL: npm install node-cron
// SETUP:   require this file once in server.js (see bottom)
// ============================================================

const cron = require("node-cron");
const GymAttendance = require("../models/gymAttendanceModel");
const User = require("../models/userModel");

// ── CONFIG ──────────────────────────────────────────────────
// Max time a user can be "checked in" before auto-checkout
const MAX_CHECKIN_HOURS = 12; // adjust as needed (e.g. 8 for stricter)

// ── AUTO CHECKOUT LOGIC ──────────────────────────────────────
const runAutoCheckout = async () => {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - MAX_CHECKIN_HOURS * 60 * 60 * 1000);

    // Find all open attendance records older than the cutoff
    const staleRecords = await GymAttendance.find({
      checkoutTime: null,
      checkinTime: { $lt: cutoff },
    });

    if (staleRecords.length === 0) return;

    console.log(
      `[AutoCheckout] Found ${staleRecords.length} stale check-in(s). Closing...`,
    );

    for (const record of staleRecords) {
      // Cap the checkout time at MAX_CHECKIN_HOURS after checkin
      // so the duration is realistic and not inflated
      const cappedCheckout = new Date(
        record.checkinTime.getTime() + MAX_CHECKIN_HOURS * 60 * 60 * 1000,
      );

      const durationMs = cappedCheckout - record.checkinTime;
      record.checkoutTime = cappedCheckout;
      record.durationMinutes = Math.round(durationMs / 60000);
      record.source = record.source || "manual"; // preserve original source
      await record.save();

      // Reset user gym status
      await User.findByIdAndUpdate(record.user, {
        isAtGym: false,
        gymStatus: "offline",
        gymCheckinTime: null,
      });

      console.log(
        `[AutoCheckout] Auto-checked out user ${record.user} — duration capped at ${record.durationMinutes} min`,
      );
    }
  } catch (err) {
    console.error("[AutoCheckout] Error during auto-checkout:", err.message);
  }
};

// ── SCHEDULE ─────────────────────────────────────────────────
// Runs every hour at :00 — e.g. 1:00, 2:00, 3:00...
// Change "0 * * * *" to "*/30 * * * *" for every 30 minutes
const startAutoCheckoutJob = () => {
  cron.schedule("0 * * * *", () => {
    console.log("[AutoCheckout] Running scheduled auto-checkout check...");
    runAutoCheckout();
  });

  console.log(
    `[AutoCheckout] Job scheduled — auto-checkout after ${MAX_CHECKIN_HOURS}h of inactivity`,
  );
};

module.exports = { startAutoCheckoutJob, runAutoCheckout };
