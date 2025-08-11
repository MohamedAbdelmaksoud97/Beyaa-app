const Purchase = require("../models/purchaseModel");
const Store = require("../models/storeModel");
const Product = require("../models/productModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const helpers = require("../utils/helpers");

// ✅ Create a purchase by store ID
exports.createPurchase = catchAsync(async (req, res, next) => {
  const store = await Store.findById(req.params.id);
  if (!store) return next(new AppError("Store not found", 404));

  const product = await Product.findById(req.body.productId);
  if (!product || product.storeId.toString() !== store._id.toString()) {
    return next(new AppError("Product not found in this store", 400));
  }

  const quantity = req.body.quantity ?? 1;
  const unitPrice = product.price;
  const totalPrice = unitPrice * quantity;

  const purchase = await Purchase.create({
    storeId: store._id,
    productId: product._id,
    productNameSnapshot: product.name,
    quantity,
    size: req.body.size,
    isPOD: req.body.isPOD || false,
    podImage: req.body.podImage,
    customerName: req.body.customerName,
    customerPhone: req.body.customerPhone,
    customerAddress: req.body.customerAddress,
    unitPrice,
    totalPrice,
  });

  res.status(201).json({
    status: "you have successfuly purchase this product",
    data: purchase,
  });
  product.numberOfPurchases++;
  product.save({ runValidators: false });
});

// ✅ Get all purchases for a store by ID
exports.getStorePurchases = catchAsync(async (req, res, next) => {
  const store = await Store.findById(req.params.id).select("owner");
  if (!store) return next(new AppError("Store not found", 404));

  if (!helpers.isHisStore(req.user, store.owner)) {
    return next(
      new AppError("You are not allowed to explore those purchases", 401)
    );
  }

  const purchases = await Purchase.find({ storeId: store._id }).sort(
    "-createdAt"
  );

  res.status(200).json({
    status: "success",
    results: purchases.length,
    data: purchases,
  });
});

// ✅ Get a single purchase
exports.getPurchase = catchAsync(async (req, res, next) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) return next(new AppError("Purchase not found", 404));

  res.status(200).json({
    status: "success",
    data: purchase,
  });
});

// ✅ Update purchase status
exports.updatePurchaseStatus = catchAsync(async (req, res, next) => {
  const validStatuses = ["pending", "paid", "shipped", "delivered", "canceled"];
  const { status } = req.body;

  // First get the purchase
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) return next(new AppError("Purchase not found", 404));

  // Then get the store
  const store = await Store.findById(purchase.storeId).select("owner");
  if (!store) return next(new AppError("Store not found", 404));
  console.log(store);
  console.log(req.user);
  // Check ownership
  if (!helpers.isHisStore(req.user, store.owner)) {
    return next(
      new AppError("You are not authorized to update this purchase", 403)
    );
  }

  if (!validStatuses.includes(status)) {
    return next(new AppError("Invalid status", 400));
  }

  const updated = await Purchase.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: "success",
    data: updated,
  });
});

// ✅ Delete a purchase
exports.deletePurchase = catchAsync(async (req, res, next) => {
  const deleted = await Purchase.findByIdAndDelete(req.params.id);
  if (!deleted) return next(new AppError("Purchase not found", 404));

  res.status(204).json({
    status: "success",
    data: null,
  });
});
