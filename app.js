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
const congestionRouter = require("./routes/congestionRouter");
const viewRouter = require("./routes/viewRoutes");
const app = express();

const authController = require("./controllers/authController");

console.log("this is app");

// BODY + COOKIES
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ── PREVENT BACK-BUTTON CACHE ─────────────────────────────
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// VIEW ENGINE
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// API ROUTES
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/workout-plans", workoutPlanRouter);
app.use("/api/v1/prs", prRouter);
app.use("/api/v1/challenges", challengeRouter);
app.use("/api/v1/workout-logs", workoutLogRouter);
app.use("/api/v1/exercise-db-api", exerciseDbApiRouter);
app.use("/api/v1/exercises", exerciseRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/congestion", congestionRouter);

// VIEW ROUTES
app.use(authController.isLoggedIn);
app.use("/", viewRouter);

// 404 HANDLER
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
