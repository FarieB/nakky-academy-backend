const User = require("../models/user");
const Candidate = require("../models/candidateProfile");
const Course = require("../models/Course");
const Payment = require("../models/Payment");


// ==============================
// Platform Statistics
// ==============================
exports.getPlatformStats = async (req, res) => {
    try {

        const users = await User.countDocuments();
        const candidates = await Candidate.countDocuments();
        const courses = await Course.countDocuments();
        const payments = await Payment.countDocuments({
            status: "paid",
        });

        res.json({
            users,
            candidates,
            courses,
            payments,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// ==============================
// Get all users
// ==============================
exports.getUsers = async (req, res) => {
    try {

        const users = await User.find().select("-password");

        res.json(users);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// ==============================
// Get all candidates
// ==============================
exports.getCandidates = async (req, res) => {
    try {

        const candidates = await Candidate.find().populate("user");

        res.json(candidates);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// ==============================
// Get all courses
// ==============================
exports.getCourses = async (req, res) => {
    try {

        const courses = await Course.find();

        res.json(courses);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// ==============================
// Delete User
// ==============================
exports.deleteUser = async (req, res) => {
    try {

        await User.findByIdAndDelete(req.params.id);

        res.json({
            message: "User deleted successfully",
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// ==============================
// Delete Candidate
// ==============================
exports.deleteCandidate = async (req, res) => {
    try {

        await Candidate.findByIdAndDelete(req.params.id);

        res.json({
            message: "Candidate deleted successfully",
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// ==============================
// Delete Course
// ==============================
exports.deleteCourse = async (req, res) => {
    try {

        await Course.findByIdAndDelete(req.params.id);

        res.json({
            message: "Course deleted successfully",
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// ==============================
// Revenue Analytics
// ==============================
exports.getRevenue = async (req, res) => {

    try {

        const totalRevenue = await Payment.aggregate([
            {
                $match: {
                    status: "paid",
                },
            },
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: "$amount",
                    },
                },
            },
        ]);

        const payments = await Payment.find().populate("user");

        res.json({
            revenue: totalRevenue[0]?.total || 0,
            payments,
        });

    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};