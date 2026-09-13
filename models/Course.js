const mongoose = require("mongoose");

/**
 * ============================================================
 * COURSE MATERIAL
 * ============================================================
 * Each lesson can have multiple PDFs and multiple audio files.
 *
 * Example:
 * materials: [
 *   {
 *     type: "pdf",
 *     title: "Child Development Notes",
 *     filename: "123456-notes.pdf"
 *   },
 *   {
 *     type: "audio",
 *     title: "Lesson 1 Audio",
 *     filename: "123456-lesson1.mp3"
 *   }
 * ]
 */
const MaterialSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["pdf", "audio"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    filename: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      default: "",
    },

    mimeType: {
      type: String,
      default: "",
    },

    size: {
      type: Number,
      default: 0,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

/**
 * ============================================================
 * VIDEO
 * ============================================================
 *
 * A lesson can have:
 *
 * 1. No video
 * 2. An uploaded video
 * 3. An external video link
 */
const VideoSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["none", "upload", "external"],
      default: "none",
    },

    url: {
      type: String,
      default: "",
    },

    filename: {
      type: String,
      default: "",
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

/**
 * ============================================================
 * QUESTION
 * ============================================================
 *
 * Used by both:
 *
 * - Module assignments
 * - Final examination
 *
 * The structure is flexible enough to support:
 *
 * - Multiple choice
 * - True/False
 * - Short answer
 * - Long answer
 */
const QuestionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "multiple_choice",
        "true_false",
        "short_answer",
        "long_answer",
      ],
      default: "multiple_choice",
    },

    question: {
      type: String,
      required: true,
      trim: true,
    },

    options: {
      type: [String],
      default: [],
    },

    correctAnswer: {
      type: String,
      default: "",
    },

    marks: {
      type: Number,
      default: 1,
      min: 0,
    },

    order: {
      type: Number,
      default: 1,
    },
  },
  {
    _id: true,
  }
);

/**
 * ============================================================
 * ASSIGNMENT
 * ============================================================
 *
 * Every module can optionally have an assignment.
 */
const AssignmentSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    instructions: {
      type: String,
      default: "",
    },

    passMark: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },

    questions: {
      type: [QuestionSchema],
      default: [],
    },
  },
  {
    _id: false,
  }
);

/**
 * ============================================================
 * LESSON
 * ============================================================
 *
 * This is the important part of the new architecture.
 *
 * Every lesson can contain:
 *
 * - Multiple PDFs
 * - Multiple audio recordings
 * - One uploaded video OR external video
 */
const LessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    duration: {
      type: Number,
      default: 0,
      min: 0,
    },

    order: {
      type: Number,
      default: 1,
    },

    /**
     * Multiple PDF/audio materials
     */
    materials: {
      type: [MaterialSchema],
      default: [],
    },

    /**
     * Video configuration
     */
    video: {
      type: VideoSchema,
      default: () => ({
        type: "none",
        url: "",
        filename: "",
        title: "",
      }),
    },
  },
  {
    _id: true,
  }
);

/**
 * ============================================================
 * MODULE
 * ============================================================
 *
 * Course
 *   └── Module
 *         ├── Lesson
 *         ├── Lesson
 *         ├── Lesson
 *         └── Assignment
 */
const ModuleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    order: {
      type: Number,
      default: 1,
    },

    lessons: {
      type: [LessonSchema],
      default: [],
    },

    assignment: {
      type: AssignmentSchema,
      default: () => ({
        enabled: false,
        title: "",
        instructions: "",
        passMark: 80,
        questions: [],
      }),
    },
  },
  {
    _id: true,
  }
);

/**
 * ============================================================
 * FINAL EXAMINATION
 * ============================================================
 *
 * The final examination belongs to the COURSE, not a module.
 *
 * Course
 *   ├── Module 1
 *   ├── Module 2
 *   ├── Module 3
 *   └── Final Examination
 */
const FinalExamSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },

    title: {
      type: String,
      default: "Final Examination",
      trim: true,
    },

    instructions: {
      type: String,
      default: "",
    },

    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    passMark: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },

    questions: {
      type: [QuestionSchema],
      default: [],
    },
  },
  {
    _id: false,
  }
);

/**
 * ============================================================
 * LEGACY LESSON STRUCTURE
 * ============================================================
 *
 * IMPORTANT:
 *
 * We are keeping the old `content` field temporarily so that
 * existing courses in MongoDB do NOT break.
 *
 * Existing courses can subsequently be migrated into:
 *
 * Module 1 → Lessons
 *
 * Once the new system is working and the old courses have been
 * migrated, this field can eventually be removed.
 */
const LegacyLessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    videoUrl: {
      type: String,
      default: "",
    },

    duration: {
      type: Number,
      default: 0,
    },

    order: {
      type: Number,
      default: 1,
    },
  },
  {
    _id: true,
  }
);

/**
 * ============================================================
 * COURSE
 * ============================================================
 */
const CourseSchema = new mongoose.Schema(
  {
    /**
     * --------------------------------------------------------
     * BASIC COURSE INFORMATION
     * --------------------------------------------------------
     */
    title: {
      type: String,
      required: true,
      trim: true,
    },

    shortDescription: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      default: "General",
      trim: true,
    },

    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },

    duration: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * --------------------------------------------------------
     * COURSE PRICE
     * --------------------------------------------------------
     *
     * Your current business rule is R1,200 per course.
     *
     * The controller will also force this value to 1200 so
     * admins cannot accidentally create a course at another
     * price.
     */
    price: {
      type: Number,
      default: 1200,
      min: 0,
    },

    image: {
      type: String,
      default: "",
    },

    /**
     * --------------------------------------------------------
     * COURSE STATUS
     * --------------------------------------------------------
     */
    published: {
      type: Boolean,
      default: false,
    },

    certificate: {
      type: Boolean,
      default: true,
    },

    passMark: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },

    /**
     * ========================================================
     * NEW COURSE STRUCTURE
     * ========================================================
     *
     * Course
     *   ├── Module 1
     *   │     ├── Lesson 1
     *   │     │     ├── PDF
     *   │     │     ├── Audio
     *   │     │     └── Video
     *   │     │
     *   │     ├── Lesson 2
     *   │     │     ├── PDF
     *   │     │     └── Audio
     *   │     │
     *   │     └── Assignment
     *   │
     *   ├── Module 2
     *   │     └── ...
     *   │
     *   └── Final Examination
     */
    modules: {
      type: [ModuleSchema],
      default: [],
    },

    finalExam: {
      type: FinalExamSchema,
      default: () => ({
        enabled: false,
        title: "Final Examination",
        instructions: "",
        durationMinutes: 0,
        passMark: 80,
        questions: [],
      }),
    },

    /**
     * --------------------------------------------------------
     * LEGACY CONTENT
     * --------------------------------------------------------
     *
     * Kept temporarily for compatibility with courses that
     * were created before the new module architecture.
     */
    content: {
      type: [LegacyLessonSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * ============================================================
 * EXPORT
 * ============================================================
 *
 * Using mongoose.models prevents the common
 * "OverwriteModelError" during development/hot reload.
 */
module.exports =
  mongoose.models.Course ||
  mongoose.model("Course", CourseSchema);