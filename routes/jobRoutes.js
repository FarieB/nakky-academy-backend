const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const checkSubscription = require("../middleware/subscriptionMiddleware");

const {
  createJob,
  getMatchedCandidates
} = require("../controllers/jobController");

// ==============================
// Create a new job post (Employer only, must have active subscription)
// ==============================
router.post("/", protect, checkSubscription, createJob);

// ==============================
// Get matched employee candidates for a job
// (Employer only, must have active subscription)
// ==============================
router.get("/:id/matches", protect, checkSubscription, getMatchedCandidates);

module.exports = router;