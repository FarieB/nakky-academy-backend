const CandidateProfile =
    require("../models/CandidateProfile");

const EmployerProfile =
    require("../models/EmployerProfile");

const Course =
    require("../models/Course");

const Enrollment =
    require("../models/Enrollment");


// =====================================================
// HELPER FUNCTIONS
// =====================================================

const normalise = (value) => {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase();

};


const arrayNormalise = (value) => {

    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(Boolean)
        .map(item =>
            normalise(item)
        );

};


const hasOverlap = (
    first,
    second
) => {

    const firstArray =
        arrayNormalise(first);

    const secondArray =
        arrayNormalise(second);

    return firstArray.some(
        item =>
            secondArray.includes(item)
    );

};


// =====================================================
// STUDENT → COURSE RECOMMENDATIONS
// Existing functionality
// =====================================================

exports.recommendCourses =
    async (req, res) => {

        try {

            const enrollments =
                await Enrollment.find({
                    student:
                        req.user._id,
                });

            const enrolledCourseIds =
                enrollments.map(
                    enrollment =>
                        enrollment.course
                );

            const courses =
                await Course.find({
                    _id: {
                        $nin:
                            enrolledCourseIds,
                    },
                });

            const ranked =
                courses.map(
                    course => {

                        let score = 0;

                        const title =
                            (
                                course.title ||
                                ""
                            ).toLowerCase();

                        if (
                            title.includes("care")
                        ) {
                            score += 20;
                        }

                        if (
                            title.includes("child")
                        ) {
                            score += 15;
                        }

                        if (
                            title.includes("elder")
                        ) {
                            score += 15;
                        }

                        if (
                            title.includes("first aid")
                        ) {
                            score += 10;
                        }

                        return {
                            course,
                            score
                        };

                    }
                );

            ranked.sort(
                (a, b) =>
                    b.score - a.score
            );

            return res.json(
                ranked.slice(0, 5)
            );

        } catch (error) {

            console.error(
                "RECOMMEND COURSES ERROR:",
                error
            );

            return res.status(500).json({
                message:
                    error.message
            });

        }

    };


// =====================================================
// EMPLOYER → CANDIDATE MATCHING
// =====================================================

exports.recommendCandidates =
    async (req, res) => {

        try {

            if (
                req.user.role !==
                "employer"
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Only employers can access candidate recommendations."
                });

            }


            // ==========================================
            // LOAD EMPLOYER PROFILE
            // ==========================================

            const employer =
                await EmployerProfile.findOne({
                    user:
                        req.user._id
                }).lean();

            if (!employer) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Employer profile not found."
                });

            }

            if (
                !employer.profileActive
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Your employer profile is inactive."
                });

            }


            // ==========================================
            // QUERY FILTERS
            // ==========================================

            const {
                workType,
                province,
                city,
                language,
                availability,
                minExperience,
                maxSalary,
                page = 1,
                limit = 20
            } = req.query;


            // ==========================================
            // BUILD CANDIDATE QUERY
            // ==========================================

            const filter = {

                profileActive:
                    true,

                profileCompleted:
                    true

            };


            if (workType) {

                filter.workerTypes =
                    workType;

            }


            if (province) {

                filter.province =
                    new RegExp(
                        `^${String(
                            province
                        ).replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                        )}$`,
                        "i"
                    );

            }


            if (city) {

                filter.city =
                    new RegExp(
                        `^${String(
                            city
                        ).replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                        )}$`,
                        "i"
                    );

            }


            if (language) {

                filter.languages =
                    language;

            }


            if (availability) {

                filter.availabilityStatus =
                    availability;

            }


            if (
                minExperience !==
                undefined
            ) {

                filter.yearsExperience = {
                    $gte:
                        Number(
                            minExperience
                        ) || 0
                };

            }


            if (
                maxSalary !==
                undefined
            ) {

                filter.expectedSalary = {
                    $lte:
                        Number(
                            maxSalary
                        )
                };

            }


            // ==========================================
            // LOAD CANDIDATES
            // ==========================================

            const candidates =
                await CandidateProfile.find(
                    filter
                )
                .populate({
                    path: "user",
                    select:
                        "name profilePhoto verifiedBadge isVerified"
                })
                .lean();


            // ==========================================
            // SCORE CANDIDATES
            // ==========================================

            const ranked =
                candidates.map(
                    candidate => {

                        let score = 0;

                        const reasons = [];


                        // ==================================
                        // WORK TYPE — 30 POINTS
                        // ==================================

                        const workTypeMatch =
                            hasOverlap(
                                candidate.workerTypes,
                                employer.lookingFor
                            );

                        if (
                            workTypeMatch
                        ) {

                            score += 30;

                            reasons.push(
                                "Candidate's work type matches what you are looking for."
                            );

                        }


                        // ==================================
                        // PROVINCE — 15 POINTS
                        // ==================================

                        if (
                            normalise(
                                candidate.province
                            ) ===
                            normalise(
                                employer.province
                            )
                        ) {

                            score += 15;

                            reasons.push(
                                "Candidate is in your province."
                            );

                        }


                        // ==================================
                        // CITY — 15 POINTS
                        // ==================================

                        if (
                            normalise(
                                candidate.city
                            ) ===
                            normalise(
                                employer.city
                            )
                        ) {

                            score += 15;

                            reasons.push(
                                "Candidate is in your city."
                            );

                        }


                        // ==================================
                        // LANGUAGE — 10 POINTS
                        // ==================================

                        const languageMatch =
                            hasOverlap(
                                candidate.languages,
                                employer.preferredLanguages
                            );

                        if (
                            languageMatch
                        ) {

                            score += 10;

                            reasons.push(
                                "Candidate speaks a preferred language."
                            );

                        }


                        // ==================================
                        // EXPERIENCE — 10 POINTS
                        // ==================================

                        const candidateExperience =
                            Number(
                                candidate.yearsExperience
                            ) || 0;

                        const requiredExperience =
                            Number(
                                employer.preferredExperience
                            ) || 0;

                        if (
                            candidateExperience >=
                            requiredExperience
                        ) {

                            score += 10;

                            reasons.push(
                                "Candidate meets your experience requirement."
                            );

                        }


                        // ==================================
                        // EMPLOYMENT PREFERENCE — 5 POINTS
                        // ==================================

                        const employmentMatch =
                            hasOverlap(
                                candidate.workPreferences,
                                employer.employmentTypes
                            );

                        if (
                            employmentMatch
                        ) {

                            score += 5;

                            reasons.push(
                                "Candidate's work preferences match your requirements."
                            );

                        }


                        // ==================================
                        // GENDER — 5 POINTS
                        // ==================================

                        const genderPreference =
                            normalise(
                                employer.preferredGender
                            );

                        const candidateGender =
                            normalise(
                                candidate.gender
                            );

                        if (
                            genderPreference ===
                            "any"
                        ) {

                            score += 5;

                            reasons.push(
                                "Candidate meets your gender preference."
                            );

                        } else if (
                            genderPreference &&
                            genderPreference ===
                            candidateGender
                        ) {

                            score += 5;

                            reasons.push(
                                "Candidate matches your gender preference."
                            );

                        }


                        // ==================================
                        // SALARY — 5 POINTS
                        // ==================================

                        const candidateSalary =
                            Number(
                                candidate.expectedSalary
                            ) || 0;

                        const employerSalary =
                            Number(
                                employer.salaryOffered
                            ) || 0;

                        if (
                            employerSalary <= 0
                        ) {

                            score += 5;

                            reasons.push(
                                "Salary compatibility cannot restrict this match."
                            );

                        } else if (
                            candidateSalary <= 0
                        ) {

                            score += 5;

                            reasons.push(
                                "Candidate has not specified a salary expectation."
                            );

                        } else if (
                            candidateSalary <=
                            employerSalary
                        ) {

                            score += 5;

                            reasons.push(
                                "Candidate's salary expectation is within your offered salary."
                            );

                        }


                        // ==================================
                        // AVAILABILITY BONUS
                        // ==================================

                        if (
                            candidate.availabilityStatus ===
                            "Available Immediately"
                        ) {

                            score += 5;

                            reasons.push(
                                "Candidate is available immediately."
                            );

                        }


                        return {

                            candidate,

                            matchScore:
                                score,

                            matchPercentage:
                                Math.min(
                                    score,
                                    100
                                ),

                            matchReasons:
                                reasons

                        };

                    }
                );


            // ==========================================
            // SORT BEST MATCH FIRST
            // ==========================================

            ranked.sort(
                (a, b) =>
                    b.matchScore -
                    a.matchScore
            );


            // ==========================================
            // PAGINATION
            // ==========================================

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

            const total =
                ranked.length;

            const start =
                (
                    pageNumber - 1
                ) *
                pageLimit;

            const results =
                ranked.slice(
                    start,
                    start +
                    pageLimit
                );


            return res.json({

                success: true,

                candidates:
                    results,

                pagination: {

                    page:
                        pageNumber,

                    limit:
                        pageLimit,

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
                "RECOMMEND CANDIDATES ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Failed to calculate candidate matches."
            });

        }

    };


// =====================================================
// CANDIDATE → EMPLOYER MATCHING
// =====================================================

exports.recommendEmployers =
    async (req, res) => {

        try {

            if (
                req.user.role !==
                "candidate"
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Only candidates can access employer recommendations."
                });

            }


            // ==========================================
            // LOAD CANDIDATE PROFILE
            // ==========================================

            const candidate =
                await CandidateProfile.findOne({
                    user:
                        req.user._id
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


            // ==========================================
            // FILTERS
            // ==========================================

            const {
                workType,
                province,
                city,
                language,
                employmentType,
                page = 1,
                limit = 20
            } = req.query;


            const filter = {
                profileActive:
                    true,
                hiringStatus:
                    "Looking"
            };


            if (workType) {

                filter.lookingFor =
                    workType;

            }


            if (province) {

                filter.province =
                    new RegExp(
                        `^${String(
                            province
                        ).replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                        )}$`,
                        "i"
                    );

            }


            if (city) {

                filter.city =
                    new RegExp(
                        `^${String(
                            city
                        ).replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                        )}$`,
                        "i"
                    );

            }


            if (language) {

                filter.preferredLanguages =
                    language;

            }


            if (employmentType) {

                filter.employmentTypes =
                    employmentType;

            }


            // ==========================================
            // LOAD EMPLOYERS
            // ==========================================

            const employers =
                await EmployerProfile.find(
                    filter
                )
                .populate({
                    path: "user",
                    select:
                        "name profilePhoto verifiedBadge isVerified"
                })
                .lean();


            // ==========================================
            // SCORE EMPLOYERS
            // ==========================================

            const ranked =
                employers.map(
                    employer => {

                        let score = 0;

                        const reasons = [];


                        // ==================================
                        // WORK TYPE — 30 POINTS
                        // ==================================

                        if (
                            hasOverlap(
                                candidate.workerTypes,
                                employer.lookingFor
                            )
                        ) {

                            score += 30;

                            reasons.push(
                                "Employer is looking for your type of work."
                            );

                        }


                        // ==================================
                        // PROVINCE — 15 POINTS
                        // ==================================

                        if (
                            normalise(
                                candidate.province
                            ) ===
                            normalise(
                                employer.province
                            )
                        ) {

                            score += 15;

                            reasons.push(
                                "Employer is in your province."
                            );

                        }


                        // ==================================
                        // CITY — 15 POINTS
                        // ==================================

                        if (
                            normalise(
                                candidate.city
                            ) ===
                            normalise(
                                employer.city
                            )
                        ) {

                            score += 15;

                            reasons.push(
                                "Employer is in your city."
                            );

                        }


                        // ==================================
                        // LANGUAGE — 10 POINTS
                        // ==================================

                        if (
                            hasOverlap(
                                candidate.languages,
                                employer.preferredLanguages
                            )
                        ) {

                            score += 10;

                            reasons.push(
                                "Your language skills match the employer's preferences."
                            );

                        }


                        // ==================================
                        // EXPERIENCE — 10 POINTS
                        // ==================================

                        const experience =
                            Number(
                                candidate.yearsExperience
                            ) || 0;

                        const required =
                            Number(
                                employer.preferredExperience
                            ) || 0;

                        if (
                            experience >=
                            required
                        ) {

                            score += 10;

                            reasons.push(
                                "Your experience meets the employer's requirement."
                            );

                        }


                        // ==================================
                        // EMPLOYMENT TYPE — 10 POINTS
                        // ==================================

                        if (
                            hasOverlap(
                                candidate.workPreferences,
                                employer.employmentTypes
                            )
                        ) {

                            score += 10;

                            reasons.push(
                                "Your work preferences match the employer."
                            );

                        }


                        // ==================================
                        // SALARY — 5 POINTS
                        // ==================================

                        const expected =
                            Number(
                                candidate.expectedSalary
                            ) || 0;

                        const offered =
                            Number(
                                employer.salaryOffered
                            ) || 0;

                        if (
                            offered <= 0
                        ) {

                            score += 5;

                            reasons.push(
                                "Employer has not specified a salary restriction."
                            );

                        } else if (
                            expected <= 0
                        ) {

                            score += 5;

                            reasons.push(
                                "You have not specified a salary expectation."
                            );

                        } else if (
                            offered >=
                            expected
                        ) {

                            score += 5;

                            reasons.push(
                                "Employer's offered salary meets your expectation."
                            );

                        }


                        return {

                            employer,

                            matchScore:
                                score,

                            matchPercentage:
                                Math.min(
                                    score,
                                    100
                                ),

                            matchReasons:
                                reasons

                        };

                    }
                );


            ranked.sort(
                (a, b) =>
                    b.matchScore -
                    a.matchScore
            );


            // ==========================================
            // PAGINATION
            // ==========================================

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

            const total =
                ranked.length;

            const start =
                (
                    pageNumber - 1
                ) *
                pageLimit;

            const results =
                ranked.slice(
                    start,
                    start +
                    pageLimit
                );


            return res.json({

                success: true,

                employers:
                    results,

                pagination: {

                    page:
                        pageNumber,

                    limit:
                        pageLimit,

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
                "RECOMMEND EMPLOYERS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Failed to calculate employer matches."
            });

        }

    };
