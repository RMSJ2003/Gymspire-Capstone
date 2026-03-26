const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const WorkoutLog = require("../models/workoutLogModel");

function formatHour12(h) {
  if (h === 0) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

exports.signUp = catchAsync(async (req, res, next) => {
  res.status(200).render("signup", {
    title: "Sign Up",
    hideNavbar: false,
    errorMessage: req.query.error || null,
    successMessage: req.query.success || null,
    formValues: {
      email: req.query.email || "",
      username: req.query.username || "",
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  res.status(200).render("login", { title: "Login", hideNavbar: false });
});

exports.dashboard = catchAsync(async (req, res, next) => {
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
  const todayName = days[new Date().getDay()];
  const todaySchedule = gymSettings.schedule.find((s) => s.day === todayName);

  const ongoingLog = await WorkoutLog.findOne({
    userId: req.user._id,
    status: "ongoing",
  }).lean();

  res.status(200).render("dashboard", {
    title: "Dashboard",
    frequencies: req.myTargetWeeklyFrequency,
    workoutCount: req.weeklyWorkoutCount,
    hideNavbar: false,
    gymSchedule: gymSettings.schedule,
    todaySchedule,
    formatHour12, // pass helper so pug can use it
    ongoingLog: ongoingLog || null,
  });
});
exports.adminDashboard = catchAsync(async (req, res, next) => {
  const GymSettings = require("../models/gymSettingsModel");
  const gymSettings = await GymSettings.getSettings();

  res.status(200).render("admin/adminDashboard", {
    title: "Admin Dashboard",
    frequencies: req.myTargetWeeklyFrequency,
    workoutCount: req.weeklyWorkoutCount,
    users: req.users,
    hideNavbar: false,
    gymSchedule: gymSettings.schedule,
    formatHour12,
  });
});
exports.coachDashboard = catchAsync(async (req, res, next) => {
  res.status(200).render("coach/coachDashboard", {
    title: "Coach Dashboard",
    frequencies: req.myTargetWeeklyFrequency,
    workoutCount: req.weeklyWorkoutCount,
    hideNavbar: false,
  });
});

exports.clinicDashboard = catchAsync(async (req, res, next) => {
  res.status(200).render("clinic/clinicDashboard", {
    title: "Clinic Dashboard",
    frequencies: req.myTargetWeeklyFrequency,
    workoutCount: req.weeklyWorkoutCount,
    hideNavbar: false,
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  res.status(200).render("auth/forgotPassword", {
    title: "Forgot Password",
    hideNavbar: false,
    user: req.user || null,
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  res.status(200).render("auth/resetPassword", {
    title: "Reset Password",
    hideNavbar: true,
    token: req.params.token,
  });
});

exports.requestEmailVerification = catchAsync(async (req, res, next) => {
  res
    .status(200)
    .render("auth/requestEmailVerification", { title: "Email Verification" });
});

exports.emailVerification = catchAsync(async (req, res, next) => {
  res
    .status(200)
    .render("auth/emailVerification", { title: "Email Verification" });
});

exports.profile = catchAsync(async (req, res, next) => {
  res.status(200).render("profile", { title: "Profile" });
});

exports.workoutPlan = catchAsync(async (req, res, next) => {
  res.status(200).render("workoutPlan", {
    title: "Workout Plan",
    gymPlan: req.gymPlan || null,
    homePlan: req.homePlan || null,
  });
});

exports.congestion = catchAsync(async (req, res, next) => {
  res
    .status(200)
    .render("congestion", { title: "Gym Congestion", user: req.user });
});

exports.challenges = catchAsync(async (req, res, next) => {
  res.status(200).render("challenges", {
    title: "Challenges",
    user: req.user,
    challenges: req.challenges || [],
    workoutLogs: req.myWorkoutLogs || [],
  });
});

exports.workoutLogs = catchAsync(async (req, res, next) => {
  res.status(200).render("workoutLogs", {
    title: "My Workout Logs",
    user: req.user,
    workoutLogs: req.myWorkoutLogs,
  });
});

exports.workoutLog = catchAsync(async (req, res, next) => {
  const fp = req.user.fitnessProfile || {};
  const experience = fp.experienceLevel || "intermediate";
  const goal = fp.fitnessGoal || "general_fitness";
  const intensity = fp.intensity || "moderate";

  // Deload threshold = experience level
  const deloadThresholds = { beginner: 3, intermediate: 4, advanced: 6 };

  // Overload threshold = goal target reps
  // Strength=5, Muscle Gain=10, Endurance=15, Weight Loss=12, General=8
  const goalConfig = {
    strength: { reps: 5, rir: 2 },
    muscle_gain: { reps: 10, rir: 2 },
    endurance: { reps: 15, rir: 4 },
    weight_loss: { reps: 12, rir: 3 },
    general_fitness: { reps: 8, rir: 3 },
  };

  const rirDescriptions = {
    0: "Train to complete failure — every rep is maximum effort.",
    1: "Stop when you have 1 rep left in the tank — very high effort.",
    2: "Stop when you have 2 reps left — challenging but controlled.",
    3: "Stop when you have 3 reps left — moderate effort, good form focus.",
    4: "Stop when you have 4 reps left — comfortable, sustainable pace.",
  };

  const intensityRirAdjust = { easy: 1, moderate: 0, hard: -1 };
  const goalLabels = {
    strength: "Strength",
    muscle_gain: "Muscle Gain",
    endurance: "Endurance",
    weight_loss: "Weight Loss",
    general_fitness: "General Fitness",
  };

  const currentGoal = goalConfig[goal] || goalConfig.general_fitness;
  const baseRir = currentGoal.rir;
  const finalRir = Math.max(0, baseRir + (intensityRirAdjust[intensity] || 0));

  res.status(200).render("workoutLog", {
    title: "Workout Log",
    user: req.user,
    log: req.myWorkoutLog,
    prevLog: req.myWorkoutLogs,
    deloadThreshold: deloadThresholds[experience] || 4,
    overloadThreshold: currentGoal.reps, // ← goal reps, no fallback override
    hasHealthConditions: fp.hasHealthConditions || false,
    healthNotes: fp.healthNotes || "",
    rirTarget: finalRir,
    rirDescription: rirDescriptions[finalRir] || rirDescriptions[2],
    goalLabel: goalLabels[goal] || "General Fitness",
  });
});

exports.startSoloWorkout = catchAsync(async (req, res, next) => {
  const gymExercises = req.gymPlan?.exerciseDetails || [];
  const homeExercises = req.homePlan?.exerciseDetails || [];

  const fp = req.user.fitnessProfile || {};
  const goal = fp.fitnessGoal || "general_fitness";
  const intensity = fp.intensity || "moderate";
  const experience = fp.experienceLevel || "intermediate";

  // ── Import shared config from createDefaultSets ───────
  // No duplication — single source of truth
  const {
    setsMatrix,
    goalConfig,
    intensityRirAdjust,
  } = require("../utils/defaultWorkoutSets");

  // ── Goal labels and tips (view-only, not in createDefaultSets) ──
  const goalMeta = {
    strength: {
      label: "Strength",
      tip: "Focus on compound lifts with heavy weight and low reps. Prioritize form over speed.",
    },
    muscle_gain: {
      label: "Muscle Gain",
      tip: "Aim for moderate weight with controlled tempo. Feel the muscle work on each rep.",
    },
    endurance: {
      label: "Endurance",
      tip: "Keep rest short and maintain consistent form throughout all sets.",
    },
    weight_loss: {
      label: "Weight Loss",
      tip: "Keep intensity high and rest periods short for maximum calorie burn.",
    },
    general_fitness: {
      label: "General Fitness",
      tip: "Focus on balanced effort across all muscle groups with good form.",
    },
  };

  const intensityLabels = { easy: "Easy", moderate: "Moderate", hard: "Hard" };

  const currentGoal = goalConfig[goal] || goalConfig.general_fitness;
  const currentMeta = goalMeta[goal] || goalMeta.general_fitness;
  const numSets =
    (setsMatrix[experience] || setsMatrix.intermediate)[intensity] || 3;
  const warmupCount = experience === "advanced" ? 2 : 3;
  const finalRir = Math.max(
    0,
    currentGoal.rir + (intensityRirAdjust[intensity] || 0),
  );

  const restMin = Math.floor(currentGoal.rest / 60);
  const restSec = currentGoal.rest % 60;
  const restLabel =
    restMin +
    ":" +
    (restSec === 0 ? "00" : String(restSec).padStart(2, "0")) +
    " min";

  // ── Gym schedule for operating hours check ────────────
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
    (s) => s.day === days[new Date().getDay()],
  );

  res.status(200).render("startSoloWorkout", {
    title: "Start Solo Workout",
    user: req.user,
    gymExercises,
    homeExercises,
    hasHomePlan: !!req.homePlan,
    gymLat: gymSettings.gymLat || process.env.GYM_LAT,
    gymLng: gymSettings.gymLng || process.env.GYM_LNG,
    gymRadius:
      gymSettings.gymRadiusMeters || process.env.GYM_RADIUS_METERS || 150,
    gymName: gymSettings.gymName || "iAcademy Gym",
    hasHealthConditions: fp.hasHealthConditions || false,
    healthNotes: fp.healthNotes || "",
    gymSchedule: gymSettings.schedule,
    todaySchedule,
    profileSuggestion: {
      hasProfile: !!fp.profileComplete,
      goalLabel: currentMeta.label,
      goalTip: currentMeta.tip,
      targetReps: currentGoal.reps,
      restSeconds: currentGoal.rest,
      restLabel,
      sets: numSets + " working sets",
      warmups: warmupCount + " warm-up sets",
      rir: finalRir,
      intensityLabel: intensityLabels[intensity] || "Moderate",
      experience,
    },
  });
});

exports.editProfile = catchAsync(async (req, res, next) => {
  res
    .status(200)
    .render("editProfile", { title: "Edit Profile", currentUser: req.user });
});

exports.createWorkoutPlan = catchAsync(async (req, res, next) => {
  if (req.gymPlan && req.homePlan) return res.redirect("/workoutPlan");

  // If user has gym plan and is trying to create gym again — redirect
  // (but allow if they're adding home plan)
  if (req.gymPlan && !req.query.skipToHome) return res.redirect("/workoutPlan");
  const allExercises = req.exercises || [];
  const gymExercises = allExercises.filter((ex) => ex.isGymExercise);
  const homeExercises = allExercises;
  res.status(200).render("createWorkoutPlan", {
    title: "Create Workout Plan",
    currentUser: req.user,
    exercises: allExercises,
    gymExercises,
    homeExercises,
  });
});

exports.editWorkoutPlan = catchAsync(async (req, res, next) => {
  const allExercises = req.exercises || [];
  const planType = req.query.type || "Gym";
  const exercises =
    planType === "Home"
      ? allExercises
      : allExercises.filter((ex) => ex.isGymExercise);
  const workoutPlan =
    req.workoutPlans?.find((p) => p.type === planType) ||
    (await require("../models/workoutPlanModel").findOne({
      userId: req.user._id,
      type: planType,
    }));
  const selectedIds = workoutPlan ? workoutPlan.exerciseIds : [];
  const selectedExercises = exercises.filter((e) =>
    selectedIds.includes(e.exerciseId),
  );
  const unselectedExercises = exercises.filter(
    (e) => !selectedIds.includes(e.exerciseId),
  );
  res.status(200).render("editWorkoutPlan", {
    title: `Edit ${planType} Workout Plan`,
    user: req.user,
    exercises: [...selectedExercises, ...unselectedExercises],
    selectedIds,
    planType,
  });
});

exports.personalRecord = catchAsync(async (req, res, next) => {
  res.status(200).render("personalRecord", {
    title: "My Personal Records",
    exercises: req.exercises,
    workoutLogs: req.myWorkoutLogs,
    currentUser: req.user,
  });
});

exports.reviewSubmissions = (req, res) => {
  res.render("coach/reviewSubmissions", {
    title: "Challenge Submissions",
    user: req.user,
    submissions: req.submissionLogs,
  });
};

exports.createChallenge = catchAsync(async (req, res, next) => {
  res.status(200).render("coach/createChallenge", {
    title: "Create Challenge",
    exercises: req.exercises,
    currentUser: req.user,
  });
});

exports.users = catchAsync(async (req, res, next) => {
  res
    .status(200)
    .render(req.user.userType === "admin" ? "admin/users" : "clinic/users", {
      title: "User Management",
      users: req.users,
      currentUser: req.user,
    });
});

exports.createAdmin = catchAsync(async (req, res, next) => {
  res.status(200).render("admin/createAdmin", {
    title: "Create Admin",
    currentUser: req.user,
  });
});
exports.createCoach = catchAsync(async (req, res, next) => {
  res.status(200).render("admin/createCoach", {
    title: "Create Coach",
    currentUser: req.user,
  });
});
exports.createClinic = catchAsync(async (req, res, next) => {
  res.status(200).render("admin/createClinic", {
    title: "Create Clinic",
    currentUser: req.user,
  });
});

exports.exercisesManagement = catchAsync(async (req, res, next) => {
  res.status(200).render("admin/exercisesManagement", {
    title: "Exercises Management",
    exercises: req.exercises,
    currentUser: req.user,
  });
});

exports.noWorkoutPlan = (req, res) => {
  res
    .status(200)
    .render("noWorkoutPlan", { title: "No Workout Plan", user: req.user });
};

exports.onboarding = catchAsync(async (req, res, next) => {
  if (req.user.fitnessProfile?.profileComplete)
    return res.redirect("/dashboard");
  res.status(200).render("onboarding", { title: "Complete Your Profile" });
});
