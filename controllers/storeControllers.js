const Store = require("../models/storeModel");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const helpers = require("../utils/helpers");
// @desc    Create a new store
// @route   POST /stores/createStore
// @access  Public (can be protected later)
exports.createStore = catchAsync(async (req, res, next) => {
  const { name, storeInformation, logo, brandColor } = req.body;
  const owner = req.user._id;
  const doesHaveAStore = await Store.findOne({ owner: owner });
  if (doesHaveAStore)
    return next(new AppError("you already have a store", 401));
  const newStore = await Store.create({
    name,
    storeInformation,
    owner,
    userInterface: {
      logo: logo || "",
      brandColor: brandColor || "#000000",
    },
  });

  const storeData = newStore.toObject();
  delete storeData.owner;

  res.status(201).json({
    message: "Store created successfully",
    data: storeData,
  });
});

// @desc    Get all stores
// @route   GET /stores/all
// @access  Public
exports.getAllStores = catchAsync(async (req, res, next) => {
  const stores = await Store.find();
  res.status(200).json({
    status: "success",
    results: stores.length,
    data: stores,
  });
});

// @desc    Get a single store by ID
// @route   GET /stores/:id
// @access  Public
exports.getStoreBySlug = catchAsync(async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug })
    .populate("products")
    .populate("purchases");
  if (!store) return next(new AppError("Store not found", 404));

  res.status(200).json({
    status: "success",
    data: store,
  });
});

// @desc    Update a store by ID
// @route   PATCH /stores/:id
// @access  Private (owner/admin)
exports.updateStore = catchAsync(async (req, res, next) => {
  const updatedStore = await Store.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).select("owner");

  if (!updatedStore) return next(new AppError("Store not found", 404));

  if (!helpers.isHisStore(req.user, updatedStore.owner)) {
    return next(
      new AppError("You do not have permission to update this store", 403)
    );
  }

  // 3️⃣ Apply changes manually then save to avoid second query
  Object.assign(updatedStore, req.body);
  await updatedStore.save();
  const storeData = updatedStore.toObject();
  delete storeData.owner;

  res.status(200).json({
    status: "success",
    data: storeData,
  });
});

// @desc    Delete a store by ID
// @route   DELETE /stores/:id
// @access  Private (owner/admin)
exports.deleteStore = catchAsync(async (req, res, next) => {
  const store = await Store.findByIdAndDelete(req.params.id);
  if (!store) return next(new AppError("Store not found", 404));

  res.status(204).json({
    status: "success",
    data: null,
  });
});
