const Subscription = require("../models/Subscription");

const checkSubscription = async (req, res, next) => {

    try {

        const user = req.user;
        async (req, res, next) => {
            const errorMap = {
const checkSubscription = async (req, res, next) => {
    try {
        const { user } = req;
        const errorMap = {
            noUser: { status: 401, message: "Authentication required." },
            notEmployer: { status: 403, message: "Only employers can perform this action." }
        };

        const errorKey = !user ? "noUser" : (user.role !== "employer" ? "notEmployer" : null);
        if (errorKey) {
            const { status, message } = errorMap[errorKey];
            return res.status(status).json({ message });
        }

        if (user.subscriptionStatus !== "active") {
            return res.status(403).json({
                message: "Please subscribe before posting jobs."
            });
        }

        return null;
    } catch (error) {
        next(error);
        return null;
    }
};

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