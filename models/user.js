const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({

    role: {
        type: String,
        enum: [
            "employer",
            "employee",
            "student",
            "admin"
        ],
        required: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    phone: String,

    profilePhoto: String,

    subscriptionStatus: {
        type: String,
        enum: [
            "active",
            "inactive"
        ],
        default: "inactive"
    },

    subscriptionExpiry: Date,

    currentSubscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription"
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    verificationStatus: {
        type: String,
        enum: [
            "unverified",
            "pending",
            "verified",
            "rejected"
        ],
        default: "unverified"
    },

    verifiedBadge: {
        type: Boolean,
        default: false
    },

    hasPaidVerificationFee: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("User", UserSchema);