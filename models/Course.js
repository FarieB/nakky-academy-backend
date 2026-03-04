const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  notes: String,
  duration: String
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  price: {
    type: Number,
    required: true
  },
  duration: String,
  category: String,

  content: [lessonSchema],

  isPublished: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);