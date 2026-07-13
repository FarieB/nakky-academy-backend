const Payment = require("../models/Payment");
const Subscription = require("../models/Subscription");
const SubscriptionPlan = require("../models/SubscriptionPlan");

const payfastService = require("./payfastService");
const subscriptionService = require("./subscriptionService");

/**
 * -------------------------------------------------------
 * CREATE SUBSCRIPTION PAYMENT
 * -------------------------------------------------------
 */

const createSubscriptionPayment = async (user, planId) => {

    // Fetch Plan

    const plan = await SubscriptionPlan.findById(planId);

    if (!plan) {

        throw new Error("Subscription plan not found.");

    }

    // Prevent duplicate ACTIVE subscription

    const activeSubscription = await Subscription.findOne({

        employer: { $eq: user._id },

        status: "active",

        endDate: { $gte: new Date() }

    }).populate("plan");

    if (activeSubscription) {

        throw new Error(

            `You already have an active ${activeSubscription.plan.name} subscription until ${activeSubscription.endDate.toDateString()}.`

        );

    }

    // Remove old pending subscriptions (>24 hours)

    const yesterday = new Date();

    yesterday.setHours(yesterday.getHours() - 24);

    await Subscription.updateMany(

        {

            employer: { $eq: user._id },

            status: "pending",

            createdAt: {

                $lt: yesterday

            }

        },

        {

            status: "cancelled"

        }

    );
    // Check for an existing pending subscription

    const pendingSubscription = await Subscription.findOne({

        employer: { $eq: user._id },

        status: "pending"

    });

    if (pendingSubscription) {

        const pendingPayment = await Payment.findOne({

            referenceId: pendingSubscription._id,

            status: "pending"

        });

        if (pendingPayment) {

            const paymentData = {

                merchant_id: process.env.PAYFAST_MERCHANT_ID,

                merchant_key: process.env.PAYFAST_MERCHANT_KEY,

                return_url: process.env.PAYFAST_RETURN_URL,

                cancel_url: process.env.PAYFAST_CANCEL_URL,

                notify_url: process.env.PAYFAST_NOTIFY_URL,

                amount: pendingPayment.amount.toFixed(2),

                item_name: `${plan.name} Subscription`,

                custom_str1: pendingPayment._id.toString(),

                custom_str2: user._id.toString()

            };

            return {

                payment: pendingPayment,

                subscription: pendingSubscription,

                paymentUrl:

                    payfastService.generatePaymentUrl(paymentData)

            };

        }

    }

    // Create new Subscription

    const subscription = await Subscription.create({

        employer: user._id,

        plan: plan._id,

        amount: plan.price,

        status: "pending"

    });

    // Merchant Payment ID

    const merchantPaymentId =

        `NKKY-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    // Create Payment

    const payment = await Payment.create({

        user: user._id,

        type: "subscription",

        referenceId: subscription._id,

        amount: plan.price,

        merchantPaymentId,

        paymentMethod: "payfast",

        gateway: "PayFast",

        status: "pending"

    });

    subscription.payment = payment._id;

    await subscription.save();

    const paymentData = {

        merchant_id: process.env.PAYFAST_MERCHANT_ID,

        merchant_key: process.env.PAYFAST_MERCHANT_KEY,

        return_url: process.env.PAYFAST_RETURN_URL,

        cancel_url: process.env.PAYFAST_CANCEL_URL,

        notify_url: process.env.PAYFAST_NOTIFY_URL,

        amount: plan.price.toFixed(2),

        item_name: `${plan.name} Subscription`,

        m_payment_id: merchantPaymentId,

        custom_str1: payment._id.toString(),

        custom_str2: user._id.toString()

    };

    return {

        payment,

        subscription,

        paymentUrl:

            payfastService.generatePaymentUrl(paymentData)

    };

};

/**
 * -------------------------------------------------------
 * PROCESS PAYFAST ITN
 * -------------------------------------------------------
 */

const processITN = async (payload) => {

    const payment = await Payment.findById(

        payload.custom_str1

    );

    if (!payment) {

        throw new Error("Payment not found.");

    }

    // Ignore duplicate ITNs

    if (payment.status === "paid") {

        return payment;

    }

    // Payment failed

    if (

        payload.payment_status !== "COMPLETE"

    ) {

        payment.status = "failed";

        payment.paymentStatus = payload.payment_status;

        payment.itnPayload = payload;

        await payment.save();

        return payment;

    }

    // Successful payment

    payment.status = "paid";

    payment.paymentStatus = payload.payment_status;

    payment.gatewayReference = payload.pf_payment_id;

    payment.paymentDate = new Date();

    payment.itnPayload = payload;

    await payment.save();

    // Activate subscription

    await subscriptionService.activateSubscription(

        payment.user,

        payment.referenceId

    );

    return payment;

};

module.exports = {

    createSubscriptionPayment,

    processITN

};