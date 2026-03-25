const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

// All routes below require login
router.use(authController.protect);

// ── SELF ────────────────────────────────────────────────────
router.get("/me", userController.getMe, userController.getUser);

router.patch(
  "/updateMe",
  userController.uploadUserPhoto,
  userController.updateMe,
);
router.patch("/updateMyPassword", authController.updatePassword);
router.patch("/onboarding", userController.saveOnboarding);
router.delete("/deleteMe", userController.deleteMe);
router.delete("/permanentDeleteMe", userController.permanentDeleteMe);

// ── GYM CHECK-IN ────────────────────────────────────────────
router.patch("/gymCheckin", userController.gymCheckin);

// ── ADMIN / ALL USERS ───────────────────────────────────────
router.get("/", userController.getAllUsers);

router.get(
  "/:id/attendance",
  authController.protect,
  authController.restrictTo("admin", "coach"),
  userController.getUserAttendance,
);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

router.patch(
  "/:id/role",
  authController.restrictTo("admin"),
  userController.updateUserRole,
);

module.exports = router;
