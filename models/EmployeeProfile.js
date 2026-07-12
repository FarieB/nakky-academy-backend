const mongoose = require("mongoose");

const EmployeeProfileSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    workerType: {
        type: String,
        enum: [
            "caregiver",
            "nanny",
            "helper",
            "babysitter",
            "gardener"
        ]
    },

    province: String,

    city: String,

    suburb: String,

    yearsExperience: {
        type: Number,
        default: 0
    },

    expectedSalary: Number,

    skills: [{
        type: String
    }],

    workPreference: {
        type: String,
        enum: [
            "full-time",
            "part-time",
            "live-in",
            "live-out"
        ]
    },

    availabilityStatus: {
        type: String,
        enum: [
            "available-now",
            "available-next-week",
            "available-next-month",
            "not-available"
        ],
        default: "available-now"
    },

    uploadedDocuments: {

        profilePhoto: String,

        idDocument: String,

        policeClearance: String,

        cv: String,

        qualifications: [String],

        references: [String]

    },

    averageRating: {
        type: Number,
        default: 0
    },

    totalReviews: {
        type: Number,
        default: 0
    },

    profileCompleted: {
        type: Boolean,
        default: false
    }

},
{
    timestamps: true
});

module.exports = mongoose.model("EmployeeProfile", EmployeeProfileSchema);
