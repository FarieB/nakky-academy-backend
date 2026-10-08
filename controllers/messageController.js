const Message = require("../models/Message");
const User = require("../models/user");

const socketService = require("../services/socketService");

const {
    notifyMessage,
} = require("../services/notificationService");

const {
    requireBothActiveSubscriptions,
} = require("../middleware/marketplaceAccess");

// =====================================================
// SEND MESSAGE
// =====================================================

exports.sendMessage = async (req, res) => {
    try {
        const {
            receiverId,
            message,
        } = req.body;

        if (!receiverId || !message) {
            return res.status(400).json({
                message:
                    "Receiver and message are required.",
            });
        }

        const cleanMessage =
            String(message).trim();

        if (!cleanMessage) {
            return res.status(400).json({
                message:
                    "Message cannot be empty.",
            });
        }

        if (cleanMessage.length > 5000) {
            return res.status(400).json({
                message:
                    "Message cannot exceed 5000 characters.",
            });
        }

        // =================================================
        // IMPORTANT:
        // BOTH candidate and employer must have active
        // subscriptions before communication is allowed.
        // =================================================

        if (
            !req.marketplaceSender ||
            !req.marketplaceReceiver
        ) {
            return res.status(403).json({
                message:
                    "You do not currently have permission to contact this user.",
            });
        }

        // =================================================
        // CREATE MESSAGE
        // =================================================

        const newMessage = await Message.create({
            sender: req.user._id,
            receiver: receiverId,
            message: cleanMessage,
            status: "sent",
        });

        // =================================================
        // GET SENDER NAME
        // =================================================

        const sender = await User.findById(
            req.user._id
        ).select("firstName name");

        const senderName =
            sender?.firstName ||
            sender?.name?.split(" ")[0] ||
            "User";

        // =================================================
        // NOTIFICATION
        // =================================================

        await notifyMessage({
            sender: req.user._id,
            receiver: receiverId,
            senderName,
        });

        // =================================================
        // POPULATE MESSAGE
        // =================================================

        const populatedMessage =
            await Message.findById(
                newMessage._id
            )
                .populate(
                    "sender",
                    "name firstName profilePhoto"
                )
                .populate(
                    "receiver",
                    "name firstName profilePhoto"
                );

        // =================================================
        // SOCKET MESSAGE
        // =================================================

        socketService.sendMessage(
            receiverId,
            populatedMessage
        );

        // =================================================
        // UPDATE UNREAD COUNT
        // =================================================

        await socketService.sendUnreadCount(
            receiverId
        );

        return res.status(201).json(
            populatedMessage
        );
    } catch (error) {
        console.error(
            "SEND MESSAGE ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to send message.",
            error: error.message,
        });
    }
};

// =====================================================
// MARK MESSAGE DELIVERED
// =====================================================

exports.markDelivered = async (
    req,
    res
) => {
    try {
        const message =
            await Message.findById(
                req.params.id
            );

        if (!message) {
            return res.status(404).json({
                message:
                    "Message not found.",
            });
        }

        // Only the receiver may mark a message
        // as delivered.

        if (
            String(message.receiver) !==
            String(req.user._id)
        ) {
            return res.status(403).json({
                message:
                    "You are not authorised to update this message.",
            });
        }

        if (
            message.status === "sent"
        ) {
            message.status = "delivered";
            message.deliveredAt =
                new Date();

            await message.save();

            socketService.sendMessageStatus(
                message.sender,
                {
                    messageId:
                        message._id,
                    status: "delivered",
                    deliveredAt:
                        message.deliveredAt,
                }
            );
        }

        return res.json(message);
    } catch (error) {
        console.error(
            "MARK DELIVERED ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to update message status.",
        });
    }
};

// =====================================================
// MARK MESSAGE AS READ
// =====================================================

exports.markRead = async (
    req,
    res
) => {
    try {
        const message =
            await Message.findById(
                req.params.id
            );

        if (!message) {
            return res.status(404).json({
                message:
                    "Message not found.",
            });
        }

        // Only the receiver may mark the
        // message as read.

        if (
            String(message.receiver) !==
            String(req.user._id)
        ) {
            return res.status(403).json({
                message:
                    "You are not authorised to update this message.",
            });
        }

        if (
            message.status !== "read"
        ) {
            message.status = "read";
            message.readAt = new Date();

            await message.save();

            socketService.sendMessageStatus(
                message.sender,
                {
                    messageId:
                        message._id,
                    status: "read",
                    readAt:
                        message.readAt,
                }
            );

            await socketService.sendUnreadCount(
                req.user._id
            );
        }

        return res.json(message);
    } catch (error) {
        console.error(
            "MARK READ ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to update message status.",
        });
    }
};

// =====================================================
// GET UNREAD COUNTS
// =====================================================

exports.getUnreadCounts = async (
    req,
    res
) => {
    try {
        const counts =
            await Message.aggregate([
                {
                    $match: {
                        receiver:
                            req.user._id,
                        status: {
                            $ne: "read",
                        },
                    },
                },
                {
                    $group: {
                        _id: "$sender",
                        unreadCount: {
                            $sum: 1,
                        },
                    },
                },
            ]);

        return res.json(counts);
    } catch (error) {
        console.error(
            "GET UNREAD COUNTS ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to retrieve unread counts.",
        });
    }
};

// =====================================================
// GET CONVERSATION
// =====================================================
//
// Existing conversations can still be viewed by
// participants. Subscription is required for NEW
// contact/message creation, not for accessing one's
// existing message history.
//

exports.getConversation = async (
    req,
    res
) => {
    try {
        const { userId } =
            req.params;

        if (!userId) {
            return res.status(400).json({
                message:
                    "User ID is required.",
            });
        }

        if (
            String(userId) ===
            String(req.user._id)
        ) {
            return res.status(400).json({
                message:
                    "Invalid conversation.",
            });
        }

        // Make sure the other user exists.

        const otherUser =
            await User.findById(userId)
                .select(
                    "_id role accountStatus name firstName profilePhoto"
                );

        if (!otherUser) {
            return res.status(404).json({
                message:
                    "User not found.",
            });
        }

        const messages =
            await Message.find({
                $or: [
                    {
                        sender:
                            req.user._id,
                        receiver:
                            userId,
                    },
                    {
                        sender:
                            userId,
                        receiver:
                            req.user._id,
                    },
                ],
            })
                .sort({
                    createdAt: 1,
                })
                .populate(
                    "sender",
                    "name firstName profilePhoto"
                )
                .populate(
                    "receiver",
                    "name firstName profilePhoto"
                );

        return res.json(messages);
    } catch (error) {
        console.error(
            "GET CONVERSATION ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to retrieve conversation.",
        });
    }
};

// =====================================================
// GET MY CHATS
// =====================================================

exports.getMyChats = async (
    req,
    res
) => {
    try {
        const messages =
            await Message.find({
                $or: [
                    {
                        sender:
                            req.user._id,
                    },
                    {
                        receiver:
                            req.user._id,
                    },
                ],
            })
                .sort({
                    createdAt: -1,
                })
                .populate(
                    "sender",
                    "name firstName profilePhoto"
                )
                .populate(
                    "receiver",
                    "name firstName profilePhoto"
                );

        return res.json(messages);
    } catch (error) {
        console.error(
            "GET MY CHATS ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to retrieve conversations.",
        });
    }
};