const mongoose = require("mongoose");

const JobPostSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // 🔥 Flattened for faster matching
    province: {
      type: String,
      required: true,
      trim: true
    },

    city: {
      type: String,
      required: true,
      trim: true
    },

    requiredExperience: {
      type: Number,
      required: true,
      min: 0
    },

    requiredSkills: [
      {
        type: String,
        trim: true
      }
    ],

    minAge: {
      type: Number,
      min: 18
    },

    maxAge: {
      type: Number
    },

    jobType: {
      type: String,
      enum: ["nanny", "caregiver", "housekeeper", "babysitter"],
      required: true
    },

    description: {
      type: String,
      maxlength: 1000
    }
  },
  { timestamps: true }
);

// 🔎 Indexes for faster search
JobPostSchema.index({ province: 1 });
JobPostSchema.index({ city: 1 });
JobPostSchema.index({ requiredExperience: 1 });
JobPostSchema.index({ requiredSkills: 1 });

module.exports = mongoose.model("JobPost", JobPostSchema);
