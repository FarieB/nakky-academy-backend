const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {
  createCourse,
  addCourseContent,
  enrollCourse,
  getCourseContent,
  updateProgress,
  issueCertificate
} = require("../controllers/courseController");

router.post("/", protect, createCourse);
router.post("/:courseId/content", protect, addCourseContent);
router.post("/:courseId/enroll", protect, enrollCourse);
router.get("/:courseId/content", protect, getCourseContent);
router.put("/:courseId/progress", protect, updateProgress);
router.get("/:courseId/certificate", protect, issueCertificate);
// Download PDF certificate
router.get("/:courseId/download-certificate", protect, downloadCertificate);

module.exports = router;