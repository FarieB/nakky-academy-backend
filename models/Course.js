const mongoose = require("mongoose");

// ==============================
// Lesson Schema
// ==============================

const LessonSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
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
    }

});

// ==============================
// Course Schema
// ==============================

const CourseSchema = new mongoose.Schema(
{
  title: {
    type: String,
    required: true,
  },

  shortDescription: String,

  description: String,

  category: {
    type: String,
    default: "General",
  },

  level: {
    type: String,
    enum: [
      "Beginner",
      "Intermediate",
      "Advanced",
    ],
    default: "Beginner",
  },

  duration: Number,

  price: {
    type: Number,
    default: 0,
  },

  image: String,

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
  },

  content: [LessonSchema],

},
{
  timestamps: true,
});

module.exports = mongoose.model("Course", CourseSchema);