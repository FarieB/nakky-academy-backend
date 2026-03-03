const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const checkSubscription = require("../middleware/subscriptionMiddleware");
const { createJob, getMatchedCandidates } = require("../controllers/jobController");

router.post("/", protect, checkSubscription, createJob);
router.get("/:id/matches", protect, checkSubscription, getMatchedCandidates);

module.exports = router;
