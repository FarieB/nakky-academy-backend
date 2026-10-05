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

// ==========================================
// EMPLOYER: Get My Subscription
// ==========================================
exports.getMySubscription = async (req, res) => {
    try {

        if (!req.user) {
            return res.status(401).json({
                message: "Not authorized.",
            });
        }

        if (req.user.role !== "employer") {
            return res.status(403).json({
                message: "Employer access only.",
            });
        }

        const user = await require("../models/user")
            .findById(req.user._id)
            .select(
                "_id subscriptionStatus subscriptionExpiry currentSubscription"
            );

        if (!user) {
            return res.status(404).json({
                message: "User account not found.",
            });
        }

        return res.json({
            subscriptionStatus: user.subscriptionStatus || "inactive",
            subscriptionExpiry: user.subscriptionExpiry || null,
            currentSubscription: user.currentSubscription || null,
        });

    } catch (error) {

        console.error(
            "GET MY SUBSCRIPTION ERROR:",
            error
        );

        return res.status(500).json({
            message: error.message,
        });
    }
};