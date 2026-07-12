const User = require("../models/User");
const Subscription = require("../models/Subscription");
const SubscriptionPlan = require("../models/SubscriptionPlan");

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

    // If already active simply return
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
            status: "active"
        },

        {
            status: "expired"
        }

    );

    subscription.status = "active";
    subscription.startDate = today;
    subscription.endDate = expiry;

    await subscription.save();

    await User.findByIdAndUpdate(

        userId,

        {

            subscriptionStatus: "active",

            subscriptionExpiry: expiry,

            currentSubscription: subscription._id

        }

    );

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

    await User.findByIdAndUpdate(

        subscription.employer,

        {

            subscriptionStatus: "active",

            subscriptionExpiry: expiry,

            currentSubscription: subscription._id

        }

    );

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

                employer: userId,

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

            employer: userId,

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