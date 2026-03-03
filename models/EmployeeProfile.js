const mongoose = require("mongoose");

const EmployeeProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true // 🔥 Ensures 1 profile per employee
    },

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

    age: {
      type: Number,
      required: true,
      min: 18
    },

    yearsExperience: {
      type: Number,
      required: true,
      min: 0
    },

    skills: [
      {
        type: String,
        trim: true
      }
    ],

    qualifications: [
      {
        type: String,
        trim: true
      }
    ],

    availability: {
      type: String,
      enum: ["full-time", "part-time", "live-in", "live-out"],
      required: true
    },

    bio: {
      type: String,
      maxlength: 500
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  },
  { timestamps: true }
);

// 🔎 Indexes for faster matching queries
EmployeeProfileSchema.index({ province: 1 });
EmployeeProfileSchema.index({ city: 1 });
EmployeeProfileSchema.index({ yearsExperience: 1 });
EmployeeProfileSchema.index({ skills: 1 });

module.exports = mongoose.model("EmployeeProfile", EmployeeProfileSchema);
