const express = require("express");

const router = express.Router();

const {
  register,
  login,
  forgotPassword,
  resetPassword,
  refreshSession,
  logout,
} = require("../controllers/authController");

router.post("/register", register);

router.post("/login", login);

router.post("/refresh", refreshSession);

router.post("/logout", logout);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

module.exports = router;
