const express = require("express");

const router = express.Router();


// ============================================================
// AUTHENTICATION
// ============================================================
//
// Your existing backend uses authMiddleware.js.
// ============================================================

const protect =
    require("../middleware/authMiddleware");


// ============================================================
// CONTROLLER
// ============================================================

const {
    createInterviewRequest,
    getMyInterviews,
    getInterviewById,
    respondToInterview,
    cancelInterview,
    completeInterview,
} = require(
    "../controllers/interviewController"
);


// ============================================================
// INTERVIEW ROUTES
// ============================================================


// ------------------------------------------------------------
// CREATE INTERVIEW REQUEST
// ------------------------------------------------------------
//
// Requires BOTH candidate and employer to have active
// subscriptions.
//
// ------------------------------------------------------------

router.post(
    "/",
    protect,
    createInterviewRequest
);


// ------------------------------------------------------------
// GET MY INTERVIEWS
// ------------------------------------------------------------

router.get(
    "/my",
    protect,
    getMyInterviews
);


// ------------------------------------------------------------
// GET SINGLE INTERVIEW
// ------------------------------------------------------------

router.get(
    "/:id",
    protect,
    getInterviewById
);


// ------------------------------------------------------------
// ACCEPT / REJECT
// ------------------------------------------------------------

router.patch(
    "/:id/respond",
    protect,
    respondToInterview
);


// ------------------------------------------------------------
// CANCEL
// ------------------------------------------------------------

router.patch(
    "/:id/cancel",
    protect,
    cancelInterview
);


// ------------------------------------------------------------
// COMPLETE
// ------------------------------------------------------------

router.patch(
    "/:id/complete",
    protect,
    completeInterview
);


module.exports = router;