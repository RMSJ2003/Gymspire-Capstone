const cron = require("node-cron");
const GymAttendance = require("../models/gymAttendanceModel");
const WorkoutLog = require("../models/workoutLogModel");
const User = require("../models/userModel");
const cloudinary = require("cloudinary").v2;
const Challenge = require("../models/challengeModel");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const MAX_CHECKIN_HOURS = 12;
const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

// ── HELPERS ──────────────────────────────────────────────────
function computeStrengthScore(workoutLog) {
  function toKg(weight, unit) {
    return unit === "LB" ? weight * 0.453592 : weight;
  }
  let bestScore = 0;
  workoutLog.exercises.forEach((ex) => {
    ex.set.forEach((s) => {
      if (s.type === "working" && s.weight > 0) {
        const weightKg = toKg(s.weight, s.unit || "LB");
        const estimated1RM = weightKg * (1 + s.reps / 30);
        if (estimated1RM > bestScore) bestScore = estimated1RM;
      }
    });
  });
  return Math.round(bestScore * 100) / 100;
}

async function closeAttendanceForUser(userId) {
  const now = new Date();
  const openRecords = await GymAttendance.find({
    user: userId,
    checkoutTime: null,
  });
  for (const record of openRecords) {
    record.checkoutTime = now;
    record.durationMinutes = Math.round((now - record.checkinTime) / 60000);
    await record.save();
  }
}

// ── All exercises must have ≥1 saved working set ─────────────
function allExercisesHaveOneSet(log) {
  return log.exercises.every((ex) =>
    ex.set.some((s) => s.type === "working" && s.saved),
  );
}

// ── Remove unsaved working sets entirely (not zero them) ──────
function removeUnsavedSets(log) {
  log.exercises.forEach((ex) => {
    ex.set = ex.set.filter((s) => {
      if (s.type === "working" && !s.saved) return false;
      return true;
    });
  });
}

// ── TWO-TIER AUTO-FINISH (home & challenge midnight cleanup) ──
async function autoFinishWorkoutLog(log) {
  if (!allExercisesHaveOneSet(log)) {
    await WorkoutLog.findByIdAndDelete(log._id);
    await closeAttendanceForUser(log.userId);
    await User.findByIdAndUpdate(log.userId, {
      isAtGym: false,
      gymStatus: "offline",
      gymCheckinTime: null,
    });
    console.log(
      `[AutoCheckout] ABANDONED log ${log._id} (user ${log.userId}) — not all exercises had ≥1 set`,
    );
    return;
  }

  removeUnsavedSets(log);
  log.status = "done";
  log.autoCompleted = true;
  if (log.challengeId) log.strengthScore = computeStrengthScore(log);
  log.markModified("exercises");
  await log.save({ validateBeforeSave: false });
  await closeAttendanceForUser(log.userId);
  await User.findByIdAndUpdate(log.userId, {
    isAtGym: false,
    gymStatus: "offline",
    gymCheckinTime: null,
  });
  console.log(
    `[AutoCheckout] COMPLETED log ${log._id} (user ${log.userId}) — all exercises had ≥1 set — autoCompleted: true`,
  );
}

// ── STALE CHECK-IN CLEANUP (runs every hour) ─────────────────
const runAutoCheckout = async () => {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - MAX_CHECKIN_HOURS * 60 * 60 * 1000);

    const staleRecords = await GymAttendance.find({
      checkoutTime: null,
      checkinTime: { $lt: cutoff },
    });

    if (staleRecords.length === 0) return;

    console.log(
      `[AutoCheckout] Found ${staleRecords.length} stale check-in(s). Closing...`,
    );

    for (const record of staleRecords) {
      const cappedCheckout = new Date(
        record.checkinTime.getTime() + MAX_CHECKIN_HOURS * 60 * 60 * 1000,
      );
      record.checkoutTime = cappedCheckout;
      record.durationMinutes = Math.round(
        (cappedCheckout - record.checkinTime) / 60000,
      );
      record.source = record.source || "manual";
      await record.save();
      await User.findByIdAndUpdate(record.user, {
        isAtGym: false,
        gymStatus: "offline",
        gymCheckinTime: null,
      });
      console.log(
        `[AutoCheckout] Auto-checked out user ${record.user} — capped at ${record.durationMinutes} min`,
      );
    }
  } catch (err) {
    console.error("[AutoCheckout] Error during auto-checkout:", err.message);
  }
};

// ── CLOSING HOUR CLEANUP — GYM WORKOUTS ONLY ─────────────────
const runClosingHourCleanup = async () => {
  try {
    const now = new Date();
    const nowPH = new Date(now.getTime() + PH_OFFSET_MS);

    const GymSettings = require("../models/gymSettingsModel");
    const gymSettings = await GymSettings.getSettings();
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const todaySchedule = gymSettings.schedule.find(
      (s) => s.day === days[nowPH.getUTCDay()],
    );

    const closeHour = todaySchedule ? todaySchedule.closingHour : 23;
    const gymIsOpen = todaySchedule ? todaySchedule.isOpen : true;
    const currentHour = nowPH.getUTCHours();

    if (gymIsOpen && currentHour < closeHour) return;
    if (!gymIsOpen && currentHour !== 0) return;

    console.log(
      `[AutoCheckout] Closing hour (${closeHour}:00) reached — running GYM cleanup...`,
    );

    const ongoingGymLogs = await WorkoutLog.find({
      status: "ongoing",
      place: "gym",
    });

    for (const log of ongoingGymLogs) {
      if (!allExercisesHaveOneSet(log)) {
        await WorkoutLog.findByIdAndDelete(log._id);
        await closeAttendanceForUser(log.userId);
        await User.findByIdAndUpdate(log.userId, {
          isAtGym: false,
          gymStatus: "offline",
          gymCheckinTime: null,
        });
        console.log(
          `[AutoCheckout] ABANDONED gym log ${log._id} (user ${log.userId}) — not all exercises had ≥1 set`,
        );
      } else {
        removeUnsavedSets(log);
        log.status = "done";
        log.autoCompleted = true;
        log.markModified("exercises");
        await log.save({ validateBeforeSave: false });
        console.log(
          `[AutoCheckout] COMPLETED gym log ${log._id} (user ${log.userId}) — autoCompleted`,
        );
      }
    }

    const openAttendance = await GymAttendance.find({ checkoutTime: null });
    for (const record of openAttendance) {
      record.checkoutTime = now;
      record.durationMinutes = Math.round((now - record.checkinTime) / 60000);
      await record.save();
    }
    if (openAttendance.length)
      console.log(
        `[AutoCheckout] Closed ${openAttendance.length} open attendance record(s).`,
      );

    const result = await User.updateMany(
      { gymStatus: { $ne: "offline" } },
      { gymStatus: "offline", isAtGym: false, gymCheckinTime: null },
    );
    if (result.modifiedCount)
      console.log(
        `[AutoCheckout] Reset gym status for ${result.modifiedCount} user(s).`,
      );
  } catch (err) {
    console.error("[AutoCheckout] Error in closing hour cleanup:", err.message);
  }
};

// ── MIDNIGHT CLEANUP — HOME & CHALLENGE WORKOUTS ONLY ────────
const runNextDayCleanup = async () => {
  try {
    const now = new Date();
    const nowPH = new Date(now.getTime() + PH_OFFSET_MS);
    if (nowPH.getUTCHours() !== 0 || nowPH.getUTCMinutes() !== 0) return;

    console.log("[AutoCheckout] Midnight — cleaning up HOME/CHALLENGE logs...");

    const ongoingLogs = await WorkoutLog.find({
      status: "ongoing",
      $or: [{ place: "home" }, { challengeId: { $exists: true, $ne: null } }],
    });

    if (ongoingLogs.length === 0) return;

    for (const log of ongoingLogs) {
      await autoFinishWorkoutLog(log);
    }

    console.log(
      `[AutoCheckout] Midnight cleanup done — processed ${ongoingLogs.length} log(s).`,
    );
  } catch (err) {
    console.error("[AutoCheckout] Error during next-day cleanup:", err.message);
  }
};

// ── EXPIRED CHALLENGE VIDEO CLEANUP (2 AM PH daily) ──────────
const runExpiredChallengeCleanup = async (bypassTimeCheck = false) => {
  try {
    const now = new Date();
    const nowPH = new Date(now.getTime() + PH_OFFSET_MS);
    if (
      !bypassTimeCheck &&
      (nowPH.getUTCHours() !== 2 || nowPH.getUTCMinutes() !== 0)
    )
      return;

    console.log("[AutoCheckout] Running expired challenge video cleanup...");

    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const expiredChallenges = await Challenge.find({
      endTime: { $lt: cutoff },
    });
    if (!expiredChallenges.length) return;

    const challengeIds = expiredChallenges.map((c) => c._id);
    const logsWithVideos = await WorkoutLog.find({
      challengeId: { $in: challengeIds },
      status: "done",
      videoUrl: { $exists: true, $ne: null },
    });

    let deleted = 0;
    for (const log of logsWithVideos) {
      try {
        const urlParts = log.videoUrl.split("/");
        const uploadIdx = urlParts.indexOf("upload");
        if (uploadIdx === -1) continue;
        const afterUpload = urlParts.slice(uploadIdx + 2).join("/");
        const publicId = afterUpload.replace(/\.[^/.]+$/, "");
        await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
        log.videoUrl = null;
        await log.save({ validateBeforeSave: false });
        deleted++;
      } catch (e) {
        console.error(
          `[AutoCheckout] Failed to delete video for log ${log._id}:`,
          e.message,
        );
      }
    }

    if (deleted > 0)
      console.log(
        `[AutoCheckout] Deleted ${deleted} expired challenge video(s) from Cloudinary.`,
      );
  } catch (err) {
    console.error(
      "[AutoCheckout] Error during expired challenge cleanup:",
      err.message,
    );
  }
};

// ── SCHEDULE ─────────────────────────────────────────────────
const startAutoCheckoutJob = () => {
  cron.schedule("0 * * * *", () => {
    console.log("[AutoCheckout] Running stale check-in cleanup...");
    runAutoCheckout();
  });

  cron.schedule("* * * * *", () => {
    runClosingHourCleanup();
    runNextDayCleanup();
    runExpiredChallengeCleanup();
  });

  console.log(
    `[AutoCheckout] Jobs scheduled — stale checkout after ${MAX_CHECKIN_HOURS}h, gym closing from DB schedule, midnight home/challenge cleanup.`,
  );
};

module.exports = {
  startAutoCheckoutJob,
  runAutoCheckout,
  runExpiredChallengeCleanup,
};
