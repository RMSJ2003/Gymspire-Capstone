const express = require("express");
const viewController = require("../controllers/viewController");
const authController = require("../controllers/authController");
const adminController = require("../controllers/adminController");
const workoutPlanController = require("../controllers/workoutPlanController");
const exerciseController = require("../controllers/exerciseController");
const challengeController = require("../controllers/challengeController");
const userController = require("../controllers/userController");
const workoutLogController = require("../controllers/workoutLogController");
const requireWorkoutPlan = require("../middlewares/requireWorkoutPlan");
const requireWorkoutplanView = require("../middlewares/requireWorkoutplanView");
const requireWorkoutplanStarter = require("../middlewares/requireWorkoutPlanStarter");

const router = express.Router();

// Overview Page
// router.get('/')

router.get(
  "/signup",
  authController.isLoggedIn,
  authController.redirectIfLoggedIn,
  viewController.signUp,
);

router.get(
  "/login",
  authController.isLoggedIn,
  authController.redirectIfLoggedIn,
  viewController.login,
);

router.get("/forgotPassword", viewController.forgotPassword);
router.get("/reset-password/:token", viewController.resetPassword);
router.get(
  "/requestEmailVerification",
  viewController.requestEmailVerification,
);

// router.use(authController.protect); // Do not put this here cuz it will
// also protect the unknwon routes e.g. /sdafasdf then it will say
// 'You are not logged in. Please log in' we don't want that.

router.get(
  "/dashboard",
  authController.protect,
  authController.restrictTo("user"),
  adminController.getGymspireNowStatus,
  requireWorkoutplanStarter,
  workoutLogController.acquireMyTargetWeeklyFrequency,
  workoutLogController.acquireMyWeeklyWorkoutCount,
  viewController.dashboard,
);

router.get(
  "/adminDashboard",
  authController.protect,
  authController.restrictTo("admin"),
  adminController.getGymspireNowStatus,
  viewController.adminDashboard,
);

router.get(
  "/coachDashboard",
  authController.protect,
  authController.restrictTo("coach"),
  adminController.getGymspireNowStatus,
  viewController.coachDashboard,
);

router.get(
  "/clinicDashboard",
  authController.protect,
  authController.restrictTo("clinic"),
  adminController.getGymspireNowStatus,
  viewController.clinicDashboard,
);

router.get("/profile", authController.protect, viewController.profile);

router.get(
  "/workoutPlan",
  authController.protect,
  workoutPlanController.acquireMyWorkoutPlan,
  viewController.workoutPlan,
);

router.get(
  "/challenges",
  authController.protect,
  challengeController.acquireAllChallenges,
  viewController.challenges,
);

router.get(
  "/workoutLogs",
  authController.protect,
  workoutLogController.acquireMyWorkoutLogs,
  viewController.workoutLogs,
);

router.get(
  "/workoutLogs/:id",
  authController.protect,
  workoutLogController.acquireMyWorkoutLog,
  viewController.workoutLog,
);

// router.get(
//   "/editWorkoutLog/:id",
//   authController.protect,
//   viewController.editWorkoutLog
// );

router.get(
  "/startSoloWorkout",
  authController.protect,
  requireWorkoutplanView,
  viewController.startSoloWorkout,
);

router.get("/editProfile", authController.protect, viewController.editProfile);

router.get(
  "/createWorkoutPlan",
  authController.protect,
  // requireWorkoutPlan,
  exerciseController.acquireAllExericses,
  viewController.createWorkoutPlan,
);

router.get(
  "/editWorkoutPlan",
  authController.protect,
  requireWorkoutPlan,
  exerciseController.acquireAllExericses,
  viewController.editWorkoutPlan,
);

router.get(
  "/personalRecord",
  authController.protect,
  exerciseController.acquireAllExericses,
  viewController.personalRecord,
);

router.get(
  "/reviewSubmissions/:challengeId",
  authController.protect,
  authController.restrictTo("coach"),
  workoutLogController.acquireSubmissions,
  viewController.reviewSubmissions,
);

router.get(
  "/createChallenge",
  authController.protect,
  authController.restrictTo("coach"),
  exerciseController.acquireAllExericses,
  viewController.createChallenge,
);

router.get(
  "/users",
  authController.protect,
  authController.restrictTo("admin", "clinic"),
  userController.acquireAllUsers,
  viewController.users,
);

router.get(
  "/createAdmin",
  authController.protect,
  authController.restrictTo("admin"),
  viewController.createAdmin,
);

router.get(
  "/createCoach",
  authController.protect,
  authController.restrictTo("admin"),
  viewController.createCoach,
);

router.get(
  "/createClinic",
  authController.protect,
  authController.restrictTo("admin"),
  viewController.createClinic,
);

router.get(
  "/exercisesManagement",
  authController.protect,
  authController.restrictTo("admin"),
  exerciseController.acquireAllExericses,
  viewController.exercisesManagement,
);

router.get(
  "/noWorkoutPlan",
  authController.protect, // optional if you want only logged-in users
  viewController.noWorkoutPlan, // make sure this exists
);

module.exports = router;
