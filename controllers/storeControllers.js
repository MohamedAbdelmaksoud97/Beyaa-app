const Store = require("../models/storeModel");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const helpers = require("../utils/helpers");
// @desc    Create a new store
// @route   POST /stores/createStore
// @access  Public (can be protected later)
exports.createStore = catchAsync(async (req, res, next) => {
  console.log("Creating store with data:", req.body);

  const {
    name,
    storeInformation,
    whatSell,
    logo,
    heroImage,
    heading,
    subHeading,
    brandColor,
  } = req.body;
  const owner = req.user._id;
  const existingStore = await Store.findOne({ owner });
  if (existingStore) {
    return next(new AppError("You already have a store", 400));
  }

  const newStore = await Store.create({
    name,
    storeInformation,
    owner,
    heroImage,
    brandColor,
    whatSell,
    heading,
    subHeading,
    logo: logo || "",
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
    .populate("purchases")
    .lean()
    .exec();
  if (!store) return next(new AppError("Store not found", 404));

  const today = new Date();
  store.banners = store.banners.filter(
    (b) => b.endDate >= today && b.startDate <= today
  );

  res.status(200).json({
    status: "success",
    data: store,
  });
});
exports.getStoreOfOwner = catchAsync(async (req, res, next) => {
  const store = await Store.findOne({ owner: req.user._id });
  console.log(req.user._id);
  console.log(store);

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
  // 1) Load doc first
  console.log(req.body);
  const store = await Store.findById(req.params.id).select("+owner");
  console.log("sssss", store);
  if (!store) return next(new AppError("Store not found", 404));

  // 2) Authorize BEFORE changing anything

  if (!helpers.isHisStore(req.user._id, store.owner)) {
    return next(
      new AppError("You do not have permission to update this store", 403)
    );
  }

  // 3) Whitelist allowed fields (avoid updating protected fields like `owner`)
  const allowedKeys = [
    "name",
    "storeInformation",
    "whatSell",
    "logo",
    "brandColor",
    "heading",
    "subHeading",
    "heroImage", // ✅ include heroImage
  ];

  // 4) Apply once and save (validators run on save)
  const allowed = {};
  for (const k of allowedKeys) {
    const v = req.body[k];
    // accept only defined AND non-empty-string values
    if (v !== undefined && v !== "") allowed[k] = v;
  }

  // 4) Apply once and save (validators run on save)
  Object.assign(store, allowed);
  await store.save();

  const data = store.toObject();
  delete data.owner;
  res.status(200).json({ status: "success", data });
});

// @desc    Delete a store by ID
// @route   DELETE /stores/:id
// @access  Private (owner/admin)

exports.addBanner = catchAsync(async (req, res, next) => {
  const store = await Store.findById(req.params.id).select("+owner");
  if (!store) return next(new AppError("Store not found", 404));

  if (!helpers.isHisStore(req.user._id, store.owner)) {
    return next(
      new AppError("You do not have permission to update this store", 403)
    );
  }

  const banner = {
    title: req.body.title,
    description: req.body.description,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    image: req.body.image,
    link: req.body.link,
  };

  store.banners.push(banner);
  await store.save();

  res.status(201).json({
    status: "success",
    data: store.banners,
  });
});

exports.removeBanner = catchAsync(async (req, res, next) => {
  const store = await Store.findById(req.params.id).select("+owner");
  if (!store) return next(new AppError("Store not found", 404));

  if (!helpers.isHisStore(req.user._id, store.owner)) {
    return next(
      new AppError("You do not have permission to update this store", 403)
    );
  }
  const bannerId = req.params.bannerId;
  const bannerIndex = store.banners.findIndex(
    (b) => b._id.toString() === bannerId
  );
  if (bannerIndex === -1) {
    return next(new AppError("Banner not found", 404));
  }
  store.banners.splice(bannerIndex, 1);
  await store.save();
  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.deleteStore = catchAsync(async (req, res, next) => {
  const store = await Store.findByIdAndDelete(req.params.id);
  if (!store) return next(new AppError("Store not found", 404));

  res.status(204).json({
    status: "success",
    data: null,
  });
});
