const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/videoUpload");

const courseController = require("../controllers/courseController");

const {
  createCourse,
  getAllCourses,
  getCourseById,
  addCourseContent,
  uploadLessonVideo,
  streamVideo,
  createCoursePayment,
  getCourseContent,
  updateProgress,
  issueCertificate,
  downloadCertificate,
} = courseController;

// =====================================================
// ADMIN ROUTES
// =====================================================

// Create Course
router.post(
  "/",
  protect,
  (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can create courses",
      });
    }

    next();
  },
  createCourse
);


// Update Course
router.put(
  "/:courseId",
  protect,
  (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can update courses",
      });
    }

    next();
  },
  courseController.updateCourse
);


// Delete Course
router.delete(
  "/:courseId",
  protect,
  (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can delete courses",
      });
    }

    next();
  },
  courseController.deleteCourse
);


// Publish Course
router.put(
  "/:courseId/publish",
  protect,
  (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can publish courses",
      });
    }

    next();
  },
  courseController.publishCourse
);


// Unpublish Course
router.put(
  "/:courseId/unpublish",
  protect,
  (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can unpublish courses",
      });
    }

    next();
  },
  courseController.unpublishCourse
);


// Add Lesson
router.post(
  "/:courseId/content",
  protect,
  (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can add lessons",
      });
    }

    next();
  },
  addCourseContent
);


// Upload Lesson Video
router.post(
  "/:courseId/lessons/:lessonId/video",
  protect,
  (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can upload videos",
      });
    }

    next();
  },
  upload.single("video"),
  uploadLessonVideo
);


// =====================================================
// STUDENT ROUTES
// =====================================================

// Browse available courses
router.get(
  "/",
  protect,
  getAllCourses
);


// Create EFT payment for course
router.post(
  "/:courseId/payment",
  protect,
  createCoursePayment
);


// Get single course
router.get(
  "/:courseId",
  protect,
  getCourseById
);


// Access paid course content
router.get(
  "/:courseId/content",
  protect,
  getCourseContent
);


// Stream lesson video
router.get(
  "/:courseId/video/:filename",
  protect,
  streamVideo
);


// Update learning progress
router.put(
  "/:courseId/progress",
  protect,
  updateProgress
);


// Issue certificate
router.get(
  "/:courseId/certificate",
  protect,
  issueCertificate
);


// Download certificate
router.get(
  "/:courseId/download-certificate",
  protect,
  downloadCertificate
);


module.exports = router;
