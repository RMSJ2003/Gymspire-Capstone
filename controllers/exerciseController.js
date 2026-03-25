const Exercise = require("../models/exerciseModel");
const handlerFactory = require("../controllers/handlerFactory");
const catchAsync = require("../utils/catchAsync");

exports.getAllExercises = handlerFactory.getAll(Exercise);
exports.deleteAllExercises = handlerFactory.deleteAll(Exercise);

// For workout plan creation/editing — gym exercises only
exports.acquireAllExericses = catchAsync(async (req, res, next) => {
  const exercises = await Exercise.find({
    gifURL: { $exists: true, $ne: "" },
    isGymExercise: true,
  });
  req.exercises = exercises;
  next();
});

// For home workout filtering in createWorkoutPlan
exports.acquireAllExericsesHome = catchAsync(async (req, res, next) => {
  const exercises = await Exercise.find({ gifURL: { $exists: true, $ne: "" } });
  req.exercises = exercises;
  next();
});
// Bulk update which exercises are gym exercises
exports.updateGymExercises = catchAsync(async (req, res, next) => {
  const { gymExerciseIds } = req.body;

  if (!Array.isArray(gymExerciseIds)) {
    return next(
      new (require("../utils/appError"))(
        "gymExerciseIds must be an array",
        400,
      ),
    );
  }

  // Reset all to false first
  await Exercise.updateMany({}, { isGymExercise: false });

  // Set selected ones to true
  if (gymExerciseIds.length > 0) {
    await Exercise.updateMany(
      { exerciseId: { $in: gymExerciseIds } },
      { isGymExercise: true },
    );
  }

  res.status(200).json({
    status: "success",
    message: `${gymExerciseIds.length} gym exercises saved.`,
  });
});
// For exercises management page — ALL exercises, no filter
exports.acquireAllExercisesAdmin = catchAsync(async (req, res, next) => {
  const exercises = await Exercise.find({
    gifURL: { $exists: true, $ne: "" },
  });
  req.exercises = exercises;
  next();
});
