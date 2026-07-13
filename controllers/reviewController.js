const User = require("../models/user");
const Review = require("../models/Review");
const Hire = require("../models/Hire");


// =================================
// Employer leaves review
// =================================
exports.leaveReview = async (req, res) => {
  try {
    const { employeeId, rating, comment, jobId } = req.body;
    const employee = await User.findById(employeeId);

    const validators = {
      role: {
        check: () => req.user.role === "employer",
        status: 403,
        message: "Only employers can leave reviews"
      },
      rating: {
        check: () => rating && rating >= 1 && rating <= 5,
        status: 400,
        message: "Rating must be between 1 and 5"
      },
      employee: {
        check: () => employee && employee.role === "employee",
        status: 404,
        message: "Employee not found"
      }
    };

    const error = Object.values(validators).find(v => !v.check());
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    // Optional: ensure employer actually hired this worker
    const hire = await Hire.findOne({
      employer: req.user._id,
      candidate: { $eq: employeeId },
      job: { $eq: jobId }
    });

    if (!hire) {
      return res.status(403).json({
        message: "You can only review hired employees"
      });
    }

    // Prevent duplicate review per job
    const existingReview = await Review.findOne({
      employer: req.user._id,
      employee: { $eq: employeeId },
      job: { $eq: jobId }
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this employee for this job"
      });
    }

    const review = await Review.create({
      employer: req.user._id,
      employee: employeeId,
      job: jobId,
      rating,
      comment
    });

    // Recalculate average rating
    const reviews = await Review.find({ employee: employeeId });

    const avg =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await User.findOneAndUpdate({ _id: { $eq: employeeId } }, {
      averageRating: Number(avg.toFixed(1)),
      totalReviews: reviews.length
    });

    res.status(201).json({
      message: "Review submitted successfully ⭐",
      review
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// =================================
// Get caregiver reviews
// =================================
exports.getEmployeeReviews = async (req, res) => {
  try {
    const employee = await User.findById(req.params.employeeId);

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found"
      });
    }

    const reviews = await Review.find({
      employee: req.params.employeeId
    })
      .populate("employer", "name")
      .sort({ createdAt: -1 });

    res.json({
      averageRating: employee.averageRating,
      totalReviews: employee.totalReviews,
      reviews
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};