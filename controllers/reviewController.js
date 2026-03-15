const Review = require("../models/Review");
const User = require("../models/user");


// =================================
// Employer leaves review
// =================================
exports.leaveReview = async (req, res) => {

  try {

    if (req.user.role !== "employer") {
      return res.status(403).json({
        message: "Only employers can leave reviews"
      });
    }

    const { employeeId, rating, comment, jobId } = req.body;

    const review = await Review.create({
      employer: req.user._id,
      employee: employeeId,
      job: jobId,
      rating,
      comment
    });

    // Update caregiver rating
    const reviews = await Review.find({ employee: employeeId });

    const avg =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await User.findByIdAndUpdate(employeeId, {
      averageRating: avg,
      totalReviews: reviews.length
    });

    res.json({
      message: "Review submitted successfully ⭐",
      review
    });

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};


// =================================
// Get caregiver reviews
// =================================
exports.getEmployeeReviews = async (req, res) => {

  try {

    const reviews = await Review.find({
      employee: req.params.employeeId
    })
      .populate("employer", "name")
      .sort({ createdAt: -1 });

    res.json(reviews);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};