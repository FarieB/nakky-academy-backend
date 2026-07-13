const Subscription = require("../models/Subscription");

const checkSubscription = async (req, res, next) => {

    try {

        const user = req.user;

        if (!user) {

            return res.status(401).json({

                message: "Authentication required."

            });

        }

        if (user.role !== "employer") {

            return res.status(403).json({

                message: "Only employers can perform this action."

            });

        }

        return null;

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