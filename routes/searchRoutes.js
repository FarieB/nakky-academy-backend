const express = require("express");
const router = express.Router();

const {
  searchCandidatesAdvanced,
} = require("../controllers/searchController");

// ======================================
// Advanced Candidate Search
// ======================================
router.get("/candidates", searchCandidatesAdvanced);

module.exports = router;