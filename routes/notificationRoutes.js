const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getMyNotifications,
  markAsRead,
  getUnreadCount,
  clearAllNotifications,
} = require("../controllers/notificationController");

// =====================================
// GET MY NOTIFICATIONS
// =====================================

router.get(
  "/",
  protect,
  getMyNotifications
);

// =====================================
// GET UNREAD COUNT
// =====================================

router.get(
  "/unread-count",
  protect,
  getUnreadCount
);

// =====================================
// MARK NOTIFICATION AS READ
// =====================================

router.put(
  "/:id/read",
  protect,
  markAsRead
);

// =====================================
// CLEAR ALL MY NOTIFICATIONS
// =====================================

router.delete(
  "/",
  protect,
  clearAllNotifications
);

module.exports = router;