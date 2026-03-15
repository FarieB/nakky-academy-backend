const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { searchWorkersAdvanced } = require("../controllers/searchController");

// 🔎 Advanced search endpoint
router.get("/workers", protect, searchWorkersAdvanced);

module.exports = router;