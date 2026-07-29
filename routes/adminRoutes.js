const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const {
    getPlatformStats,
    getRevenue,
    getUsers,
    getCandidates,
    getCourses,
    deleteUser,
    deleteCandidate,
    deleteCourse,
} = require("../controllers/adminController");


// =====================================
// Dashboard
// =====================================
router.get("/stats", protect, adminOnly, getPlatformStats);


// =====================================
// Revenue
// =====================================
router.get("/revenue", protect, adminOnly, getRevenue);


// =====================================
// Users
// =====================================
router.get("/users", protect, adminOnly, getUsers);
router.delete("/users/:id", protect, adminOnly, deleteUser);


// =====================================
// Candidates
// =====================================
router.get("/candidates", protect, adminOnly, getCandidates);
router.delete("/candidates/:id", protect, adminOnly, deleteCandidate);


// =====================================
// Courses
// =====================================
router.get("/courses", protect, adminOnly, getCourses);
router.delete("/courses/:id", protect, adminOnly, deleteCourse);

module.exports = router;