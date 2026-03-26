const express = require("express");
const challengeController = require("../controllers/challengeController");
const authController = require("../controllers/authController");
const requireWorkoutPlan = require("../middlewares/requireWorkoutPlan");
const requireActiveChallenge = require("../middlewares/requireActiveChallenge");

const router = express.Router();

router.use(authController.protect);

// ✅ More specific routes FIRST
router.post(
  "/:joinCode/join",
  requireWorkoutPlan,
  challengeController.getChallenge,
  requireActiveChallenge,
  challengeController.joinChallenge,
);

router.get("/:challengeId/leaderboard", challengeController.getLeaderboard); // ✅ before /:challengeId

router.get(
  "/:challengeId",
  requireWorkoutPlan,
  challengeController.getChallenge,
  challengeController.getgetChallenge,
);

router
  .route("/")
  .post(authController.restrictTo("coach"), challengeController.createChallenge)
  .get(challengeController.getAllChallenges);

router.delete(
  "/:id",
  authController.protect,
  authController.restrictTo("coach", "admin"),
  challengeController.deleteChallenge,
);

module.exports = router;
