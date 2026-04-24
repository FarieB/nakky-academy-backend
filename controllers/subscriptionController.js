const SubscriptionPlan = require("../models/SubscriptionPlan");
const Payment = require("../models/Payment");
const User = require("../models/user");


// ==============================
// ADMIN: Create subscription plan
// ==============================
exports.createPlan = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const plan = await SubscriptionPlan.create(req.body);

    res.status(201).json(plan);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ==============================
// PUBLIC: Get all plans
// ==============================
exports.getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ==============================
// EMPLOYER: Subscribe (Monthly)
// ==============================
exports.subscribeEmployer = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.role !== "employer") {
      return res.status(403).json({
        message: "Only employers can subscribe"
      });
    }

    const plan = await SubscriptionPlan.findById(req.params.planId);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // Create payment record
    const payment = await Payment.create({
      user: user._id,
      type: "subscription",
      referenceId: plan._id,
      amount: plan.price,
      status: "paid"
    });

    // Calculate expiry date
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + plan.durationDays);

    // Update user subscription
    user.subscriptionPlan = plan._id;
    user.subscriptionStatus = "active";
    user.subscriptionExpiry = expiry;

    await user.save();

    res.json({
      message: "Subscription activated successfully ✅",
      expires: expiry,
      payment
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ==============================
// EMPLOYEE: Pay Verification Fee (Once-off)
// ==============================
exports.payEmployeeVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.role !== "employee") {
      return res.status(403).json({
        message: "Only employees can pay verification fee"
      });
    }

    if (user.hasPaidVerificationFee) {
      return res.status(400).json({
        message: "Verification already paid"
      });
    }

    // Create payment record (R100 fixed)
    const payment = await Payment.create({
      user: user._id,
      type: "verification",
      amount: 100,
      status: "paid"
    });

    // Update user
    user.hasPaidVerificationFee = true;
    user.verificationStatus = "pending";

    await user.save();

    res.json({
      message: "Verification payment successful ✅. You can now upload documents.",
      payment
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};