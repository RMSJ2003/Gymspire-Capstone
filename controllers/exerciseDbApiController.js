const axios = require("axios");
const Exercise = require("../models/exerciseModel");
const catchAsync = require("../utils/catchAsync");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function isGifWorking(url) {
  if (!url) return false;
  try {
    const res = await axios.head(url, { timeout: 5000 });
    return (
      res.status === 200 && res.headers["content-type"]?.startsWith("image")
    );
  } catch {
    return false;
  }
}

exports.importApiExercises = catchAsync(async (req, res, next) => {
  const baseURL = `${process.env.EXERCISE_DB_URL}/api/v1/exercises/filter`;
  const LIMIT = 25;

  let totalImported = 0;
  const muscles = process.env.ALLOWED_MUSCLES.split(",");

  for (const muscle of muscles) {
    let offset = 0;
    let hasMore = true;

    console.log(`\n📦 Starting import for muscle: ${muscle}`);

    while (hasMore) {
      try {
        const response = await axios.get(baseURL, {
          params: {
            offset,
            limit: LIMIT,
            muscles: muscle,
            // ✅ No equipment filter — fetch ALL equipment types
          },
        });

        const exercises = response.data.data || [];
        console.log(
          `  → offset ${offset}: fetched ${exercises.length} exercises`,
        );

        if (exercises.length === 0) {
          hasMore = false;
          break;
        }

        for (const ex of exercises) {
          const gifWorking = await isGifWorking(ex.gifUrl);

          await Exercise.updateOne(
            { exerciseId: ex.exerciseId },
            {
              exerciseId: ex.exerciseId,
              name: ex.name,
              gifURL: ex.gifUrl,
              target: ex.targetMuscles?.[0] || muscle,
              equipment: ex.equipments?.[0] || "unknown",
              instructions: ex.instructions,
              gifWorking,
            },
            { upsert: true },
          );

          totalImported++;
          await sleep(300); // small delay per exercise
        }

        // If fewer results than limit, we've reached the end for this muscle
        if (exercises.length < LIMIT) {
          hasMore = false;
        } else {
          offset += LIMIT;
          console.log(`  ⏱️  Waiting 60s before next page (rate limit)...`);
          await sleep(60000);
        }
      } catch (err) {
        console.error(
          `Failed importing muscle: ${muscle} at offset ${offset}`,
          err.response?.status,
          err.response?.data,
        );

        if (err.response?.status === 429) {
          return res.status(429).json({
            status: "fail",
            message:
              "Rate limited by ExerciseDB. Please wait several minutes before retrying.",
            importedSoFar: totalImported,
          });
        }

        // Skip this page on other errors and move on
        hasMore = false;
      }
    }

    console.log(`✅ Done with ${muscle}. Waiting 60s before next muscle...`);
    await sleep(60000); // wait between muscle groups
  }

  res.status(200).json({
    status: "success",
    imported: totalImported,
  });
});

exports.deleteAllExercises = catchAsync(async (req, res, next) => {
  await Exercise.deleteMany({});
  res
    .status(200)
    .json({ status: "success", message: "All exercises deleted." });
});
