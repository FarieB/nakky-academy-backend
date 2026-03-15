const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost"
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },

    comment: {
      type: String,
      maxlength: 500
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", ReviewSchema);