const User = require("../models/user");
const Review = require("../models/Review");
const Hire = require("../models/Hire");

// =================================
// Employer leaves review
// =================================
exports.leaveReview = async (req, res) => {
  try {
    const { employeeId, rating, comment, jobId } = req.body;

    if (req.user.role !== "employer") {
      return res.status(403).json({
        message: "Only employers can leave reviews",
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    const employee = await User.findById(employeeId);

    if (!employee || employee.role !== "employee") {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // Ensure employer actually hired this employee
    const hire = await Hire.findOne({
      employer: req.user._id,
      candidate: employeeId,
      job: jobId,
    });

    if (!hire) {
      return res.status(403).json({
        message: "You can only review hired employees",
      });
    }

    // Prevent duplicate reviews
    const existingReview = await Review.findOne({
      employer: req.user._id,
      employee: employeeId,
      job: jobId,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this employee for this job",
      });
    }

    const review = await Review.create({
      employer: req.user._id,
      employee: employeeId,
      job: jobId,
      rating,
      comment,
    });

    // Recalculate average rating
    const reviews = await Review.find({
      employee: employeeId,
    });

    const averageRating =
      reviews.reduce((sum, review) => sum + review.rating, 0) /
      reviews.length;

    await User.findByIdAndUpdate(employeeId, {
      averageRating: Number(averageRating.toFixed(1)),
      totalReviews: reviews.length,
    });

    return res.status(201).json({
      message: "Review submitted successfully ⭐",
      review,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// =================================
// Get Employee Reviews
// =================================
exports.getEmployeeReviews = async (req, res) => {
  try {
    const employee = await User.findById(req.params.employeeId);

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    const reviews = await Review.find({
      employee: req.params.employeeId,
    })
      .populate("employer", "name")
      .sort({ createdAt: -1 });

    return res.json({
      averageRating: employee.averageRating,
      totalReviews: employee.totalReviews,
      reviews,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};