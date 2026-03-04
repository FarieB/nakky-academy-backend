const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {
  initiateCoursePayment,
  payfastNotify
} = require("../controllers/paymentController");

// ==============================
// Initiate PayFast Payment
// ==============================
router.post("/course/:enrollmentId", protect, initiateCoursePayment);

// ==============================
// PayFast Notification (NO protect)
// ==============================
router.post("/notify", payfastNotify);

module.exports = router;
