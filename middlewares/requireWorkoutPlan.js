const WorkoutPlan = require("../models/workoutPlanModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

module.exports = catchAsync(async (req, res, next) => {
  // Read workoutType from body (POST) or query (GET), default to Gym
  const type = req.body?.workoutType || req.query?.type || "Gym";

  const workoutPlan = await WorkoutPlan.findOne({
    userId: req.user._id,
    type,
  }).populate("exerciseDetails");

  if (!workoutPlan) {
    return next(
      new AppError(
        `You do not have a ${type} workout plan. Please create one first.`,
        409,
      ),
    );
  }

  req.workoutPlan = workoutPlan;
  next();
});
