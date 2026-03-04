const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending"
  },

  lessonsCompleted: [
    {
      lessonId: String
    }
  ],

  progress: {
    type: Number,
    default: 0
  },

  completed: {
    type: Boolean,
    default: false
  },

  certificateIssued: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);