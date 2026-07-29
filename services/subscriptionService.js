const User = require("../models/User");
const Subscription = require("../models/Subscription");
const { createNotification } = require("./notificationService");
const { refreshAdminDashboard } = require("./socketService");


/**
 * =====================================================
 * Activate Subscription
 * Called ONLY after successful PayFast payment
 * =====================================================
 */

const activateSubscription = async (userId, subscriptionId) => {

    const subscription = await Subscription
        .findById(subscriptionId)
        .populate("plan");

    if (!subscription) {
        throw new Error("Subscription not found.");
    }

    if (!subscription.plan) {
        throw new Error("Subscription plan not found.");
    }

    if (subscription.status === "active") {
        return subscription;
    }

    const today = new Date();

    const expiry = new Date(today);

    expiry.setDate(
        expiry.getDate() +
        subscription.plan.durationDays
    );

    // Expire previous active subscriptions
    await Subscription.updateMany(
        {
            employer: userId,
            status: "active",
        },
        {
            status: "expired",
        }
    );

    subscription.status = "active";
    subscription.startDate = today;
    subscription.endDate = expiry;

    await subscription.save();

    const employer = await User.findByIdAndUpdate(
        userId,
        {
            subscriptionStatus: "active",
            subscriptionExpiry: expiry,
            currentSubscription: subscription._id,
        },
        {
            new: true,
        }
    );

    // ==========================================
    // Notify Employer
    // ==========================================

    await createNotification({

        user: employer._id,

        sender: null,

        title: "Subscription Activated",

        message: `Your ${subscription.plan.name} subscription has been activated successfully and is valid until ${expiry.toDateString()}.`,

        type: "subscription_activated",

        action: "open_subscription",

        actionData: {
            subscriptionId: subscription._id,
            expires: expiry,
        },

    });

    // ==========================================
    // Notify Admins
    // ==========================================

    const admins = await User.find({
        role: "admin",
    }).select("_id");

    for (const admin of admins) {

        await createNotification({

            user: admin._id,

            sender: employer._id,

            title: "New Employer Subscription",

            message: `${employer.name} activated a ${subscription.plan.name} subscription.`,

            type: "subscription_purchase",

            action: "open_subscription",

            actionData: {
                employerId: employer._id,
                subscriptionId: subscription._id,
            },

        });

    }

    refreshAdminDashboard();

    return subscription;

};

/**
 * =====================================================
 * Cancel Subscription
 * =====================================================
 */

const cancelSubscription = async (subscriptionId) => {

    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription)
        throw new Error("Subscription not found.");

    subscription.status = "cancelled";

    await subscription.save();

    await User.findByIdAndUpdate(

        subscription.employer,

        {

            subscriptionStatus: "inactive",

            currentSubscription: null

        }

    );

    await createNotification({

        user: subscription.employer,

        sender: null,

        title: "Subscription Cancelled",

        message: "Your employer subscription has been cancelled.",

        type: "subscription_cancelled",

        action: "open_subscription",

        actionData: {
            subscriptionId: subscription._id,
        },

    });

    refreshAdminDashboard();

    return subscription;

};

/**
 * =====================================================
 * Expire Subscription
 * =====================================================
 */

const expireSubscription = async (subscriptionId) => {

    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) return null;

    subscription.status = "expired";

    await subscription.save();

    await User.findByIdAndUpdate(

        subscription.employer,

        {

            subscriptionStatus: "inactive",

            currentSubscription: null

        }

    );

        await createNotification({

            user: subscription.employer,

            sender: null,

            title: "Subscription Expired",

            message: "Your employer subscription has expired. Renew now to continue accessing employer features.",

            type: "subscription_expired",

            action: "open_subscription",

            actionData: {
                subscriptionId: subscription._id,
            },

         });

         refreshAdminDashboard();

    return subscription;

};

/**
 * =====================================================
 * Renew Subscription
 * =====================================================
 */

const renewSubscription = async (

    subscriptionId,

    durationDays

) => {

    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription)
        throw new Error("Subscription not found.");

    const expiry = new Date();

    expiry.setDate(

        expiry.getDate() +

        durationDays

    );

    subscription.status = "active";

    subscription.endDate = expiry;

    await subscription.save();

    await User.findOneAndUpdate(

        { _id: { $eq: subscription.employer } },

        {

            subscriptionStatus: "active",

            subscriptionExpiry: expiry,

            currentSubscription: subscription._id

        }

    );

    const employer = await User.findById(subscription.employer);

    await createNotification({

        user: employer._id,

        sender: null,

        title: "Subscription Renewed",

        message: `Your subscription has been renewed until ${expiry.toDateString()}.`,

        type: "subscription_renewed",

        action: "open_subscription",

        actionData: {
            subscriptionId: subscription._id,
        },

    });

    refreshAdminDashboard();

    return subscription;

};

/**
 * =====================================================
 * Check Subscription Validity
 * =====================================================
 */

const isSubscriptionActive = async (userId) => {

    const user = await User.findById(userId);

    if (!user)
        return false;

    if (user.subscriptionStatus !== "active")
        return false;

    if (!user.subscriptionExpiry)
        return false;

    if (new Date(user.subscriptionExpiry) < new Date()) {

        user.subscriptionStatus = "inactive";

        user.currentSubscription = null;

        await user.save();

        await Subscription.updateMany(

            {

                employer: { $eq: userId },

                status: "active"

            },

            {

                status: "expired"

            }

        );

        return false;

    }

    return true;

};

/**
 * =====================================================
 * Remaining Days
 * =====================================================
 */

const getRemainingDays = async (userId) => {

    const user = await User.findById(userId);

    if (!user)
        return 0;

    if (!user.subscriptionExpiry)
        return 0;

    const diff =

        new Date(user.subscriptionExpiry)

        -

        new Date();

    return Math.max(

        Math.ceil(

            diff /

            (1000 * 60 * 60 * 24)

        ),

        0

    );

};

/**
 * =====================================================
 * Get Current Subscription
 * =====================================================
 */

const getCurrentSubscription = async (userId) => {

    return await Subscription

        .findOne({

            employer: { $eq: userId },

            status: "active"

        })

        .populate("plan")

        .sort({

            createdAt: -1

        });

};

module.exports = {

    activateSubscription,

    cancelSubscription,

    expireSubscription,

    renewSubscription,

    isSubscriptionActive,

    getRemainingDays,

    getCurrentSubscription

};