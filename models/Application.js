const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  text: String,
  sentAt: {
    type: Date,
    default: Date.now
  }
});

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job"
    },

    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    status: {
      type: String,
      enum: ["invited", "applied", "accepted", "rejected", "hired"],
      default: "invited"
    },

    messages: [messageSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);