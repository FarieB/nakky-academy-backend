const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getCandidateDashboard,
  getEmployerDashboard
} = require("../controllers/dashboardController");


// Candidate dashboard
router.get("/candidate", protect, getCandidateDashboard);

// Employer dashboard
router.get("/employer", protect, getEmployerDashboard);

module.exports = router;