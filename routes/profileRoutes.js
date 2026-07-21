const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  updateWorkerProfile,
  searchWorkers
} = require("../controllers/profileController");

// ==============================
// Update worker profile
// ==============================
router.put("/worker", protect, updateWorkerProfile);

// ==============================
// Search workers
// ==============================
router.get("/search", protect, searchWorkers);

module.exports = router;