const User = require("../models/user");
const Candidate = require("../models/candidateProfile");
const Review = require("../models/Review");

// =================================
// Employer leaves review
// =================================
exports.leaveReview = async (req, res) => {
    try {

        const {
            candidateId,
            rating,
            comment,
        } = req.body;

        if (req.user.role !== "employer") {
            return res.status(403).json({
                message: "Only employers can leave reviews.",
            });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                message: "Rating must be between 1 and 5.",
            });
        }

        const candidate = await Candidate.findById(candidateId);

        if (!candidate) {
            return res.status(404).json({
                message: "Candidate not found.",
            });
        }

        // Prevent duplicate reviews from the same employer
        const existingReview = await Review.findOne({
            employer: req.user._id,
            candidate: candidateId,
        });

        if (existingReview) {
            return res.status(400).json({
                message: "You have already reviewed this candidate.",
            });
        }

        const review = await Review.create({
            employer: req.user._id,
            candidate: candidateId,
            rating,
            comment,
        });

        // Recalculate rating
        const reviews = await Review.find({
            candidate: candidateId,
        });

        const averageRating =
            reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviews.length;

        await Candidate.findByIdAndUpdate(candidateId, {
            averageRating: Number(averageRating.toFixed(1)),
            totalReviews: reviews.length,
        });

        return res.status(201).json({
            message: "Review submitted successfully.",
            review,
        });

    } catch (error) {

        return res.status(500).json({
            message: error.message,
        });

    }
};


// =================================
// Get Candidate Reviews
// =================================
exports.getCandidateReviews = async (req, res) => {

    try {

        const candidate = await Candidate.findById(
            req.params.candidateId
        );

        if (!candidate) {
            return res.status(404).json({
                message: "Candidate not found.",
            });
        }

        const reviews = await Review.find({
            candidate: req.params.candidateId,
        })
            .populate("employer", "name")
            .sort({
                createdAt: -1,
            });

        return res.json({
            averageRating: candidate.averageRating || 0,
            totalReviews: candidate.totalReviews || 0,
            reviews,
        });

    } catch (error) {

        return res.status(500).json({
            message: error.message,
        });

    }

};