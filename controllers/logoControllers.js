const path = require("path");
const fs = require("fs");
const multer = require("multer");
const sharp = require("sharp");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const LOGO_DIR = path.join(__dirname, "..", "public", "img", "logos");
fs.mkdirSync(LOGO_DIR, { recursive: true });
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
// Accept one image for the "logo" field
exports.uploadLogoImage = upload.single("logo");

// Resize & save; put filenames on req.body.images
// Resize & save; put filename on req.body.logo
exports.resizeLogoImage = catchAsync(async (req, res, next) => {
  if (!req.file) return next(); // If no file is uploaded, skip

  if (!req.body) req.body = {};

  const baseId = req.params.id || "new";

  // Save as PNG
  const filename = `logo-${baseId}-${Date.now()}.png`;

  await sharp(req.file.buffer)
    .resize(1200, 1200, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toFormat("png")
    .png({
      compressionLevel: 9, // max compression
      adaptiveFiltering: true,
      quality: 90, // ignored by PNG, but Sharp accepts it
    })
    .toFile(path.join(LOGO_DIR, filename));

  req.body.logo = filename;
  console.log(req.body);
  next();
});
