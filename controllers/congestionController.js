const GymAttendance = require("../models/gymAttendanceModel");
const GymSettings = require("../models/gymSettingsModel");
const formatHourAMPM = require("../utils/formatHourAMPM");
const catchAsync = require("../utils/catchAsync");

// ── HELPER ───────────────────────────────────────────────────
function congestionTier(count) {
  if (count === 0) return { label: "Empty", color: "#16a34a", emoji: "🟢" };
  if (count <= 5) return { label: "Light", color: "#16a34a", emoji: "🟢" };
  if (count <= 10) return { label: "Moderate", color: "#d97706", emoji: "🟡" };
  if (count <= 15) return { label: "Busy", color: "#dc2626", emoji: "🔴" };
  return { label: "Packed", color: "#dc2626", emoji: "🔴" };
}

// ── Read today's gym hours from DB ────────────────────────────
async function getTodaySchedule() {
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
  const todayName = days[new Date().getDay()];
  const todaySchedule = gymSettings.schedule.find((s) => s.day === todayName);

  const isOpen = todaySchedule ? todaySchedule.isOpen : true;
  const openHour = todaySchedule ? todaySchedule.openingHour : 6;
  const closeHour = todaySchedule ? todaySchedule.closingHour : 23;

  return { isOpen, openHour, closeHour, schedule: gymSettings.schedule };
}

// ============================================================
// GET /api/v1/gymspire/congestion
// ============================================================
exports.getCongestionPrediction = catchAsync(async (req, res, next) => {
  const { isOpen, openHour, closeHour, schedule } = await getTodaySchedule();

  // ── 1. Aggregate avg visitors by hour ─────────────────────
  const byHour = await GymAttendance.aggregate([
    {
      $group: {
        _id: {
          $hour: { date: "$checkinTime", timezone: "Asia/Manila" },
        },
        totalVisits: { $sum: 1 },
        days: {
          $addToSet: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$checkinTime",
              timezone: "Asia/Manila",
            },
          },
        },
      },
    },
    {
      $project: {
        hour: "$_id",
        totalVisits: 1,
        uniqueDays: { $size: "$days" },
        avgVisitors: {
          $round: [{ $divide: ["$totalVisits", { $size: "$days" }] }, 1],
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // ── 2. Build full 24-hour map using DB schedule ───────────
  // isOpen = within today's opening-closing range AND gym is open today
  const hourMap = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    time: formatHourAMPM(h),
    avgVisitors: 0,
    tier: congestionTier(0),
    isOpen: isOpen && h >= openHour && h < closeHour,
  }));

  byHour.forEach((b) => {
    if (b.hour >= 0 && b.hour < 24) {
      hourMap[b.hour].avgVisitors = b.avgVisitors;
      hourMap[b.hour].tier = congestionTier(b.avgVisitors);
    }
  });

  // ── 3. Open hours only (within admin schedule) ────────────
  const openHours = hourMap.filter((h) => h.isOpen);

  const peakHour = openHours.length
    ? openHours.reduce(
        (max, h) => (h.avgVisitors > max.avgVisitors ? h : max),
        openHours[0],
      )
    : null;

  const bestHours = [...openHours]
    .sort((a, b) => a.avgVisitors - b.avgVisitors)
    .slice(0, 3);

  // ── 4. Avg visitors by day of week ────────────────────────
  const byDay = await GymAttendance.aggregate([
    {
      $group: {
        _id: {
          $dayOfWeek: { date: "$checkinTime", timezone: "Asia/Manila" },
        },
        totalVisits: { $sum: 1 },
        days: {
          $addToSet: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$checkinTime",
              timezone: "Asia/Manila",
            },
          },
        },
      },
    },
    {
      $project: {
        dayOfWeek: "$_id",
        avgVisitors: {
          $round: [{ $divide: ["$totalVisits", { $size: "$days" }] }, 1],
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Mark days that are closed in admin schedule
  const dayMap = dayNames.map((name, i) => {
    const fullDayName = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][i];
    const daySchedule = schedule.find((s) => s.day === fullDayName);
    return {
      name,
      avgVisitors: 0,
      tier: congestionTier(0),
      isOpen: daySchedule ? daySchedule.isOpen : true,
    };
  });

  byDay.forEach((d) => {
    const idx = d.dayOfWeek - 1;
    if (idx >= 0 && idx < 7) {
      dayMap[idx].avgVisitors = d.avgVisitors;
      dayMap[idx].tier = congestionTier(d.avgVisitors);
    }
  });

  // Best day = quietest open day
  const bestDay =
    [...dayMap]
      .filter((d) => d.isOpen)
      .sort((a, b) => a.avgVisitors - b.avgVisitors)[0] || dayMap[0];

  // ── 5. Today's prediction (remaining open hours only) ─────
  const currentHour = new Date().getHours();

  const todayPrediction = hourMap
    .filter((h) => h.isOpen && h.hour >= currentHour)
    .map((h) => ({ ...h, isPast: false }));

  // ── 6. Personal best time for THIS user ───────────────────
  let personalBest = null;

  if (req.user) {
    const userHistory = await GymAttendance.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: { $hour: { date: "$checkinTime", timezone: "Asia/Manila" } },
          visits: { $sum: 1 },
        },
      },
    ]);

    const userHours = new Set(userHistory.map((u) => u._id));
    const unusedQuiet = bestHours.filter((h) => !userHours.has(h.hour));
    personalBest = unusedQuiet[0] || bestHours[0] || null;
  }

  // ── 7. Data sufficiency ───────────────────────────────────
  const totalRecords = await GymAttendance.countDocuments();
  const hasEnoughData = totalRecords >= 10;

  res.status(200).json({
    status: "success",
    data: {
      hasEnoughData,
      totalRecords,
      hourlyAvg: hourMap,
      openHour,
      closeHour,
      gymOpenToday: isOpen,
      peakHour,
      bestHours,
      bestDay,
      todayPrediction,
      personalBest,
      dayMap,
    },
  });
});

// ============================================================
// GET /api/v1/gymspire/congestion/now
// Lightweight — for dashboard card live indicator
// ============================================================
exports.getCongestionNow = catchAsync(async (req, res, next) => {
  const now = new Date();
  const currentHour = now.getHours();

  const predicted = await GymAttendance.aggregate([
    {
      $group: {
        _id: { $hour: { date: "$checkinTime", timezone: "Asia/Manila" } },
        totalVisits: { $sum: 1 },
        days: {
          $addToSet: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$checkinTime",
              timezone: "Asia/Manila",
            },
          },
        },
      },
    },
    { $match: { _id: currentHour } },
    {
      $project: {
        avgVisitors: {
          $round: [{ $divide: ["$totalVisits", { $size: "$days" }] }, 1],
        },
      },
    },
  ]);

  const predictedLoad = predicted[0]?.avgVisitors ?? 0;

  const windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const actualLoad = await GymAttendance.countDocuments({
    checkinTime: { $gte: windowStart },
    $or: [{ checkoutTime: null }, { checkoutTime: { $gte: now } }],
  });

  res.status(200).json({
    status: "success",
    data: {
      predictedLoad,
      actualLoad,
      tier: congestionTier(actualLoad),
      hour: formatHourAMPM(currentHour),
    },
  });
});
