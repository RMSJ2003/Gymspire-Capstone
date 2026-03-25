const crypto = require("crypto");

const mongoose = require("mongoose");
const { type } = require("os");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    validate: {
      validator: validator.isEmail,
      message: "Please provide a valid email address",
    },
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8, // length of passwords is more important than crazy symbols
    select: false, // If we read all users then password field won't show up but if we sign up user it will still show up (encrypted version)
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    // Custom Validator to confirm password.
    validate: {
      // THIS ONLY WORKS ON CREATE AND SAVE !!! (.save and .create in mongoose)
      // We can't use arrow function cuz we need this keyword
      // A validator function returns a boolean if it's validated
      validator: function (el) {
        // If passwordConfirm == password, from doc
        return el === this.password;
      },
      message: "Passwords are not the same!",
    },
  },
  userType: {
    type: String,
    enum: ["user", "coach", "admin"],
    default: "user",
  },
  username: {
    type: String,
    required: [true, "Please provide your username"],
    // NOT SURE ABOUT THESE:
    trim: true,
    minlength: [3, "Username must be at least 3 characters"],
    maxlength: [20, "Username must be at most 20 characters"],
    match: [
      /^[a-zA-Z0-9._-]+$/,
      "Username may only contain letters, numbers, dots, underscores, and hyphens",
    ],
  },
  pfpUrl: {
    type: String,
    default: "/img/default-user.png",
  },
  // quote: {
  //     type: String,
  //     trim: true // *is this really needed?
  // },
  // beforeImgUrl: String,  // *is this really needed?
  // beforeWeight: Number, // *is this really needed?
  // afterImgUrl: String, // *is this really needed?
  // afterWeight: Number, // *is this really needed?
  passwordChangedAt: Date, // The value of this field will change when someone change the password.
  passwordResetToken: String,
  passwordResetExpires: Date, // timer do reset the password
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  active: {
    type: Boolean,
    default: true, //ofc when user is created, active is set to true
    select: false, // We set select to false cuz we don't want users to see active field
  },
  // Add to your existing User schema
  isAtGym: { type: Boolean, default: false },
  gymCheckinTime: { type: Date },
  gymStatus: {
    type: String,
    enum: ["atGym", "logging", "offline"],
    default: "offline",
  },
  fitnessProfile: {
    age: { type: Number, min: 13, max: 100 },
    sex: { type: String, enum: ["male", "female", "prefer_not_to_say"] },
    weightKg: { type: Number },
    heightCm: { type: Number },
    fitnessGoal: {
      type: String,
      enum: [
        "strength",
        "endurance",
        "weight_loss",
        "muscle_gain",
        "general_fitness",
      ],
    },
    intensity: {
      type: String,
      enum: ["easy", "moderate", "hard"],
      default: "moderate",
    },
    experienceLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
    },
    healthDisclaimer: { type: Boolean, default: false },
    hasHealthConditions: { type: Boolean, default: false },
    healthNotes: { type: String, maxlength: 500 },
    profileComplete: { type: Boolean, default: false },
  },
});

// START OF COMMENT FOR IMPORTING DEV DATA

userSchema.pre("save", async function (next) {
  // We only want to encrypt the password if the password field
  // has actually been updated or when it's new.
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 13);

  this.passwordConfirm = undefined;

  next();
});

// Reset Password Middleware
userSchema.pre("save", function (next) {
  // If not modified OR the document is new, then return right away and proceed to the middleware
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; // update last update date
  next();
});

// END OF COMMENT FOR IMPORTING DEV DATA

// Query middleware
// Regular Expression (RegEx) /^find/ means a string that starts with "find"
userSchema.pre(/^find/, function (next) {
  // 🔥 Allow bypassing inactive filter when explicitly requested
  if (this.getOptions().includeInactive) {
    return next();
  }

  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // just finished this middleware functin - continue
  if (this.passwordChangedAt) {
    // The second param of parseInt is the base, which we set to base 10 number
    // returns the seconds
    // We used parse function to turn ms to s
    // returns the date as seconds since Jan 1, 1970 (UNIX epoch).
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    console.log(changedTimestamp, JWTTimestamp);

    return JWTTimestamp < changedTimestamp;
    // e.g. iat (issued at / created at) is at time 100 and we changed password at time 200
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // resetToken should be cryptographically strong as the password hash

  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256") // type of hash
    .update(resetToken) // which string?
    .digest("hex"); // type of string

  // We are logging the resetToken as an object cuz this way, we'll se the variable name along with its value
  console.log(
    {
      resetToken,
    },
    this.passwordResetToken,
  );

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

userSchema.methods.createEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString("hex");

  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  this.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 mins

  return verificationToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
