const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  leaveReview,
  getEmployeeReviews
} = require("../controllers/reviewController");


// Employer writes review
router.post("/", protect, leaveReview);

// View employee reviews
router.get("/:employeeId", protect, getEmployeeReviews);

module.exports = router;