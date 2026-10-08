const CandidateProfile = require(
    "../models/CandidateProfile"
);

exports.searchCandidates = async (req, res) => {

    const startTime = Date.now();

    try {

        // =====================================================
        // INPUT
        // =====================================================

        const {
            workerType,
            workerTypes,
            province,
            gender,
            language,
            languages,
            employment,
            workPreference,
            workPreferences,
            availabilityStatus,
            minimumExperience,
            verified,
            page = 1,
            limit = 20,
        } = {
            ...req.body,
            ...req.query,
        };

        // =====================================================
        // PAGINATION
        // =====================================================

        const currentPage =
            Math.max(
                parseInt(page, 10) || 1,
                1
            );

        const requestedLimit =
            parseInt(limit, 10) || 20;

        const pageLimit =
            Math.min(
                Math.max(
                    requestedLimit,
                    1
                ),
                50
            );

        const skip =
            (currentPage - 1) *
            pageLimit;

        // =====================================================
        // BASE QUERY
        // =====================================================

        const query = {
            profileActive: true,
            profileCompleted: true,
        };

        // =====================================================
        // WORKER TYPE
        // =====================================================

        let selectedWorkerTypes =
            workerTypes ||
            (workerType
                ? [workerType]
                : []);

        if (
            typeof selectedWorkerTypes ===
            "string"
        ) {
            selectedWorkerTypes =
                selectedWorkerTypes
                    .split(",")
                    .map(
                        (value) =>
                            value.trim()
                    )
                    .filter(Boolean);
        }

        if (
            selectedWorkerTypes.length > 0
        ) {

            query.workerTypes = {
                $in: selectedWorkerTypes,
            };

        }

        // =====================================================
        // PROVINCE
        // =====================================================

        if (province) {
            query.province = province;
        }

        // =====================================================
        // GENDER
        // =====================================================

        if (gender) {
            query.gender = gender;
        }

        // =====================================================
        // LANGUAGES
        // =====================================================

        let selectedLanguages =
            languages ||
            (language
                ? [language]
                : []);

        if (
            typeof selectedLanguages ===
            "string"
        ) {

            selectedLanguages =
                selectedLanguages
                    .split(",")
                    .map(
                        (value) =>
                            value.trim()
                    )
                    .filter(Boolean);

        }

        if (
            selectedLanguages.length > 0
        ) {

            query.languages = {
                $in: selectedLanguages,
            };

        }

        // =====================================================
        // WORK PREFERENCES
        // =====================================================

        let selectedWorkPreferences =
            workPreferences ||
            (workPreference
                ? [workPreference]
                : []);

        if (
            typeof selectedWorkPreferences ===
            "string"
        ) {

            selectedWorkPreferences =
                selectedWorkPreferences
                    .split(",")
                    .map(
                        (value) =>
                            value.trim()
                    )
                    .filter(Boolean);

        }

        if (
            selectedWorkPreferences.length >
            0
        ) {

            query.workPreferences = {
                $in:
                    selectedWorkPreferences,
            };

        }

        // =====================================================
        // EMPLOYMENT
        // =====================================================

        if (employment) {

            query.workPreferences = {
                $in: [employment],
            };

        }

        // =====================================================
        // AVAILABILITY
        // =====================================================

        if (availabilityStatus) {

            query.availabilityStatus =
                availabilityStatus;

        }

        // =====================================================
        // EXPERIENCE
        // =====================================================

        if (
            minimumExperience !==
                undefined &&
            minimumExperience !== ""
        ) {

            const experience =
                Number(
                    minimumExperience
                );

            if (
                Number.isFinite(
                    experience
                )
            ) {

                query.yearsExperience = {
                    $gte: experience,
                };

            }

        }

        // =====================================================
        // VERIFIED
        // =====================================================

        if (
            verified === true ||
            verified === "true"
        ) {

            query.profileVerified =
                true;

        }

        // =====================================================
        // DATABASE
        // =====================================================

        const [
            candidates,
            total,
        ] = await Promise.all([

            CandidateProfile
                .find(query)
                .select(
                    [
                        "firstName",
                        "workerTypes",
                        "province",
                        "city",
                        "suburb",
                        "yearsExperience",
                        "languages",
                        "expectedSalary",
                        "availabilityStatus",
                        "profileVerified",
                        "profilePhoto",
                        "averageRating",
                        "totalReviews",
                    ].join(" ")
                )
                .sort({
                    profileVerified: -1,
                    averageRating: -1,
                    createdAt: -1,
                })
                .skip(skip)
                .limit(pageLimit)
                .lean(),

            CandidateProfile.countDocuments(
                query
            ),
        ]);

        // =====================================================
        // RESPONSE
        // =====================================================

        const totalPages =
            Math.ceil(
                total / pageLimit
            );

        res.json({
            candidates,

            pagination: {
                page: currentPage,
                limit: pageLimit,
                total,
                totalPages,
                hasNextPage:
                    currentPage <
                    totalPages,
                hasPreviousPage:
                    currentPage > 1,
            },
        });

        console.log(
            `[SEARCH] ${Date.now() - startTime}ms | ${total} matches | page ${currentPage}`
        );

    } catch (err) {

        console.error(
            "SEARCH CANDIDATES ERROR:",
            err
        );

        res.status(500).json({
            message:
                "Unable to search candidates.",
        });

    }

};