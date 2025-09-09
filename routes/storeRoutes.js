const express = require("express");
const router = express.Router();

const storeControllers = require("../controllers/storeControllers");
const authControllers = require("../controllers/authControllers");
const logoControllers = require("../controllers/logoControllers");

// ✅ Create a new store
/*
router.post("/createStore", storeControllers.createStore);
*/
// ✅ Get all stores
router.get(
  "/allStores",
  authControllers.protect,
  authControllers.restrictTo,
  storeControllers.getAllStores
);

// ✅ Get a store by ID
router.get(
  "/getMyStore",
  authControllers.protect,
  storeControllers.getStoreOfOwner
);
router.get("/:slug", storeControllers.getStoreBySlug);

// ✅ Update a store by ID
router.patch(
  "/:id",
  authControllers.protect,
  logoControllers.uploadLogoImage,
  logoControllers.resizeLogoImage,
  storeControllers.updateStore
);

// ✅ Delete a store by ID
router.delete("/:id", authControllers.restrictTo, storeControllers.deleteStore);

module.exports = router;
