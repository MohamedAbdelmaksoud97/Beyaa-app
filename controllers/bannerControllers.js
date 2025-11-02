const path = require("path");
const multer = require("multer");
const sharp = require("sharp");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// Directory for banner images
const BANNER_DIR = path.join(__dirname, "..", "public", "img", "banners");

// Multer: keep in memory for Sharp
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype?.startsWith("image")) cb(null, true);
  else cb(new AppError("Only image files are allowed.", 400), false);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // banners may be larger, e.g. 5 MB
});

// Middleware: accept one banner image
exports.uploadBannerImage = upload.single("image");

// Resize & save; put filename on req.body.image
exports.resizeBannerImage = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  if (!req.body) req.body = {};

  const baseId = req.params.id || "new";

  // Save as PNG (you can change to JPG if you prefer smaller size)
  const filename = `banner-${baseId}-${Date.now()}.png`;

  await sharp(req.file.buffer)
    .resize(1920, 1080, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toFormat("png")
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
    })
    .toFile(path.join(BANNER_DIR, filename));

  req.body.image = filename;
  console.log("Banner uploaded:", filename);

  next();
});
