const CandidateProfile = require("../models/CandidateProfile");

exports.searchCandidates = async (req, res) => {
    try {

        // Support both GET query parameters and POST body
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
            verified
        } = {
            ...req.body,
            ...req.query
        };

        let query = {
            profileActive: true,
            profileCompleted: true
        };

        // =====================================
        // PROFESSION
        // =====================================

        const selectedWorkerTypes =
            workerTypes ||
            (workerType ? [workerType] : []);

        if (selectedWorkerTypes.length > 0) {
            query.workerTypes = {
                $in: selectedWorkerTypes
            };
        }

        // =====================================
        // PROVINCE
        // =====================================

        if (province) {
            query.province = province;
        }

        // =====================================
        // GENDER
        // =====================================

        if (gender) {
            query.gender = gender;
        }

        // =====================================
        // LANGUAGES
        // =====================================

        const selectedLanguages =
            languages ||
            (language ? [language] : []);

        if (selectedLanguages.length > 0) {
            query.languages = {
                $in: selectedLanguages
            };
        }

        // =====================================
        // WORK PREFERENCE
        // =====================================

        const selectedWorkPreferences =
            workPreferences ||
            (workPreference ? [workPreference] : []);

        if (selectedWorkPreferences.length > 0) {
            query.workPreferences = {
                $in: selectedWorkPreferences
            };
        }

        // =====================================
        // EMPLOYMENT
        // =====================================

        if (employment) {
            query.workPreferences = {
                $in: [employment]
            };
        }

        // =====================================
        // AVAILABILITY
        // =====================================

        if (availabilityStatus) {
            query.availabilityStatus = availabilityStatus;
        }

        // =====================================
        // EXPERIENCE
        // =====================================

        if (
            minimumExperience !== undefined &&
            minimumExperience !== ""
        ) {
            query.yearsExperience = {
                $gte: Number(minimumExperience)
            };
        }

        // =====================================
        // VERIFIED
        // =====================================

        if (
            verified === true ||
            verified === "true"
        ) {
            query.profileVerified = true;
        }

        // =====================================
        // SEARCH
        // =====================================

        const candidates = await CandidateProfile.find(query)
            .select(
                "firstName workerTypes province city suburb yearsExperience languages expectedSalary availabilityStatus profileVerified profilePhoto averageRating totalReviews"
            )
            .sort({
                profileVerified: -1,
                averageRating: -1,
                createdAt: -1
            });

        // =====================================
        // SECURITY
        // =====================================
        // Do NOT return:
        // surname
        // email
        // phone
        // ID documents
        // CV
        // private references
        // other sensitive information

        res.json(candidates);

    } catch (err) {

        console.log(
            "SEARCH CANDIDATES ERROR:",
            err
        );

        res.status(500).json({
            message: err.message
        });

    }
};