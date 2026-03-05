const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {
  createCourse,
  addCourseContent,
  enrollCourse,
  getCourseContent,
  updateProgress,
  issueCertificate,
  downloadCertificate // ✅ added
} = require("../controllers/courseController");

// ==============================
// ADMIN
// ==============================

// Create course
router.post("/", protect, createCourse);

// Add lesson
router.post("/:courseId/content", protect, addCourseContent);


// ==============================
// STUDENTS
// ==============================

// Enroll in course
router.post("/:courseId/enroll", protect, enrollCourse);

// Access course lessons
router.get("/:courseId/content", protect, getCourseContent);

// Update lesson progress
router.put("/:courseId/progress", protect, updateProgress);

// Issue certificate
router.get("/:courseId/certificate", protect, issueCertificate);

// Download PDF certificate
router.get("/:courseId/download-certificate", protect, downloadCertificate);

module.exports = router;