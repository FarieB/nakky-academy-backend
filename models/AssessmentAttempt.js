const mongoose = require("mongoose");

const AnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    answer: {
      type: String,
      default: "",
    },

    correct: {
      type: Boolean,
      default: false,
    },

    marksAwarded: {
      type: Number,
      default: 0,
    },

    manuallyReviewed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const AssessmentAttemptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    module: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    assessmentType: {
      type: String,
      enum: ["module_assignment", "final_exam"],
      required: true,
    },

    answers: {
      type: [AnswerSchema],
      default: [],
    },

    totalMarks: {
      type: Number,
      default: 0,
    },

    marksAwarded: {
      type: Number,
      default: 0,
    },

    percentage: {
      type: Number,
      default: 0,
    },

    passMark: {
      type: Number,
      default: 80,
    },

    passed: {
      type: Boolean,
      default: false,
    },

    requiresManualReview: {
      type: Boolean,
      default: false,
    },

    submittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.AssessmentAttempt ||
  mongoose.model(
    "AssessmentAttempt",
    AssessmentAttemptSchema
  );