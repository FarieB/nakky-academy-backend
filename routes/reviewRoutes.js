const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  leaveReview,
  getCandidateReviews,
} = require("../controllers/reviewController");

// ======================================
// Employer leaves a review for a candidate
// ======================================
router.post("/", protect, leaveReview);

// ======================================
// View reviews for a candidate
// ======================================
router.get("/candidate/:candidateId", protect, getCandidateReviews);

module.exports = router;