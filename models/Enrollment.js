const mongoose = require("mongoose");


// ==========================================
// ASSIGNMENT SUBMISSION SCHEMA
// ==========================================

const AssignmentSubmissionSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    answers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,

        answer: {
          type: String,
          default: "",
        },
      },
    ],

    status: {
      type: String,
      enum: ["pending", "submitted", "marked"],
      default: "pending",
    },

    mark: {
      type: Number,
      default: null,
    },

    feedback: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);


// ==========================================
// EXAM RESULT SCHEMA
// ==========================================

const ExamResultSchema = new mongoose.Schema(
  {
    attempted: {
      type: Boolean,
      default: false,
    },

    attemptedAt: Date,

    answers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,

        answer: {
          type: String,
          default: "",
        },
      },
    ],

    score: {
      type: Number,
      default: 0,
    },

    passed: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);


// ==========================================
// ENROLLMENT SCHEMA
// ==========================================

const EnrollmentSchema = new mongoose.Schema(
  {
    // ==========================================
    // STUDENT
    // ==========================================

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


    // ==========================================
    // EFT PAYMENT INFORMATION
    // ==========================================

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "proof_uploaded",
        "approved",
        "rejected",
      ],
      default: "pending",
    },

    paymentReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    paymentDate: {
      type: Date,
      default: null,
    },

    paymentProof: {
      type: String,
      default: "",
    },

    paymentNotes: {
      type: String,
      default: "",
    },

    paymentReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    paymentReviewedAt: {
      type: Date,
      default: null,
    },

    coursePrice: {
      type: Number,
      default: 0,
    },


    // ==========================================
    // LESSON PROGRESS
    // ==========================================

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


    // ==========================================
    // MODULE PROGRESS
    // ==========================================

    modulesCompleted: [
      {
        moduleId: {
          type: mongoose.Schema.Types.ObjectId,
        },

        completedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],


    // ==========================================
    // ASSIGNMENTS
    // ==========================================

    assignmentSubmissions: {
      type: [AssignmentSubmissionSchema],
      default: [],
    },


    // ==========================================
    // FINAL EXAM
    // ==========================================

    finalExamResult: {
      type: ExamResultSchema,
      default: () => ({}),
    },


    // ==========================================
    // OVERALL PROGRESS
    // ==========================================

    progress: {
      type: Number,
      default: 0,
    },

    lastAccessed: {
      type: Date,
      default: null,
    },


    // ==========================================
    // COURSE COMPLETION
    // ==========================================

    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },


    // ==========================================
    // CERTIFICATE
    // ==========================================

    certificateIssued: {
      type: Boolean,
      default: false,
    },

    certificateNumber: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);


// ==========================================
// PREVENT DUPLICATE ENROLLMENTS
// ==========================================

EnrollmentSchema.index(
  {
    student: 1,
    course: 1,
  },
  {
    unique: true,
  }
);


module.exports = mongoose.model(
  "Enrollment",
  EnrollmentSchema
);