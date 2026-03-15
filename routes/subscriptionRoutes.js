const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
createPlan,
getPlans,
subscribe
} = require("../controllers/subscriptionController");

router.post("/plan", protect, createPlan);

router.get("/plans", getPlans);

router.post("/subscribe/:planId", protect, subscribe);

module.exports = router;