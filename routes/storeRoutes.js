const express = require("express");
const router = express.Router();

const storeControllers = require("../controllers/storeControllers");
const authControllers = require("../controllers/authControllers");

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
router.get("/:slug", storeControllers.getStoreBySlug);

// ✅ Update a store by ID
router.patch("/:id", authControllers.protect, storeControllers.updateStore);

// ✅ Delete a store by ID
router.delete("/:id", authControllers.restrictTo, storeControllers.deleteStore);

module.exports = router;
