const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
{
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    type: {
        type: String,
        enum: ["course", "subscription", "verification"],
        required: true
    },

    referenceId: {
        type: mongoose.Schema.Types.ObjectId
    },

    amount: {
        type: Number,
        required: true
    },

    currency: {
        type: String,
        default: "ZAR"
    },

    status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending"
    },

    paymentMethod: {
        type: String,
        enum: ["card", "eft", "paypal"]
    }

},
{ timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);