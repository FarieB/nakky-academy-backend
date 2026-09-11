const SubscriptionPlan =
    require("../models/SubscriptionPlan");

const Payment =
    require("../models/Payment");

const paymentService =
    require("../services/paymentService");


// =====================================================
// EMPLOYER SUBSCRIPTION PAYMENT
// =====================================================

exports.createSubscription = async (req, res) => {

    try {

        const { planId } =
            req.body;


        if (!planId) {

            return res.status(400).json({

                message:
                    "Subscription plan is required."

            });

        }


        const plan =
            await SubscriptionPlan.findById(
                planId
            );


        if (!plan) {

            return res.status(404).json({

                message:
                    "Subscription plan not found."

            });

        }


        const result =
            await paymentService.createSubscriptionPayment(

                req.user,

                plan._id

            );


        return res.status(201).json(
            result
        );

    }

    catch (err) {

        console.error(
            "CREATE SUBSCRIPTION ERROR:",
            err
        );


        return res.status(500).json({

            message:
                err.message

        });

    }

};


// =====================================================
// CANDIDATE VERIFICATION PAYMENT
// =====================================================

exports.createVerificationPayment =
    async (req, res) => {

        try {

            const result =
                await paymentService.createVerificationPayment(

                    req.user

                );


            return res.status(201).json(
                result
            );

        }

        catch (err) {

            console.error(
                "CREATE VERIFICATION PAYMENT ERROR:",
                err
            );


            return res.status(500).json({

                message:
                    err.message

            });

        }

    };


// =====================================================
// STUDENT COURSE PAYMENT
// =====================================================

exports.createCoursePayment =
    async (req, res) => {

        try {

            const { courseId } =
                req.body;


            if (!courseId) {

                return res.status(400).json({

                    message:
                        "Course ID is required."

                });

            }


            const result =
                await paymentService.createCoursePayment(

                    req.user,

                    courseId

                );


            return res.status(201).json(
                result
            );

        }

        catch (err) {

            console.error(
                "CREATE COURSE PAYMENT ERROR:",
                err
            );


            return res.status(500).json({

                message:
                    err.message

            });

        }

    };


// =====================================================
// UPLOAD EFT PROOF OF PAYMENT
// =====================================================

exports.uploadProofOfPayment = async (req, res) => {

    try {

        const { paymentId } = req.body;


        // ===================================
        // CHECK PAYMENT ID
        // ===================================

        if (!paymentId) {

            return res.status(400).json({

                message: "Payment ID is required."

            });

        }


        // ===================================
        // CHECK FILE
        // ===================================

        if (!req.file) {

            return res.status(400).json({

                message: "Please select a proof of payment file."

            });

        }


        // ===================================
        // FIND PAYMENT
        // ===================================

        const payment = await Payment.findById(paymentId);


        if (!payment) {

            return res.status(404).json({

                message: "Payment not found."

            });

        }


        // ===================================
        // SECURITY CHECK
        // USER MUST OWN PAYMENT
        // ===================================

        if (
            payment.user.toString() !==
            req.user._id.toString()
        ) {

            return res.status(403).json({

                message:
                    "You are not authorised to upload proof for this payment."

            });

        }


        // ===================================
        // PAYMENT MUST BE EFT
        // ===================================

        if (payment.paymentMethod !== "eft") {

            return res.status(400).json({

                message:
                    "Proof of payment can only be uploaded for EFT payments."

            });

        }


        // ===================================
        // SAVE PROOF
        // ===================================

        payment.proofOfPayment =
            `/uploads/proofs/${req.file.filename}`;

        payment.proofSubmittedAt =
            new Date();

        payment.proofStatus =
            "submitted";


        await payment.save();


        return res.status(200).json({

            message:
                "Proof of payment uploaded successfully. Your payment is now awaiting verification.",

            payment: {

                _id: payment._id,

                paymentReference:
                    payment.paymentReference,

                amount:
                    payment.amount,

                proofOfPayment:
                    payment.proofOfPayment,

                proofStatus:
                    payment.proofStatus

            }

        });

    }

    catch (err) {

        console.error(
            "UPLOAD PROOF ERROR:",
            err
        );

        return res.status(500).json({

            message:
                err.message ||
                "Failed to upload proof of payment."

        });

    }

};


// =====================================================
// GET MY PAYMENTS
// =====================================================

exports.getMyPayments =
    async (req, res) => {

        try {

            const payments =
                await Payment.find({

                    user:
                        req.user._id

                })
                    .sort({
                        createdAt: -1
                    });


            return res.json(
                payments
            );

        }

        catch (err) {

            return res.status(500).json({

                message:
                    err.message

            });

        }

    };


// =====================================================
// ADMIN: GET ALL PAYMENTS
// =====================================================

exports.getAllPayments =
    async (req, res) => {

        try {

            const payments =
                await Payment.find()

                    .populate(
                        "user",
                        "name email role"
                    )

                    .populate(
                        "verifiedBy",
                        "name email"
                    )

                    .sort({

                        createdAt: -1

                    });


            return res.json(
                payments
            );

        }

        catch (err) {

            return res.status(500).json({

                message:
                    err.message

            });

        }

    };


// =====================================================
// ADMIN: APPROVE PAYMENT
// =====================================================

exports.approvePayment =
    async (req, res) => {

        try {

            const {

                adminNotes

            } = req.body;


            const payment =
                await paymentService.approvePayment(

                    req.params.paymentId,

                    req.user._id,

                    adminNotes

                );


            return res.json({

                message:
                    "Payment approved successfully.",

                payment

            });

        }

        catch (err) {

            console.error(
                "APPROVE PAYMENT ERROR:",
                err
            );


            return res.status(500).json({

                message:
                    err.message

            });

        }

    };


// =====================================================
// ADMIN: REJECT PAYMENT
// =====================================================

exports.rejectPayment =
    async (req, res) => {

        try {

            const {

                adminNotes

            } = req.body;


            const payment =
                await paymentService.rejectPayment(

                    req.params.paymentId,

                    req.user._id,

                    adminNotes

                );


            return res.json({

                message:
                    "Payment rejected.",

                    payment

            });

        }

        catch (err) {

            console.error(
                "REJECT PAYMENT ERROR:",
                err
            );


            return res.status(500).json({

                message:
                    err.message

            });

        }

    };
