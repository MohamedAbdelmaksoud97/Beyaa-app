const express = require("express");
const router = express.Router({ mergeParams: true });
const purchaseControllers = require("../controllers/purchaseControllers");
const authControllers = require("../controllers/authControllers");

// 👇 Route: /api/v1/stores/:id/purchases
router
  .route("/")

  .get(authControllers.protect, purchaseControllers.getStorePurchases);

// 👇 Route: /api/v1/purchases/:id
router
  .route("/:id")
  .get(purchaseControllers.getPurchase)
  .patch(authControllers.protect, purchaseControllers.updatePurchaseStatus)
  .delete(purchaseControllers.deletePurchase);

module.exports = router;
