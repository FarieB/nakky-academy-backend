const SubscriptionPlan = require("../models/SubscriptionPlan");

// ==========================================
// ADMIN: Create Subscription Plan
// ==========================================
exports.createPlan = async (req, res) => {
    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin access only.",
            });
        }

        const {
            name,
            price,
            durationDays,
            description,
        } = req.body;

        const existingPlan = await SubscriptionPlan.findOne({
            name,
        });

        if (existingPlan) {
            return res.status(400).json({
                message: "A subscription plan with this name already exists.",
            });
        }

        const plan = await SubscriptionPlan.create({
            name,
            price,
            durationDays,
            description,
        });

        return res.status(201).json({
            message: "Subscription plan created successfully.",
            plan,
        });

    } catch (error) {

        return res.status(500).json({
            message: error.message,
        });

    }
};


// ==========================================
// PUBLIC: Get Subscription Plans
// ==========================================
exports.getPlans = async (req, res) => {

    try {

        const plans = await SubscriptionPlan.find()
            .sort({
                price: 1,
            });

        return res.json(plans);

    } catch (error) {

        return res.status(500).json({
            message: error.message,
        });

    }

};