const express = require("express");
const router = express.Router({ mergeParams: true });
const authController = require("../controllers/authControllers");
const productControllers = require("../controllers/productControllers");
const filesControllers = require("../controllers/filesControllers");

// Create product
/*

*/
// Get all products of a store
router.get("/", productControllers.getAllProducts);

// Get product by ID
router.get("/:id", productControllers.getProductById);

// Update product
router.patch(
  "/:id",
  authController.protect,
  filesControllers.uploadProductImages,
  filesControllers.resizeProductImages,
  productControllers.updateProduct
);

// Delete product
router.delete("/:id", authController.protect, productControllers.deleteProduct);

module.exports = router;
