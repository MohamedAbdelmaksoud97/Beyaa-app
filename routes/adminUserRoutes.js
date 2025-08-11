const express = require("express");
const authController = require("../controllers/authControllers");
const adminUserController = require("../controllers/adminUserControllers");

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo);

router.get("/getStatistics", adminUserController.getStatistics);
router.route("/getAllUsers").get(adminUserController.getAllUsers); // list

router
  .route("/:id")
  .get(adminUserController.getUser) // read
  .patch(adminUserController.updateUser); // update fields (no password here)

module.exports = router;
