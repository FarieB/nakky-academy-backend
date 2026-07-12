const SubscriptionPlan = require("../models/SubscriptionPlan");


// ==============================
// ADMIN: Create subscription plan
// ==============================
exports.createPlan = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only",
      });
    }

    const plan = await SubscriptionPlan.create({
      name: req.body.name,
      price: req.body.price,
      durationDays: req.body.durationDays,
      description: req.body.description,
    });

    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// ==============================
// PUBLIC: Get all plans
// ==============================
exports.getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({
      price: 1,
    });

    res.json(plans);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};