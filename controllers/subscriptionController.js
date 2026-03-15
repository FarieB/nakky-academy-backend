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
// PUBLIC: View plans
// ==============================
exports.getPlans = async (req, res) => {

    const plans = await SubscriptionPlan.find();

    res.json(plans);

};



// ==============================
// EMPLOYER: Subscribe
// ==============================
exports.subscribe = async (req, res) => {

    try {

        const plan = await SubscriptionPlan.findById(req.params.planId);

        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        const payment = await Payment.create({

            user: req.user._id,
            type: "subscription",
            referenceId: plan._id,
            amount: plan.price,
            status: "paid"

        });

        const expiry = new Date();

        expiry.setDate(expiry.getDate() + plan.durationDays);

        await User.findByIdAndUpdate(req.user._id, {

            subscriptionPlan: plan._id,
            subscriptionExpires: expiry

        });

        res.json({

            message: "Subscription activated",
            expires: expiry,
            payment

        });

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

};