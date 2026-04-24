const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const checkSubscription = require("../middleware/checkSubscription");

const {
  createJob,
  getMatchedCandidates,
  getRecommendedCandidates, // ✅ Added AI recommendations
  inviteCandidate,
  sendMessage,
  hireCandidate
} = require("../controllers/jobController");

// ==============================
// Job routes
// ==============================

// Create job
router.post("/", protect, checkSubscription, createJob);

// Smart matching (basic)
router.get("/:id/matches", protect, checkSubscription, getMatchedCandidates);

// AI-powered recommended candidates
router.get("/:id/recommended", protect, checkSubscription, getRecommendedCandidates);

// Invite candidate
router.post("/:jobId/invite", protect, checkSubscription, inviteCandidate);

// Send message
router.post("/message", protect, sendMessage);

// Hire candidate
router.post("/:jobId/hire", protect, checkSubscription, hireCandidate);

module.exports = router;