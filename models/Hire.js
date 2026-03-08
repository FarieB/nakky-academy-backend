const mongoose = require("mongoose");

const HireSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },

    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost",
      required: true
    },

    status: {
      type: String,
      enum: ["active", "completed", "terminated"],
      default: "active"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hire", HireSchema);