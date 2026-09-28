const express = require("express");

const router = express.Router();

const paymentController =
    require("../controllers/paymentController");

const authMiddleware =
    require("../middleware/authMiddleware");

const adminOnly =
    require("../middleware/adminMiddleware");

const upload =
    require("../middleware/upload");


// =====================================================
// CREATE EMPLOYER SUBSCRIPTION PAYMENT
// =====================================================

router.post(
    "/subscription",
    authMiddleware,
    paymentController.createSubscription
);


// =====================================================
// CREATE CANDIDATE VERIFICATION PAYMENT
// =====================================================

router.post(
    "/verification",
    authMiddleware,
    paymentController.createVerificationPayment
);


// =====================================================
// CREATE STUDENT COURSE PAYMENT
// =====================================================

router.post(
    "/course",
    authMiddleware,
    paymentController.createCoursePayment
);


router.get(
    "/course/:courseId",
    authMiddleware,
    paymentController.getCoursePayment
);


// =====================================================
// UPLOAD EFT PROOF OF PAYMENT
// =====================================================

router.post(
    "/upload-proof",
    authMiddleware,
    upload.single("proof"),
    paymentController.uploadProofOfPayment
);


// =====================================================
// GET MY PAYMENTS
// =====================================================
// Logged-in student/candidate/employer can see
// their own payment records.

router.get(
    "/my",
    authMiddleware,
    paymentController.getMyPayments
);


// =====================================================
// GET ALL PAYMENTS
// ADMIN ONLY
// =====================================================
// Used by the mobile admin management system.

router.get(
    "/all",
    authMiddleware,
    adminOnly,
    paymentController.getAllPayments
);


// =====================================================
// APPROVE EFT PAYMENT
// ADMIN ONLY
// =====================================================
// Course payment approval:
// Payment.status       → paid
// Enrollment.paymentStatus → paid
//
// Employer subscription:
// Payment.status       → paid
// Subscription.status  → active
//
// Candidate verification:
// Payment.status       → paid
// Candidate profile    → verified

router.post(
    "/:paymentId/approve",
    authMiddleware,
    adminOnly,
    paymentController.approvePayment
);


// =====================================================
// REJECT EFT PAYMENT
// ADMIN ONLY
// =====================================================

router.post(
    "/:paymentId/reject",
    authMiddleware,
    adminOnly,
    paymentController.rejectPayment
);


module.exports = router;