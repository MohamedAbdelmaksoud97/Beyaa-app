import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Store from "../models/storeModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import sgMail from "@sendgrid/mail";
import crypto from "crypto";
import { promisify } from "util";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/* ---------------------------- helpers ---------------------------- */

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sendCookie = (res, token) => {
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge:
      (parseInt(process.env.JWT_COOKIE_EXPIRES_DAYS || "7", 10) || 7) *
      24 *
      60 *
      60 *
      1000,
  });
};

const createSendToken = async (user, statusCode, res) => {
  const token = signToken(user._id);
  user.password = undefined;

  const store = await Store.findOne({ owner: user._id });
  const slug = store?.slug;

  sendCookie(res, token);

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user, slug },
  });
};

// email verify JWT
const genEmailVerificationToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_EMAIL_SECRET, { expiresIn: "1h" });

/* ---------------------------- SIGNUP ---------------------------- */

export const signUp = catchAsync(async (req, res, next) => {
  const { name, email, phone, password, passwordConfirm, photo } = req.body;

  const newUser = await User.create({
    name,
    email,
    phone,
    password,
    passwordConfirm,
    photo,
  });

  const emailToken = genEmailVerificationToken(newUser._id);

  const verifyUrl = `${process.env.CLIENT_URL}/verifyEmail?token=${emailToken}`;

  const html = `
    <h1>Verify Your Email</h1>
    <p>Hello ${newUser.name},</p>
    <p>Please click below to verify your account:</p>
    <a href="${verifyUrl}" 
       style="padding:10px 20px;background:#2563eb;color:white;
              text-decoration:none;border-radius:6px;"
       target="_blank">
       Verify Email
    </a>
    <p>Expires in 1 hour.</p>
  `;

  await sgMail.send({
    to: newUser.email,
    from: process.env.SENDGRID_SENDER,
    subject: "Verify your email - Beyaa",
    html,
  });

  await createSendToken(newUser, 200, res);
});

/* --------------------------- VERIFY EMAIL --------------------------- */

export const verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.query;
  if (!token) return next(new AppError("Token is required", 400));

  console.log("Verifying email with token:", token);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET);
  } catch (err) {
    return next(new AppError("Invalid or expired token", 400));
  }

  const user = await User.findById(decoded.userId);
  if (!user) return next(new AppError("User not found", 404));

  if (!user.emailVerified) {
    user.emailVerified = true;
    await user.save({ validateBeforeSave: false });
  }

  await createSendToken(user, 200, res);
});

/* ----------------------- RESEND VERIFICATION ----------------------- */

export const resendVerification = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) return next(new AppError("No user with that email", 404));
  if (user.emailVerified)
    return next(new AppError("Email already verified", 400));

  const emailToken = genEmailVerificationToken(user._id);
  const verifyUrl = `${process.env.CLIENT_URL}/verifyEmail?token=${emailToken}`;

  await sgMail.send({
    to: user.email,
    from: process.env.SENDGRID_SENDER,
    subject: "Resend Email Verification - Beyaa",
    html: `<p>Verify your email: <a href="${verifyUrl}">Click here</a></p>`,
  });

  res.status(200).json({
    status: "success",
    message: "Verification email sent",
  });
});

/* ------------------------------ LOGIN ------------------------------ */

export const logIn = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new AppError("Please provide email and password", 400));

  const user = await User.findOne({ email }).select("+password");
  if (!user) return next(new AppError("Incorrect email or password", 401));

  //if (!user.emailVerified)
  //return next(new AppError("Please verify your email first", 403));

  if (!(await user.correctPassword(password, user.password)))
    return next(new AppError("Incorrect email or password", 401));

  await createSendToken(user, 200, res);
});

/* ----------------------------- PROTECT ----------------------------- */

export const protect = catchAsync(async (req, res, next) => {
  let token = req.cookies?.jwt;

  if (!token && req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) return next(new AppError("You are not logged in", 401));

  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError("Invalid token, login again", 401));
  }

  const user = await User.findById(decoded.id);
  if (!user) return next(new AppError("User not found", 401));

  req.user = user;
  next();
});

/* --------------------------- RESTRICT TO --------------------------- */

export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(new AppError("Not allowed", 403));
    next();
  };

/* -------------------------- UPDATE PASSWORD -------------------------- */

export const updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("+password");

  const { passwordCurrent, password, passwordConfirm } = req.body;

  if (!(await user.correctPassword(passwordCurrent, user.password)))
    return next(new AppError("Current password incorrect", 401));

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  await createSendToken(user, 200, res);
});

/* ------------------------- FORGOT PASSWORD ------------------------- */

export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res.status(200).json({
      status: "success",
      message: "If this email exists, a reset link was sent",
    });

  const resetToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_RESET_SECRET,
    { expiresIn: "15m" }
  );

  const resetURL = `${process.env.CLIENT_URL}/resetpassword/${resetToken}`;

  const html = `
    <h2>Password Reset Request</h2>
    <p>Hello ${user.name}, click below to reset your password:</p>
    <a href="${resetURL}"
       style="padding:10px 20px;background:#2563eb;color:white;
              text-decoration:none;border-radius:6px;">
       Reset Password
    </a>
  `;

  await sgMail.send({
    to: user.email,
    from: process.env.SENDGRID_SENDER,
    subject: "Password Reset - Beyaa",
    html,
  });

  res.status(200).json({
    status: "success",
    message: "Reset link sent to email",
  });
});

/* --------------------------- RESET PASSWORD --------------------------- */

export const resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { newPassword, newPasswordConfirm } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
  } catch (err) {
    return next(new AppError("Token expired or invalid", 400));
  }

  const user = await User.findById(decoded.userId).select("+password");
  if (!user) return next(new AppError("User not found", 404));

  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;
  user.passwordChangedAt = Date.now();

  await user.save();
  await createSendToken(user, 200, res);
});

/* ------------------------------ LOGOUT ------------------------------ */

export const logOut = catchAsync(async (_req, res, _next) => {
  res.cookie("jwt", "LoggedOut", {
    httpOnly: true,
    expires: new Date(Date.now() + 10 * 1000),
  });

  res.status(200).json({ status: "success" });
});
