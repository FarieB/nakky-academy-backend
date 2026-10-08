const express =
    require("express");

const router =
    express.Router();

const protect =
    require("../middleware/authMiddleware");

const {
    recommendCandidates,
    recommendCourses,
    recommendEmployers
} = require(
    "../controllers/recommendationController"
);


// =====================================================
// EMPLOYER → CANDIDATE MATCHING
// =====================================================

router.get(
    "/candidates",
    protect,
    recommendCandidates
);


// =====================================================
// CANDIDATE → EMPLOYER MATCHING
// =====================================================

router.get(
    "/employers",
    protect,
    recommendEmployers
);


// =====================================================
// STUDENT → COURSE RECOMMENDATIONS
// =====================================================

router.get(
    "/courses",
    protect,
    recommendCourses
);


module.exports =
    router;