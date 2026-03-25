const mongoose = require("mongoose");

const exerciseSchema = new mongoose.Schema({
  exerciseId: String,
  name: String,
  gifURL: String,
  target: String,
  equipment: String,
  instructions: [String],
  isGymExercise: {
    type: Boolean,
    default: false,
  },
  gifWorking: {
    type: Boolean,
    default: true,
    select: false,
  },
});

exerciseSchema.pre(/^find/, function (next) {
  if (this.getOptions().includeInactive) return next();
  this.find({ gifWorking: { $ne: false } });
  next();
});

module.exports = mongoose.model("Exercise", exerciseSchema);
