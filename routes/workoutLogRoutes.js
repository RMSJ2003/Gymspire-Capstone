const express = require("express");
const workoutLogController = require("../controllers/workoutLogController");
const challengeController = require("../controllers/challengeController");
const authController = require("../controllers/authController");
const requireActiveChallenge = require("../middlewares/requireActiveChallenge");
const requireWorkoutPlan = require("../middlewares/requireWorkoutPlan");
const userController = require("../controllers/userController");
const autoFinishStaleWorkouts = require("../middlewares/authFinishStaleWorkouts");
const upload = require("../middlewares/uploadVideo");
const router = express.Router();

router.use(authController.protect);

// ── CHALLENGE WORKOUT ──
// autoCheckin removed from middleware — now runs inside controller
// AFTER enforceMuscleRest passes, to prevent stale gymStatus on error
router
  .route("/challenge/:challengeId")
  .post(
    challengeController.getChallenge,
    requireActiveChallenge,
    autoFinishStaleWorkouts,
    workoutLogController.createMyChallengeWorkoutLog,
  );

router.get(
  "/my",
  authController.protect,
  workoutLogController.getMyWorkoutLogs,
);

// ── SOLO WORKOUT ──
// autoCheckin also handled inside createMySoloWorkoutLog controller
router
  .route("/solo")
  .post(
    requireWorkoutPlan,
    autoFinishStaleWorkouts,
    workoutLogController.createMySoloWorkoutLog,
  )
  .get(workoutLogController.getMyWorkoutLogs);

router.get("/members", workoutLogController.getMembersWorkoutSummary);

router.get("/:id", requireWorkoutPlan, workoutLogController.getMyWorkoutLog);

router.post(
  "/:workoutLogId/exercises/:exerciseIndex/sets",
  workoutLogController.addSet,
);

router.delete(
  "/:workoutLogId/exercises/:exerciseIndex/sets/:setId",
  workoutLogController.removeSet,
);

router.patch(
  "/:workoutLogId/sets/bulk",
  workoutLogController.updateMyWorkoutSetsBulk,
);

router.patch(
  "/:workoutLogId/finish",
  upload.single("video"),
  workoutLogController.finishWorkoutLog,
);

router.use(authController.restrictTo("coach"));

router.get("/:challengeId/submissions", workoutLogController.getSubmissions);

router
  .route("/:workoutLogId/verify")
  .patch(workoutLogController.verifyChallengeWorkoutLog);

module.exports = router;
