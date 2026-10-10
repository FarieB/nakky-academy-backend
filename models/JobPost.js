const mongoose = require("mongoose");

const JobPostSchema = new mongoose.Schema(
    {
        // =====================================================
        // EMPLOYER
        // =====================================================

        employer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        employerProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployerProfile",
            required: true
        },

        // =====================================================
        // JOB INFORMATION
        // =====================================================

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        jobTypes: [{
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

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000
        },

        responsibilities: [{
            type: String,
            trim: true
        }],

        requirements: [{
            type: String,
            trim: true
        }],

        skills: [{
            type: String,
            trim: true
        }],

        // =====================================================
        // LOCATION
        // =====================================================

        province: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        city: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        suburb: {
            type: String,
            trim: true,
            default: ""
        },

        // =====================================================
        // EMPLOYMENT
        // =====================================================

        employmentType: {
            type: String,
            enum: [
                "Full Time",
                "Part Time",
                "Temporary"
            ],
            required: true
        },

        workArrangement: {
            type: String,
            enum: [
                "Live In",
                "Live Out",
                "Flexible"
            ],
            default: "Flexible"
        },

        workingDays: [{
            type: String,
            enum: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday"
            ]
        }],

        startTime: {
            type: String,
            default: ""
        },

        endTime: {
            type: String,
            default: ""
        },

        // =====================================================
        // REMUNERATION
        // =====================================================

        salaryType: {
            type: String,
            enum: [
                "Monthly",
                "Weekly",
                "Daily",
                "Hourly",
                "Negotiable"
            ],
            default: "Monthly"
        },

        salaryAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        salaryMin: {
            type: Number,
            default: 0,
            min: 0
        },

        salaryMax: {
            type: Number,
            default: 0,
            min: 0
        },

        salaryNegotiable: {
            type: Boolean,
            default: false
        },

        // =====================================================
        // CANDIDATE REQUIREMENTS
        // =====================================================

        requiredLanguages: [{
            type: String,
            trim: true
        }],

        requiredExperience: {
            type: Number,
            default: 0,
            min: 0
        },

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
            default: 18,
            min: 18
        },

        preferredAgeMax: {
            type: Number,
            default: 65,
            max: 100
        },

        // =====================================================
        // CHILDCARE DETAILS
        // =====================================================

        numberOfChildren: {
            type: Number,
            default: 0,
            min: 0
        },

        childrenDetails: {
            type: String,
            default: "",
            maxlength: 3000
        },

        // =====================================================
        // CAREGIVING DETAILS
        // =====================================================

        careType: {
            type: String,
            enum: [
                "None",
                "Baby Care",
                "Child Care",
                "Elderly Care",
                "Disability Care",
                "Post Surgery Care",
                "Palliative Care",
                "Hospice Care",
                "General Care",
                "Other"
            ],
            default: "None"
        },

        patientAge: {
            type: Number,
            default: null
        },

        patientCondition: {
            type: String,
            default: "",
            maxlength: 2000
        },

        patientMobility: {
            type: String,
            enum: [
                "",
                "Independent",
                "Needs Assistance",
                "Wheelchair",
                "Bedridden"
            ],
            default: ""
        },

        careRequirements: {
            type: String,
            default: "",
            maxlength: 3000
        },

        // =====================================================
        // BENEFITS
        // =====================================================

        accommodationProvided: {
            type: Boolean,
            default: false
        },

        foodProvided: {
            type: Boolean,
            default: false
        },

        // =====================================================
        // JOB STATUS
        // =====================================================

        status: {
            type: String,
            enum: [
                "draft",
                "active",
                "paused",
                "filled",
                "closed",
                "expired"
            ],
            default: "draft",
            index: true
        },

        isActive: {
            type: Boolean,
            default: false,
            index: true
        },

        allowInterviewRequests: {
            type: Boolean,
            default: true
        },

        // =====================================================
        // EXPIRY
        // =====================================================

        expiresAt: {
            type: Date,
            default: null,
            index: true
        }
    },
    {
        timestamps: true
    }
);


// =====================================================
// SEARCH INDEXES
// =====================================================

JobPostSchema.index({
    isActive: 1,
    status: 1,
    createdAt: -1
});

JobPostSchema.index({
    isActive: 1,
    jobTypes: 1,
    province: 1,
    city: 1
});

JobPostSchema.index({
    isActive: 1,
    employmentType: 1,
    workArrangement: 1
});

JobPostSchema.index({
    isActive: 1,
    requiredLanguages: 1
});

JobPostSchema.index({
    isActive: 1,
    salaryType: 1,
    salaryAmount: 1
});

JobPostSchema.index({
    employer: 1,
    status: 1,
    createdAt: -1
});




module.exports =
    mongoose.models.JobPost ||
    mongoose.model(
        "JobPost",
        JobPostSchema
    );