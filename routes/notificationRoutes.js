const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getMyNotifications,
  markAsRead,
} = require("../controllers/notificationController");

// ==============================
// Get notifications
// ==============================
router.get("/", protect, getMyNotifications);

// ==============================
// Mark notification read
// ==============================
router.put("/:id/read", protect, markAsRead);

module.exports = router;