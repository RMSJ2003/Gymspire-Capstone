const mongoose = require("mongoose");
const Exercise = require("../models/exerciseModel");
require("dotenv").config({ path: "../config.env" });

const HOME_EQUIPMENT = [
  "body weight",
  "resistance band",
  "dumbbell",
  "ez barbell",
];

async function migrate() {
  await mongoose.connect(process.env.DATABASE);
  console.log("Connected to DB...");

  // Set isGymExercise: true on everything that is NOT home-only equipment
  const result = await Exercise.updateMany(
    {
      equipment: { $nin: HOME_EQUIPMENT },
      isGymExercise: { $ne: true },
    },
    { $set: { isGymExercise: true } },
  );

  console.log(
    `Updated ${result.modifiedCount} exercises → isGymExercise: true`,
  );

  // Also set home exercises (they can be both, but keep isGymExercise false)
  const homeResult = await Exercise.countDocuments({
    equipment: { $in: HOME_EQUIPMENT },
  });
  console.log(`Home-only exercises (isGymExercise stays false): ${homeResult}`);

  await mongoose.disconnect();
  console.log("Done.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
