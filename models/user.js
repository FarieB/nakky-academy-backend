const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["employer", "employee", "admin"],
    required: true
  },
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,

  // Employer subscription
  subscriptionStatus: {
    type: String,
    enum: ["active", "inactive"],
    default: "inactive"
  },
  subscriptionExpiry: Date,

  // Employee verification
  isVerified: { type: Boolean, default: false },
  uploadedDocuments: {
    idDocument: String,
    references: [String],
    qualifications: [String]
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);
