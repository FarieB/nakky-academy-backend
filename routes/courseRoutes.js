const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/videoUpload");

// Controllers
const {
  createCourse,
  getAllCourses,          // ✅ NEW (for frontend course list)
  getCourseById,          // ✅ NEW (single course view)
  addCourseContent,
  uploadLessonVideo,
  streamVideo,
  enrollCourse,
  getCourseContent,
  updateProgress,
  issueCertificate,
  downloadCertificate
} = require("../controllers/courseController");


// ==============================
// ADMIN ROUTES
// ==============================

// Create course (Admin only)
router.post("/", protect, (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admins can create courses" });
  }
  next();
}, createCourse);

// Add lesson metadata
router.post("/:courseId/content", protect, (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admins can add course content" });
  }
  next();
}, addCourseContent);

// Upload lesson video
router.post(
  "/:courseId/upload-video",
  protect,
  (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can upload videos" });
    }
    next();
  },
  upload.single("video"),
  uploadLessonVideo
);


// ==============================
// PUBLIC / AUTHENTICATED ROUTES
// ==============================

// Get all courses (for students to browse)
router.get("/", protect, getAllCourses);

// Get single course details
router.get("/:courseId", protect, getCourseById);


// ==============================
// STUDENT ROUTES
// ==============================

// Enroll in course
router.post("/:courseId/enroll", protect, enrollCourse);

// Get course content (only after enroll logic handled in controller)
router.get("/:courseId/content", protect, getCourseContent);

// Secure video streaming
router.get(
  "/:courseId/video/:filename",
  protect,
  streamVideo
);

// Update lesson progress
router.put("/:courseId/progress", protect, updateProgress);

// Issue certificate (generate)
router.get("/:courseId/certificate", protect, issueCertificate);

// Download certificate
router.get("/:courseId/download-certificate", protect, downloadCertificate);


module.exports = router;