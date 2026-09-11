const CandidateProfile = require("../models/CandidateProfile");
const Payment = require("../models/Payment");
const Subscription = require("../models/Subscription");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");


// =====================================================
// NAKKY ACADEMY BANKING DETAILS
// =====================================================

const BANKING_DETAILS = {
    accountName: "Nakky Academy (Pty) Ltd",
    bankName: "FNB",
    accountNumber: "63148927510",
    branchCode: "210835",
    accountType: "Gold Business Account"
};


// =====================================================
// GENERATE UNIQUE EFT PAYMENT REFERENCE
// =====================================================

const generatePaymentReference = async (prefix) => {

    let paymentReference;
    let exists = true;

    while (exists) {

        const timestamp = Date.now();

        const randomNumber = Math.floor(
            1000 + Math.random() * 9000
        );

        paymentReference =
            `NKKY-${prefix}-${timestamp}-${randomNumber}`;

        const existingPayment =
            await Payment.findOne({
                paymentReference
            });

        exists = !!existingPayment;
    }

    return paymentReference;
};


// =====================================================
// CREATE EMPLOYER EFT SUBSCRIPTION PAYMENT
// =====================================================

const createSubscriptionPayment = async (user, planId) => {

    const plan =
        await SubscriptionPlan.findById(planId);

    if (!plan) {
        throw new Error(
            "Subscription plan not found."
        );
    }

    if (!plan.isActive) {
        throw new Error(
            "This subscription plan is currently unavailable."
        );
    }

    if (plan.planType !== "employer") {
        throw new Error(
            "Invalid employer subscription plan."
        );
    }


    // ==========================================
    // CHECK ACTIVE SUBSCRIPTION
    // ==========================================

    const activeSubscription =
        await Subscription.findOne({

            employer: user._id,

            status: "active",

            endDate: {
                $gte: new Date()
            }

        }).populate("plan");


    if (activeSubscription) {

        throw new Error(
            `You already have an active ${activeSubscription.plan.name} subscription until ${activeSubscription.endDate.toDateString()}.`
        );

    }


    // ==========================================
    // CHECK EXISTING PENDING PAYMENT FOR THIS PLAN
    // ==========================================

    const existingPendingSubscription =
        await Subscription.findOne({

            employer: user._id,

            plan: plan._id,

            status: "pending"

        });


    if (existingPendingSubscription) {

        const existingPayment =
            await Payment.findOne({

                referenceId:
                    existingPendingSubscription._id,

                type: "subscription",

                status: "pending"

            });


        if (existingPayment) {

            return {

                message:
                    "You already have a pending EFT payment for this subscription.",

                subscription: {
                    _id:
                        existingPendingSubscription._id,

                    status:
                        existingPendingSubscription.status
                },

                plan: {
                    _id: plan._id,
                    name: plan.name,
                    price: plan.price,
                    durationDays: plan.durationDays
                },

                payment: {
                    _id: existingPayment._id,
                    amount: existingPayment.amount,
                    paymentReference:
                        existingPayment.paymentReference,
                    status: existingPayment.status
                },

                bankingDetails:
                    BANKING_DETAILS

            };

        }

    }


    // ==========================================
    // CREATE SUBSCRIPTION
    // ==========================================

    const subscription =
        await Subscription.create({

            employer: user._id,

            plan: plan._id,

            amount: plan.price,

            status: "pending"

        });


    // ==========================================
    // GENERATE PAYMENT REFERENCE
    // ==========================================

    const paymentReference =
        await generatePaymentReference("EMP");


    // ==========================================
    // CREATE PAYMENT
    // ==========================================

    const payment =
        await Payment.create({

            user: user._id,

            type: "subscription",

            referenceId:
                subscription._id,

            amount:
                plan.price,

            paymentMethod:
                "eft",

            paymentReference,

            status:
                "pending"

        });


    // ==========================================
    // LINK PAYMENT
    // ==========================================

    subscription.payment =
        payment._id;

    await subscription.save();


    return {

        message:
            "Your subscription request has been created. Please make an EFT using the payment reference exactly as shown.",

        subscription: {
            _id: subscription._id,
            status: subscription.status
        },

        plan: {
            _id: plan._id,
            name: plan.name,
            price: plan.price,
            durationDays: plan.durationDays
        },

        payment: {
            _id: payment._id,
            amount: payment.amount,
            paymentReference:
                payment.paymentReference,
            status: payment.status
        },

        bankingDetails:
            BANKING_DETAILS

    };

};


// =====================================================
// CREATE CANDIDATE VERIFICATION EFT PAYMENT
// =====================================================

const createVerificationPayment = async (user) => {

    // ==========================================
    // FIND CANDIDATE PROFILE
    // ==========================================

    const profile =
        await CandidateProfile.findOne({

            user: user._id

        });


    if (!profile) {

        throw new Error(
            "Candidate profile not found."
        );

    }


    // ==========================================
    // CHECK IF ALREADY VERIFIED
    // ==========================================

    if (profile.profileVerified) {

        throw new Error(
            "Your profile has already been verified."
        );

    }


    // ==========================================
    // CANDIDATE VERIFICATION FEE
    // ==========================================

    const verificationFee = 200;


    // ==========================================
    // CHECK EXISTING PENDING PAYMENT
    // ==========================================

    let existingPayment =
        await Payment.findOne({

            user: user._id,

            type: "verification",

            referenceId: profile._id,

            status: "pending"

        });


    // ==========================================
    // EXISTING PAYMENT FOUND
    // ==========================================

    if (existingPayment) {

        console.log(
            "EXISTING VERIFICATION PAYMENT FOUND:",
            existingPayment._id
        );


        // ======================================
        // FIX OLD PAYMENT WITHOUT REFERENCE
        // ======================================

        if (
            !existingPayment.paymentReference ||
            existingPayment.paymentReference.trim() === ""
        ) {

            console.log(
                "GENERATING MISSING PAYMENT REFERENCE"
            );


            existingPayment.paymentReference =
                await generatePaymentReference("CAN");

        }


        // ======================================
        // UPDATE OLD INCORRECT AMOUNT
        // ======================================

        if (
            existingPayment.amount !== verificationFee
        ) {

            console.log(
                `UPDATING VERIFICATION AMOUNT FROM R${existingPayment.amount} TO R${verificationFee}`
            );

            existingPayment.amount =
                verificationFee;

        }


        // ======================================
        // ENSURE EFT PAYMENT METHOD
        // ======================================

        if (
            existingPayment.paymentMethod !== "eft"
        ) {

            existingPayment.paymentMethod =
                "eft";

        }


        // ======================================
        // ENSURE PROOF STATUS EXISTS
        // ======================================

        if (!existingPayment.proofStatus) {

            existingPayment.proofStatus =
                "not_submitted";

        }


        await existingPayment.save();


        return {

            message:
                "You already have a pending candidate verification payment. Please use the EFT details below.",


            profile: {

                _id:
                    profile._id

            },


            payment: {

                _id:
                    existingPayment._id,

                amount:
                    existingPayment.amount,

                paymentReference:
                    existingPayment.paymentReference,

                status:
                    existingPayment.status,

                proofStatus:
                    existingPayment.proofStatus

            },


            bankingDetails:
                BANKING_DETAILS

        };

    }


    // ==========================================
    // GENERATE NEW EFT REFERENCE
    // ==========================================

    const paymentReference =
        await generatePaymentReference("CAN");


    // ==========================================
    // CREATE NEW PAYMENT
    // ==========================================

    const payment =
        await Payment.create({

            user:
                user._id,

            type:
                "verification",

            referenceId:
                profile._id,

            amount:
                verificationFee,

            paymentMethod:
                "eft",

            paymentReference:
                paymentReference,

            status:
                "pending",

            proofStatus:
                "not_submitted"

        });


    console.log(
        "NEW VERIFICATION PAYMENT CREATED:",
        payment
    );


    // ==========================================
    // RETURN COMPLETE EFT DETAILS
    // ==========================================

    return {

        message:
            "Your candidate verification payment request has been created.",


        profile: {

            _id:
                profile._id

        },


        payment: {

            _id:
                payment._id,

            amount:
                payment.amount,

            paymentReference:
                payment.paymentReference,

            status:
                payment.status,

            proofStatus:
                payment.proofStatus

        },


        bankingDetails:
            BANKING_DETAILS

    };

};


// =====================================================
// CREATE STUDENT COURSE EFT PAYMENT
// =====================================================

const createCoursePayment = async (
    user,
    courseId
) => {

    // ==========================================
    // FIND COURSE
    // ==========================================

    const course =
        await Course.findById(courseId);


    if (!course) {

        throw new Error(
            "Course not found."
        );

    }


    // ==========================================
    // CHECK IF COURSE IS PUBLISHED
    // ==========================================

    if (!course.published) {

        throw new Error(
            "This course is not currently available."
        );

    }


    // ==========================================
    // CHECK EXISTING ENROLLMENT
    // ==========================================

    let enrollment =
        await Enrollment.findOne({

            student: user._id,

            course: course._id

        });


    // ==========================================
    // ALREADY PAID
    // ==========================================

    if (
        enrollment &&
        enrollment.paymentStatus === "paid"
    ) {

        throw new Error(
            "You are already enrolled in this course."
        );

    }


    // ==========================================
    // CREATE ENROLLMENT IF IT DOESN'T EXIST
    // ==========================================

    if (!enrollment) {

        enrollment =
            await Enrollment.create({

                student:
                    user._id,

                course:
                    course._id,

                paymentStatus:
                    "pending",

                coursePrice:
                    course.price

            });

    }


    // ==========================================
    // CHECK EXISTING PENDING PAYMENT
    // ==========================================

    const existingPayment =
        await Payment.findOne({

            user:
                user._id,

            type:
                "course",

            referenceId:
                enrollment._id,

            status:
                "pending"

        });


    if (existingPayment) {

        return {

            message:
                "You already have a pending payment for this course.",

            course: {
                _id:
                    course._id,

                title:
                    course.title,

                price:
                    course.price
            },

            enrollment: {
                _id:
                    enrollment._id,

                paymentStatus:
                    enrollment.paymentStatus
            },

            payment: {
                _id:
                    existingPayment._id,

                amount:
                    existingPayment.amount,

                paymentReference:
                    existingPayment.paymentReference,

                status:
                    existingPayment.status
            },

            bankingDetails:
                BANKING_DETAILS

        };

    }


    // ==========================================
    // GENERATE PAYMENT REFERENCE
    // ==========================================

    const paymentReference =
        await generatePaymentReference("STU");


    // ==========================================
    // CREATE COURSE PAYMENT
    // ==========================================

    const payment =
        await Payment.create({

            user:
                user._id,

            type:
                "course",

            referenceId:
                enrollment._id,

            amount:
                course.price,

            paymentMethod:
                "eft",

            paymentReference,

            status:
                "pending"

        });


    // ==========================================
    // LINK PAYMENT TO ENROLLMENT
    // ==========================================

    enrollment.paymentReference =
        payment._id;

    await enrollment.save();


    return {

        message:
            "Your course enrollment payment request has been created.",

        course: {
            _id:
                course._id,

            title:
                course.title,

            price:
                course.price
        },

        enrollment: {
            _id:
                enrollment._id,

            paymentStatus:
                enrollment.paymentStatus
        },

        payment: {
            _id:
                payment._id,

            amount:
                payment.amount,

            paymentReference:
                payment.paymentReference,

            status:
                payment.status
        },

        bankingDetails:
            BANKING_DETAILS

    };

};


// =====================================================
// APPROVE EFT PAYMENT
// ADMIN ONLY
// =====================================================

const approvePayment = async (
    paymentId,
    adminId,
    adminNotes = ""
) => {

    const payment =
        await Payment.findById(paymentId);


    if (!payment) {

        throw new Error(
            "Payment not found."
        );

    }


    if (payment.status === "paid") {

        throw new Error(
            "This payment has already been approved."
        );

    }


    // ==========================================
    // UPDATE PAYMENT
    // ==========================================

    payment.status = "paid";

    payment.paymentDate =
        new Date();

    payment.verifiedBy =
        adminId;

    payment.verifiedAt =
        new Date();

    payment.adminNotes =
        adminNotes;

    payment.proofStatus =
        "approved";

    await payment.save();


    // ==========================================
    // EMPLOYER SUBSCRIPTION
    // ==========================================

    if (payment.type === "subscription") {

        const subscription =
            await Subscription.findById(
                payment.referenceId
            ).populate("plan");


        if (!subscription) {

            throw new Error(
                "Subscription not found."
            );

        }


        const startDate =
            new Date();

        const endDate =
            new Date(startDate);

        endDate.setDate(
            endDate.getDate() +
            subscription.plan.durationDays
        );


        subscription.status =
            "active";

        subscription.startDate =
            startDate;

        subscription.endDate =
            endDate;

        await subscription.save();

    }


    // ==========================================
    // CANDIDATE VERIFICATION
    // ==========================================

    if (payment.type === "verification") {

        const profile =
            await CandidateProfile.findById(
                payment.referenceId
            );


        if (!profile) {

            throw new Error(
                "Candidate profile not found."
            );

        }


        profile.profileVerified =
            true;

        await profile.save();

    }


    // ==========================================
    // COURSE PAYMENT
    // ==========================================

    if (payment.type === "course") {

        const enrollment =
            await Enrollment.findById(
                payment.referenceId
            );


        if (!enrollment) {

            throw new Error(
                "Course enrollment not found."
            );

        }


        enrollment.paymentStatus =
            "paid";

        enrollment.paymentDate =
            new Date();

        await enrollment.save();

    }


    return payment;

};


// =====================================================
// REJECT EFT PAYMENT
// =====================================================

const rejectPayment = async (
    paymentId,
    adminId,
    adminNotes = ""
) => {

    const payment =
        await Payment.findById(paymentId);


    if (!payment) {

        throw new Error(
            "Payment not found."
        );

    }


    payment.status =
        "failed";

    payment.verifiedBy =
        adminId;

    payment.verifiedAt =
        new Date();

    payment.adminNotes =
        adminNotes;

    payment.proofStatus =
        "rejected";

    await payment.save();


    return payment;

};


module.exports = {

    createSubscriptionPayment,

    createVerificationPayment,

    createCoursePayment,

    approvePayment,

    rejectPayment

};