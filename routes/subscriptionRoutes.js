const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createPlan,
  getPlans,
  getMySubscription,
} = require("../controllers/subscriptionController");


// ==============================
// ADMIN: Create plan
// ==============================
router.post(
  "/plan",
  protect,
  createPlan
);


// ==============================
// PUBLIC: View plans
// ==============================
router.get(
  "/plans",
  getPlans
);


// ==============================
// EMPLOYER: Get my subscription
// ==============================
router.get(
  "/my-subscription",
  protect,
  getMySubscription
);


module.exports = router;