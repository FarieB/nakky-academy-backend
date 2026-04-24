const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {
  initiateCoursePayment,
  payfastNotify
} = require("../controllers/paymentController");


// ==============================
// STUDENT: Initiate Payment
// ==============================
router.post("/course/:enrollmentId", protect, initiateCoursePayment);


// ==============================
// PAYFAST WEBHOOK (PUBLIC)
// ==============================
router.post("/notify", payfastNotify);


module.exports = router;
