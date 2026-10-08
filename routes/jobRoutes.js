const express = require("express");

const router =
    express.Router();

const protect =
    require("../middleware/authMiddleware");

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
// PUBLIC/LOGGED-IN JOB SEARCH
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
// IMPORTANT: BEFORE /:id
// =====================================================

router.get(
    "/employer/my-jobs",
    protect,
    getMyJobs
);


// =====================================================
// ADMIN EXPIRY
// IMPORTANT: BEFORE /:id
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
// =====================================================

router.post(
    "/",
    protect,
    createJob
);


// =====================================================
// UPDATE JOB
// =====================================================

router.put(
    "/:id",
    protect,
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
    reactivateJob
);


module.exports = router;