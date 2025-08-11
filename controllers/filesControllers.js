const path = require("path");
const fs = require("fs");
const multer = require("multer");
const sharp = require("sharp");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Product = require("../models/productModel");

const PROD_DIR = path.join(__dirname, "..", "public", "img", "products");
// Multer: keep in memory for Sharp
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype?.startsWith("image")) cb(null, true);
  else cb(new AppError("Only image files are allowed.", 400), false);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});

// Accept up to 2 images via field name "images"
exports.uploadProductImages = upload.array("images", 2);

// Resize & save; put filenames on req.body.images
exports.resizeProductImages = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  // Ensure req.body exists
  if (!req.body) req.body = {};
  req.body.images = [];

  // Use product id if updating, else a temp id (replaced after create if you like)
  const baseId = req.params.id || "new";

  let i = 0;
  for (const f of req.files) {
    i += 1;
    const filename = `prod-${baseId}-${Date.now()}-${i}.jpeg`;
    await sharp(f.buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .toFormat("jpeg")
      .jpeg({ quality: 85 })
      .toFile(path.join(PROD_DIR, filename));

    req.body.images.push(filename);
  }

  next();
});
