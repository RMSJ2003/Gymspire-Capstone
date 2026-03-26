const express = require("express");
const workoutPlanController = require("../controllers/workoutPlanController");
const authController = require("../controllers/authController");
const requireWorkoutPlan = require("../middlewares/requireWorkoutPlan");

const router = express.Router();

router.use(authController.protect);

router
  .route("/")
  .post(workoutPlanController.createMyWorkoutPlan)
  .get(requireWorkoutPlan, workoutPlanController.getMyWorkoutPlan)
  .patch(requireWorkoutPlan, workoutPlanController.updateMyWorkoutPlan)
  .delete(requireWorkoutPlan, workoutPlanController.deleteMyWorkoutPlan);

module.exports = router;

// note:
// const axios = require('axios');
// const AppError = require('../utils/appError');

// exports.getExerciseForMuscle = async (muscle) => {
//     const url = `${process.env.EXERCISE_DB_URL}/exercises/target/muscle`;

//     try {
//         const res = await axios.get(url, {
//             header: {
//                 'x-rapidapi-key': process.env.EXERCISE_DB_KEY,
//                 'x-rapidapi-host': process.env.EXERCISE_DB_HOST
//             }
//         });

//         const exercises = res.data;

//         if (!execises || exercises.length === 0)
//             throw new AppError(`No exercises found for muscle: ${muscle}`, 404);

//         // Pick 1 random exercise
//         const random = exercises[Math.floor(Math.random() * exercises.length)];

//         return {
//             workoutName: random.name,
//             formGifUrl: 'formGifurl', // *template - FIX LATER
//             targetMuscle: random.target,
//             sets: 3,
//             minReps: 8,
//             maxReps: 12
//         };
//     } catch (err) {
//         console.error(err);
//         throw new AppError(`Failed to fetch exercise for ${muscle}`, 500);
//     }
// };
