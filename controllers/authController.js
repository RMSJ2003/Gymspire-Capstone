const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const sendEmail = require("./../utils/email");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { log } = require("console");

const isStrongPassword = (password) => {
  // at least 8 chars, 1 letter, 1 number
  const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  return strongPasswordRegex.test(password);
};

const signToken = (id) => {
  // .sign(<payload>, <secret>, <options>)
  return jwt.sign(
    {
      id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  );
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true, // The cookie can't be access or modified in anyway by the browser (important for xss attacks)
  };

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  let redirectTo = "/dashboard";

  if (user.userType === "admin") redirectTo = "/adminDashboard";
  if (user.userType === "coach") redirectTo = "/coachDashboard";

  res.status(statusCode).json({
    status: "success",
    token, // This also will be used by .protect
    redirectTo, // The backend now tells frontend where to go
    data: {
      user,
    },
  });
};

const fs = require("fs");
const path = require("path");

exports.signup = catchAsync(async (req, res, next) => {
  const existingUser = await User.findOne({ email: req.body.email })
    .setOptions({ includeInactive: true })
    .select("+active");

  if (existingUser) {
    if (existingUser.active === false) {
      return next(
        new AppError(
          "Account is deactivated. To reactivate, please verify the email.",
          400,
        ),
      );
    }

    return next(new AppError("Email already in use", 400));
  }

  // 1️⃣ Create user FIRST (no photo yet)
  const newUser = await User.create({
    email: req.body.email,
    username: req.body.username,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // 2️⃣ If user uploaded a photo, save it using USER ID 🔥
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

    // 🔥 Write file manually
    await fs.promises.writeFile(filePath, req.file.buffer);
    // 3️⃣ Update user with photo URL
    newUser.pfpUrl = `/img/users/${filename}`;
    await newUser.save({ validateBeforeSave: false });
  }

  // 4️⃣ CREATE EMAIL VERIFICATION TOKEN
  const verificationToken = newUser.createEmailVerificationToken();
  await newUser.save({ validateBeforeSave: false });

  // 5️⃣ SEND VERIFICATION EMAIL
  const verifyURL = `${req.protocol}://${req.get(
    "host",
  )}/api/v1/auth/verify-email/${verificationToken}`;

  console.log("before sending email");

  await sendEmail({
    to: newUser.email,
    subject: "Verify your iACADEMY email",
    message: `Click this link to verify your email:\n${verifyURL}\n\nThis link expires in 10 minutes.`,
  });

  // 6️⃣ DO NOT LOG THEM IN YET
  res.status(201).json({
    status: "success",
    message: "Account created. Please verify your email before logging in.",
  });
});

exports.createCoach = catchAsync(async (req, res, next) => {
  const { email, username, password, passwordConfirm } = req.body;

  if (!password) {
    return next(new AppError("Password is required", 400));
  }

  if (!isStrongPassword(password)) {
    return next(
      new AppError(
        "Password must be at least 8 characters long and contain at least one letter and one number.",
        400,
      ),
    );
  }

  const existingUser = await User.findOne({ email }).select("+active");
  if (existingUser) {
    return next(new AppError("Email already in use", 400));
  }

  // 🔥 HANDLE IMAGE
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

exports.createAdmin = catchAsync(async (req, res, next) => {
  const { email, username, password, passwordConfirm } = req.body;

  if (!password) {
    return next(new AppError("Password is required", 400));
  }

  if (!isStrongPassword(password)) {
    return next(
      new AppError(
        "Password must be at least 8 characters long and contain at least one letter and one number.",
        400,
      ),
    );
  }

  const existingUser = await User.findOne({ email }).select("+active");
  if (existingUser) {
    return next(new AppError("Email already in use", 400));
  }

  // 🔥 HANDLE IMAGE
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

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await User.findOne({ email })
    .setOptions({ includeInactive: true })
    .select("+password +emailVerified +active +userType");

  // ❗ Check user + password FIRST
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // Email + deactivation logic
  if (!user.emailVerified && !user.active) {
    return next(
      new AppError(
        "Account is deactivated. To reactivate, please verify the email.",
        401,
      ),
    );
  }

  if (!user.emailVerified) {
    return next(new AppError("Please verify your email to get access.", 401));
  }

  // 🚨 Deactivated → special response
  if (user.active === false) {
    return res.status(200).json({
      status: "deactivated",
      message: "Account is deactivated",
      email: user.email,
    });
  }

  // ✅ Normal login
  createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  // res.cookie("jwt", "loggedout", {
  //   expires: new Date(Date.now() + 10 * 1000), // Overwrites the JWT cookie that it expires
  //   // almost immediately
  //   httpOnly: true,
  // });
  req.user = undefined;

  res.clearCookie("jwt");

  res.redirect("/login");
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it exists
  let token;

  // 2) Get token from cookie OR header
  if (req.cookies.jwt && req.cookies.jwt !== "loggedout") {
    token = req.cookies.jwt;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1]; // Getting the value of token cuz
    // the authorization looks like this:
    // Authorization: Bearer <token>
  }

  if (!token)
    return next(
      new AppError("Your are not logged in! Please log in to get access", 401),
    );

  // 2) Validate the token
  // Decoding the token
  // Promisifying .verify function
  // The promisify(jwt.verify) part will promisify the jwt.verify
  // The (token, process.env.JWT_SECRET) part will call the promisified jwt.verify
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser)
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401,
      ),
    );

  // 4) Check if user changed password after the JWT (token) was issued
  // .iat means issued at, and .exp means (expire)(not used in this code)
  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError("User currently changed password! Please login again.", 401),
    );

  // Grant access to the protected route.
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.userType))
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );

    next();
  };
};

// CHANGING PASSWORD FUNCTIONALITIES - START

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email,
  });

  if (!user)
    return next(new AppError("There is no user with that email address.", 404));

  const resetToken = user.createPasswordResetToken();

  // We edited certain values from the user doc using the createPasswordResetToken function.
  await user.save({
    validateBeforeSave: false,
  });

  // req.protocol is https/http
  // In here we will send the original reset token, not the encrypted one
  // const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}\n
  // If you didn't forget your password, please ignore this email!`;

  // // try {

  const resetURL = `${req.protocol}://${req.get(
    "host",
  )}/api/v1/auth/resetPassword/${resetToken}`; // In here we will send the original reset token, not the encrypted one

  const resetUrlPage = `${req.protocol}://${req.get(
    "host",
  )}/reset-password/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.
    \nIf you didn't forget your password, please ignore this email!\n Use this link (page) to reset your password: ${resetUrlPage}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message,
    });

    // We can't send the resetToken here it's dangerous - anyone can see it
    // We send it via email cuz email is safe
    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.createPasswordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({
      validateBeforeSave: false,
    });

    // Fix Error
    // return next(new AppError('There was an error sending an email. Try again later!', 500));
    return;
    // return apperror
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the given token
  // req.params come from the URL

  if (!isStrongPassword(req.body.password)) {
    return next(
      new AppError(
        "Password must be at least 8 characters long and contain at least one letter and one number.",
        400,
      ),
    );
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: {
      $gt: Date.now(),
    },
  });

  // 2} If token has not expired, and there is a user, set the new password.
  if (!user) next(new AppError("Token is invalid or has expired", 400));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  // Since we already updated the password, we can now remove the rest token fields
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  createSendToken(user, 200, res);
});

// CHANGING PASSWORD FUNCTIONALITIES - END

exports.reactivateAccount = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email })
    .setOptions({ includeInactive: true })
    .select("+active");

  if (!user) return next(new AppError("User not found", 404));

  user.active = true;
  await user.save({ validateBeforeSave: false });

  res.redirect("/login");

  // createSendToken(user, 200, res); // auto login after reactivation
});

exports.verifyIacademyEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  // 2} If token has not expired, and there is a user, set the new password.
  if (!user) next(new AppError("Token is invalid or has expired", 400));

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "Email verified successfully",
  });
});

exports.requestEmailVerification = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  // 1) Check if user exists
  const user = await User.findOne({ email })
    .setOptions({ includeInactive: true })
    .select("+active");

  if (!user) {
    return next(new AppError("No user found with that email", 404));
  }

  // 2) Check if email is already verified
  if (user.emailVerified) {
    return next(new AppError("Email is already verified", 400));
  }

  // 3) Check if a valid (non-expired) verification link already exists
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

  // 4) Create new verification token (old one is expired or missing)
  const verificationToken = user.createEmailVerificationToken();

  await user.save({ validateBeforeSave: false });

  // 5) Send verification email
  const verificationURL = `${req.protocol}://${req.get(
    "host",
  )}/api/v1/auth/${user.active ? "verify-email" : "reactivate-account"}/${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: user.active ? "Verify your Email" : "Account Reactivation",
    message: `Did you request for ${user.active ? "Email Verification" : "Accont Reactivation"}? \nClick to verify your email: ${verificationURL}`,
  });

  // 6) Response
  res.status(200).json({
    status: "success",
    message: "Verification email sent",
  });
});

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
  // 2} If token has not expired, and there is a user, set the new password.
  if (!user) next(new AppError("Token is invalid or has expired", 400));

  user.emailVerified = true;
  user.active = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "Email verified successfully",
  });
});

// With this, pug files can now do something like this:
// if user
//   p Welcome #{user.username}
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

exports.redirectIfLoggedIn = catchAsync(async (req, res, next) => {
  // console.log(res.locals.user);
  if (res.locals.user) {
    // res.locals.user came from isLoggedIn in this controller file
    let redirectTo = "/dashboard";

    if (res.locals.user.userType === "admin") redirectTo = "/adminDashboard";
    else if (res.locals.user.userType === "coach")
      redirectTo = "/coachDashboard";
    return res.redirect(redirectTo);
  }
  next();
});
