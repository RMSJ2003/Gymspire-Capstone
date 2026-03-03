const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.signUp = catchAsync(async (req, res, next) => {
  res.status(200).render("signup", {
    title: "Sign Up",
    hideNavbar: false,
  });
});

exports.login = catchAsync(async (req, res, next) => {
  res.status(200).render("login", {
    title: "Login",
    hideNavbar: false,
  });
});

exports.dashboard = catchAsync(async (req, res, next) => {
  res.status(200).render("dashboard", {
    title: "Dashboard",
    frequencies: req.myTargetWeeklyFrequency,
    workoutCount: req.weeklyWorkoutCount,
    hideNavbar: false,
  });
});

exports.adminDashboard = catchAsync(async (req, res, next) => {
  res.status(200).render("admin/adminDashboard", {
    title: "Admin Dashboard",
    frequencies: req.myTargetWeeklyFrequency,
    workoutCount: req.weeklyWorkoutCount,
    hideNavbar: false,
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
  res.status(200).render("auth/requestEmailVerification", {
    title: "Email Verification",
  });
});

exports.profile = catchAsync(async (req, res, next) => {
  console.log(req.user);

  res.status(200).render("profile", {
    title: "Profile",
  });
});

exports.workoutPlan = catchAsync(async (req, res, next) => {
  let exercises = [];
  console.log(req.workoutPlan);

  if (req.workoutPlan && req.workoutPlan.exerciseDetails) {
    exercises = req.workoutPlan.exerciseDetails;
  }

  res.status(200).render("workoutPlan", {
    title: "Workout Plan",
    exercises,
    hasPlan: !!req.workoutPlan,
  });
});

exports.challenges = catchAsync(async (req, res, next) => {
  const challenges = req.challenges || [];

  res.status(200).render("challenges", {
    title: "Challenges",
    user: req.user,
    challenges,
  });
});

exports.workoutLogs = catchAsync(async (req, res, next) => {
  console.log(req.workoutLogs);

  res.status(200).render("workoutLogs", {
    title: "My Workout Logs",
    user: req.user,
    workoutLogs: req.myWorkoutLogs,
  });
});

exports.workoutLog = catchAsync(async (req, res, next) => {
  console.log(req.myWorkoutLog);

  res.status(200).render("workoutLog", {
    title: "Workout Log",
    user: req.user,
    log: req.myWorkoutLog,
  });
});

exports.startSoloWorkout = catchAsync(async (req, res, next) => {
  const workoutPlan = req.workoutPlan;

  // 🔥 Extract unique muscle targets from workout plan
  const muscles = workoutPlan.exerciseDetails.map((ex) => ({
    name: ex.target,
    exerciseName: ex.name,
  }));

  res.status(200).render("startSoloWorkout", {
    title: "Start Solo Workout",
    user: req.user,
    muscles,
  });
});

exports.editProfile = catchAsync(async (req, res, next) => {
  res.status(200).render("editProfile", {
    title: "Edit Profile",
    currentUser: req.user,
  });
});

exports.createWorkoutPlan = catchAsync(async (req, res, next) => {
  if (req.workoutPlan)
    return next(new AppError("You already have a workout plan."));

  res.status(200).render("createWorkoutPlan", {
    title: "Create Workout Plan",
    currentUser: req.user,
    exercises: req.exercises,
  });
});

exports.editWorkoutPlan = catchAsync(async (req, res, next) => {
  const exercises = req.exercises || [];
  const workoutPlan = req.workoutPlan;

  // ✅ exerciseIds are already strings
  const selectedIds = workoutPlan ? workoutPlan.exerciseIds : [];

  // 🔥 Reorder: selected first
  const selectedExercises = [];
  const unselectedExercises = [];

  exercises.forEach((exercise) => {
    if (selectedIds.includes(exercise.exerciseId)) {
      selectedExercises.push(exercise);
    } else {
      unselectedExercises.push(exercise);
    }
  });

  const orderedExercises = [...selectedExercises, ...unselectedExercises];

  res.status(200).render("editWorkoutPlan", {
    title: "Edit Workout Plan",
    user: req.user,
    exercises: orderedExercises,
    selectedIds, // array of exerciseId strings
  });
});

exports.personalRecord = catchAsync(async (req, res, next) => {
  res.status(200).render("personalRecord", {
    title: "My Personal Records",
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
    title: "Exercises Management (with dumbbells)",
    exercises: req.exercises,
    currentUser: req.user,
  });
});
exports.noWorkoutPlan = (req, res) => {
  res.status(200).render("noWorkoutPlan", {
    title: "No Workout Plan",
    user: req.user,
  });
};
