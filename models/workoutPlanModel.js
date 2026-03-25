const mongoose = require("mongoose");

const workoutPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["Home", "Gym"],
      required: true,
    },

    exerciseIds: {
      type: [String],
      required: true,
    },

    name: {
      type: String,
      default: "My Workout Plan",
    },

    description: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// 1 Home + 1 Gym per user max
workoutPlanSchema.index({ userId: 1, type: 1 }, { unique: true });

workoutPlanSchema.virtual("exerciseDetails", {
  ref: "Exercise",
  localField: "exerciseIds",
  foreignField: "exerciseId",
});

const WorkoutPlan = mongoose.model("WorkoutPlan", workoutPlanSchema);

module.exports = WorkoutPlan;
