const JobPost =
    require("../models/JobPost");

const User =
    require("../models/user");

const EmployerProfile =
    require("../models/EmployerProfile");

const CandidateProfile =
    require("../models/CandidateProfile");


// =====================================================
// HELPERS
// =====================================================

const escapeRegex = (value) => {

    return String(value)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

};


const normaliseArray = (value) => {

    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value;
    }

    return [value];

};


// =====================================================
// CREATE JOB
// =====================================================

exports.createJob = async (
    req,
    res
) => {

    try {

        if (
            req.user.role !== "employer"
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Only employers can create jobs."
            });

        }

        const employerProfile =
            await EmployerProfile.findOne({
                user: req.user._id
            });

        if (!employerProfile) {

            return res.status(404).json({
                success: false,
                message:
                    "Please create your employer profile first."
            });

        }

        if (
            !employerProfile.profileActive
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Your employer profile is inactive."
            });

        }

        const {
            title,
            jobTypes,
            description,
            responsibilities,
            requirements,
            skills,
            province,
            city,
            suburb,
            employmentType,
            workArrangement,
            workingDays,
            startTime,
            endTime,
            salaryType,
            salaryAmount,
            salaryMin,
            salaryMax,
            salaryNegotiable,
            requiredLanguages,
            requiredExperience,
            preferredGender,
            preferredAgeMin,
            preferredAgeMax,
            numberOfChildren,
            childrenDetails,
            careType,
            patientAge,
            patientCondition,
            patientMobility,
            careRequirements,
            accommodationProvided,
            foodProvided,
            allowInterviewRequests,
            expiresAt,
            status
        } = req.body;


        if (!title) {

            return res.status(400).json({
                success: false,
                message:
                    "Job title is required."
            });

        }

        if (!description) {

            return res.status(400).json({
                success: false,
                message:
                    "Job description is required."
            });

        }

        if (!province) {

            return res.status(400).json({
                success: false,
                message:
                    "Province is required."
            });

        }

        if (!city) {

            return res.status(400).json({
                success: false,
                message:
                    "City is required."
            });

        }

        if (!employmentType) {

            return res.status(400).json({
                success: false,
                message:
                    "Employment type is required."
            });

        }

        const requestedStatus =
            status === "active"
                ? "active"
                : "draft";

        const job =
            await JobPost.create({

                employer:
                    req.user._id,

                employerProfile:
                    employerProfile._id,

                title,

                jobTypes:
                    normaliseArray(jobTypes),

                description,

                responsibilities:
                    normaliseArray(
                        responsibilities
                    ),

                requirements:
                    normaliseArray(
                        requirements
                    ),

                skills:
                    normaliseArray(skills),

                province,

                city,

                suburb:
                    suburb || "",

                employmentType,

                workArrangement:
                    workArrangement ||
                    "Flexible",

                workingDays:
                    normaliseArray(
                        workingDays
                    ),

                startTime:
                    startTime || "",

                endTime:
                    endTime || "",

                salaryType:
                    salaryType ||
                    "Monthly",

                salaryAmount:
                    Number(salaryAmount) || 0,

                salaryMin:
                    Number(salaryMin) || 0,

                salaryMax:
                    Number(salaryMax) || 0,

                salaryNegotiable:
                    Boolean(
                        salaryNegotiable
                    ),

                requiredLanguages:
                    normaliseArray(
                        requiredLanguages
                    ),

                requiredExperience:
                    Number(
                        requiredExperience
                    ) || 0,

                preferredGender:
                    preferredGender ||
                    "Any",

                preferredAgeMin:
                    Number(
                        preferredAgeMin
                    ) || 18,

                preferredAgeMax:
                    Number(
                        preferredAgeMax
                    ) || 65,

                numberOfChildren:
                    Number(
                        numberOfChildren
                    ) || 0,

                childrenDetails:
                    childrenDetails || "",

                careType:
                    careType || "None",

                patientAge:
                    patientAge
                        ? Number(patientAge)
                        : null,

                patientCondition:
                    patientCondition || "",

                patientMobility:
                    patientMobility || "",

                careRequirements:
                    careRequirements || "",

                accommodationProvided:
                    Boolean(
                        accommodationProvided
                    ),

                foodProvided:
                    Boolean(
                        foodProvided
                    ),

                status:
                    requestedStatus,

                isActive:
                    requestedStatus === "active",

                allowInterviewRequests:
                    allowInterviewRequests !== false,

                expiresAt:
                    expiresAt
                        ? new Date(expiresAt)
                        : null

            });


        return res.status(201).json({
            success: true,
            message:
                requestedStatus === "active"
                    ? "Job posted successfully."
                    : "Job saved as draft.",
            job
        });


    } catch (error) {

        console.error(
            "CREATE JOB ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to create job."
        });

    }

};


// =====================================================
// GET ALL ACTIVE JOBS
// =====================================================

exports.getAllJobs = async (
    req,
    res
) => {

    try {

        const {
            jobType,
            employmentType,
            province,
            city,
            suburb,
            language,
            workArrangement,
            salaryType,
            minSalary,
            maxSalary,
            workingDay,
            careType,
            keyword,
            page = 1,
            limit = 20
        } = req.query;


        const query = {
            isActive: true,
            status: "active"
        };


        // ==========================================
        // JOB TYPE
        // ==========================================

        if (jobType) {

            query.jobTypes = jobType;

        }


        // ==========================================
        // EMPLOYMENT TYPE
        // ==========================================

        if (employmentType) {

            query.employmentType =
                employmentType;

        }


        // ==========================================
        // PROVINCE
        // ==========================================

        if (province) {

            query.province = {
                $regex:
                    `^${escapeRegex(
                        province
                    )}$`,
                $options: "i"
            };

        }


        // ==========================================
        // CITY
        // ==========================================

        if (city) {

            query.city = {
                $regex:
                    `^${escapeRegex(
                        city
                    )}$`,
                $options: "i"
            };

        }


        // ==========================================
        // SUBURB
        // ==========================================

        if (suburb) {

            query.suburb = {
                $regex:
                    escapeRegex(suburb),
                $options: "i"
            };

        }


        // ==========================================
        // LANGUAGE
        // ==========================================

        if (language) {

            query.requiredLanguages = {
                $regex:
                    escapeRegex(language),
                $options: "i"
            };

        }


        // ==========================================
        // WORK ARRANGEMENT
        // ==========================================

        if (workArrangement) {

            query.workArrangement =
                workArrangement;

        }


        // ==========================================
        // SALARY TYPE
        // ==========================================

        if (salaryType) {

            query.salaryType =
                salaryType;

        }


        // ==========================================
        // WORKING DAY
        // ==========================================

        if (workingDay) {

            query.workingDays =
                workingDay;

        }


        // ==========================================
        // CARE TYPE
        // ==========================================

        if (careType) {

            query.careType =
                careType;

        }


        // ==========================================
        // SALARY
        // ==========================================

        if (
            minSalary ||
            maxSalary
        ) {

            query.salaryAmount = {};

            if (minSalary) {

                query.salaryAmount.$gte =
                    Number(minSalary);

            }

            if (maxSalary) {

                query.salaryAmount.$lte =
                    Number(maxSalary);

            }

        }


        // ==========================================
        // KEYWORD
        // ==========================================

        if (keyword) {

            const safeKeyword =
                escapeRegex(keyword);

            query.$or = [
                {
                    title: {
                        $regex:
                            safeKeyword,
                        $options: "i"
                    }
                },
                {
                    description: {
                        $regex:
                            safeKeyword,
                        $options: "i"
                    }
                },
                {
                    skills: {
                        $regex:
                            safeKeyword,
                        $options: "i"
                    }
                },
                {
                    requirements: {
                        $regex:
                            safeKeyword,
                        $options: "i"
                    }
                }
            ];

        }


        const pageNumber =
            Math.max(
                Number(page) || 1,
                1
            );

        const pageLimit =
            Math.min(
                Math.max(
                    Number(limit) || 20,
                    1
                ),
                100
            );

        const skip =
            (pageNumber - 1) *
            pageLimit;


        const [
            jobs,
            total
        ] = await Promise.all([

            JobPost.find(query)
                .populate({
                    path: "employerProfile",
                    select:
                        "contactPerson householdName employerType province city suburb"
                })
                .sort({
                    createdAt: -1
                })
                .skip(skip)
                .limit(pageLimit)
                .lean(),

            JobPost.countDocuments(
                query
            )

        ]);


        return res.json({

            success: true,

            jobs,

            pagination: {
                page: pageNumber,
                limit: pageLimit,
                total,
                pages:
                    Math.ceil(
                        total /
                        pageLimit
                    )
            }

        });


    } catch (error) {

        console.error(
            "GET JOBS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to retrieve jobs."
        });

    }

};


// =====================================================
// GET SINGLE JOB
// =====================================================

exports.getJobById = async (
    req,
    res
) => {

    try {

        const job =
            await JobPost.findById(
                req.params.id
            )
            .populate({
                path: "employerProfile",
                select:
                    "contactPerson householdName employerType province city suburb"
            })
            .lean();

        if (!job) {

            return res.status(404).json({
                success: false,
                message:
                    "Job not found."
            });

        }


        // Only active jobs are public
        // unless the employer owns it.

        const isOwner =
            String(job.employer) ===
            String(req.user._id);

        if (
            !isOwner &&
            (
                !job.isActive ||
                job.status !== "active"
            )
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "This job is not currently available."
            });

        }


        return res.json({
            success: true,
            job
        });


    } catch (error) {

        console.error(
            "GET JOB ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to retrieve job."
        });

    }

};


// =====================================================
// GET EMPLOYER'S JOBS
// =====================================================

exports.getMyJobs = async (
    req,
    res
) => {

    try {

        if (
            req.user.role !== "employer"
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Only employers can access their jobs."
            });

        }

        const jobs =
            await JobPost.find({
                employer:
                    req.user._id
            })
            .sort({
                createdAt: -1
            })
            .lean();


        return res.json({
            success: true,
            jobs
        });


    } catch (error) {

        console.error(
            "GET MY JOBS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to retrieve your jobs."
        });

    }

};


// =====================================================
// UPDATE JOB
// =====================================================

exports.updateJob = async (
    req,
    res
) => {

    try {

        const job =
            await JobPost.findById(
                req.params.id
            );

        if (!job) {

            return res.status(404).json({
                success: false,
                message:
                    "Job not found."
            });

        }

        if (
            String(job.employer) !==
            String(req.user._id)
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "You can only edit your own jobs."
            });

        }


        const allowedFields = [
            "title",
            "jobTypes",
            "description",
            "responsibilities",
            "requirements",
            "skills",
            "province",
            "city",
            "suburb",
            "employmentType",
            "workArrangement",
            "workingDays",
            "startTime",
            "endTime",
            "salaryType",
            "salaryAmount",
            "salaryMin",
            "salaryMax",
            "salaryNegotiable",
            "requiredLanguages",
            "requiredExperience",
            "preferredGender",
            "preferredAgeMin",
            "preferredAgeMax",
            "numberOfChildren",
            "childrenDetails",
            "careType",
            "patientAge",
            "patientCondition",
            "patientMobility",
            "careRequirements",
            "accommodationProvided",
            "foodProvided",
            "allowInterviewRequests",
            "expiresAt"
        ];


        for (
            const field of allowedFields
        ) {

            if (
                req.body[field] !== undefined
            ) {

                job[field] =
                    req.body[field];

            }

        }


        if (
            req.body.status !== undefined
        ) {

            const allowedStatuses = [
                "draft",
                "active",
                "paused",
                "filled",
                "closed",
                "expired"
            ];

            if (
                allowedStatuses.includes(
                    req.body.status
                )
            ) {

                job.status =
                    req.body.status;

                job.isActive =
                    req.body.status ===
                    "active";

            }

        }


        await job.save();


        return res.json({
            success: true,
            message:
                "Job updated successfully.",
            job
        });


    } catch (error) {

        console.error(
            "UPDATE JOB ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to update job."
        });

    }

};


// =====================================================
// DELETE / CLOSE JOB
// =====================================================

exports.deleteJob = async (
    req,
    res
) => {

    try {

        const job =
            await JobPost.findById(
                req.params.id
            );

        if (!job) {

            return res.status(404).json({
                success: false,
                message:
                    "Job not found."
            });

        }

        if (
            String(job.employer) !==
            String(req.user._id)
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "You can only close your own jobs."
            });

        }


        job.status = "closed";
        job.isActive = false;

        await job.save();


        return res.json({
            success: true,
            message:
                "Job closed successfully."
        });


    } catch (error) {

        console.error(
            "DELETE JOB ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to close job."
        });

    }

};


// =====================================================
// PAUSE JOB
// =====================================================

exports.pauseJob = async (
    req,
    res
) => {

    try {

        const job =
            await JobPost.findById(
                req.params.id
            );

        if (!job) {

            return res.status(404).json({
                success: false,
                message:
                    "Job not found."
            });

        }

        if (
            String(job.employer) !==
            String(req.user._id)
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "You can only pause your own jobs."
            });

        }


        job.status = "paused";
        job.isActive = false;

        await job.save();


        return res.json({
            success: true,
            message:
                "Job paused successfully.",
            job
        });


    } catch (error) {

        console.error(
            "PAUSE JOB ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to pause job."
        });

    }

};


// =====================================================
// REACTIVATE JOB
// =====================================================

exports.reactivateJob = async (
    req,
    res
) => {

    try {

        const job =
            await JobPost.findById(
                req.params.id
            );

        if (!job) {

            return res.status(404).json({
                success: false,
                message:
                    "Job not found."
            });

        }

        if (
            String(job.employer) !==
            String(req.user._id)
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "You can only reactivate your own jobs."
            });

        }


        if (
            job.expiresAt &&
            new Date(job.expiresAt) <=
            new Date()
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "This job has expired. Please update the expiry date before reactivating it."
            });

        }


        job.status = "active";
        job.isActive = true;

        await job.save();


        return res.json({
            success: true,
            message:
                "Job reactivated successfully.",
            job
        });


    } catch (error) {

        console.error(
            "REACTIVATE JOB ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to reactivate job."
        });

    }

};


// =====================================================
// MATCH JOBS TO CURRENT CANDIDATE
// =====================================================

exports.getJobMatches = async (
    req,
    res
) => {

    try {

        if (
            req.user.role !== "candidate"
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Only candidates can use candidate job matching."
            });

        }

        const candidate =
            await CandidateProfile.findOne({
                user: req.user._id
            }).lean();

        if (!candidate) {

            return res.status(404).json({
                success: false,
                message:
                    "Candidate profile not found."
            });

        }

        if (
            !candidate.profileActive
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Your candidate profile is inactive."
            });

        }


        const jobs =
            await JobPost.find({
                isActive: true,
                status: "active"
            })
            .populate({
                path: "employerProfile",
                select:
                    "contactPerson householdName employerType province city suburb"
            })
            .sort({
                createdAt: -1
            })
            .limit(100)
            .lean();


        const candidateWorkerTypes =
            candidate.workerTypes || [];

        const candidateLanguages =
            candidate.languages || [];

        const candidatePreferences =
            candidate.workPreferences || [];


        const matches =
            jobs.map(
                (job) => {

                    let score = 0;

                    const reasons = [];


                    // ==================================
                    // JOB TYPE — 30 POINTS
                    // ==================================

                    const jobTypeMatch =
                        (job.jobTypes || [])
                            .some(
                                type =>
                                    candidateWorkerTypes.includes(
                                        type
                                    )
                            );

                    if (jobTypeMatch) {

                        score += 30;

                        reasons.push(
                            "Your work type matches the job."
                        );

                    }


                    // ==================================
                    // PROVINCE — 15 POINTS
                    // ==================================

                    if (
                        candidate.province &&
                        job.province &&
                        candidate.province
                            .toLowerCase() ===
                        job.province
                            .toLowerCase()
                    ) {

                        score += 15;

                        reasons.push(
                            "The job is in your province."
                        );

                    }


                    // ==================================
                    // CITY — 15 POINTS
                    // ==================================

                    if (
                        candidate.city &&
                        job.city &&
                        candidate.city
                            .toLowerCase() ===
                        job.city
                            .toLowerCase()
                    ) {

                        score += 15;

                        reasons.push(
                            "The job is in your city."
                        );

                    }


                    // ==================================
                    // EMPLOYMENT TYPE — 10 POINTS
                    // ==================================

                    const employmentMatch =
                        candidatePreferences.includes(
                            job.employmentType
                        );

                    if (
                        employmentMatch
                    ) {

                        score += 10;

                        reasons.push(
                            "The employment type matches your preference."
                        );

                    }


                    // ==================================
                    // WORK ARRANGEMENT — 10 POINTS
                    // ==================================

                    const arrangementMatch =
                        candidatePreferences.includes(
                            job.workArrangement
                        );

                    if (
                        arrangementMatch
                    ) {

                        score += 10;

                        reasons.push(
                            "The work arrangement matches your preference."
                        );

                    }


                    // ==================================
                    // LANGUAGE — 10 POINTS
                    // ==================================

                    const languageMatch =
                        (job.requiredLanguages || [])
                            .some(
                                required =>
                                    candidateLanguages.some(
                                        language =>
                                            language
                                                .toLowerCase() ===
                                            required
                                                .toLowerCase()
                                    )
                            );

                    if (
                        languageMatch
                    ) {

                        score += 10;

                        reasons.push(
                            "You speak a required language."
                        );

                    }


                    // ==================================
                    // EXPERIENCE — 10 POINTS
                    // ==================================

                    if (
                        Number(
                            candidate.yearsExperience
                        ) >=
                        Number(
                            job.requiredExperience
                        )
                    ) {

                        score += 10;

                        reasons.push(
                            "Your experience meets the requirement."
                        );

                    }


                    return {
                        ...job,
                        matchScore: score,
                        matchReasons: reasons
                    };

                }
            )
            .filter(
                job =>
                    job.matchScore > 0
            )
            .sort(
                (a, b) =>
                    b.matchScore -
                    a.matchScore
            );


        return res.json({

            success: true,

            matches:

                matches.slice(
                    0,
                    50
                )

        });


    } catch (error) {

        console.error(
            "JOB MATCH ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to calculate job matches."
        });

    }

};


// =====================================================
// EXPIRE OLD JOBS
// =====================================================

exports.expireJobs = async (
    req,
    res
) => {

    try {

        if (
            req.user.role !== "admin"
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Admin access required."
            });

        }

        const result =
            await JobPost.updateMany(
                {
                    isActive: true,
                    expiresAt: {
                        $ne: null,
                        $lte: new Date()
                    }
                },
                {
                    $set: {
                        status: "expired",
                        isActive: false
                    }
                }
            );


        return res.json({
            success: true,
            message:
                "Expired jobs updated.",
            modified:
                result.modifiedCount
        });


    } catch (error) {

        console.error(
            "EXPIRE JOBS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to expire jobs."
        });

    }

};