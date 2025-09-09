const mongoose = require("mongoose");
const { default: slugify } = require("slugify");
const Product = require("./productModel");
const Purchase = require("./purchaseModel");

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

      //required: [true, "What you sell is required"],
    },
    slug: {
      type: String,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      select: false,
      unique: true, // 🛡 Prevents accidental multiple stores per user
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
  ref: "Product", // The model to use
  foreignField: "storeId", // The field in Product that refers to Store
  localField: "_id", // The field in Store that matches foreignField
});
storeSchema.virtual("purchases", {
  ref: "Purchase", // The model to use
  foreignField: "storeId", // The field in Product that refers to Store
  localField: "_id", // The field in Store that matches foreignField
});

module.exports = mongoose.model("Store", storeSchema);
