const Message = require("../models/Message");
const User = require("../models/user");
// 1. IMPORT SOCKET SERVICE AT THE TOP
const socketService = require("../services/socketService"); 

const {
    notifyMessage,
} = require("../services/notificationService");


// ==============================
// Send Message
// ==============================
exports.sendMessage = async (req, res) => {
    try {
        const {
            receiverId,
            message,
        } = req.body;

        if (!receiverId || !message) {
            return res.status(400).json({
                message: "Receiver and message are required",
            });
        }

        // Create message with status
        const newMessage = await Message.create({
            sender: req.user._id,
            receiver: receiverId,
            message,
            status: "sent",
        });

        // Get sender's first name
        const sender = await User.findById(req.user._id)
            .select("firstName name");

        const senderName =
            sender.firstName ||
            sender.name.split(" ")[0];

        // Create notification
        await notifyMessage({
            sender: req.user._id,
            receiver: receiverId,
            senderName,
        });

        // Fetch populated message with necessary fields
        const populatedMessage = await Message.findById(newMessage._id)
            .populate(
                "sender",
                "name firstName profilePhoto"
            )
            .populate(
                "receiver",
                "name firstName profilePhoto"
            );

        // Emit message to the receiver instantly via WebSockets
        socketService.sendMessage(
            receiverId,
            populatedMessage
        );

        // 2. BROADCAST UNREAD COUNT TO THE RECEIVER AFTER SAVING
        await socketService.sendUnreadCount(receiverId);

        // Return populated message to the sender
        res.status(201).json(populatedMessage);

    } catch (err) {
        res.status(500).json({
            error: err.message,
        });
    }
};

// =====================================
// Mark Message Delivered
// =====================================

exports.markDelivered = async (req, res) => {

    try {

        const message = await Message.findById(req.params.id);

        if (!message) {

            return res.status(404).json({
                message: "Message not found",
            });

        }

        if (message.status === "sent") {

            message.status = "delivered";
            message.deliveredAt = new Date();

            await message.save();

            socketService.sendMessageStatus(
                message.sender,
                {
                    messageId: message._id,
                    status: "delivered",
                    deliveredAt: message.deliveredAt,
                }
            );

        }

        res.json(message);

    } catch (err) {

        res.status(500).json({
            message: err.message,
        });

    }

};

// =====================================
// Mark Message As Read
// =====================================

exports.markRead = async (req, res) => {

    try {

        const message = await Message.findById(req.params.id);

        if (!message) {

            return res.status(404).json({
                message: "Message not found",
            });

        }

        if (message.status !== "read") {

            message.status = "read";
            message.readAt = new Date();

            await message.save();

            socketService.sendMessageStatus(
                message.sender,
                {
                    messageId: message._id,
                    status: "read",
                    readAt: message.readAt,
                }
            );

            // 3. OPTIONAL BUT HIGHLY RECOMMENDED: 
            // Update unread count for the receiver (req.user._id) since they just read a message
            await socketService.sendUnreadCount(req.user._id);

        }

        res.json(message);

    }

    catch (err) {

        res.status(500).json({
            message: err.message,
        });

    }

};

// =====================================
// Get Unread Counts
// =====================================

exports.getUnreadCounts = async (req, res) => {

    try {

        const counts = await Message.aggregate([

            {

                $match: {

                    receiver: req.user._id,

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

        res.json(counts);

    }

    catch (err) {

        res.status(500).json({

            message: err.message

        });

    }

};


// ==============================
// Get Conversation (2 users)
// ==============================
exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name")
      .populate("receiver", "name");

    res.json(messages);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// Get My Conversations (last messages)
// ==============================
exports.getMyChats = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id },
        { receiver: req.user._id }
      ]
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name")
      .populate("receiver", "name");

    res.json(messages);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
