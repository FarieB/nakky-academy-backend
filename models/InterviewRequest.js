const mongoose = require("mongoose");

/**
 * ============================================================
 * INTERVIEW REQUEST MODEL
 * ============================================================
 *
 * Interviews are always between:
 *
 * Candidate <-> Employer
 *
 * Either party can initiate the request.
 *
 * The request can then be:
 *
 * pending
 * accepted
 * rejected
 * cancelled
 * completed
 *
 * Subscription is checked when an interview request is CREATED.
 *
 * Existing interview requests can still be viewed/responded to
 * if a subscription later expires.
 * ============================================================
 */

const InterviewRequestSchema = new mongoose.Schema(
    {
        // =====================================================
        // CANDIDATE
        // =====================================================

        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },


        // =====================================================
        // EMPLOYER
        // =====================================================

        employer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },


        // =====================================================
        // RELATED JOB
        // =====================================================

        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JobPost",
            default: null,
            index: true,
        },


        // =====================================================
        // WHO CREATED THE REQUEST?
        // =====================================================

        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },


        // =====================================================
        // STATUS
        // =====================================================

        status: {
            type: String,
            enum: [
                "pending",
                "accepted",
                "rejected",
                "cancelled",
                "completed",
            ],
            default: "pending",
            index: true,
        },


        // =====================================================
        // PROPOSED INTERVIEW DATE
        // =====================================================

        proposedDate: {
            type: Date,
            required: true,
        },


        // =====================================================
        // PROPOSED TIME
        // =====================================================

        proposedStartTime: {
            type: String,
            default: "",
        },

        proposedEndTime: {
            type: String,
            default: "",
        },


        // =====================================================
        // INTERVIEW TYPE
        // =====================================================

        meetingType: {
            type: String,
            enum: [
                "In Person",
                "Phone",
                "Video Call",
            ],
            default: "In Person",
        },


        // =====================================================
        // LOCATION
        // =====================================================

        location: {
            type: String,
            default: "",
            maxlength: 1000,
        },


        // =====================================================
        // MESSAGE FROM REQUESTER
        // =====================================================

        message: {
            type: String,
            default: "",
            maxlength: 3000,
        },


        // =====================================================
        // RESPONSE MESSAGE
        // =====================================================

        responseMessage: {
            type: String,
            default: "",
            maxlength: 3000,
        },


        // =====================================================
        // RESPONSE DATE
        // =====================================================

        respondedAt: {
            type: Date,
            default: null,
        },


        // =====================================================
        // COMPLETION
        // =====================================================

        completedAt: {
            type: Date,
            default: null,
        },

    },
    {
        timestamps: true,
    }
);


// ============================================================
// INDEXES
// ============================================================

InterviewRequestSchema.index({
    candidate: 1,
    status: 1,
    createdAt: -1,
});

InterviewRequestSchema.index({
    employer: 1,
    status: 1,
    createdAt: -1,
});

InterviewRequestSchema.index({
    job: 1,
    status: 1,
});

InterviewRequestSchema.index({
    candidate: 1,
    employer: 1,
    status: 1,
});


module.exports =
    mongoose.models.InterviewRequest ||
    mongoose.model(
        "InterviewRequest",
        InterviewRequestSchema
    );