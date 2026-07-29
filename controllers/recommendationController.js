const Candidate = require("../models/candidateProfile");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");

// =================================
// Recommend Courses
// =================================
exports.recommendCourses = async (req, res) => {
    try {

        const enrollments = await Enrollment.find({
            student: req.user._id,
        });

        const enrolledCourseIds = enrollments.map(
            (enrollment) => enrollment.course
        );

        const courses = await Course.find({
            _id: {
                $nin: enrolledCourseIds,
            },
        });

        const ranked = courses.map((course) => {

            let score = 0;

            const title = course.title.toLowerCase();

            if (title.includes("care")) score += 20;
            if (title.includes("child")) score += 15;
            if (title.includes("elder")) score += 15;
            if (title.includes("first aid")) score += 10;

            return {
                course,
                score,
            };

        });

        ranked.sort((a, b) => b.score - a.score);

        return res.json(ranked.slice(0, 5));

    } catch (error) {

        return res.status(500).json({
            message: error.message,
        });

    }
};


// =================================
// Recommend Candidates
// =================================
exports.recommendCandidates = async (req, res) => {

    try {

        if (req.user.role !== "employer") {
            return res.status(403).json({
                message: "Only employers can access candidate recommendations.",
            });
        }

        const { workType, province } = req.query;

        const filter = {};

        if (province) {
            filter.province = province;
        }

        // workTypes is now an array
        if (workType) {
            filter.workTypes = workType;
        }

        const candidates = await Candidate.find(filter)
            .populate("user", "name email profilePhoto verifiedBadge");

        return res.json(candidates);

    } catch (error) {

        return res.status(500).json({
            message: error.message,
        });

    }

};