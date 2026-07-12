const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({

    employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubscriptionPlan",
        required: true
    },

    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment"
    },

    amount: {
        type: Number,
        required: true
    },

    startDate: {
        type: Date
    },

    endDate: {
        type: Date
    },

    status: {
        type: String,
        enum: [
            "pending",
            "active",
            "expired",
            "cancelled"
        ],
        default: "pending"
    }

},
{
    timestamps: true
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);