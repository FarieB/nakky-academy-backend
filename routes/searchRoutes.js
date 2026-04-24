const express = require("express");
const router = express.Router();

const { searchWorkersAdvanced } = require("../controllers/searchController");

// Public search
router.get("/workers", searchWorkersAdvanced);

module.exports = router;