const mongoose = require("mongoose");

const SubscriptionPlanSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    description: {
        type: String
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

    features: [{
        type: String
    }],

    isActive: {
        type: Boolean,
        default: true
    }

},
{
    timestamps: true
});

module.exports = mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);