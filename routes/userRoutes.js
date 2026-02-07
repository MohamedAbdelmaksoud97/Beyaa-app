const express = require("express");
const authController = require("../controllers/authControllers");
const userController = require("../controllers/userControllers");

const router = express.Router();

/* -------------------- AUTH -------------------- */

// Signup (sends SendGrid verification email)
router.post("/signUp", authController.signUp);

// Verify email: /api/v1/users/verifyEmail?token=XYZ
router.get("/verifyEmail", authController.verifyEmail);

// Resend verification email
router.post(
  "/resendVerification",
  authController.protect,
  authController.resendVerification
);

// Login (blocks if email not verified)
router.post("/logIn", authController.logIn);

// Update password while logged in
router.patch(
  "/updatePassword",
  authController.protect,
  authController.updatePassword
);

// Logout
router.get("/logOut", authController.protect, authController.logOut);

// Forgot password (SendGrid reset email)
router.post("/forgotPassword", authController.forgotPassword);

// Reset password with token from email
router.patch("/resetPassword/:token", authController.resetPassword);

/* -------------------- USER -------------------- */

router.get(
  "/me",
  authController.protect,
  userController.getMe,
  userController.getUser
);

router.patch("/updateMe", authController.protect, userController.updateMe);

module.exports = router;
