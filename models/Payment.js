const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
{
    // ============================================
    // User Making Payment
    // ============================================

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // ============================================
    // What is being paid for?
    // ============================================

    type: {
        type: String,
        enum: [
            "subscription",
            "course",
            "verification"
        ],
        required: true
    },

    // Links to Subscription / Course / Verification

    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    // ============================================
    // Amount
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
    // Payment Status
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
    // Payment Gateway
    // ============================================

    gateway: {
        type: String,
        default: "PayFast"
    },

    paymentMethod: {
        type: String,
        enum: [
            "payfast",
            "eft",
            "voucher"
        ],
        default: "payfast"
    },

    // ============================================
    // PayFast Details
    // ============================================

    merchantPaymentId: {
        type: String
    },

    gatewayReference: {
        // pf_payment_id
        type: String
    },

    paymentStatus: {
        type: String
    },

    paymentDate: Date,

    // ============================================
    // Audit Trail
    // Store the full ITN payload
    // ============================================

    itnPayload: {
        type: mongoose.Schema.Types.Mixed
    },

    // ============================================
    // Future Refund Support
    // ============================================

    refundedAt: Date,

    refundReason: String

},
{
    timestamps: true
});

module.exports = mongoose.model("Payment", PaymentSchema);