const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({

  role: {
    type: String,
    enum: ["employer", "employee", "student", "admin"],
    required: true
  },

  name: String,

  email: {
    type: String,
    unique: true
  },

  password: String,

  phone: String,


  // ==============================
  // Worker Profile (Caregivers, Nannies, Helpers, Babysitters, Gardeners)
  // ==============================

  workerType: {
    type: String,
    enum: ["caregiver", "nanny", "helper", "babysitter", "gardener"]
  },

  province: String,

  city: String,

  skills: [String],

  experienceYears: {
    type: Number,
    default: 0
  },

  expectedSalary: Number,

  availability: {
    type: String,
    enum: ["full-time", "part-time", "live-in", "live-out"]
  },

  bio: {
    type: String,
    maxlength: 500
  },

  // ==============================
// Worker Details
// ==============================
workerType: {
  type: String,
  enum: ["caregiver", "nanny", "helper", "babysitter", "gardener"],
},

yearsExperience: {
  type: Number,
  default: 0
},

skills: [
  {
    type: String,
    trim: true
  }
],

expectedSalary: {
  type: Number
},

averageRating: {
  type: Number,
  default: 0
},


  // ==============================
  // Employer Subscription
  // ==============================

  subscriptionStatus: {
    type: String,
    enum: ["active", "inactive"],
    default: "inactive"
  },

  subscriptionExpiry: Date,

  subscriptionPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubscriptionPlan"
  },

  subscriptionExpires: {
    type: Date
  },


  // ==============================
  // Candidate Verification System
  // ==============================

  isVerified: {
    type: Boolean,
    default: false
  },

  verificationStatus: {
    type: String,
    enum: ["unverified", "pending", "verified", "rejected"],
    default: "unverified"
  },

  verifiedBadge: {
    type: Boolean,
    default: false
  },

  hasPaidVerificationFee: {
    type: Boolean,
    default: false
  },


  // ==============================
  // Uploaded Documents
  // ==============================

  uploadedDocuments: {

    idDocument: String,

    policeClearance: String,

    references: [String],

    qualifications: [String]

  },


  // ==============================
  // ⭐ Rating System
  // ==============================

  averageRating: {
    type: Number,
    default: 0
  },

  totalReviews: {
    type: Number,
    default: 0
  },


  // ==============================
// Worker Availability
// ==============================

availabilityStatus: {
  type: String,
  enum: [
    "available-now",
    "available-next-week",
    "available-next-month",
    "not-available"
  ],
  default: "available-now"
},

workPreference: {
  type: String,
  enum: [
    "full-time",
    "part-time",
    "live-in",
    "live-out"
  ]
},


  // ==============================
  // Metadata
  // ==============================

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("User", UserSchema);