const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
    {
        // ============================================
        // USER MAKING PAYMENT
        // ============================================

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },


        // ============================================
        // PAYMENT TYPE
        // ============================================

        type: {
            type: String,
            enum: [
                "subscription",
                "verification",
                "course"
            ],
            required: true
        },


        // ============================================
        // RELATED RECORD
        // ============================================

        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },


        // ============================================
        // PAYMENT AMOUNT
        // ============================================

        amount: {
            type: Number,
            required: true
        },

        currency: {
            type: String,
            default: "ZAR"
        },


        // ============================================
        // PAYMENT STATUS
        // ============================================

        status: {
            type: String,
            enum: [
                "pending",
                "paid",
                "failed",
                "cancelled",
                "refunded"
            ],
            default: "pending"
        },


        // ============================================
        // PAYMENT METHOD
        // ============================================

        paymentMethod: {
            type: String,
            enum: [
                "eft",
                "payfast",
                "voucher"
            ],
            default: "eft"
        },


        // ============================================
        // EFT PAYMENT REFERENCE
        // ============================================

        paymentReference: {
            type: String,
            required: true,
            unique: true
        },


        // ============================================
        // TRANSACTION REFERENCE
        // Optional bank transaction reference
        // ============================================

        transactionReference: {
            type: String,
            default: null
        },


        // ============================================
        // PAYMENT DATE
        // ============================================

        paymentDate: {
            type: Date,
            default: null
        },


        // ============================================
        // PROOF OF PAYMENT
        // ============================================

        proofOfPayment: {
            type: String,
            default: null
        },

        proofSubmittedAt: {
            type: Date,
            default: null
        },

        proofStatus: {
            type: String,
            enum: [
                "not_submitted",
                "submitted",
                "approved",
                "rejected"
            ],
            default: "not_submitted"
        },


        // ============================================
        // ADMIN PAYMENT CONFIRMATION
        // ============================================

        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        verifiedAt: {
            type: Date,
            default: null
        },


        // ============================================
        // ADMIN NOTES
        // ============================================

        adminNotes: {
            type: String,
            default: ""
        },


        // ============================================
        // FUTURE REFUND SUPPORT
        // ============================================

        refundedAt: Date,

        refundReason: String

    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.models.Payment ||
    mongoose.model("Payment", PaymentSchema);