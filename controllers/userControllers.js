const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const filterObj = require("../utils/filterObj");
const User = require("../models/userModel");
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id; // set id param to current user
  next();
};
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("-__v -_id");
  if (!user) return next(new AppError("User not found", 404));

  res.status(200).json({ status: "success", data: { user } });
});

// controllers/userController.js
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Block password updates here
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Use /updateMyPassword.",
        400
      )
    );
  }

  // 2) Filter body to allowed fields
  const allowedData = filterObj(req.body, "name", "email", "phone");

  if (!Object.keys(allowedData).length) {
    return next(new AppError("No allowed fields to update", 400));
  }

  // 3) If a photo was uploaded, attach filename
  //if (req.file) allowedData.photo = req.file.filename;

  // 4) Update user document
  // For non-password fields, findByIdAndUpdate is fine (validators run)
  const updatedUser = await User.findByIdAndUpdate(req.user.id, allowedData, {
    new: true,
    runValidators: true,
  });
  if (!updatedUser) {
    next(
      new AppError("an error happens while trying to update your account", 401)
    );
  }

  res.status(200).json({
    status: "success",
    data: { user: updatedUser },
  });
});
