const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  sendMessage,
  getConversation,
  getMyChats,
  markDelivered,
  markRead,
  getUnreadCounts
} = require("../controllers/messageController");

// Send message
router.post("/", protect, sendMessage);

// Get conversation with specific user
router.get("/:userId", protect, getConversation);

// Get all chats
router.get("/", protect, getMyChats);

router.put(
    "/:id/delivered",
    protect,
    markDelivered
);

router.put(
    "/:id/read",
    protect,
    markRead
);

router.get(
    "/unread/counts",
    protect,
    getUnreadCounts
);

module.exports = router;