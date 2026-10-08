const User = require("../models/user");
const CandidateProfile = require("../models/CandidateProfile");
const EmployerProfile = require("../models/EmployerProfile");

// =====================================================
// CHECK WHETHER A USER HAS AN ACTIVE SUBSCRIPTION
// =====================================================

const hasActiveSubscription = (user) => {
    if (!user) {
        return false;
    }

    if (user.subscriptionStatus !== "active") {
        return false;
    }

    if (!user.subscriptionExpiry) {
        return false;
    }

    return new Date(user.subscriptionExpiry) > new Date();
};

// =====================================================
// GET SUBSCRIPTION STATUS
// =====================================================

const getSubscriptionStatus = async (userId) => {
    const user = await User.findById(userId)
        .select(
            "_id role accountStatus subscriptionStatus subscriptionExpiry"
        )
        .lean();

    if (!user) {
        return {
            exists: false,
            active: false,
        };
    }

    return {
        exists: true,
        active:
            user.accountStatus === "active" &&
            hasActiveSubscription(user),
        accountStatus: user.accountStatus,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiry: user.subscriptionExpiry || null,
        role: user.role,
    };
};

// =====================================================
// REQUIRE CURRENT USER TO HAVE ACTIVE SUBSCRIPTION
// =====================================================

const requireActiveSubscription = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .select(
                "_id role accountStatus subscriptionStatus subscriptionExpiry"
            );

        if (!user) {
            return res.status(401).json({
                message: "User account not found.",
            });
        }

        if (user.accountStatus !== "active") {
            return res.status(403).json({
                message: "Your account is currently inactive.",
            });
        }

        if (!hasActiveSubscription(user)) {
            return res.status(403).json({
                message:
                    "An active subscription is required to contact other marketplace users.",
                subscriptionRequired: true,
            });
        }

        req.marketplaceUser = user;

        next();
    } catch (error) {
        console.error(
            "REQUIRE ACTIVE SUBSCRIPTION ERROR:",
            error
        );

        return res.status(500).json({
            message: "Unable to verify subscription status.",
        });
    }
};

// =====================================================
// REQUIRE BOTH USERS TO HAVE ACTIVE SUBSCRIPTIONS
// =====================================================

const requireBothActiveSubscriptions = async (
    req,
    res,
    next
) => {
    try {
        const senderId = req.user._id;
        const receiverId =
            req.body.receiverId ||
            req.params.userId ||
            req.params.receiverId;

        if (!receiverId) {
            return res.status(400).json({
                message: "Receiver is required.",
            });
        }

        if (String(senderId) === String(receiverId)) {
            return res.status(400).json({
                message:
                    "You cannot communicate with your own account.",
            });
        }

        const users = await User.find({
            _id: {
                $in: [senderId, receiverId],
            },
        }).select(
            "_id role accountStatus subscriptionStatus subscriptionExpiry"
        );

        const sender = users.find(
            (user) =>
                String(user._id) === String(senderId)
        );

        const receiver = users.find(
            (user) =>
                String(user._id) === String(receiverId)
        );

        if (!sender || !receiver) {
            return res.status(404).json({
                message: "One or both users could not be found.",
            });
        }

        // =================================================
        // ONLY CANDIDATE <-> EMPLOYER COMMUNICATION
        // =================================================

        const validPair =
            (sender.role === "candidate" &&
                receiver.role === "employer") ||
            (sender.role === "employer" &&
                receiver.role === "candidate");

        if (!validPair) {
            return res.status(403).json({
                message:
                    "Marketplace communication is only available between candidates and employers.",
            });
        }

        // =================================================
        // ACCOUNT STATUS
        // =================================================

        if (sender.accountStatus !== "active") {
            return res.status(403).json({
                message:
                    "Your account is currently inactive.",
            });
        }

        if (receiver.accountStatus !== "active") {
            return res.status(403).json({
                message:
                    "The other user's account is currently inactive.",
            });
        }

        // =================================================
        // SENDER SUBSCRIPTION
        // =================================================

        if (!hasActiveSubscription(sender)) {
            return res.status(403).json({
                message:
                    "Your subscription is inactive or expired. Please renew your subscription before making contact.",
                subscriptionRequired: true,
            });
        }

        // =================================================
        // RECEIVER SUBSCRIPTION
        // =================================================

        if (!hasActiveSubscription(receiver)) {
            return res.status(403).json({
                message:
                    "The other user's subscription is inactive or expired. Contact cannot be initiated at this time.",
                receiverSubscriptionRequired: true,
            });
        }

        // =================================================
        // PROFILE STATUS
        // =================================================

        if (sender.role === "candidate") {
            const candidateProfile =
                await CandidateProfile.findOne({
                    user: sender._id,
                }).select("profileActive");

            if (
                !candidateProfile ||
                candidateProfile.profileActive !== true
            ) {
                return res.status(403).json({
                    message:
                        "Your candidate profile is currently unavailable.",
                });
            }

            const employerProfile =
                await EmployerProfile.findOne({
                    user: receiver._id,
                }).select("profileActive");

            if (
                !employerProfile ||
                employerProfile.profileActive !== true
            ) {
                return res.status(403).json({
                    message:
                        "The employer profile is currently unavailable.",
                });
            }
        }

        if (sender.role === "employer") {
            const employerProfile =
                await EmployerProfile.findOne({
                    user: sender._id,
                }).select("profileActive");

            if (
                !employerProfile ||
                employerProfile.profileActive !== true
            ) {
                return res.status(403).json({
                    message:
                        "Your employer profile is currently unavailable.",
                });
            }

            const candidateProfile =
                await CandidateProfile.findOne({
                    user: receiver._id,
                }).select("profileActive");

            if (
                !candidateProfile ||
                candidateProfile.profileActive !== true
            ) {
                return res.status(403).json({
                    message:
                        "The candidate profile is currently unavailable.",
                });
            }
        }

        req.marketplaceSender = sender;
        req.marketplaceReceiver = receiver;

        next();
    } catch (error) {
        console.error(
            "BOTH SUBSCRIPTIONS CHECK ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to verify marketplace communication access.",
        });
    }
};

module.exports = {
    hasActiveSubscription,
    getSubscriptionStatus,
    requireActiveSubscription,
    requireBothActiveSubscriptions,
};