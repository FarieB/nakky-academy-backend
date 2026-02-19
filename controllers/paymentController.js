const User = require("../models/user");

// Employer monthly subscription payment
exports.payEmployerSubscription = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "employer") {
      return res.status(403).json({ message: "Only employers can pay subscription" });
    }

    // Simulate successful payment (we will integrate PayFast later)
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


// Employee verification payment (one-time fee)
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
