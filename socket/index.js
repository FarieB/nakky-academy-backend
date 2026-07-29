const User = require("../models/user");
const socketService = require("../services/socketService");

module.exports = function initializeSocket(io) {
  // Initialize the shared socket service instance
  socketService.initialize(io);

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ==========================
    // Register Logged-in User
    // ==========================
    socket.on("register", async (userId) => {
      socket.userId = userId;

      socketService.registerUser(userId, socket.id);

      await User.findByIdAndUpdate(userId, {
        isOnline: true,
      });

      socket.broadcast.emit("user_online", {
        userId,
      });

      console.log(`${userId} is online`);
    });

    // =====================================
    // Typing Indicator
    // =====================================
    socket.on("typing", ({ receiverId, senderId }) => {
      socketService.sendTyping(receiverId, senderId);
    });

    // =====================================
    // Stop Typing
    // =====================================
    socket.on("stop_typing", ({ receiverId, senderId }) => {
      socketService.stopTyping(receiverId, senderId);
    });

    // ==========================
    // Disconnect
    // ==========================
    socket.on("disconnect", async () => {
      console.log("Socket disconnected:", socket.id);

      if (socket.userId) {
        // Remove this specific socket instance
        socketService.removeSocket(socket.id);

        // Check if the user has any other active connections left
        const activeSockets = socketService.getSockets(socket.userId);

        if (activeSockets.length === 0) {
          // No devices left connected, mark user offline
          await User.findByIdAndUpdate(socket.userId, {
            isOnline: false,
            lastSeen: new Date(),
          });

          socket.broadcast.emit("user_offline", {
            userId: socket.userId,
            lastSeen: new Date(),
          });

          console.log(`${socket.userId} is offline`);
        }
      }
    });
  });
};

