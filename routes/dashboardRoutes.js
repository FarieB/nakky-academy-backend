const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const { getUnifiedDashboard } = require("../controllers/dashboardController");

// ==============================
// Unified Dashboard Endpoint
// ==============================
// Role-based: Admins see revenue, verification stats, all jobs/candidates
// Employers see their jobs, candidates, invitations, hires, messages, AI recommendations
router.get("/", protect, getUnifiedDashboard);

module.exports = router;