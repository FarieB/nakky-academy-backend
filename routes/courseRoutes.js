const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/videoUpload"); // ✅ video upload middleware

const {
  createCourse,
  addCourseContent,
  uploadLessonVideo, // ✅ new
  streamVideo, // ✅ new
  enrollCourse,
  getCourseContent,
  updateProgress,
  issueCertificate,
  downloadCertificate
} = require("../controllers/courseController");


// ==============================
// ADMIN
// ==============================

// Create course
router.post("/", protect, createCourse);

// Add lesson (text / metadata)
router.post("/:courseId/content", protect, addCourseContent);

// Upload lesson video
router.post(
  "/:courseId/upload-video",
  protect,
  upload.single("video"),
  uploadLessonVideo
);


// ==============================
// STUDENTS
// ==============================

// Enroll in course
router.post("/:courseId/enroll", protect, enrollCourse);

// Access course lessons
router.get("/:courseId/content", protect, getCourseContent);

// Secure video streaming
router.get(
  "/:courseId/video/:filename",
  protect,
  streamVideo
);

// Update lesson progress
router.put("/:courseId/progress", protect, updateProgress);

// Issue certificate
router.get("/:courseId/certificate", protect, issueCertificate);

// Download PDF certificate
router.get("/:courseId/download-certificate", protect, downloadCertificate);


module.exports = router;