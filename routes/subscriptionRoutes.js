const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createPlan,
  getPlans,
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


module.exports = router;