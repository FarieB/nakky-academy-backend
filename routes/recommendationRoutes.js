const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  recommendJobs,
  recommendCandidates,
  recommendCourses
} = require("../controllers/recommendationController");


// Recommend jobs for employees
router.get("/jobs", protect, recommendJobs);

// Recommend candidates for a job
router.get("/candidates/:jobId", protect, recommendCandidates);

// Recommend courses for students
router.get("/courses", protect, recommendCourses);

module.exports = router;