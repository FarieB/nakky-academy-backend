const SubscriptionPlan = require("../models/SubscriptionPlan");

const paymentService = require("../services/paymentService");

const payfastService = require("../services/payfastService");

// =======================================
// Create Subscription Payment
// =======================================

exports.createSubscription = async (req, res) => {

    try {

        const plan = await SubscriptionPlan.findById(

            req.body.planId

        );

        if (!plan) {

            return res.status(404).json({

                message: "Subscription plan not found."

            });

        }

        const payment = await paymentService.createSubscriptionPayment(

            req.user,

            plan._id

        );

        res.status(200).json(payment);

    }

    catch (err) {

        console.error(err);

        res.status(500).json({

            message: err.message

        });

    }

};

// =======================================
// PayFast ITN
// =======================================

exports.handleITN = async (req, res) => {

    try {

        // Verify with PayFast

        const valid = await payfastService.verifyITN(req.body);

        if (!valid) {

            return res.status(400).send("INVALID");

        }

        await paymentService.processITN(req.body);

        return res.status(200).send("OK");

    }

    catch (err) {

        console.error(err);

        return res.status(500).send("FAILED");

    }

};
