const express = require("express");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");

const router = express.Router();

router
  .route("/signup")
  .post(userController.uploadUserPhoto, authController.signup);
router.route("/login").post(authController.login);

// ── Email verification ─────────────────────────────────────
// Step 1: preview token — returns username/email without verifying
router.get("/previewToken/:token", authController.previewVerificationToken);
// Step 2: confirm button clicked — actually verifies
router.post("/verifyEmail/:token", authController.verifyIacademyEmail);

// Legacy GET route still supported for old links in circulation
router.get("/verify-email/:token", authController.verifyIacademyEmail);
router.get("/reactivate-account/:token", authController.verifyIacademyEmail);

router.post(
  "/requestEmailVerification",
  authController.requestEmailVerification,
);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);
router.post("/reactivateAccount", authController.reactivateAccount);
router.get("/logout", authController.protect, authController.logout);

module.exports = router;
