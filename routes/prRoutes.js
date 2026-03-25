const express = require("express");
const prController = require("../controllers/prController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);

router.get("/exercise/:exerciseName", prController.getExercisePR);
router.get("/my-prs", authController.protect, prController.getAllMyPRs);
module.exports = router;
