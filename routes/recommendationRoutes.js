const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {
  recommendJobs,
  recommendCandidates,
  recommendCourses
} = require("../controllers/recommendationController");


// Employee → job recommendations
router.get("/jobs", protect, recommendJobs);

// Employer → candidate recommendations
router.get("/candidates/:jobId", protect, recommendCandidates);

// Student → course recommendations
router.get("/courses", protect, recommendCourses);

module.exports = router;