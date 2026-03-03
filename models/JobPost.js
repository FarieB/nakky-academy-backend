const mongoose = require("mongoose");

const JobPostSchema = new mongoose.Schema({
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  location: {
    province: String,
    city: String
  },

  requiredExperience: Number,

  requiredSkills: [
    {
      type: String
    }
  ],

  ageRange: {
    min: Number,
    max: Number
  },

  jobType: {
    type: String,
    enum: ["nanny", "caregiver", "housekeeper", "babysitter"]
  },

  description: String

}, { timestamps: true });

module.exports = mongoose.model("JobPost", JobPostSchema);
