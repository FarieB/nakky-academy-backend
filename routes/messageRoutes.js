const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    requireBothActiveSubscriptions,
} = require("../middleware/marketplaceAccess");

const {
    sendMessage,
    getConversation,
    getMyChats,
    markDelivered,
    markRead,
    getUnreadCounts,
} = require("../controllers/messageController");

// =====================================================
// SEND MESSAGE
// =====================================================
//
// BOTH candidate and employer must have an active,
// unexpired subscription.
//

router.post(
    "/",
    protect,
    requireBothActiveSubscriptions,
    sendMessage
);

// =====================================================
// GET CONVERSATION
// =====================================================
//
// Existing participants may view their conversation.
// This does NOT reveal phone numbers or email addresses.
//

router.get(
    "/:userId",
    protect,
    getConversation
);

// =====================================================
// GET MY CHATS
// =====================================================

router.get(
    "/",
    protect,
    getMyChats
);

// =====================================================
// MARK MESSAGE DELIVERED
// =====================================================

router.put(
    "/:id/delivered",
    protect,
    markDelivered
);

// =====================================================
// MARK MESSAGE READ
// =====================================================

router.put(
    "/:id/read",
    protect,
    markRead
);

// =====================================================
// UNREAD COUNTS
// =====================================================

router.get(
    "/unread/counts",
    protect,
    getUnreadCounts
);

module.exports = router;