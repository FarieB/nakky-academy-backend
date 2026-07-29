// 1. ADD THIS IMPORT AT THE TOP OF THE FILE
const Message = require("../models/Message");

let io = null;

// userId -> socketId
const connectedUsers = new Map();

/*
Map Structure
userId
  ↓
[
    socketId1,
    socketId2,
    socketId3
]
*/

/**
 * =====================================
 * Initialize Socket.IO
 * =====================================
 */
const initialize = (ioInstance) => {
  io = ioInstance;
};

/**
 * =====================================
 * Register Logged-in User
 * =====================================
 */
const registerUser = (userId, socketId) => {
  const key = userId.toString();
  const sockets = connectedUsers.get(key) || [];
  if (!sockets.includes(socketId)) {
    sockets.push(socketId);
  }
  connectedUsers.set(key, sockets);
};

/**
 * =====================================
 * Remove Disconnected Socket
 * =====================================
 */
const removeSocket = (socketId) => {
  for (const [userId, sockets] of connectedUsers.entries()) {
    const updated = sockets.filter((id) => id !== socketId);
    if (updated.length === 0) {
      connectedUsers.delete(userId);
    } else {
      connectedUsers.set(userId, updated);
    }
  }
};

/**
 * =====================================
 * Get User Socket
 * =====================================
 */
const getSockets = (userId) => {
  return connectedUsers.get(userId.toString()) || [];
};

/**
 * =====================================
 * Send Notification
 * =====================================
 */
const sendNotification = (userId, notification) => {
  if (!io) return;
  const sockets = getSockets(userId);
  sockets.forEach((socketId) => {
    io.to(socketId).emit("notification", notification);
  });
};

/**
 * =====================================
 * Send Message
 * =====================================
 */
const sendMessage = (userId, message) => {
  if (!io) return;
  const sockets = getSockets(userId);
  sockets.forEach((socketId) => {
    io.to(socketId).emit("new_message", message);
  });
};

/**
 * =====================================
 * Typing Indicator
 * =====================================
 */
const sendTyping = (userId, senderId) => {
  if (!io) return;
  const sockets = getSockets(userId);
  sockets.forEach((socketId) => {
    io.to(socketId).emit("typing", {
      senderId,
    });
  });
};

/**
 * =====================================
 * Stop Typing
 * =====================================
 */
const stopTyping = (userId, senderId) => {
  if (!io) return;
  const sockets = getSockets(userId);
  sockets.forEach((socketId) => {
    io.to(socketId).emit("stop_typing", {
      senderId,
    });
  });
};

/**
 * =====================================
 * Message Status
 * =====================================
 */
const sendMessageStatus = (userId, status) => {
  if (!io) return;
  const sockets = getSockets(userId);
  sockets.forEach((socketId) => {
    io.to(socketId).emit("message_status", status);
  });
};

/**
 * =====================================
 * Broadcast
 * =====================================
 */
const broadcast = (event, payload) => {
  if (!io) return;
  io.emit(event, payload);
};

/**
 * =====================================
 * Broadcast Unread Updates
 * =====================================
 */
const sendUnreadCount = async (userId) => {
    const unread = await Message.aggregate([
        {
            $match: {
                receiver: userId,
                status: {
                    $ne: "read"
                }
            }
        },
        {
            $group: {
                _id: "$sender",
                unreadCount: {
                    $sum: 1
                }
            }
        }
    ]);

    const sockets = getSockets(userId);
    sockets.forEach(socketId => {
        io.to(socketId).emit(
            "unread_counts",
            unread
        );
    });
};

/**
 * =====================================
 * Notification Badge
 * =====================================
 */
const sendNotificationBadge = async (userId) => {
    const Notification = require("../models/Notification");
    const unread = await Notification.countDocuments({
        user: userId,
        isRead: false
    });

    const sockets = getSockets(userId);
    sockets.forEach(socketId => {
        io.to(socketId).emit(
            "notification_badge",
            {
                unread
            }
        );
    });
};

/**
 * =====================================
 * Refresh Admin Dashboard (NEW FUNCTION ADDED HERE)
 * =====================================
 */
const refreshAdminDashboard = () => {
  if (!io) return;

  io.emit("admin_dashboard_update");
};

module.exports = {
  initialize,
  registerUser,
  removeSocket,
  getSockets,
  sendNotification,
  sendMessage,
  sendTyping,
  stopTyping,
  sendMessageStatus,
  broadcast,
  sendUnreadCount,
  sendNotificationBadge,
  refreshAdminDashboard, // ← EXPORTED HERE
};

