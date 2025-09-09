const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
          min: 1,
        },
        size: String, // optional variant
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },

        totalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    isPOD: {
      type: Boolean,
      default: false,
    },
    podImage: String,

    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    customerAddress: {
      type: String,
      required: true,
    },

    // 👇 replace root unitPrice/totalPrice with grandTotal
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "canceled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Purchase", purchaseSchema);
