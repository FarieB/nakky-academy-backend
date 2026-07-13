const Subscription = require("../models/Subscription");

const checkSubscription = async (req, res, next) => {

    try {

        const user = req.user;

        const checks = [
            { condition: !user, status: 401, message: "Authentication required." },
            { condition: user && user.role !== "employer", status: 403, message: "Only employers can perform this action." }
        ];

        for (const { condition, status, message } of checks) {
            if (condition) {
                return res.status(status).json({ message });
            }
        }

        if (user.subscriptionStatus !== "active") {

            return res.status(403).json({

                message:
                    "Please subscribe before posting jobs."

            });

        }

        if (!user.subscriptionExpiry) {

            return res.status(403).json({

                message: "Subscription not found."

            });

        }

        const today = new Date();

        if (new Date(user.subscriptionExpiry) < today) {

            user.subscriptionStatus = "inactive";

            user.currentSubscription = null;

            await user.save();

            // Update latest subscription

            await Subscription.findOneAndUpdate(

                {

                    employer: user._id,

                    status: "active"

                },

                {

                    status: "expired"

                },

                {

                    sort: {

                        createdAt: -1

                    }

                }

            );

            return res.status(403).json({

                message:
                    "Your subscription has expired. Please renew to continue."

            });

        }

        next();

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Subscription validation failed."

        });

    }

};

module.exports = checkSubscription;