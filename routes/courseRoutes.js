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
  enrollCourse,
  getCourseContent,
  updateProgress,
  issueCertificate,
  downloadCertificate,
} = courseController;

//
// ==============================
// ADMIN ROUTES
// ==============================
//

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

router.post(
  "/:courseId/lessons/:lessonId/video",
  protect,
  upload.single("video"),
  courseController.uploadLessonVideo
);

//
// ==============================
// PAYFAST WEBHOOK ROUTES (UNPROTECTED)
// ==============================
//

// Step 4 — PayFast Instant Transaction Notification (ITN)
router.post(
  "/payfast/itn",
  courseController.coursePaymentITN
);

//
// ==============================
// AUTHENTICATED ROUTES
// ==============================
//

// Browse Courses
router.get("/", protect, getAllCourses);

// Single Course
router.get("/:courseId", protect, getCourseById);

//
// ==============================
// STUDENT ROUTES
// ==============================
//

// Purchase Course via PayFast
router.post("/:courseId/purchase", protect, courseController.purchaseCourse);

// Enroll
router.post("/:courseId/enroll", protect, enrollCourse);

// Course Content
router.get("/:courseId/content", protect, getCourseContent);

// Stream Video
router.get(
  "/:courseId/video/:filename",
  protect,
  streamVideo
);

// Progress
router.put(
  "/:courseId/progress",
  protect,
  updateProgress
);

// Issue Certificate
router.get(
  "/:courseId/certificate",
  protect,
  issueCertificate
);

// Download Certificate
router.get(
  "/:courseId/download-certificate",
  protect,
  downloadCertificate
);

module.exports = router;
