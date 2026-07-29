const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },  

    message: {
      type: String,
      required: true
    },

    status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent",
    },

    deliveredAt: {
        type: Date,
        default: null,
    },

    readAt: {
        type: Date,
        default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);