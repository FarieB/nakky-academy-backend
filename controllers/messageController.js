const Message = require("../models/Message");

// ==============================
// Send Message
// ==============================
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({
        message: "Receiver and message are required"
      });
    }

    const newMessage = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      message
    });

    res.status(201).json(newMessage);

  } catch (err) {
    res.status(500).json({ error: err.message });
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