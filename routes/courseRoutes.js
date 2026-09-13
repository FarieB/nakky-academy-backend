const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const videoUpload = require("../middleware/videoUpload");

const courseMaterialUpload = require("../middleware/courseMaterialUpload");

const courseController = require("../controllers/courseController");


/**
 * ============================================================
 * ADMIN ONLY MIDDLEWARE
 * ============================================================
 */
const adminOnly = (req, res, next) => {
    if (
        !req.user ||
        req.user.role !== "admin"
    ) {
        return res.status(403).json({
            message: "Admin only.",
        });
    }

    next();
};


/**
 * ============================================================
 * COURSE MANAGEMENT
 * ============================================================
 */

/**
 * Create course
 */
router.post(
    "/",
    protect,
    adminOnly,
    courseController.createCourse
);


/**
 * Update complete course structure
 *
 * This updates:
 *
 * Course
 * ├── Modules
 * ├── Lessons
 * ├── Assignments
 * └── Final Exam
 */
router.put(
    "/:courseId",
    protect,
    adminOnly,
    courseController.updateCourse
);


/**
 * Delete course
 */
router.delete(
    "/:courseId",
    protect,
    adminOnly,
    courseController.deleteCourse
);


/**
 * Publish course
 */
router.put(
    "/:courseId/publish",
    protect,
    adminOnly,
    courseController.publishCourse
);


/**
 * Unpublish course
 */
router.put(
    "/:courseId/unpublish",
    protect,
    adminOnly,
    courseController.unpublishCourse
);


/**
 * ============================================================
 * LEGACY COURSE CONTENT
 * ============================================================
 *
 * Kept temporarily for compatibility.
 */
router.post(
    "/:courseId/content",
    protect,
    adminOnly,
    courseController.addCourseContent
);


/**
 * ============================================================
 * LESSON VIDEO UPLOAD
 * ============================================================
 *
 * NEW STRUCTURE:
 *
 * Course
 *   → Module
 *      → Lesson
 *         → Video
 */
router.post(
    "/:courseId/modules/:moduleId/lessons/:lessonId/video",
    protect,
    adminOnly,
    videoUpload.single("video"),
    courseController.uploadLessonVideo
);


/**
 * ============================================================
 * LEGACY VIDEO UPLOAD
 * ============================================================
 *
 * Kept so old frontend code doesn't immediately break.
 */
router.post(
    "/:courseId/lessons/:lessonId/video",
    protect,
    adminOnly,
    videoUpload.single("video"),
    courseController.uploadLessonVideo
);


/**
 * ============================================================
 * PDF / AUDIO MATERIAL UPLOAD
 * ============================================================
 *
 * Multiple files can be uploaded to the same lesson,
 * one request at a time.
 *
 * The frontend can simply call this endpoint repeatedly:
 *
 * PDF 1
 * PDF 2
 * PDF 3
 * Audio 1
 * Audio 2
 * etc.
 */
router.post(
    "/:courseId/modules/:moduleId/lessons/:lessonId/material",
    protect,
    adminOnly,
    courseMaterialUpload.single("material"),
    courseController.uploadLessonMaterial
);


/**
 * ============================================================
 * DELETE LESSON MATERIAL
 * ============================================================
 */
router.delete(
    "/:courseId/modules/:moduleId/lessons/:lessonId/materials/:materialId",
    protect,
    adminOnly,
    courseController.deleteLessonMaterial
);


/**
 * ============================================================
 * GET COURSES
 * ============================================================
 *
 * Admin:
 *   receives complete course structure.
 *
 * Student:
 *   receives published courses with safe overview.
 */
router.get(
    "/",
    protect,
    courseController.getAllCourses
);


/**
 * ============================================================
 * GET SINGLE COURSE
 * ============================================================
 *
 * Admin:
 *   complete modules/materials.
 *
 * Student:
 *   safe course overview.
 */
router.get(
    "/:courseId",
    protect,
    courseController.getCourseById
);


/**
 * ============================================================
 * COURSE PAYMENT
 * ============================================================
 */
router.post(
    "/:courseId/payment",
    protect,
    courseController.createCoursePayment
);


/**
 * ============================================================
 * COURSE ENROLLMENT
 * ============================================================
 */
router.post(
    "/:courseId/enroll",
    protect,
    courseController.enrollCourse
);


/**
 * ============================================================
 * PAID COURSE CONTENT
 * ============================================================
 */
router.get(
    "/:courseId/content",
    protect,
    courseController.getCourseContent
);


/**
 * ============================================================
 * PROTECTED VIDEO STREAMING
 * ============================================================
 *
 * Example:
 *
 * GET /courses/COURSE_ID/video/FILENAME.mp4
 */
router.get(
    "/:courseId/video/:filename",
    protect,
    courseController.streamVideo
);


/**
 * ============================================================
 * PROTECTED PDF / AUDIO ACCESS
 * ============================================================
 *
 * Example:
 *
 * GET /courses/COURSE_ID/material/FILENAME.pdf
 *
 * The controller checks:
 *
 * 1. User is authenticated
 * 2. User paid for the course
 * 3. File belongs to that course
 */
router.get(
    "/:courseId/material/:filename",
    protect,
    courseController.streamMaterial
);


/**
 * ============================================================
 * UPDATE COURSE PROGRESS
 * ============================================================
 */
router.put(
    "/:courseId/progress",
    protect,
    courseController.updateProgress
);


/**
 * ============================================================
 * CERTIFICATE
 * ============================================================
 */
router.get(
    "/:courseId/certificate",
    protect,
    courseController.issueCertificate
);


/**
 * ============================================================
 * DOWNLOAD CERTIFICATE
 * ============================================================
 */
router.get(
    "/:courseId/download-certificate",
    protect,
    courseController.downloadCertificate
);


module.exports = router;
