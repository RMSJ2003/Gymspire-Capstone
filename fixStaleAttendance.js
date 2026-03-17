// fixStaleAttendance.js
require("dotenv").config({ path: "./config.env" }); // ← change this line

const mongoose = require("mongoose");
const GymAttendance = require("./models/gymAttendanceModel");
const User = require("./models/userModel");

const fix = async () => {
  // ← change this block
  const DB = process.env.DATABASE.replace(
    "<PASSWORD>",
    process.env.DATABASE_PASSWORD,
  );
  await mongoose.connect(DB);
  console.log("DB connected...");

  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const stale = await GymAttendance.find({
    checkoutTime: null,
    checkinTime: { $lt: cutoff },
  });

  console.log(`Found ${stale.length} stale record(s)`);

  for (const r of stale) {
    r.checkoutTime = new Date(r.checkinTime.getTime() + 12 * 60 * 60 * 1000);
    r.durationMinutes = 720;
    await r.save();
    await User.findByIdAndUpdate(r.user, {
      isAtGym: false,
      gymStatus: "offline",
      gymCheckinTime: null,
    });
    console.log(`Fixed user: ${r.user}`);
  }

  console.log("Done! All stale records fixed.");
  process.exit(0);
};

fix().catch((err) => {
  console.error(err);
  process.exit(1);
});
