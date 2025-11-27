const Product = require("../models/productModel");
const Store = require("../models/storeModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const qs = require("qs");
const { find } = require("../models/userModel");
const User = require("../models/userModel");
// @desc Create a product
exports.createProduct = catchAsync(async (req, res, next) => {
  const store = await Store.findOne({ owner: req.user._id });
  console.log("sssss", store._id, req.params);
  if (store._id != req.params.id) {
    return next(
      new AppError("you are not allowed to create products here ", 401)
    );
  }

  const user = await User.findById(req.user._id);
  if (!user.emailVerified) {
    return next(
      new AppError(
        "Verify your email first, please go to your email and click the verification link",
        401
      )
    );
  }

  let { availableSize } = req.body;
  if (typeof availableSize === "string") {
    try {
      availableSize = JSON.parse(availableSize);
    } catch {
      availableSize = [];
    }
  }

  console.log(req.body);

  /*
  if (!req.user.emailVerified) {
    return next(
      new AppError(
        "Verify your email first, please go to your email and click the verification link",
        401
      )
    );
  }
    */
  const product = await Product.create({
    ...req.body,
    availableSize: availableSize,
    storeId: req.params.id,
    ownerId: req.user._id,
  });

  const productData = product.toObject();
  delete productData.storeId;
  delete productData.ownerId;

  res.status(201).json({
    status: "success",
    data: productData,
  });
});

// @desc Get all products of the store
exports.getAllProducts = catchAsync(async (req, res, next) => {
  const currentStore = await Store.findOne({ _id: req.params.id });

  let query = Product.find({ storeId: currentStore._id });

  // 1️⃣ Filter
  const queryObj = qs.parse(req.query);

  const excludedFields = ["page", "sort", "limit", "fields"];
  excludedFields.forEach((el) => delete queryObj[el]);

  // 2 Advanced filtering: price[gte] → { price: { $gte: 50 } }
  let filterStr = JSON.stringify(queryObj);
  filterStr = filterStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
  const filters = JSON.parse(filterStr);

  console.log(filters);
  // 3 Apply to query
  query = Product.find({ storeId: currentStore._id, ...filters });
  // 4 Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }
  // 5️⃣ Field Limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    query = query.select(fields);
  } else {
    query = query.select("-__v");
  }

  // 6️⃣ Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 100;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  const products = await query;
  res.status(200).json({
    status: "success",
    results: products.length,
    data: products,
  });
});

// @desc Get product by ID
exports.getProductById = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) return next(new AppError("Product not found", 404));

  res.status(200).json({
    status: "success",
    data: product,
  });
});

// @desc Update product by ID
exports.updateProduct = catchAsync(async (req, res, next) => {
  // 1️⃣ Find the product
  const product = await Product.findById(req.params.id).select("ownerId");

  console.log("product");
  if (!product) return next(new AppError("Product not found", 404));

  // 2️⃣ Check ownership/admin
  if (!isHisStore(req.user, product.ownerId)) {
    return next(
      new AppError("You do not have permission to update this product", 403)
    );
  }

  // 3️⃣ Apply updates and save
  Object.assign(product, req.body);
  await product.save();

  // 4️⃣ Respond
  res.status(200).json({
    status: "success",
    data: product,
  });
});

// @desc Delete product by ID
/*exports.deleteProduct = catchAsync(async (req, res, next) => {
  const deleted = await Product.findByIdAndDelete(req.params.id);

  if (!deleted) return next(new AppError("Product not found", 404));

  res.status(204).json({
    status: "success",
    data: null,
  });
});*/
exports.deleteProduct = catchAsync(async (req, res, next) => {
  // 1️⃣ Find product
  const product = await Product.findById(req.params.id).select("+ownerId");
  if (!product) return next(new AppError("Product not found", 404));

  // 2️⃣ Check permission
  console.log(req.user._id, product);
  if (!isHisStore(req.user, product.ownerId)) {
    return next(
      new AppError("You do not have permission to delete this product", 403)
    );
  }

  // 3️⃣ Delete using document method
  await product.deleteOne(); // ✅ Only one DB query total

  // 4️⃣ Respond
  res.status(204).json({
    status: "success",
    data: null,
  });
});

const isHisStore = function (currentUser, productOwnerId) {
  return (
    currentUser.role === "admin" ||
    productOwnerId.toString() === currentUser._id.toString()
  );
};
