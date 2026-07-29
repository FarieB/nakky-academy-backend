const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
{
    // ==========================================
    // Recipient
    // ==========================================

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },

    // ==========================================
    // Notification Content
    // ==========================================

    title: {
        type: String,
        required: true,
        trim: true,
    },

    message: {
        type: String,
        required: true,
        trim: true,
    },

    // ==========================================
    // Notification Category
    // ==========================================

    type: {
        type: String,
        enum: [
            "message",
            "candidate_saved",
            "candidate_viewed",
            "verification",
            "subscription",
            "course",
            "certificate",
            "payment",
            "announcement",
            "system",
            "general",
        ],
        default: "general",
    },

    // ==========================================
    // Read Status
    // ==========================================

    isRead: {
        type: Boolean,
        default: false,
    },

    readAt: {
        type: Date,
    },

    // ==========================================
    // Who triggered it?
    // ==========================================

    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

    // ==========================================
    // Related Record
    // ==========================================

    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
    },

    referenceModel: {
        type: String,
        enum: [
            "User",
            "Course",
            "Enrollment",
            "Payment",
            "Conversation",
            "Message",
            "Subscription",
        ],
    },

    // ==========================================
    // App Navigation
    // ==========================================

    action: {
        type: String,
    },

    actionData: {
        type: mongoose.Schema.Types.Mixed,
    },

},
{
    timestamps: true,
});

module.exports =
    mongoose.models.Notification ||
    mongoose.model("Notification", NotificationSchema);