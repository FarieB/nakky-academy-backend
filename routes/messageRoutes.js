const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  sendMessage,
  getConversation,
  getMyChats
} = require("../controllers/messageController");

// Send message
router.post("/", protect, sendMessage);

// Get conversation with specific user
router.get("/:userId", protect, getConversation);

// Get all chats
router.get("/", protect, getMyChats);

module.exports = router;