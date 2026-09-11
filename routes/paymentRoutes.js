const express = require("express");

const router = express.Router();

const paymentController =
    require("../controllers/paymentController");

const authMiddleware =
    require("../middleware/authMiddleware");

const upload =
    require("../middleware/upload");


// =======================================
// CREATE EMPLOYER SUBSCRIPTION PAYMENT
// =======================================

router.post(
    "/subscription",

    authMiddleware,

    paymentController.createSubscription
);


// =======================================
// CREATE CANDIDATE VERIFICATION PAYMENT
// =======================================

router.post(
    "/verification",

    authMiddleware,

    paymentController.createVerificationPayment
);


// =======================================
// CREATE STUDENT COURSE PAYMENT
// =======================================

router.post(
    "/course",

    authMiddleware,

    paymentController.createCoursePayment
);


// =======================================
// UPLOAD EFT PROOF OF PAYMENT
// =======================================

router.post(
    "/upload-proof",

    authMiddleware,

    upload.single("proof"),

    paymentController.uploadProofOfPayment
);


module.exports = router;