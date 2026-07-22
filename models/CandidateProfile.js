const mongoose = require("mongoose");

const CandidateProfileSchema = new mongoose.Schema(
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
    // PERSONAL INFORMATION
    // ==========================================

    firstName: {
        type: String,
        required: true,
        trim: true
    },

    surname: {
        type: String,
        required: true,
        trim: true
    },

    profilePhoto: {
        type: String,
        required: true
    },

    gender: {
        type: String,
        enum: ["Male", "Female", "Other"]
    },

    dateOfBirth: Date,

    nationality: {
        type: String
    },

    languages: [{
        type: String
    }],

    // ==========================================
    // LOCATION
    // ==========================================

    province: String,

    city: String,

    suburb: String,

    // ==========================================
    // PROFESSIONAL PROFILE
    // ==========================================

    bio: {
        type: String,
        maxlength: 1000
    },

    workerTypes: [{
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

    yearsExperience: {
        type: Number,
        default: 0
    },

    expectedSalary: {
        type: Number,
        default: 0
    },

    skills: [{
        type: String
    }],

    // ==========================================
    // EMPLOYMENT PREFERENCES
    // ==========================================

    workPreferences: [{
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

    availabilityStatus: {
        type: String,
        enum: [
            "Available Immediately",
            "Available Next Week",
            "Available Next Month",
            "Not Available"
        ],
        default: "Available Immediately"
    },

    // ==========================================
    // QUALIFICATIONS
    // ==========================================

    qualifications: [{
        title: String,
        institution: String,
        yearCompleted: Number,
        certificateFile: String
    }],

    // ==========================================
    // REFERENCES
    // ==========================================

    references: [{
        name: String,
        relationship: String,
        phone: String
    }],

    // ==========================================
    // DOCUMENTS
    // ==========================================

    documents: {

        idDocument: String,

        policeClearance: String,

        cv: String

    },

    // ==========================================
    // NAKKY ACADEMY
    // ==========================================

    academyCertificates: [{
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course"
        },

        certificateNumber: String,

        issueDate: Date
    }],

    // ==========================================
    // REVIEWS
    // ==========================================

    averageRating: {
        type: Number,
        default: 0
    },

    totalReviews: {
        type: Number,
        default: 0
    },

    // ==========================================
    // PROFILE STATUS
    // ==========================================

    profileCompleted: {
        type: Boolean,
        default: false
    },

    profileActive: {
        type: Boolean,
        default: true
    },

    profileVerified: {
        type: Boolean,
        default: false
    }

},
{
    timestamps: true
});

module.exports =
    mongoose.models.CandidateProfile ||
    mongoose.model(
        "CandidateProfile",
        CandidateProfileSchema
    );
