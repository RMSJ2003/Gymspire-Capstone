const systemExercises = require("../dev-data/data/systemExercises");
const mongoose = require("mongoose");
const WorkoutLog = require("../models/workoutLogModel");
const Challenge = require("../models/challengeModel");
const Exercise = require("../models/exerciseModel");
const handlerFactory = require("./handlerFactory");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const generateJoinCode = require("../utils/generateJoinCode");
const { enforceMuscleRest } = require("../services/restRule.service");

// Note: you will create a workoutLog with challengeId in this function
exports.createChallenge = catchAsync(async (req, res, next) => {
  const { name, exerciseIds, startTime, endTime } = req.body;

  console.log("Exercise IDs: ", exerciseIds);

  // =========================
  // 0) Validate name
  // =========================
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return next(new AppError("Challenge name is required", 400));
  }

  // =========================
  // 1) Validate start & end time
  // =========================
  if (!startTime || !endTime) {
    return next(new AppError("Start time and end time are required", 400));
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new AppError("Invalid date format", 400));
  }

  // Allow 5 minutes grace period
  const graceMinutes = 5;
  const graceTime = new Date(now.getTime() - graceMinutes * 60 * 1000);

  if (start < graceTime) {
    return next(
      new AppError(
        `Start time cannot be more than ${graceMinutes} minutes in the past`,
        400,
      ),
    );
  }
  if (end <= start) {
    return next(new AppError("End time must be after start time", 400));
  }

  // =========================
  // 2) Validate exerciseIds array
  // =========================
  if (!Array.isArray(exerciseIds) || exerciseIds.length === 0) {
    return next(new AppError("exerciseIds must be a non-empty array", 400));
  }

  // Ensure all are strings
  const invalidTypeIds = exerciseIds.filter(
    (id) => typeof id !== "string" || id.trim().length === 0,
  );

  if (invalidTypeIds.length > 0) {
    return next(new AppError("All exerciseIds must be valid strings", 400));
  }

  // =========================
  // 3) Fetch exercises by exerciseId
  // =========================
  const exercisesFromDb = await Exercise.find({
    exerciseId: { $in: exerciseIds },
  });

  // =========================
  // 4) Validate existence
  // =========================
  const foundIds = exercisesFromDb.map((ex) => ex.exerciseId);

  const notFoundIds = exerciseIds.filter((id) => !foundIds.includes(id));

  if (notFoundIds.length > 0) {
    return next(
      new AppError(`ExerciseIds not found: ${notFoundIds.join(", ")}`, 400),
    );
  }

  // =========================
  // 5) Validate NO duplicate muscle targets
  // =========================
  const targets = exercisesFromDb.map((ex) => ex.target);
  const uniqueTargets = new Set(targets);

  if (targets.length !== uniqueTargets.size) {
    return next(
      new AppError("Each muscle group can only have ONE exercise.", 400),
    );
  }

  // =========================
  // 6) Generate join code
  // =========================
  const joinCode = generateJoinCode();

  // =========================
  // 7) Create challenge (store exerciseId strings)
  // =========================
  const newChallenge = await Challenge.create({
    name: name.trim(),
    joinCode,
    startTime: start,
    endTime: end,
    exercises: exerciseIds, // 🔥 store string IDs
  });

  // =========================
  // 8) Send response
  // =========================
  res.status(201).json({
    status: "success",
    data: newChallenge,
  });
});

exports.joinChallenge = catchAsync(async (req, res, next) => {
  // ------------------------------------------------------------------
  // STEP 1: Validate join code
  // ------------------------------------------------------------------
  const challenge = req.challenge;

  if (!challenge) {
    return next(new AppError("Invalid join code", 404));
  }

  // ------------------------------------------------------------------
  // 🔥 STEP 2.5: Prevent coaches who already VERIFIED before from joining
  // ------------------------------------------------------------------
  if (req.user.userType === "coach") {
    const hasVerifiedBefore = await WorkoutLog.exists({
      verifiedBy: req.user._id,
      judgeStatus: "approved",
    });

    if (hasVerifiedBefore) {
      return next(
        new AppError(
          "You cannot join challenges because you have previously verified participants.",
          403,
        ),
      );
    }
  }

  // ------------------------------------------------------------------
  // STEP 3: Prevent duplicate join
  // ------------------------------------------------------------------
  const alreadyJoined = challenge.participants.some(
    (id) => id.toString() === req.user._id.toString(),
  );

  if (alreadyJoined) {
    return next(new AppError("You already joined this challenge", 409));
  }

  // ------------------------------------------------------------------
  // STEP 4: Fetch last workout
  // ------------------------------------------------------------------
  const lastWorkoutLog = await WorkoutLog.findOne({
    userId: req.user._id,
  }).sort({ date: -1 });

  // ------------------------------------------------------------------
  // STEP 5: Extract challenge muscle targets
  // ------------------------------------------------------------------
  const challengeTargets = challenge.exercises.map((ex) => ex.target);

  // ------------------------------------------------------------------
  // STEP 6: Enforce rest rule
  // ------------------------------------------------------------------
  try {
    enforceMuscleRest({
      lastWorkoutLog,
      targets: challengeTargets,
    });
  } catch (err) {
    return next(new AppError(err.message, 409));
  }

  // ------------------------------------------------------------------
  // STEP 7: Join challenge
  // ------------------------------------------------------------------
  challenge.participants.push(req.user._id);
  await challenge.save();

  res.status(200).json({
    status: "success",
    message: "Successfully joined the challenge",
  });
});

// Problem: This doesn't send response and just calls next()
exports.getChallenge = catchAsync(async (req, res, next) => {
  // ================================
  // STEP 1: Extract possible identifiers
  // ================================
  const { joinCode, challengeId } = req.params;

  // ================================
  // STEP 2: Determine query source
  // ================================
  let query;

  if (joinCode) {
    query = {
      joinCode,
    };
  } else if (challengeId) {
    query = {
      _id: challengeId,
    };
  } else {
    return next(new AppError("Challenge identifier is required", 400));
  }

  // ================================
  // STEP 3: Fetch challenge
  // ================================
  const challenge = await Challenge.findOne(query).populate("exerciseDetails");

  if (!challenge) {
    return next(new AppError("Challenge not found", 404));
  }

  // ================================
  // STEP 4: Attach to request
  // ================================
  req.challenge = challenge;

  next();
});

exports.getgetChallenge = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: { data: req.challenge },
  });
});

exports.getAllChallenges = catchAsync(async (req, res, next) => {
  const challenges = await Challenge.find().populate("exerciseDetails");

  res.status(200).json({
    status: "success",
    results: challenges.length,
    data: {
      data: challenges,
    },
  });
});

exports.getLeaderboard = catchAsync(async (req, res, next) => {
  const { challengeId } = req.params;

  const leaderboard = await WorkoutLog.aggregate([
    // 1) Only this challenge
    {
      $match: {
        challengeId: new mongoose.Types.ObjectId(challengeId),
        status: "done",
        judgeStatus: "approved",
      },
    },

    // 2) Join user info
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },

    // 3) Shape leaderboard row
    {
      $project: {
        _id: 0,
        userId: "$user._id",
        username: "$user.username",
        strengthScore: 1,
      },
    },

    // 4) Sort strongest first
    {
      $sort: { strengthScore: -1 },
    },

    // 5) Rank users
    {
      $setWindowFields: {
        sortBy: { strengthScore: -1 },
        output: {
          rank: { $rank: {} },
        },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    results: leaderboard.length,
    data: leaderboard,
  });
});

// Without JSON
exports.acquireAllChallenges = catchAsync(async (req, res, next) => {
  const challenges = await Challenge.find()
    .populate("exerciseDetails")
    .populate({
      path: "participants",
      select: "username pfpUrl", // only send what UI needs
    });

  console.log("challenges: ", challenges);
  req.challenges = challenges;
  next();
});
