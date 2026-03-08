const mongoose = require("mongoose");

const JobInvitationSchema = new mongoose.Schema(
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
      enum: ["pending", "accepted", "declined"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobInvitation", JobInvitationSchema);