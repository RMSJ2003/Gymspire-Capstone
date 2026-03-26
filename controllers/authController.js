const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const GymAttendance = require("../models/gymAttendanceModel");
const sendEmail = require("./../utils/email");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const fs = require("fs");
const path = require("path");

// ============================================================
// HELPERS
// ============================================================
const isStrongPassword = (password) => {
  const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  return strongPasswordRegex.test(password);
};

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  });

  user.password = undefined;

  let redirectTo = "/dashboard";
  if (user.userType === "admin") redirectTo = "/adminDashboard";
  else if (user.userType === "coach") redirectTo = "/coachDashboard";
  else if (user.userType === "user" && !user.fitnessProfile?.profileComplete) {
    redirectTo = "/onboarding";
  }

  res.status(statusCode).json({
    status: "success",
    token,
    redirectTo,
    data: { user },
  });
};

// ============================================================
// SIGNUP
// ============================================================
exports.signup = catchAsync(async (req, res, next) => {
  const isXHR = req.xhr;

  const IACADEMY_REGEX = /^[^@]+@(iacademy\.ph|iacademy\.edu\.ph)$/i;
  if (!IACADEMY_REGEX.test(req.body.email || "")) {
    const msg =
      "Only iACADEMY emails (@iacademy.ph or @iacademy.edu.ph) are allowed.";
    if (!isXHR)
      return res.redirect(
        `/signup?error=${encodeURIComponent(msg)}&email=${encodeURIComponent(req.body.email || "")}&username=${encodeURIComponent(req.body.username || "")}`,
      );
    return next(new AppError(msg, 400));
  }

  const existingUser = await User.findOne({ email: req.body.email })
    .setOptions({ includeInactive: true })
    .select("+active");

  if (existingUser) {
    const msg =
      existingUser.active === false
        ? "Unable to create account. Please use a different email address."
        : "Email already in use";
    if (!isXHR)
      return res.redirect(
        `/signup?error=${encodeURIComponent(msg)}&email=${encodeURIComponent(req.body.email || "")}&username=${encodeURIComponent(req.body.username || "")}`,
      );
    return next(new AppError(msg, 400));
  }

  const newUser = await User.create({
    email: req.body.email,
    username: req.body.username,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  if (req.file) {
    const ext = req.file.mimetype.split("/")[1];
    const filename = `user-${newUser._id}.${ext}`;
    const filePath = path.join(
      __dirname,
      "..",
      "public",
      "img",
      "users",
      filename,
    );
    await fs.promises.writeFile(filePath, req.file.buffer);
    newUser.pfpUrl = `/img/users/${filename}`;
    await newUser.save({ validateBeforeSave: false });
  }

  const verificationToken = newUser.createEmailVerificationToken();
  await newUser.save({ validateBeforeSave: false });

  const verifyURL = `${req.protocol}://${req.get("host")}/emailVerification?token=${verificationToken}`;

  try {
    await sendEmail({
      to: newUser.email,
      subject: "Verify your iACADEMY email",
      message: `Click this link to verify your email:\n${verifyURL}\n\nThis link expires in 10 minutes.`,
    });
  } catch (err) {
    console.error("Email send error:", err);
  }

  if (!isXHR)
    return res.redirect(
      `/signup?success=${encodeURIComponent("Account created! Check your iACADEMY email for the verification link.")}`,
    );

  res.status(201).json({
    status: "success",
    message: "Account created. Please verify your email before logging in.",
  });
});

// ============================================================
// CREATE COACH
// ============================================================
exports.createCoach = catchAsync(async (req, res, next) => {
  const { email, username, password, passwordConfirm } = req.body;

  if (!password) return next(new AppError("Password is required", 400));

  if (!isStrongPassword(password))
    return next(
      new AppError(
        "Password must be at least 8 characters long and contain at least one letter and one number.",
        400,
      ),
    );

  const existingUser = await User.findOne({ email }).select("+active");
  if (existingUser) return next(new AppError("Email already in use", 400));

  let pfpUrl;
  if (req.file) {
    const ext = req.file.mimetype.split("/")[1];
    const filename = `coach-${Date.now()}.${ext}`;
    const filePath = path.join(
      __dirname,
      "..",
      "public",
      "img",
      "users",
      filename,
    );
    await fs.promises.writeFile(filePath, req.file.buffer);
    pfpUrl = `/img/users/${filename}`;
  }

  const newUser = await User.create({
    email,
    username,
    password,
    passwordConfirm,
    pfpUrl,
    userType: "coach",
    emailVerified: true,
  });

  res.status(201).json({
    status: "success",
    message: "Coach account created successfully",
    data: {
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        userType: newUser.userType,
        pfpUrl: newUser.pfpUrl,
      },
    },
  });
});

// ============================================================
// CREATE ADMIN
// ============================================================
exports.createAdmin = catchAsync(async (req, res, next) => {
  const { email, username, password, passwordConfirm } = req.body;

  if (!password) return next(new AppError("Password is required", 400));

  if (!isStrongPassword(password))
    return next(
      new AppError(
        "Password must be at least 8 characters long and contain at least one letter and one number.",
        400,
      ),
    );

  const existingUser = await User.findOne({ email }).select("+active");
  if (existingUser) return next(new AppError("Email already in use", 400));

  let pfpUrl;
  if (req.file) {
    const ext = req.file.mimetype.split("/")[1];
    const filename = `admin-${Date.now()}.${ext}`;
    const filePath = path.join(
      __dirname,
      "..",
      "public",
      "img",
      "users",
      filename,
    );
    await fs.promises.writeFile(filePath, req.file.buffer);
    pfpUrl = `/img/users/${filename}`;
  }

  const newUser = await User.create({
    email,
    username,
    password,
    passwordConfirm,
    pfpUrl,
    userType: "admin",
    emailVerified: true,
  });

  res.status(201).json({
    status: "success",
    message: "Admin account created successfully",
    data: {
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        userType: newUser.userType,
        pfpUrl: newUser.pfpUrl,
      },
    },
  });
});

// ============================================================
// LOGIN
// ============================================================
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new AppError("Please provide email and password", 400));

  const user = await User.findOne({ email })
    .setOptions({ includeInactive: true })
    .select("+password +emailVerified +active +userType");

  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError("Incorrect email or password", 401));

  if (!user.emailVerified && !user.active)
    return next(
      new AppError(
        "Account is deactivated. To reactivate, please verify the email.",
        401,
      ),
    );

  if (!user.emailVerified)
    return next(new AppError("Please verify your email to get access.", 401));

  if (user.active === false) {
    return res.status(200).json({
      status: "deactivated",
      message: "Account is deactivated",
      email: user.email,
    });
  }

  createSendToken(user, 200, res);
});

// ============================================================
// LOGOUT
// ============================================================
exports.logout = catchAsync(async (req, res, next) => {
  req.user = undefined;
  res.clearCookie("jwt");
  res.redirect(303, "/login");
});

// ============================================================
// PROTECT — authenticate every protected route
// ============================================================
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.cookies.jwt && req.cookies.jwt !== "loggedout") {
    token = req.cookies.jwt;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    if (req.originalUrl.startsWith("/api"))
      return next(
        new AppError(
          "You are not logged in. Please log in to get access.",
          401,
        ),
      );
    return res.redirect("/login");
  }

  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (err) {
    res.clearCookie("jwt");
    if (req.originalUrl.startsWith("/api"))
      return next(
        new AppError("Invalid or expired token. Please log in again.", 401),
      );
    return res.redirect("/login");
  }

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    res.clearCookie("jwt");
    if (req.originalUrl.startsWith("/api"))
      return next(
        new AppError("The user belonging to this token no longer exists.", 401),
      );
    return res.redirect("/login");
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    res.clearCookie("jwt");
    if (req.originalUrl.startsWith("/api"))
      return next(
        new AppError(
          "User recently changed password. Please log in again.",
          401,
        ),
      );
    return res.redirect("/login");
  }

  // ── Prevent bfcache from restoring protected pages ────────
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  req.user = currentUser;
  next();
});

// ============================================================
// RESTRICT TO ROLES
// ============================================================
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.userType)) {
      // API routes — return JSON error
      const isApiRoute = req.originalUrl.startsWith("/api/");
      if (isApiRoute) {
        return next(
          new AppError(
            "You do not have permission to perform this action",
            403,
          ),
        );
      }
      // Page routes — silently redirect to their own dashboard
      const dashMap = {
        user: "/dashboard",
        coach: "/coachDashboard",
        admin: "/adminDashboard",
      };
      return res.redirect(303, dashMap[req.user.userType] || "/dashboard");
    }
    next();
  };
};

// ============================================================
// FORGOT PASSWORD
// ============================================================
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError("There is no user with that email address.", 404));

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrlPage = `${req.protocol}://${req.get("host")}/reset-password/${resetToken}`;
  const message = `If you didn't forget your password, please ignore this email!\nUse this link to reset your password: ${resetUrlPage}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message,
    });

    res
      .status(200)
      .json({ status: "success", message: "Token sent to email!" });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
  }
});

// ============================================================
// RESET PASSWORD
// ============================================================
exports.resetPassword = catchAsync(async (req, res, next) => {
  if (!isStrongPassword(req.body.password))
    return next(
      new AppError(
        "Password must be at least 8 characters long and contain at least one letter and one number.",
        400,
      ),
    );

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError("Token is invalid or has expired", 400));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);
});

// ============================================================
// REACTIVATE ACCOUNT
// ============================================================
exports.reactivateAccount = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email })
    .setOptions({ includeInactive: true })
    .select("+active");

  if (!user) return next(new AppError("User not found", 404));

  user.active = true;
  await user.save({ validateBeforeSave: false });

  res.redirect("/login");
});

// ============================================================
// VERIFY IACADEMY EMAIL (GET legacy + POST confirm)
// ============================================================
exports.verifyIacademyEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  })
    .setOptions({ includeInactive: true })
    .select("+active");

  if (!user) {
    if (req.method === "GET")
      return res.redirect("/emailVerification?token=invalid");
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.emailVerified = true;
  user.active = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  if (req.method === "GET") return res.redirect("/login?verified=true");

  res
    .status(200)
    .json({ status: "success", message: "Email verified successfully" });
});

// ============================================================
// PREVIEW VERIFICATION TOKEN (returns user info, does NOT verify)
// ============================================================
exports.previewVerificationToken = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  })
    .setOptions({ includeInactive: true })
    .select("+active");

  if (!user) return next(new AppError("Token is invalid or has expired", 400));

  res.status(200).json({
    status: "success",
    data: { username: user.username, email: user.email },
  });
});

// ============================================================
// REQUEST EMAIL VERIFICATION
// ============================================================
exports.requestEmailVerification = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email })
    .setOptions({ includeInactive: true })
    .select("+active");

  if (!user) return next(new AppError("No user found with that email", 404));
  if (user.emailVerified)
    return next(new AppError("Email is already verified", 400));

  if (
    user.emailVerificationToken &&
    user.emailVerificationExpires &&
    user.emailVerificationExpires > Date.now()
  ) {
    return next(
      new AppError(
        "Verification email already sent. Please check your inbox.",
        429,
      ),
    );
  }

  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  const verificationURL = `${req.protocol}://${req.get("host")}/emailVerification?token=${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: user.active ? "Verify your Email" : "Account Reactivation",
    message: `Did you request for ${user.active ? "Email Verification" : "Account Reactivation"}?\nClick to verify your email: ${verificationURL}`,
  });

  res
    .status(200)
    .json({ status: "success", message: "Verification email sent" });
});

// ============================================================
// IS LOGGED IN — populates res.locals.user for pug templates
// ============================================================
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) res.locals.user = user;
    } catch (err) {}
  }
  next();
});

// ============================================================
// REDIRECT IF LOGGED IN — prevents logged-in users hitting login/signup
// ============================================================
exports.redirectIfLoggedIn = catchAsync(async (req, res, next) => {
  // Prevent caching of login/signup pages
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  if (res.locals.user) {
    const dashMap = {
      user: "/dashboard",
      coach: "/coachDashboard",
      admin: "/adminDashboard",
    };
    return res.redirect(303, dashMap[res.locals.user.userType] || "/dashboard");
  }
  next();
});

// ============================================================
// UPDATE PASSWORD
// ============================================================
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { passwordCurrent, password, passwordConfirm } = req.body;

  if (!passwordCurrent || !password || !passwordConfirm)
    return next(
      new AppError(
        "Please provide current password, new password, and confirmation.",
        400,
      ),
    );

  if (!isStrongPassword(password))
    return next(
      new AppError(
        "Password must be at least 8 characters long and contain at least one letter and one number.",
        400,
      ),
    );

  if (password !== passwordConfirm)
    return next(new AppError("New passwords do not match.", 400));

  const user = await User.findById(req.user.id).select("+password");
  if (!user) return next(new AppError("User not found.", 404));

  const isCorrect = await user.correctPassword(passwordCurrent, user.password);
  if (!isCorrect)
    return next(new AppError("Current password is incorrect.", 401));

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});
