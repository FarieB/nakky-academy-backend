const mongoose = require("mongoose");

const SubscriptionPlanSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    durationDays: {
        type: Number,
        required: true
    },

    jobPostLimit: {
        type: Number,
        default: 10
    },

    features: [String]
},
{ timestamps: true }
);

module.exports = mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);