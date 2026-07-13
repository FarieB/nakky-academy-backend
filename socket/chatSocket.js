const Message = require("../models/Message");

module.exports = (io) => {

  io.on("connection", (socket) => {

    // ==========================
    // Join personal room
    // ==========================
    socket.on("join", (userId) => {
      socket.join(userId);
    });

    // ==========================
    // Send message
    // ==========================
    socket.on("sendMessage", async (data) => {

      try {

        const { senderId, receiverId, jobId, message } = data;

        const newMessage = await Message.create({
          sender: senderId,
          receiver: receiverId,
          job: jobId,
          message
        });

        // Send message to receiver
        io.to(receiverId).emit("receiveMessage", newMessage);

        // Send message back to sender
        io.to(senderId).emit("receiveMessage", newMessage);

      } catch (error) {
      }

    });

    socket.on("disconnect", () => {
    });

  });

};