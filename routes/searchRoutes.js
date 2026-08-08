const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    searchCandidates
} = require("../controllers/searchController");

router.post(
    "/candidates",
    protect,
    searchCandidates
);

module.exports = router;