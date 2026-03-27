const express = require("express");
const adminController = require("../controllers/adminController");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");

const router = express.Router();

router.use(authController.protect);

router.get("/gymspire-time", adminController.getGymspireTime);

router.get("/gym-usage", adminController.getGymUsageByHour);

router.get("/get-gymspire-now-status", adminController.getGymspireNowStatus);

router
  .route("/createCoach")
  .post(
    authController.restrictTo("admin"),
    userController.uploadUserPhoto,
    authController.createCoach,
  );

router
  .route("/createAdmin")
  .post(
    authController.restrictTo("admin"),
    userController.uploadUserPhoto,
    authController.createAdmin,
  );
router.patch(
  "/gymHours",
  authController.protect,
  authController.restrictTo("admin"),
  adminController.updateGymHours,
);

router.patch(
  "/gymLocation",
  authController.protect,
  authController.restrictTo("admin"),
  adminController.updateGymLocation,
);

router.get("/gymHours", authController.protect, adminController.getGymHours);

// TEMPORARY ENDPOINT (NOT USED BY THE SYSTEM BUT DEV)
router.post(
  "/test-cleanup",
  authController.protect,
  authController.restrictTo("admin", "coach"),
  async (req, res) => {
    try {
      const {
        runExpiredChallengeCleanup,
      } = require("../services/autoCheckout");
      await runExpiredChallengeCleanup(true);
      res.json({ status: "success", message: "Cleanup ran." });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  },
);
module.exports = router;
