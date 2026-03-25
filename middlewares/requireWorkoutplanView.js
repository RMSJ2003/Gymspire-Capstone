const WorkoutPlan = require("../models/workoutPlanModel");
const catchAsync = require("../utils/catchAsync");

module.exports = catchAsync(async (req, res, next) => {
  const plans = await WorkoutPlan.find({
    userId: req.user._id,
  }).populate("exerciseDetails");

  const gymPlan = plans.find((p) => p.type === "Gym") || null;
  const homePlan = plans.find((p) => p.type === "Home") || null;

  // Must have at least a gym plan to start workout
  if (!gymPlan) {
    return res.status(200).render("noWorkoutPlan", {
      title: "No Workout Plan",
      user: req.user,
    });
  }

  req.gymPlan = gymPlan;
  req.homePlan = homePlan;
  req.workoutPlan = gymPlan; // keep backward compat

  next();
});
