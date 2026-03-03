const dayjs = require("dayjs");
const isoWeek = require("dayjs/plugin/isoWeek");

dayjs.extend(isoWeek);

const WorkoutLog = require("../models/workoutLogModel");
const WorkoutPlan = require("../models/workoutPlanModel");
const Challenge = require("../models/challengeModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const ensureNoOngoingWorkoutLog = require("../utils/ensureNoOngoingWorkoutLogs");
const createDefaultSets = require("../utils/defaultWorkoutSets");
const { enforceMuscleRest } = require("../services/restRule.service");

function computeStrengthScore(workoutLog) {
  let score = 0;

  workoutLog.exercises.forEach((ex) => {
    ex.set.forEach((s) => {
      if (s.type === "working") {
        const estimated1RM = s.weight * (1 + s.reps / 30);
        score += estimated1RM;
      }
    });
  });

  return score;
}

exports.createMySoloWorkoutLog = catchAsync(async (req, res, next) => {
  const { targets } = req.body;

  // 🚫 Global guard
  await ensureNoOngoingWorkoutLog(req.user._id);

  if (!Array.isArray(targets) || targets.length === 0) {
    return next(new AppError("Please select at least one muscle group", 400));
  }

  const lastWorkoutLog = await WorkoutLog.findOne({
    userId: req.user._id,
  }).sort({
    date: -1,
  });

  try {
    enforceMuscleRest({
      lastWorkoutLog,
      targets,
    });
  } catch (err) {
    return next(new AppError(err.message, 409));
  }

  const planExercises = req.workoutPlan.exerciseDetails;
  const validTargets = planExercises.map((ex) => ex.target);

  const invalidTargets = targets.filter((t) => !validTargets.includes(t));
  if (invalidTargets.length) {
    return next(
      new AppError(`Invalid muscle targets: ${invalidTargets.join(", ")}`, 400),
    );
  }

  const selectedExercises = planExercises
    .filter((ex) => targets.includes(ex.target))
    .map((ex) => ({
      name: ex.name,
      target: ex.target,
      gifURL: ex.gifURL,
      set: createDefaultSets(),
    }));

  if (!selectedExercises.length) {
    return next(new AppError("No matching exercises found", 400));
  }

  const newWorkoutLog = await WorkoutLog.create({
    userId: req.user._id,
    workoutPlanId: req.workoutPlan._id,
    status: "ongoing",
    exercises: selectedExercises,
  });

  res.status(201).json({
    status: "success",
    data: newWorkoutLog,
  });
});

exports.createMyChallengeWorkoutLog = catchAsync(async (req, res, next) => {
  const challenge = req.challenge;
  // console.log("challenge: ", challenge);

  // 🚫 Global guard
  await ensureNoOngoingWorkoutLog(req.user._id);

  const joined = challenge.participants.some(
    (id) => id.toString() === req.user._id.toString(),
  );

  if (!joined) {
    return next(
      new AppError("You are not a participant of this challenge", 409),
    );
  }

  // ✅ Keep THIS guard (one log per challenge per user)
  const alreadyLogged = await WorkoutLog.findOne({
    userId: req.user._id,
    challengeId: challenge._id,
  });

  if (alreadyLogged) {
    return next(
      new AppError("You already have a workout log for this challenge", 409),
    );
  }

  console.log("Challenge Exercises: ", challenge.exerciseDetails);

  const challengeExercises = challenge.exerciseDetails.map((ex) => ({
    name: ex.name,
    target: ex.target,
    gifURL: ex.gifURL,
    set: createDefaultSets(),
  }));

  console.log("Challenge Exercises fetched: ", challengeExercises);

  const lastWorkoutLog = await WorkoutLog.findOne({
    userId: req.user._id,
  }).sort({
    date: -1,
  });

  const challengeTargets = challengeExercises.map((ex) => ex.target);

  try {
    enforceMuscleRest({
      lastWorkoutLog,
      targets: challengeTargets,
    });
  } catch (err) {
    return next(new AppError(err.message, 409));
  }

  const newChallengeWorkoutLog = await WorkoutLog.create({
    userId: req.user._id,
    challengeId: challenge._id,
    status: "ongoing",
    exercises: challengeExercises,
  });

  console.log("New Challenge Workout Log: ", newChallengeWorkoutLog);

  res.status(201).json({
    status: "success",
    data: newChallengeWorkoutLog,
  });
});

exports.getMyWorkoutLogs = catchAsync(async (req, res, next) => {
  const workoutLogs = await WorkoutLog.find({
    userId: req.user._id,
  });

  res.status(200).json({
    status: "success",
    data: workoutLogs,
  });
});

// exports.updateMyWorkoutSet = catchAsync(async (req, res, next) => {
//   const { workoutLogId, exerciseIndex, setNumber } = req.params;
//   const { weight, reps, unit } = req.body;

//   // ======================================================
//   // STEP 1: Load workout log
//   // ======================================================
//   const workoutLog = await WorkoutLog.findById(workoutLogId);
//   if (!workoutLog) {
//     return next(new AppError("Workout log not found", 404));
//   }

//   // ======================================================
//   // STEP 2: Verify ownership
//   // User can only modify their own workout log
//   // ======================================================
//   if (workoutLog.userId.toString() !== req.user._id.toString()) {
//     return next(
//       new AppError("You are not allowed to modify this workout", 403)
//     );
//   }

//   // ======================================================
//   // STEP 3: Verify workout state
//   // ======================================================
//   if (workoutLog.status === "done") {
//     return next(new AppError("Workout already finished", 400));
//   }

//   if (workoutLog.status === "not yet started") {
//     return next(new AppError("Workout not started yet", 400));
//   }

//   // ======================================================
//   // STEP 4: Verify workout type permissions
//   // ======================================================
//   // If this is a challenge workout, ensure challengeId exists
//   // (permission logic can be expanded later if needed)
//   if (!workoutLog.workoutPlanId && !workoutLog.challengeId) {
//     return next(new AppError("Invalid workout session type", 400));
//   }

//   // ======================================================
//   // STEP 5: Validate exercise index
//   // ======================================================
//   const exercise = workoutLog.exercises[exerciseIndex];
//   if (!exercise) {
//     return next(new AppError("Exercise not found", 404));
//   }

//   // ======================================================
//   // STEP 6: Validate set number
//   // ======================================================
//   const set = exercise.set.find((s) => s.setNumber === Number(setNumber));
//   if (!set) {
//     return next(new AppError("Set not found", 404));
//   }

//   // ======================================================
//   // STEP 7: Update set values
//   // ======================================================
//   set.weight = weight;
//   set.reps = reps;
//   set.unit = unit || "LB";

//   // ======================================================
//   // STEP 8: Save workout log
//   // ======================================================
//   await workoutLog.save();

//   // ======================================================
//   // STEP 9: Send response
//   // ======================================================
//   res.status(200).json({
//     status: "success",
//     data: workoutLog,
//   });
// });

exports.updateMyWorkoutSetsBulk = catchAsync(async (req, res, next) => {
  const { workoutLogId } = req.params;
  const { updates } = req.body;

  // --------------------------------------------------
  // 1) Validate input
  // --------------------------------------------------
  if (!Array.isArray(updates) || updates.length === 0) {
    return next(new AppError("No set updates provided", 400));
  }

  // --------------------------------------------------
  // 2) Load workout log
  // --------------------------------------------------
  const workoutLog = await WorkoutLog.findById(workoutLogId);
  if (!workoutLog) {
    return next(new AppError("Workout log not found", 404));
  }

  // --------------------------------------------------
  // 3) Ownership check
  // --------------------------------------------------
  if (workoutLog.userId.toString() !== req.user._id.toString()) {
    return next(new AppError("Not authorized", 403));
  }

  // --------------------------------------------------
  // 4) Status guard
  // --------------------------------------------------
  if (workoutLog.status === "done") {
    return next(new AppError("Workout already finished", 400));
  }

  // --------------------------------------------------
  // 5) Apply updates
  // --------------------------------------------------
  let updatedCount = 0;

  workoutLog.exercises.forEach((exercise) => {
    exercise.set.forEach((set) => {
      const match = updates.find(
        (u) => u.setId.toString() === set._id.toString(),
      );

      if (match) {
        set.weight = Number(match.weight);
        set.reps = Number(match.reps);
        updatedCount++;
      }
    });
  });

  if (updatedCount === 0) {
    return next(new AppError("No matching sets found to update", 400));
  }

  // --------------------------------------------------
  // 6) Save once
  // --------------------------------------------------
  await workoutLog.save();

  // --------------------------------------------------
  // 7) Response
  // --------------------------------------------------
  res.status(200).json({
    status: "success",
    updatedSets: updatedCount,
    data: workoutLog,
  });
});

exports.getMyWorkoutLog = catchAsync(async (req, res, next) => {
  const workoutLog = await WorkoutLog.findById(req.params.id);

  if (!workoutLog) {
    return next(new AppError("Workout log not found", 404));
  }

  // 🔐 AUTHORIZATION
  if (workoutLog.workoutPlanId) {
    const workoutPlan = await WorkoutPlan.findById(workoutLog.workoutPlanId);

    if (
      !workoutPlan ||
      workoutPlan.userId.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Not authorized", 403));
    }
  }

  if (workoutLog.challengeId) {
    const challenge = await Challenge.findById(workoutLog.challengeId);

    if (
      !challenge ||
      !challenge.participants.some(
        (p) => p.toString() === req.user._id.toString(),
      )
    ) {
      return next(new AppError("Not authorized", 403));
    }
  }

  if (workoutLog.status === "done") {
    return next(new AppError("Workout already finished", 400));
  }

  res.status(200).json({
    status: "success",
    data: workoutLog,
  });
});

exports.finishWorkoutLog = catchAsync(async (req, res, next) => {
  const workoutLog = await WorkoutLog.findById(req.params.workoutLogId);

  if (!workoutLog) {
    return next(new AppError("Workout log not found", 404));
  }

  // 🔒 Ensure only owner can finish their workout
  if (workoutLog.userId.toString() !== req.user._id.toString()) {
    return next(
      new AppError("You are not allowed to finish this workout", 403),
    );
  }

  // 🔒 Prevent double finishing
  if (workoutLog.status === "done") {
    return next(new AppError("Workout is already finished", 409));
  }

  // 🎥 Challenge workouts REQUIRE a video
  // if (workoutLog.challengeId && !req.file) {
  //   return next(new AppError("Challenge workouts require a video", 400));
  // }

  // ☁️ Save Cloudinary video URL if uploaded
  if (req.file) {
    workoutLog.videoUrl = req.file.path; // real playable URL
  }
  workoutLog.status = "done";
  await workoutLog.save();
  res.status(200).json({
    status: "success",
    data: workoutLog,
  });
});

exports.getSubmissions = catchAsync(async (req, res, next) => {
  const { challengeId } = req.params;

  const workoutLogs = await WorkoutLog.find({ status: "done", challengeId });

  res.status(200).json({
    message: "success",
    results: workoutLogs.length,
    data: workoutLogs,
  });
});

exports.verifyChallengeWorkoutLog = catchAsync(async (req, res, next) => {
  const { workoutLogId } = req.params;
  console.log(req.body);
  const { decision, judgeNotes } = req.body;

  if (!["approved", "rejected"].includes(decision))
    return next(new AppError("Decision must be approved or rejected"));

  const workoutLog = await WorkoutLog.findById(workoutLogId);

  if (!workoutLog) return next(new AppError("Workout log not found"));

  // Must be challenge workout
  if (!workoutLog.challengeId)
    return next(new AppError("Solo workouts cannot be verified", 400));

  // Load challenge
  const challenge = await Challenge.findById(workoutLog.challengeId);

  if (!challenge) return next(new AppError("Challenge not found", 404));

  // 🚫 Conflict of interest: coach is participant in this challenge
  const isParticipant = challenge.participants.some(
    (p) => p.toString() === req.user._id.toString(),
  );

  if (isParticipant) {
    return next(
      new AppError(
        "Coaches who are participants cannot verify workouts in this challenge.",
        403,
      ),
    );
  }

  // 🚫 Prevent self-verification (extra safety)
  if (workoutLog.userId.toString() === req.user._id.toString())
    return next(
      new AppError(
        "Coaches are not allowed to verify their own workout log.",
        403,
      ),
    );

  // Must be finished
  if (workoutLog.status !== "done")
    return next(
      new AppError("Workout must be finished before verification", 401),
    );

  // Must have video
  if (!workoutLog.videoUrl)
    return next(new AppError("Workout has no video submission", 409));

  // Prevent double verification
  if (workoutLog.judgeStatus !== "pending")
    return next(new AppError("Workout already verified", 409));

  // Apply judge decision
  workoutLog.judgeStatus = decision;
  workoutLog.judgeNotes = judgeNotes || "";
  workoutLog.verifiedBy = req.user._id;

  // Compute score
  if (decision === "approved")
    workoutLog.strengthScore = computeStrengthScore(workoutLog);

  await workoutLog.save();

  res.status(200).json({
    status: "success",
    data: workoutLog,
  });
});

// Without JSON
exports.acquireMyWorkoutLogs = catchAsync(async (req, res, next) => {
  const workoutLogs = await WorkoutLog.find({
    userId: req.user._id,
  })
    .sort({ date: -1 }) // newest first
    .populate("verifiedBy", "username email") // 👈 LOAD verifier
    .populate("challengeId", "name"); // 👈 OPTIONAL (challenge info)

  req.myWorkoutLogs = workoutLogs;
  next();
});

exports.acquireMyWorkoutLog = catchAsync(async (req, res, next) => {
  const log = await WorkoutLog.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).populate("verifiedBy");

  console.log(log);

  if (!log) {
    return next(new AppError("Workout log not found", 404));
  }

  req.myWorkoutLog = log;

  next();
});

exports.acquireSubmissions = catchAsync(async (req, res, next) => {
  const { challengeId } = req.params;

  const workoutLogs = await WorkoutLog.find({
    status: "done",
    challengeId,
  }).populate("userId", "username email");

  const formattedLogs = workoutLogs.map((log) => {
    return {
      ...log.toObject(),
      formattedDate: new Date(log.date).toDateString(),
    };
  });

  // Send to view
  req.submissionLogs = formattedLogs;

  next(); // 🔥 ONLY ONE NEXT
});

exports.acquireMyTargetWeeklyFrequency = catchAsync(async (req, res, next) => {
  // 1) Start & end of week
  const startOfWeek = dayjs().startOf("week").toDate();
  const endOfWeek = dayjs().endOf("week").toDate();

  // 2) Get muscles from workout plan
  const targets = req.workoutPlan.exerciseDetails.map((ex) => ex.target);

  // 3) Aggregate workout logs
  const frequency = await WorkoutLog.aggregate([
    // a) Match user + this week
    {
      $match: {
        userId: req.user._id,
        status: "done",
        date: { $gte: startOfWeek, $lte: endOfWeek },
      },
    },

    // b) Deduplicate targets per workout session
    {
      $project: {
        uniqueTargets: {
          $setUnion: ["$exercises.target", []],
        },
      },
    },

    // c) One document per muscle per session
    { $unwind: "$uniqueTargets" },

    // d) Keep only muscles from workout plan
    {
      $match: {
        uniqueTargets: { $in: targets },
      },
    },

    // e) Count frequency
    {
      $group: {
        _id: "$uniqueTargets",
        trained: { $sum: 1 },
      },
    },
  ]);

  // 4) Normalize (show 0 / 2 for missing muscles)
  const TARGET_PER_WEEK = 2;

  const result = targets.map((muscle) => {
    const found = frequency.find((f) => f._id === muscle);

    return {
      muscle,
      trained: found ? found.trained : 0,
      target: TARGET_PER_WEEK,
    };
  });

  req.myTargetWeeklyFrequency = result;

  next();
});

exports.acquireMyWeeklyWorkoutCount = async (req, res, next) => {
  const startOfWeek = dayjs().startOf("isoWeek").toDate();
  const endOfWeek = dayjs().endOf("isoWeek").toDate();

  const workoutCount = await WorkoutLog.countDocuments({
    userId: req.user._id,
    date: { $gte: startOfWeek, $lte: endOfWeek },
    status: "done", // IMPORTANT: only completed workouts
  });

  // attach to request for views
  req.weeklyWorkoutCount = workoutCount;

  next();
};
