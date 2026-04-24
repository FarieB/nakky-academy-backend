const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createPlan,
  getPlans,
  subscribeEmployer,
  payEmployeeVerification
} = require("../controllers/subscriptionController");


// ==============================
// ADMIN: Create subscription plan
// ==============================
router.post("/plan", protect, createPlan);


// ==============================
// PUBLIC: View subscription plans
// ==============================
router.get("/plans", getPlans);


// ==============================
// EMPLOYER: Subscribe (monthly)
// ==============================
router.post("/subscribe/:planId", protect, subscribeEmployer);


// ==============================
// EMPLOYEE: Pay verification (once-off)
// ==============================
router.post("/verify-payment", protect, payEmployeeVerification);


module.exports = router;