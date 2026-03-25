const WorkoutLog = require("../models/workoutLogModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getExercisePR = catchAsync(async (req, res, next) => {
  const { exerciseName } = req.params;

  // 1) Aggregate
  const records = await WorkoutLog.aggregate([
    {
      $match: {
        userId: req.user._id,
        status: "done",
      },
    },
    { $unwind: "$exercises" },
    {
      $match: {
        "exercises.name": exerciseName,
      },
    },
    { $unwind: "$exercises.set" },
    {
      $match: {
        "exercises.set.type": "working",
      },
    },
    {
      $sort: {
        "exercises.set.weight": -1,
        "exercises.set.reps": -1,
      },
    },
    { $limit: 1 }, // This makes this only return ONE (the PR) document
    {
      $project: {
        _id: 0,
        exercise: "$exercises.name",
        weight: "$exercises.set.weight",
        reps: "$exercises.set.reps",
        unit: "$exercises.set.unit",
        date: "$date",
      },
    },
  ]);

  if (!records.length)
    return next(new AppError("No records found for this exercise", 404));

  res.status(200).json({
    status: "success",
    data: records[0],
  });
});
exports.getAllMyPRs = catchAsync(async (req, res, next) => {
  const WorkoutLog = require("../models/workoutLogModel");

  const logs = await WorkoutLog.find({
    userId: req.user._id,
    status: "done",
  }).select("exercises date");

  // Build PR map: exerciseName → best set
  const prMap = {};

  logs.forEach((log) => {
    log.exercises.forEach((ex) => {
      ex.set.forEach((s) => {
        if (s.type !== "working" || !s.saved || s.reps === 0) return;
        if (s.weight === 0 && ex.equipment !== "body weight") return;

        const existing = prMap[ex.name];
        const isBodyweight = ex.equipment === "body weight";

        // For bodyweight: compare reps. For weighted: compare weight then reps
        const isBetter =
          !existing ||
          (isBodyweight
            ? s.reps > existing.reps
            : s.weight > existing.weight ||
              (s.weight === existing.weight && s.reps > existing.reps));

        if (isBetter) {
          prMap[ex.name] = {
            exercise: ex.name,
            target: ex.target,
            weight: s.weight,
            reps: s.reps,
            unit: s.unit || "LB",
            date: log.date,
          };
        }
      });
    });
  });

  res.status(200).json({
    status: "success",
    data: Object.values(prMap),
  });
});
