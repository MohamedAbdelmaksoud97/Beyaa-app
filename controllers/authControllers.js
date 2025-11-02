const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const userModel = require("../models/userModel");
const { promisify } = require("util");
const crypto = require("crypto");
const sendEmail = require("../utils/email");
const Store = require("../models/storeModel");
///////helpers///////////////////
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = async (user, statusCode, res) => {
  // near the top
  const isProd = process.env.NODE_ENV === "production";

  const token = signToken(user._id);
  //send token in cookie
  //send storeslug with data
  const store = await Store.findOne({ owner: user._id });
  //console.log("ssss", slug.slug);
  const slug = store?.slug;
  console.log(slug);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    //secure: isProd,
    //sameSite: "None", // ✅ allow cross-site cookies
  };

  res.cookie("jwt", token, cookieOptions);
  //remove password from response
  user.password = undefined;

  //send the response including jwt for mobile apps
  res.status(statusCode).json({
    status: "success",
    token,
    data: { user, slug },
  });
};
/////////////////////////////////
exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    photo: req.body.photo,
  });
  // 1) Generate verification token
  const verifyToken = newUser.createEmailVerificationToken();
  await newUser.save({ validateBeforeSave: false });

  // 2) Email verification link (adjust to your frontend)
  const verifyURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/verifyEmail/${verifyToken}`;

  const message = `Welcome! Please verify your email by visiting: ${verifyURL}\nThis link expires in 1 hour.`;

  try {
    await sendEmail({
      to: newUser.email,
      subject: "Verify your email",
      text: message,
    });

    // Option A: Don’t log them in until verified
    /*
    res.status(201).json({
      status: "success",
      message: "User created. Verification email sent.",
    });*/

    // Option B : Log them in but limit features until verified.
    createSendToken(newUser, 201, res);
  } catch (err) {
    // Roll back if email sending fails
    newUser.emailVerificationToken = undefined;
    newUser.emailVerificationExpires = undefined;
    await newUser.save({ validateBeforeSave: false });

    return next(
      new AppError("Error sending verification email. Try again later.", 500)
    );
  }

  //createSendToken(newUser, 201, res);
});

// controllers/authController.js
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const hashed = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user)
    return next(new AppError("Verification token is invalid or expired.", 400));

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // Optional: log them in now
  createSendToken(user, 200, res); // or show a success page/redirect
});

exports.logIn = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1️⃣ Check if email and password exist
  if (!email || !password) {
    return next(new AppError("please provide an email and password", 400));
  }

  // 2️⃣ Find user by email + include password
  const user = await User.findOne({ email }).select("+password");

  // 3️⃣ Check if user exists and password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  /*
  if (!user.emailVerified) {
    return next(
      new AppError(
        "Verify your email first , please go to your email and click the verification link",
        401
      )
    );
  }
*/
  // 4️⃣ Send token to client
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  console.log(req.body);
  console.log("ssssaaaaa", req.params.id);
  //extract token from request headers or cookie
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(new AppError("You are not logged in!", 401));
  }

  //there is a token now , we will verify it
  /*
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
*/
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError("Invalid token. Please log in again.", 401));
  }

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError("User no longer exists.", 401));
  }
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("Password changed recently. Please log in again.", 401)
    );
  }
  req.user = currentUser;
  next();
});

exports.restrictTo = catchAsync(async (req, res, next) => {
  const currentUser = req.user;
  if (currentUser.role != "admin") {
    return next(new AppError("You are not allowed to do that", 401));
  }
  next();
});

// controllers/authController.js
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection (+password)
  const user = await User.findById(req.user._id).select("+password");

  // 2) Check current password
  const { passwordCurrent, password, passwordConfirm } = req.body;
  if (!passwordCurrent || !password || !passwordConfirm) {
    return next(
      new AppError("Provide current password, new password and confirm.", 400)
    );
  }
  if (passwordCurrent === password) {
    next(new AppError("this is an old password , use new one", 400));
  }

  const correct = await user.correctPassword(passwordCurrent, user.password);
  if (!correct)
    return next(new AppError("Your current password is wrong.", 401));

  // 3) Set new password and save (triggers validators + pre save hooks)
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save(); // IMPORTANT: not findByIdAndUpdate!

  // 4) Re-log in user: send new JWT
  createSendToken(user, 200, res);
});

exports.logOut = catchAsync(async (req, res, next) => {
  res.cookie("jwt", "LoggedOut", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
});

////////////forget passwoed///////////////

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user by email
  const user = await User.findOne({ email: req.body.email });

  //later adjust it to success whatevere the case , better for security
  if (!user) return next(new AppError("No user with that email.", 404));

  // 2) Generate reset token and save hashed fields
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Email a link containing the raw token
  // Example URL (this is an url to our backend later we will adjust it to our front end )
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't request this, ignore this email.`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Your password reset token (valid for 10 min)",
      text: message,
      html: `<p>Click <a href="${resetURL}">here</a> to reset your password.</p>`,
    });

    res
      .status(200)
      .json({ status: "success", message: "Token sent to email!" });
  } catch (err) {
    // Roll back token fields if email fails
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        "There was an error sending the email. Try again later.",
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Hash the token from the URL to compare with DB
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  // 2) Find user with valid (not expired) token
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+password"); // ensure we can set/validate password

  if (!user) return next(new AppError("Token is invalid or has expired", 400));

  // 3) Set the new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  // This runs validators + pre-save hooks (hashing & passwordChangedAt)
  await user.save();

  // 4) Log the user in: send new JWT
  createSendToken(user, 200, res);
});
