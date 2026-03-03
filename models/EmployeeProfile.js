const mongoose = require("mongoose");

const EmployeeProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  location: {
    province: String,
    city: String
  },

  age: Number,
  yearsExperience: Number,

  skills: [
    {
      type: String
    }
  ],

  qualifications: [
    {
      type: String
    }
  ],

  availability: {
    type: String,
    enum: ["full-time", "part-time", "live-in", "live-out"]
  },

  bio: String,

  rating: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

module.exports = mongoose.model("EmployeeProfile", EmployeeProfileSchema);
