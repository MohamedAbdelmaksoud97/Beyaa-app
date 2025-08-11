// controllers/adminUserController.js
const User = require("../models/userModel");
const Store = require("../models/storeModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const qs = require("qs"); // if you want same filter syntax as products
const sendEmail = require("../utils/email");
const crypto = require("crypto");

// GET /users?role=manager&sort=-createdAt&limit=20&page=2&fields=name,email,role
exports.getAllUsers = catchAsync(async (req, res, next) => {
  // Basic APIFeatures in-line (reuse your helper if you have one)
  const queryObj = qs.parse(req.query);
  const excluded = ["page", "sort", "limit", "fields"];
  excluded.forEach((k) => delete queryObj[k]);

  let query = User.find(queryObj);

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  // Field limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    query = query.select(fields);
  } else {
    query = query.select("-__v"); // and keep password hidden by schema
  }

  // Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 100;
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  const users = await query;
  res.status(200).json({
    status: "success",
    results: users.length,
    data: { users },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("+active");
  if (!user) return next(new AppError("User not found", 404));
  res.status(200).json({ status: "success", data: { user } });
});

// Optional: create user directly (often you invite instead)
exports.createUser = catchAsync(async (req, res, next) => {
  // Common pattern: admin sets name/email/role and sends invite email with set-password link.
  const allowed = (({ name, email, role }) => ({ name, email, role }))(
    req.body
  );

  const user = await User.create({
    ...allowed,
    // You may create a temporary random password and force reset
    password: crypto.randomBytes(12).toString("hex"),
    passwordConfirm: "placeholder", // will be overridden; you can bypass with validateBeforeSave: false
  });

  // Better: create minimal user then immediately send a force reset link (below)
  res.status(201).json({ status: "success", data: { user } });
});

// Update non-password fields (name, email, role, active)
exports.updateUser = catchAsync(async (req, res, next) => {
  const disallowed = [
    "password",
    "passwordConfirm",
    "passwordChangedAt",
    "resetPasswordToken",
    "resetPasswordExpires",
  ];
  for (const k of disallowed) if (k in req.body) delete req.body[k];

  const updates = (({ name, email, role, active, photo }) => ({
    name,
    email,

    photo,
  }))(req.body);

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).select("+active");

  if (!user) return next(new AppError("User not found", 404));
  res.status(200).json({ status: "success", data: { user } });
});

// Hard delete (use sparingly; soft delete is safer)
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return next(new AppError("User not found", 404));
  res.status(204).json({ status: "success", data: null });
});

// Soft deactivate (recommended)
exports.deactivateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true }
  ).select("+active");
  if (!user) return next(new AppError("User not found", 404));
  res.status(200).json({ status: "success", data: { user } });
});

exports.activateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { active: true },
    { new: true }
  ).select("+active");
  if (!user) return next(new AppError("User not found", 404));
  res.status(200).json({ status: "success", data: { user } });
});

// Force password reset: send email with reset token (reusing Step 10 logic)
exports.forcePasswordReset = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError("User not found", 404));

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;
  const message = `An administrator requested a password reset for your account.\nUse this link within 10 minutes:\n${resetURL}`;

  await sendEmail({
    to: user.email,
    subject: "Password reset requested by admin",
    text: message,
  });

  res.status(200).json({ status: "success", message: "Reset email sent." });
});

exports.getStatistics = catchAsync(async (req, res, next) => {
  const allStores = await Store.find()
    .populate("products")
    .populate("purchases");
  console.log(allStores);

  res.status(200).json({
    status: "success",
    data: {
      length: allStores.length,
      allStores,
    },
  });
});
