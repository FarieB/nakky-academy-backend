const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // ==========================================
    // AUTHENTICATION
    // ==========================================

    role: {
      type: String,
      enum: ["admin", "student", "employer", "candidate"],
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    // ==========================================
    // PROFILE
    // ==========================================

    profilePhoto: {
      type: String,
      default: "",
    },

    accountStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    displayFirstName: {
      type: Boolean,
      default: true,
    },

    // ==========================================
    // SUBSCRIPTION
    // ==========================================

    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },

    subscriptionExpiry: Date,

    currentSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },

    // ==========================================
    // VERIFICATION
    // ==========================================

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationStatus: {
      type: String,
      enum: [
        "unverified",
        "pending",
        "verified",
        "rejected",
      ],
      default: "unverified",
    },

    verifiedBadge: {
      type: Boolean,
      default: false,
    },

    hasPaidVerificationFee: {
      type: Boolean,
      default: false,
    },

    verificationSubmittedAt: {
      type: Date,
    },

   uploadedDocuments: {
    idDocument: {
        type: String,
        default: "",
    },

    policeClearance: {
        type: String,
        default: "",
    },

    references: {
        type: [String],
        default: [],
    },

    qualifications: {
        type: [String],
        default: [],
    },
}, 

    // ==========================================
    // ACTIVITY
    // ==========================================

      // ==============================
    // Online Presence
    // ==============================

    isOnline: {
        type: Boolean,
        default: false,
    },

    lastSeen: {
        type: Date,
        default: null,
    },
 

    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

// Prevent OverwriteModelError
module.exports =
  mongoose.models.User ||
  mongoose.model("User", UserSchema);