const NotificationModel = require("../models/Notification");

// ==============================
// Get My Notifications
// ==============================
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await NotificationModel.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ==============================
// Mark Notification As Read
// ==============================
exports.markAsRead = async (req, res) => {
  try {
    const notification = await NotificationModel.findOne({
      _id: { $eq: req.params.id },
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    notification.isRead = true;

    await notification.save();

    res.json({
      message: "Notification marked as read",
    });
    return null;
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
    return null;
  }
};