const mongoose = require("mongoose");

const EmployerProfileSchema = new mongoose.Schema(
{
    // ==========================================
    // LINK TO USER ACCOUNT
    // ==========================================

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    // ==========================================
    // EMPLOYER DETAILS
    // ==========================================

    contactPerson: {
        type: String,
        required: true,
        trim: true
    },

    employerType: {
        type: String,
        enum: [
            "Private Household",
            "Business",
            "Agency",
            "Organisation"
        ],
        default: "Private Household"
    },

    householdName: {
        type: String,
        default: ""
    },

    // ==========================================
    // LOCATION
    // ==========================================

    province: {
        type: String,
        required: true
    },

    city: {
        type: String,
        required: true
    },

    suburb: {
        type: String,
        default: ""
    },

    // ==========================================
    // SEARCH PREFERENCES
    // ==========================================

    lookingFor: [{
        type: String,
        enum: [
            "Caregiver",
            "Nanny",
            "Babysitter",
            "Domestic Helper",
            "Gardener",
            "Housekeeper",
            "Cook",
            "Driver",
            "Au Pair",
            "Disability Care",
            "Elderly Care"
        ]
    }],

    employmentTypes: [{
        type: String,
        enum: [
            "Full Time",
            "Part Time",
            "Live In",
            "Live Out",
            "Day Shift",
            "Night Shift",
            "Weekends",
            "Temporary"
        ]
    }],

    preferredGender: {
        type: String,
        enum: [
            "Any",
            "Male",
            "Female"
        ],
        default: "Any"
    },

    preferredAgeMin: {
        type: Number,
        default: 18
    },

    preferredAgeMax: {
        type: Number,
        default: 65
    },

    preferredExperience: {
        type: Number,
        default: 0
    },

    preferredNationalities: [{
        type: String
    }],

    preferredLanguages: [{
        type: String
    }],

    salaryOffered: {
        type: Number,
        default: 0
    },

    // ==========================================
    // PROFILE STATUS
    // ==========================================

    profileActive: {
        type: Boolean,
        default: true
    },

    hiringStatus: {
        type: String,
        enum: [
            "Looking",
            "Hired",
            "Paused"
        ],
        default: "Looking"
    },

    // ==========================================
    // SAVED CANDIDATES
    // ==========================================

    savedCandidates: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "CandidateProfile"
    }]

},
{
    timestamps: true
}
);

module.exports =
    mongoose.models.EmployerProfile ||
    mongoose.model(
        "EmployerProfile",
        EmployerProfileSchema
    );