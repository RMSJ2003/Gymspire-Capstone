const path = require("path");

const express = require("express");

const cookieParser = require("cookie-parser");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const userRouter = require("./routes/userRoutes");
const authRouter = require("./routes/authRoutes");
const workoutPlanRouter = require("./routes/workoutPlanRoutes");
const prRouter = require("./routes/prRoutes");
const challengeRouter = require("./routes/challengeRoutes");
const workoutLogRouter = require("./routes/workoutLogRoutes");
const exerciseDbApiRouter = require("./routes/exerciseDbApiRoutes");
const exerciseRouter = require("./routes/exerciseRoutes");
const adminRouter = require("./routes/adminRoutes");
const viewRouter = require("./routes/viewRoutes");
const app = express();

const authController = require("./controllers/authController"); // 🔹 ADD THIS

console.log("this is app");
// BODY + COOKIES
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// VIEW ENGINE
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// 🔹 API ROUTES FIRST (VERY IMPORTANT)
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/workout-plans", workoutPlanRouter);
app.use("/api/v1/prs", prRouter);
app.use("/api/v1/challenges", challengeRouter);
app.use("/api/v1/workout-logs", workoutLogRouter);
app.use("/api/v1/exercise-db-api", exerciseDbApiRouter);
app.use("/api/v1/exercises", exerciseRouter);
app.use("/api/v1/admin", adminRouter);

// 🔹 VIEW ROUTES LAST
app.use(authController.isLoggedIn); // To be able to use user details in pug files
app.use("/", viewRouter);

// 404 HANDLER
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
