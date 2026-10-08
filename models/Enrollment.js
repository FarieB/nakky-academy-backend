const mongoose = require("mongoose");

/**
 * -------------------------------------------------------
 * MODULE ASSESSMENT PROGRESS
 * -------------------------------------------------------
 */

const ModuleAssessmentSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "not_started",
        "pending_review",
        "passed",
        "failed",
      ],
      default: "not_started",
    },

    attempts: {
      type: Number,
      default: 0,
    },

    latestAttempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssessmentAttempt",
      default: null,
    },

    percentage: {
      type: Number,
      default: 0,
    },

    passedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

/**
 * -------------------------------------------------------
 * LESSON LEARNING PROGRESS
 * -------------------------------------------------------
 *
 * Stores the learning activities completed by the student
 * inside each lesson.
 *
 * This is separate from `lessonsCompleted`.
 *
 * `lessonsCompleted` means the entire lesson has been
 * completed.
 *
 * `lessonProgress` records the individual PDFs, audio
 * files and videos that the student has completed first.
 * -------------------------------------------------------
 */

const LessonProgressSchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    /**
     * ---------------------------------------------------
     * MATERIALS
     * ---------------------------------------------------
     *
     * Stores the IDs of PDF/audio materials that the
     * student has completed.
     */

    materialsCompleted: [
      {
        materialId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },

        completedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /**
     * ---------------------------------------------------
     * UPLOADED VIDEO
     * ---------------------------------------------------
     */

    uploadedVideoCompleted: {
      type: Boolean,
      default: false,
    },

    uploadedVideoCompletedAt: {
      type: Date,
      default: null,
    },

    /**
     * ---------------------------------------------------
     * EXTERNAL VIDEO
     * ---------------------------------------------------
     */

    externalVideoCompleted: {
      type: Boolean,
      default: false,
    },

    externalVideoCompletedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

/**
 * -------------------------------------------------------
 * ENROLLMENT SCHEMA
 * -------------------------------------------------------
 */

const EnrollmentSchema = new mongoose.Schema(
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

    /**
     * ---------------------------------------------------
     * PAYMENT
     * ---------------------------------------------------
     */

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "cancelled",
      ],
      default: "pending",
    },

    paymentReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },

    paymentDate: Date,

    coursePrice: {
      type: Number,
      default: 0,
    },

    /**
     * ---------------------------------------------------
     * LESSON PROGRESS
     * ---------------------------------------------------
     */

    lessonsCompleted: [
      {
        lessonId: {
          type: mongoose.Schema.Types.ObjectId,
        },

        completedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /**
     * ---------------------------------------------------
     * INDIVIDUAL LEARNING ITEM PROGRESS
     * ---------------------------------------------------
     *
     * Tracks completion of PDFs, audio files and videos
     * before the lesson itself is marked as completed.
     */

    lessonProgress: {
      type: [LessonProgressSchema],
      default: [],
    },

    progress: {
      type: Number,
      default: 0,
    },

    lastAccessed: Date,

    /**
     * ---------------------------------------------------
     * MODULE ASSESSMENTS
     * ---------------------------------------------------
     *
     * Stores the student's current status for each
     * module assignment.
     */

    moduleAssessments: {
      type: [ModuleAssessmentSchema],
      default: [],
    },

    /**
     * ---------------------------------------------------
     * FINAL EXAM
     * ---------------------------------------------------
     */

    finalExamStatus: {
      type: String,
      enum: [
        "not_started",
        "pending_review",
        "passed",
        "failed",
      ],
      default: "not_started",
    },

    finalExamAttempts: {
      type: Number,
      default: 0,
    },

    latestFinalExamAttempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssessmentAttempt",
      default: null,
    },

    finalExamPercentage: {
      type: Number,
      default: 0,
    },

    finalExamPassedAt: {
      type: Date,
      default: null,
    },

    /**
     * ---------------------------------------------------
     * COURSE COMPLETION
     * ---------------------------------------------------
     */

    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: Date,

    /**
     * ---------------------------------------------------
     * CERTIFICATE
     * ---------------------------------------------------
     */

    certificateIssued: {
      type: Boolean,
      default: false,
    },

    certificateNumber: String,
  },
  {
    timestamps: true,
  }
);

/**
 * =====================================================
 * PERFORMANCE INDEXES
 * =====================================================
 *
 * These indexes optimize the most common Enrollment
 * queries used by student dashboards, course access,
 * payment checks and certificate/completion lookups.
 */

// Student enrollments, newest first
EnrollmentSchema.index({
  student: 1,
  createdAt: -1,
});

// Student + payment status
EnrollmentSchema.index({
  student: 1,
  paymentStatus: 1,
});

// Student + specific course
EnrollmentSchema.index({
  student: 1,
  course: 1,
});

// Course + payment status
EnrollmentSchema.index({
  course: 1,
  paymentStatus: 1,
});

// Certificate lookup
EnrollmentSchema.index({
  certificateIssued: 1,
});

// Completed enrollment lookup
EnrollmentSchema.index({
  completed: 1,
});

/**
 * -------------------------------------------------------
 * EXPORT MODEL
 * -------------------------------------------------------
 */

module.exports =
  mongoose.models.Enrollment ||
  mongoose.model("Enrollment", EnrollmentSchema);