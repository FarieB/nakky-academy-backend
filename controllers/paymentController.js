const User = require("../models/user");
const Enrollment = require("../models/Enrollment");

// ======================================
// EMPLOYER: Monthly Subscription Payment
// ======================================
exports.payEmployerSubscription = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "employer") {
      return res.status(403).json({ message: "Only employers can pay subscription" });
    }

    // Simulate successful payment (PayFast integration later)
    user.subscriptionActive = true;
    user.subscriptionDate = new Date();

    await user.save();

    res.json({
      message: "Employer subscription payment successful ✅",
      subscriptionActive: true
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ======================================
// EMPLOYEE: Verification Payment (One-Time)
// ======================================
exports.payEmployeeFee = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "employee") {
      return res.status(403).json({ message: "Only employees can pay verification fee" });
    }

    // Simulate successful payment
    user.verificationPaid = true;

    await user.save();

    res.json({
      message: "Employee verification fee paid successfully ✅",
      verificationPaid: true
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ======================================
// STUDENT: Pay For Course
// ======================================
exports.payForCourse = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.enrollmentId);

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    // Ensure logged-in user is the student who enrolled
    if (enrollment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Simulate successful payment
    enrollment.paymentStatus = "paid";
    enrollment.paymentDate = new Date(); // optional but recommended

    await enrollment.save();

    res.json({
      message: "Course payment successful ✅",
      paymentStatus: "paid"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
