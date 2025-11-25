const mongoose = require("mongoose");
const { default: slugify } = require("slugify");
const Product = require("./productModel");
const Purchase = require("./purchaseModel");

const bannerSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      //required: [true, "Banner image is required"],
    },
    title: {
      type: String,

      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Banner start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "Banner end date is required"],
    },
    link: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true } // no extra _id for each banner, but keep timestamps
);

const footerSchema = new mongoose.Schema({
  socialLinks: {
    type: Object,

    default: {},
  },
  quickLinks: {
    type: Object,

    default: {},
  },
});

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
      unique: [true, "There is another store with the same name"],
    },
    storeInformation: {
      type: String,
      trim: true,
    },
    whatSell: {
      type: String,
    },
    slug: {
      type: String,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      select: false,
      unique: true,
    },
    active: {
      type: Boolean,
      default: false,
    },
    logo: {
      type: String,
      default: "",
    },
    brandColor: {
      type: String,
      default: "#000000",
    },
    heroImage: {
      type: String,
      required: true,
    },
    heading: {
      type: String,
      default: "Welcome to our store",
    },
    subHeading: {
      type: String,
      default: "Explore our products and enjoy shopping!",
    },

    // ✅ New banners field
    banners: {
      type: [bannerSchema],
      default: [],
    },
    footer: {
      type: footerSchema,
      default: {},
    },
  },

  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

storeSchema.pre("save", function (next) {
  if (!this.isModified("name")) return next();
  this.slug = slugify(this.name, { lower: true, strict: true });
  next();
});

storeSchema.virtual("products", {
  ref: "Product",
  foreignField: "storeId",
  localField: "_id",
});
storeSchema.virtual("purchases", {
  ref: "Purchase",
  foreignField: "storeId",
  localField: "_id",
});

module.exports = mongoose.model("Store", storeSchema);
