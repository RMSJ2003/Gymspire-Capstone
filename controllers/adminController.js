const WorkoutLog = require("../models/workoutLogModel");
const User = require("../models/userModel");
const getGymspireTime = require("../utils/getGymspireTime");
const formatHourAMPM = require("../utils/formatHourAMPM");
const GymSettings = require("../models/gymSettingsModel");

const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getGymspireTime = catchAsync(async (req, res, next) => {
  const now = getGymspireTime();
  const hour24 = now.getHours();

  res.status(200).json({
    status: "success",
    gymspireTime: now,
    hour: `${formatHourAMPM(hour24)}`,
  });
});

exports.getGymUsageByHour = catchAsync(async (req, res, next) => {
  const usage = await WorkoutLog.aggregate([
    {
      $project: {
        hour: {
          $hour: {
            date: "$date",
            timezone: "Asia/Manila",
          },
        },
      },
    },
    {
      $group: {
        _id: "$hour",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const formatted = usage.map((u) => ({
    time: formatHourAMPM(u._id),
    count: u.count,
  }));

  res.status(200).json({
    status: "success",
    data: formatted,
  });
});

exports.getGymspireNowStatus = catchAsync(async (req, res, next) => {
  // ================================
  // STEP 1: Get current time
  // ================================
  const now = new Date();
  const currentHour = now.getHours();
  const currentTime = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // ================================
  // STEP 2: Load today's schedule from DB
  // ================================
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
  const todayName = days[now.getDay()];
  const todaySchedule = gymSettings.schedule.find((s) => s.day === todayName);

  const openHour = todaySchedule?.openingHour ?? 6;
  const closeHour = todaySchedule?.closingHour ?? 23;
  const gymIsOpen = todaySchedule?.isOpen ?? true;

  // ================================
  // STEP 3: Recent activity window (last 2 hours)
  // ================================
  const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  // ================================
  // STEP 4A: Users actively logging a workout (ongoing sessions)
  // ================================
  const onlineWorkoutLogs = await WorkoutLog.find({
    status: "ongoing",
    date: { $gte: startTime, $lt: now },
  }).populate("userId", "username pfpUrl gymStatus isAtGym");

  const onlineUsersMap = new Map();

  onlineWorkoutLogs.forEach((log) => {
    if (log.userId) {
      onlineUsersMap.set(log.userId._id.toString(), {
        _id: log.userId._id,
        username: log.userId.username,
        pfpUrl: log.userId.pfpUrl,
        gymStatus: "logging",
        isAtGym: log.userId.isAtGym || false,
      });
    }
  });

  // ================================
  // STEP 4B: Users checked in manually but no ongoing workout log
  // ================================
  const checkedInUsers = await User.find({
    gymStatus: "atGym",
    isAtGym: true,
  }).select("username pfpUrl gymStatus isAtGym");

  checkedInUsers.forEach((u) => {
    if (!onlineUsersMap.has(u._id.toString())) {
      onlineUsersMap.set(u._id.toString(), {
        _id: u._id,
        username: u.username,
        pfpUrl: u.pfpUrl,
        gymStatus: "atGym",
        isAtGym: true,
      });
    }
  });

  const onlineUsers = Array.from(onlineUsersMap.values());
  const currentLoad = onlineUsers.length;

  // ================================
  // STEP 5: Recommendation logic
  // ================================
  let recommended;
  let message;

  if (!gymIsOpen) {
    recommended = false;
    message = `The gym is closed today (${todayName}).`;
  } else if (currentHour < openHour || currentHour >= closeHour) {
    recommended = false;
    message = `The gym is currently closed. Hours today: ${formatHour12(openHour)} — ${formatHour12(closeHour)}.`;
  } else if (currentLoad <= 5) {
    recommended = true;
    message = "Recommended to workout now. Few people currently at the gym.";
  } else if (currentLoad <= 15) {
    recommended = true;
    message = "Workout is acceptable now. Moderate gym activity.";
  } else {
    recommended = false;
    message = "Not recommended to workout now. The gym is quite busy.";
  }

  // ================================
  // STEP 6: Attach to locals
  // ================================
  res.locals.currentTime = currentTime;
  res.locals.currentLoad = currentLoad;
  res.locals.recommended = recommended;
  res.locals.message = message;
  res.locals.onlineUsers = onlineUsers;
  res.locals.gymOpeningHour = openHour;
  res.locals.gymClosingHour = closeHour;
  res.locals.gymIsOpen = gymIsOpen;
  res.locals.gymSchedule = gymSettings.schedule;
  res.locals.todaySchedule = todaySchedule;
  res.locals.gymLat = gymSettings.gymLat || parseFloat(process.env.GYM_LAT);
  res.locals.gymLng = gymSettings.gymLng || parseFloat(process.env.GYM_LNG);
  res.locals.gymRadiusMeters =
    gymSettings.gymRadiusMeters ||
    parseInt(process.env.GYM_RADIUS_METERS) ||
    150;
  res.locals.gymName = gymSettings.gymName || "iAcademy Gym";

  next();
});

// ── Helper (add at top of adminController.js) ──────────────
function formatHour12(h) {
  if (h === 0) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}
exports.getGymHours = catchAsync(async (req, res, next) => {
  const settings = await GymSettings.getSettings();
  res.status(200).json({ status: "success", data: settings });
});

exports.updateGymHours = catchAsync(async (req, res, next) => {
  const { schedule } = req.body;
  if (!Array.isArray(schedule) || schedule.length !== 7)
    return next(new AppError("Schedule must contain all 7 days", 400));

  for (const day of schedule) {
    if (day.isOpen && day.openingHour >= day.closingHour)
      return next(
        new AppError(
          `${day.day}: Opening hour must be before closing hour`,
          400,
        ),
      );
  }

  const settings = await GymSettings.getSettings();
  settings.schedule = schedule;
  await settings.save();

  res.status(200).json({ status: "success", data: settings });
});
exports.updateGymLocation = catchAsync(async (req, res, next) => {
  const { gymName, gymLat, gymLng, gymRadiusMeters } = req.body;

  if (!gymLat || !gymLng)
    return next(new AppError("Latitude and longitude are required", 400));
  if (gymLat < -90 || gymLat > 90)
    return next(new AppError("Latitude must be between -90 and 90", 400));
  if (gymLng < -180 || gymLng > 180)
    return next(new AppError("Longitude must be between -180 and 180", 400));

  const settings = await GymSettings.getSettings();
  if (gymName) settings.gymName = gymName.trim();
  if (gymLat) settings.gymLat = Number(gymLat);
  if (gymLng) settings.gymLng = Number(gymLng);
  if (gymRadiusMeters) settings.gymRadiusMeters = Number(gymRadiusMeters);
  await settings.save();

  res.status(200).json({ status: "success", data: settings });
});
