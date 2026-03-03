const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    joinCode: {
      type: String,
      unique: true,
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },

    // 🔥 Store exerciseId strings
    exercises: [
      {
        type: String,
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// 🔥 Virtual populate using string match
challengeSchema.virtual("exerciseDetails", {
  ref: "Exercise",
  localField: "exercises", // Challenge.exercises (array of strings)
  foreignField: "exerciseId", // Exercise.exerciseId (string field)
});

const Challenge = mongoose.model("Challenge", challengeSchema);
module.exports = Challenge;
