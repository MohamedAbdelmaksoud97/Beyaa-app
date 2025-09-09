const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      select: false,
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price must be greater than or equal to 0"],
    },

    numberOfPurchases: {
      type: Number,
      default: 0,
    },
    availableSize: {
      type: [String],
      enum: ["XS", "S", "M", "L", "XL", "XXL"],
      default: [],
    },

    // colors can stay open-ended
    color: {
      type: String,
      default: "",
    },

    images: {
      type: [String], // e.g. ["prod-<id>-169...-1.jpeg", "prod-...-2.jpeg"]
      validate: (v) => v.length <= 2,
    },

    tags: {
      type: [String], // e.g., ["electronics", "smartphone", "gaming"]
      default: [],
    },

    isTrending: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

module.exports = mongoose.model("Product", productSchema);
