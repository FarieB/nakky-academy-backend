
const express = require("express");

const router = express.Router();

const protect =
    require("../middleware/authMiddleware");

const checkSubscription =
    require("../middleware/checkSubscription");

const {
    createJob,
    getAllJobs,
    getJobById,
    getMyJobs,
    updateJob,
    deleteJob,
    pauseJob,
    reactivateJob,
    getJobMatches,
    expireJobs
} = require("../controllers/jobController");


// =====================================================
// JOB SEARCH
// =====================================================

router.get(
    "/",
    protect,
    getAllJobs
);


// =====================================================
// CANDIDATE MATCHES
// IMPORTANT: BEFORE /:id
// =====================================================

router.get(
    "/matches/recommended",
    protect,
    getJobMatches
);


// =====================================================
// EMPLOYER'S JOBS
// =====================================================

router.get(
    "/employer/my-jobs",
    protect,
    getMyJobs
);


// =====================================================
// ADMIN EXPIRY
// =====================================================

router.post(
    "/admin/expire",
    protect,
    expireJobs
);


// =====================================================
// SINGLE JOB
// =====================================================

router.get(
    "/:id",
    protect,
    getJobById
);


// =====================================================
// CREATE JOB
// Requires an active employer subscription
// =====================================================

router.post(
    "/",
    protect,
    checkSubscription,
    createJob
);


// =====================================================
// UPDATE JOB
// =====================================================

router.put(
    "/:id",
    protect,
    checkSubscription,
    updateJob
);


// =====================================================
// CLOSE JOB
// =====================================================

router.delete(
    "/:id",
    protect,
    deleteJob
);


// =====================================================
// PAUSE JOB
// =====================================================

router.patch(
    "/:id/pause",
    protect,
    pauseJob
);


// =====================================================
// REACTIVATE JOB
// =====================================================

router.patch(
    "/:id/reactivate",
    protect,
    checkSubscription,
    reactivateJob
);


module.exports = router;
