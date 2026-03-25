const mongoose = require("mongoose");

const dayScheduleSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    isOpen: { type: Boolean, default: true },
    openingHour: { type: Number, default: 6, min: 0, max: 23 },
    closingHour: { type: Number, default: 23, min: 0, max: 23 },
  },
  { _id: false },
);

const gymSettingsSchema = new mongoose.Schema(
  {
    schedule: {
      type: [dayScheduleSchema],
      default: () => [
        { day: "Sunday", isOpen: false, openingHour: 6, closingHour: 22 },
        { day: "Monday", isOpen: true, openingHour: 6, closingHour: 23 },
        { day: "Tuesday", isOpen: true, openingHour: 6, closingHour: 23 },
        { day: "Wednesday", isOpen: true, openingHour: 6, closingHour: 23 },
        { day: "Thursday", isOpen: true, openingHour: 6, closingHour: 23 },
        { day: "Friday", isOpen: true, openingHour: 6, closingHour: 23 },
        { day: "Saturday", isOpen: true, openingHour: 8, closingHour: 22 },
      ],
    },
    // ── Gym Location ──────────────────────────────────────
    gymName: { type: String, default: "iAcademy Gym" },
    gymLat: { type: Number, default: null },
    gymLng: { type: Number, default: null },
    gymRadiusMeters: { type: Number, default: 150, min: 10, max: 1000 },
  },
  { timestamps: true },
);

gymSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) settings = await this.create({});
  return settings;
};

module.exports = mongoose.model("GymSettings", gymSettingsSchema);
