const mongoose = require("mongoose");

const EnrollmentSchema = new mongoose.Schema(
{
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },

    // ==========================
    // PAYMENT INFORMATION
    // ==========================

    paymentStatus: {
        type: String,
        enum: [
            "pending",
            "paid",
            "failed",
            "cancelled"
        ],
        default: "pending"
    },

    paymentReference: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment"
    },

    paymentDate: Date,

    coursePrice: {
        type: Number,
        default: 0
    },

    // ==========================
    // LEARNING PROGRESS
    // ==========================

    lessonsCompleted: [
        {
            lessonId: {
                type: mongoose.Schema.Types.ObjectId
            },

            completedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],

    progress: {
        type: Number,
        default: 0
    },

    lastAccessed: Date,

    // ==========================
    // COURSE COMPLETION
    // ==========================

    completed: {
        type: Boolean,
        default: false
    },

    completedAt: Date,

    // ==========================
    // CERTIFICATE
    // ==========================

    certificateIssued: {
        type: Boolean,
        default: false
    },

    certificateNumber: String

},
{
    timestamps: true
});

module.exports = mongoose.model(
    "Enrollment",
    EnrollmentSchema
);