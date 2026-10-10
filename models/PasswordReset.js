
const mongoose = require("mongoose");

const PasswordResetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },

    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.PasswordReset ||
  mongoose.model("PasswordReset", PasswordResetSchema);
