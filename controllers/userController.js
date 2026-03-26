const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const User = require("../models/userModel");
const WorkoutLog = require("../models/workoutLogModel");
const WorkoutPlan = require("../models/workoutPlanModel");
const GymAttendance = require("../models/gymAttendanceModel");
const Challenge = require("../models/challengeModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");

// ============================================================
// CLOUDINARY CONFIG
// ============================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// ============================================================
// MULTER — memory storage, images only, 5 MB cap
// ============================================================
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new AppError("Please upload an image file", 400), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

exports.uploadUserPhoto = upload.single("pfp");

// ============================================================
// HELPER — upload buffer to Cloudinary
// ============================================================
const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "gymspire/users" },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });

// ============================================================
// HELPER — format hour to 12h AM/PM string
// ============================================================
function formatHour12(h) {
  if (h === 0) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

// ============================================================
// HELPER — Haversine distance in meters
// ============================================================
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// HELPER — close attendance record + clear user gym status
// ============================================================
const closeAttendance = async (userId) => {
  const now = new Date();

  const openRecord = await GymAttendance.findOne({
    user: userId,
    checkoutTime: null,
  }).sort({ checkinTime: -1 });

  if (openRecord) {
    const durationMs = now - openRecord.checkinTime;
    openRecord.checkoutTime = now;
    openRecord.durationMinutes = Math.round(durationMs / 60000);
    await openRecord.save();
  }

  await User.findByIdAndUpdate(userId, {
    isAtGym: false,
    gymStatus: "offline",
    gymCheckinTime: null,
  });
};

exports.closeAttendance = closeAttendance;

// ============================================================
// GET USER ATTENDANCE (admin)
// ============================================================
exports.getUserAttendance = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const records = await GymAttendance.find({ user: id })
    .sort({ checkinTime: -1 })
    .limit(100);

  res.status(200).json({
    status: "success",
    results: records.length,
    data: records,
  });
});

// ============================================================
// GYM CHECK-IN / CHECK-OUT
// PATCH /api/v1/users/gymCheckin
// Body: { status: "atGym" | "offline", latitude?, longitude? }
// ============================================================
exports.gymCheckin = catchAsync(async (req, res, next) => {
  const { status, latitude, longitude } = req.body;

  if (!["atGym", "offline"].includes(status)) {
    return next(new AppError('Status must be "atGym" or "offline"', 400));
  }

  if (status === "atGym") {
    // ── STEP 1: Enforce gym operating hours ──────────
    const GymSettings = require("../models/gymSettingsModel");
    const gymSettings = await GymSettings.getSettings();
    const now = new Date();
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
      (s) => s.day === days[now.getDay()],
    );

    if (!todaySchedule || !todaySchedule.isOpen) {
      return res.status(400).json({
        status: "fail",
        message: `The gym is closed today (${days[now.getDay()]}). Check-in is not available.`,
      });
    }

    const currentHour = now.getHours();
    if (
      currentHour < todaySchedule.openingHour ||
      currentHour >= todaySchedule.closingHour
    ) {
      return res.status(400).json({
        status: "fail",
        message: `The gym is currently closed. Today's hours: ${formatHour12(todaySchedule.openingHour)} — ${formatHour12(todaySchedule.closingHour)}.`,
      });
    }

    // ── STEP 2: GPS verification ──────────────────────
    if (!latitude || !longitude) {
      return res.status(400).json({
        status: "fail",
        message: "Location is required to check in at the gym.",
      });
    }

    // ── Read location from DB, fall back to env ───────
    const gymLat = gymSettings.gymLat || parseFloat(process.env.GYM_LAT);
    const gymLng = gymSettings.gymLng || parseFloat(process.env.GYM_LNG);
    const radius =
      gymSettings.gymRadiusMeters ||
      parseFloat(process.env.GYM_RADIUS_METERS) ||
      150;

    if (!gymLat || !gymLng) {
      return res.status(400).json({
        status: "fail",
        message:
          "Gym location has not been configured yet. Please contact the administrator.",
      });
    }

    const distance = getDistanceMeters(latitude, longitude, gymLat, gymLng);

    if (distance > radius) {
      return res.status(400).json({
        status: "fail",
        message: `You must be at the gym to check in. You are ${Math.round(distance)}m away.`,
      });
    }

    // ── STEP 3: Record check-in ───────────────────────
    const checkinTime = new Date();

    await User.findByIdAndUpdate(req.user.id, {
      isAtGym: true,
      gymStatus: "atGym",
      gymCheckinTime: checkinTime,
    });

    await GymAttendance.create({
      user: req.user.id,
      checkinTime,
      source: "manual",
    });
  } else {
    // ── CHECKOUT ─────────────────────────────────────
    const now = new Date();

    const currentUser = await User.findById(req.user.id).select("gymStatus");
    if (currentUser.gymStatus === "offline") {
      return res.status(200).json({
        status: "success",
        message: "Already checked out.",
      });
    }

    await User.findByIdAndUpdate(req.user.id, {
      isAtGym: false,
      gymStatus: "offline",
      gymCheckinTime: null,
    });

    const openRecord = await GymAttendance.findOne({
      user: req.user.id,
      checkoutTime: null,
    }).sort({ checkinTime: -1 });

    if (openRecord) {
      openRecord.checkoutTime = now;
      openRecord.durationMinutes = Math.round(
        (now - openRecord.checkinTime) / 60000,
      );
      await openRecord.save();
    }
  }

  res.status(200).json({ status: "success" });
});

// ============================================================
// GET ME
// ============================================================
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// ============================================================
// UPDATE ME
// ============================================================
exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword",
        400,
      ),
    );
  }

  const updates = {};

  const { fitnessGoal, intensity, experienceLevel } = req.body;
  const isFitnessUpdate =
    fitnessGoal ||
    intensity ||
    experienceLevel ||
    req.body.hasHealthConditions !== undefined ||
    req.body.healthNotes !== undefined;

  if (isFitnessUpdate) {
    const ongoingLog = await WorkoutLog.findOne({
      userId: req.user._id,
      status: "ongoing",
    });
    if (ongoingLog) {
      return next(
        new AppError(
          "You have an ongoing workout. Please finish it before updating your fitness profile.",
          400,
        ),
      );
    }

    updates.fitnessProfile = {
      ...(req.user.fitnessProfile?.toObject?.() ||
        req.user.fitnessProfile ||
        {}),
    };
    if (fitnessGoal) updates.fitnessProfile.fitnessGoal = fitnessGoal;
    if (intensity) updates.fitnessProfile.intensity = intensity;
    if (experienceLevel)
      updates.fitnessProfile.experienceLevel = experienceLevel;
    // ── Health condition update ───────────────────────
    if (req.body.hasHealthConditions !== undefined) {
      updates.fitnessProfile.hasHealthConditions =
        req.body.hasHealthConditions === "true" ||
        req.body.hasHealthConditions === true;
      // Clear any previously stored notes for privacy
      updates.fitnessProfile.healthNotes = "";
    }
  }

  if (req.file) {
    try {
      const result = await uploadToCloudinary(req.file.buffer);
      updates.pfpUrl = result.secure_url;
    } catch (err) {
      return next(new AppError("Image upload failed", 500));
    }
  }

  if (req.body.username) updates.username = req.body.username;

  const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: { user: updatedUser },
  });
});

// ============================================================
// DELETE ME (soft delete)
// ============================================================
exports.deleteMe = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, {
    active: false,
    emailVerified: false,
  });
  res.status(204).json({ status: "success", data: null });
});

// ============================================================
// SAVE ONBOARDING
// ============================================================
exports.saveOnboarding = catchAsync(async (req, res, next) => {
  const {
    age,
    sex,
    weightKg,
    heightCm,
    fitnessGoal,
    intensity,
    experienceLevel,
    healthDisclaimer,
    hasHealthConditions,
    healthNotes,
  } = req.body;

  if (!healthDisclaimer) {
    return next(new AppError("You must agree to the health disclaimer.", 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      fitnessProfile: {
        age: Number(age),
        sex,
        weightKg: weightKg ? Number(weightKg) : undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        fitnessGoal,
        intensity: intensity || "moderate",
        experienceLevel: experienceLevel || "intermediate",
        healthDisclaimer: true,
        hasHealthConditions:
          hasHealthConditions === "true" || hasHealthConditions === true,
        healthNotes: healthNotes || "",
        profileComplete: true,
      },
    },
    { new: true, runValidators: true },
  );

  res.status(200).json({ status: "success", data: { user } });
});

// ============================================================
// PERMANENT DELETE ME
// ============================================================
exports.permanentDeleteMe = catchAsync(async (req, res) => {
  const userId = req.user.id;

  await Challenge.updateMany(
    { participants: userId },
    { $pull: { participants: userId } },
  );
  await WorkoutLog.deleteMany({ userId });
  await WorkoutPlan.deleteMany({ userId });
  await GymAttendance.deleteMany({ user: userId });
  await User.findByIdAndDelete(userId);

  res.status(204).json({ status: "success", data: null });
});

// ============================================================
// UPDATE USER ROLE (admin only)
// ============================================================
exports.updateUserRole = catchAsync(async (req, res, next) => {
  const { userType } = req.body;

  if (!["coach", "admin"].includes(userType)) {
    return next(new AppError("Invalid role", 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { userType },
    { new: true, runValidators: true },
  );

  if (!user) return next(new AppError("User not found", 404));

  res.status(200).json({ status: "success", data: user });
});

// ============================================================
// ADMIN — deactivate user
// ============================================================
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError("User not found", 404));

  user.emailVerified = false;
  user.active = false;
  user.approvedByClinic = "pending";
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "User deactivated successfully",
  });
});

// ============================================================
// FACTORY ROUTES
// ============================================================
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);

// ============================================================
// MIDDLEWARE — attach all users to req
// ============================================================
exports.acquireAllUsers = catchAsync(async (req, res, next) => {
  req.users = await User.find();
  next();
});
