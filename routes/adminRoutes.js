const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const {
  getPlatformStats,
  getUsers,
  getEmployees,
  getJobs,
  getCourses,
  deleteUser,
  deleteJob
} = require("../controllers/adminController");


// ==============================
// Admin dashboard
// ==============================
router.get("/stats", protect, adminOnly, getPlatformStats);


// ==============================
// Manage users
// ==============================
router.get("/users", protect, adminOnly, getUsers);
router.delete("/users/:id", protect, adminOnly, deleteUser);


// ==============================
// Manage employees
// ==============================
router.get("/employees", protect, adminOnly, getEmployees);


// ==============================
// Manage jobs
// ==============================
router.get("/jobs", protect, adminOnly, getJobs);
router.delete("/jobs/:id", protect, adminOnly, deleteJob);


// ==============================
// Manage courses
// ==============================
router.get("/courses", protect, adminOnly, getCourses);

module.exports = router;