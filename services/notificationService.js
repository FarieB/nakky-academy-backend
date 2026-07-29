const Notification = require("../models/Notification");

// ======================================================
// Create Notification
// ======================================================

exports.createNotification = async ({
    user,
    title,
    message,
    type = "general",
    sender = null,
    referenceId = null,
    referenceModel = null,
    action = null,
    actionData = null,
}) => {
    try {

        const notification = await Notification.create({

            user,

            title,

            message,

            type,

            sender,

            referenceId,

            referenceModel,

            action,

            actionData,

        });

        // Broadcast notifications to active web instances
        sendNotification(
            user,
            notification
        );

        // 👇 UPDATED: Automatically recalculates and pushes unread badge totals
        await sendNotificationBadge(user);

        return notification;

    } catch (error) {

        console.error(
            "Notification Service Error:",
            error.message
        );

        return null;

    }
};


// ======================================================
// Mark Notification As Read
// ======================================================

exports.markNotificationRead = async (
    notificationId,
    userId
) => {

    return await Notification.findOneAndUpdate(

        {
            _id: notificationId,
            user: userId,
        },

        {
            isRead: true,
            readAt: new Date(),
        },

        {
            new: true,
        }

    );

};

// ======================================================
// Mark All Notifications As Read
// ======================================================

exports.markAllNotificationsRead = async (
    userId
) => {

    return await Notification.updateMany(

        {
            user: userId,
            isRead: false,
        },

        {
            isRead: true,
            readAt: new Date(),
        }

    );

};

// ======================================================
// Delete Notification
// ======================================================

exports.deleteNotification = async (
    notificationId,
    userId
) => {

    return await Notification.findOneAndDelete({

        _id: notificationId,

        user: userId,

    });

};

// ======================================================
// Get Unread Count
// ======================================================

exports.getUnreadCount = async (
    userId
) => {

    return await Notification.countDocuments({

        user: userId,

        isRead: false,

    });

};

// ======================================================
// Get Latest Notifications
// ======================================================

exports.getLatestNotifications = async (
    userId,
    limit = 10
) => {

    return await Notification.find({

        user: userId,

    })

        .populate(
            "sender",
            "firstName profilePhoto role"
        )

        .sort({
            createdAt: -1,
        })

        .limit(limit);

};

// ======================================================
// Messages Helper
// ======================================================

exports.notifyMessage = async ({
    sender,
    receiver,
    senderName,
}) => {

    return exports.createNotification({

        user: receiver,

        sender,

        title: "New Message",

        message: `${senderName} sent you a message.`,

        type: "message",

        action: "open_chat",

        actionData: {
            userId: sender,
        },

    });

};

// ======================================================
// Message Notification
// ======================================================

exports.notifyMessage = async ({
    sender,
    receiver,
    senderName,
}) => {

    return exports.createNotification({

        user: receiver,

        sender,

        title: "New Message",

        message: `${senderName} sent you a message.`,

        type: "message",

        action: "open_chat",

        actionData: {
            userId: sender,
        },

    });

};