const express = require("express");
const authController = require("../controllers/authControllers");
const userController = require("../controllers/userControllers");

const router = express.Router();

router.post("/signUp", authController.signUp);

router.get("/verifyEmail/:token", authController.verifyEmail); // or POST

router.post("/logIn", authController.logIn);
router.patch(
  "/updatePassword",
  authController.protect,
  authController.updatePassword
);
router.get("/logOut", authController.protect, authController.logOut);

router.post("/forgotPassword", authController.forgotPassword);

router.patch("/resetPassword/:token", authController.resetPassword);

////////////////////////userRoutes////////////////////////////////////////////////////////////
router.get(
  "/me",
  authController.protect,
  userController.getMe,
  userController.getUser
);

router.patch(
  "/updateMe",
  authController.protect,

  userController.updateMe
);

module.exports = router;
