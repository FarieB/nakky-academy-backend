const express = require("express");

const router = express.Router();

const {
    register,
    login,
    forgotPassword,
    resetPassword,
} = require("../controllers/authController");

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Request a password reset email
router.post("/forgot-password", forgotPassword);

// Submit a new password
router.post("/reset-password", resetPassword);

module.exports = router;
