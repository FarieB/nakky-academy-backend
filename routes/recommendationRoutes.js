const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const { 
  recommendCandidates,
  recommendCourses
} = require("../controllers/recommendationController");


// Employer → candidate recommendations
router.get("/candidates", protect, recommendCandidates);

// Student → course recommendations
router.get("/courses", protect, recommendCourses);

module.exports = router;