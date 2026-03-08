const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const checkSubscription = require("../middleware/subscriptionMiddleware");

const {
  createJob,
  getMatchedCandidates,
  inviteCandidate,
  sendMessage,
  hireCandidate
} = require("../controllers/jobController");


// Create job
router.post("/", protect, checkSubscription, createJob);

// Smart matching
router.get("/:id/matches", protect, checkSubscription, getMatchedCandidates);

// Invite candidate
router.post("/:jobId/invite", protect, checkSubscription, inviteCandidate);

// Send message
router.post("/message", protect, sendMessage);

// Hire candidate
router.post("/:jobId/hire", protect, checkSubscription, hireCandidate);

module.exports = router;