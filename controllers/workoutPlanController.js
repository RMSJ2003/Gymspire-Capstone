const mongoose = require("mongoose");
const WorkoutPlan = require("../models/workoutPlanModel");
const Exercise = require("../models/exerciseModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.createMyWorkoutPlan = catchAsync(async (req, res, next) => {
  const { plans } = req.body;

  if (!Array.isArray(plans) || plans.length === 0) {
    return next(new AppError("plans must be a non-empty array", 400));
  }

  const validTypes = ["Home", "Gym"];

  const hasGym = plans.some((p) => p.type === "Gym");
  if (!hasGym) {
    return next(new AppError("A Gym workout plan is required.", 400));
  }

  for (const plan of plans) {
    if (!validTypes.includes(plan.type)) {
      return next(new AppError(`Invalid type: ${plan.type}`, 400));
    }
    if (!Array.isArray(plan.exerciseIds) || plan.exerciseIds.length === 0) {
      return next(
        new AppError(
          `exerciseIds for ${plan.type} must be a non-empty array`,
          400,
        ),
      );
    }

    plan.exerciseIds = [...new Set(plan.exerciseIds)];

    const exercisesFromDb = await Exercise.find({
      exerciseId: { $in: plan.exerciseIds },
    });
    const foundIds = exercisesFromDb.map((ex) => ex.exerciseId);
    const notFoundIds = plan.exerciseIds.filter((id) => !foundIds.includes(id));
    if (notFoundIds.length > 0) {
      return next(
        new AppError(
          `${plan.type} — ExerciseIds not found: ${notFoundIds.join(", ")}`,
          400,
        ),
      );
    }
  }

  const types = plans.map((p) => p.type);
  const existingPlans = await WorkoutPlan.find({
    userId: req.user._id,
    type: { $in: types },
  });
  if (existingPlans.length > 0) {
    const existingTypes = existingPlans.map((p) => p.type).join(", ");
    return next(
      new AppError(
        `You already have a workout plan for: ${existingTypes}`,
        400,
      ),
    );
  }

  const created = await WorkoutPlan.insertMany(
    plans.map((p) => ({
      userId: req.user._id,
      type: p.type,
      exerciseIds: p.exerciseIds,
    })),
  );

  res.status(201).json({
    status: "success",
    results: created.length,
    data: created,
  });
});

exports.getMyWorkoutPlan = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: req.workoutPlans,
  });
});

exports.updateMyWorkoutPlan = catchAsync(async (req, res, next) => {
  const { type, exerciseIds } = req.body;

  if (!["Home", "Gym"].includes(type)) {
    return next(new AppError('type must be "Home" or "Gym"', 400));
  }

  if (!Array.isArray(exerciseIds) || exerciseIds.length === 0) {
    return next(new AppError("Please provide an array of exerciseIds", 400));
  }

  const deduped = [...new Set(exerciseIds.map(String))];

  const exercisesFromDb = await Exercise.find({
    exerciseId: { $in: deduped },
  });
  const foundIds = exercisesFromDb.map((ex) => ex.exerciseId);
  const notFoundIds = deduped.filter((id) => !foundIds.includes(id));
  if (notFoundIds.length > 0) {
    return next(
      new AppError(`ExerciseIds not found: ${notFoundIds.join(", ")}`, 400),
    );
  }

  const updated = await WorkoutPlan.findOneAndUpdate(
    { userId: req.user._id, type },
    { exerciseIds: deduped },
    { new: true, runValidators: true },
  );

  if (!updated) {
    return next(new AppError(`No ${type} workout plan found.`, 404));
  }

  res.status(200).json({
    status: "success",
    data: updated,
  });
});

exports.deleteMyWorkoutPlan = catchAsync(async (req, res, next) => {
  const { type } = req.body;

  if (type) {
    // Delete a specific plan by type
    await WorkoutPlan.deleteOne({ userId: req.user._id, type });
  } else {
    // Delete all plans for this user
    await WorkoutPlan.deleteMany({ userId: req.user._id });
  }

  res.status(204).json({ status: "success", data: null });
});

// ── Fetch both plans and attach to req ───────────────────
exports.acquireMyWorkoutPlan = catchAsync(async (req, res, next) => {
  const plans = await WorkoutPlan.find({ userId: req.user._id }).populate(
    "exerciseDetails",
  );

  // Separate into gym and home
  req.gymPlan = plans.find((p) => p.type === "Gym") || null;
  req.homePlan = plans.find((p) => p.type === "Home") || null;
  req.workoutPlans = plans;

  next();
});
