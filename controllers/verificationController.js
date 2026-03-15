const Verification = require("../models/Verification");
const User = require("../models/user");


// ==============================
// Candidate: Submit verification
// ==============================
exports.submitVerification = async (req, res) => {

  try {

    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Only candidates can request verification"
      });
    }

    const existing = await Verification.findOne({
      user: req.user._id
    });

    if (existing) {
      return res.status(400).json({
        message: "Verification already submitted"
      });
    }

    const verification = await Verification.create({

      user: req.user._id,
      idDocument: req.files["idDocument"][0].filename,
      policeClearance: req.files["policeClearance"]
        ? req.files["policeClearance"][0].filename
        : null

    });

    await User.findByIdAndUpdate(req.user._id, {
      verificationStatus: "pending"
    });

    res.json({
      message: "Verification submitted successfully",
      verification
    });

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};



// ==============================
// Admin: View verification requests
// ==============================
exports.getVerifications = async (req, res) => {

  const verifications = await Verification
  .find()
  .populate("user");

  res.json(verifications);

};



// ==============================
// Admin: Approve verification
// ==============================
exports.approveVerification = async (req, res) => {

  try {

    const verification = await Verification.findById(req.params.id);

    if (!verification) {
      return res.status(404).json({ message: "Verification not found" });
    }

    verification.status = "approved";

    await verification.save();

    await User.findByIdAndUpdate(verification.user, {

      verificationStatus: "verified",
      verifiedBadge: true

    });

    res.json({
      message: "Candidate verified successfully"
    });

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};



// ==============================
// Admin: Reject verification
// ==============================
exports.rejectVerification = async (req, res) => {

  try {

    const verification = await Verification.findById(req.params.id);

    verification.status = "rejected";

    await verification.save();

    await User.findByIdAndUpdate(verification.user, {

      verificationStatus: "rejected",
      verifiedBadge: false

    });

    res.json({
      message: "Verification rejected"
    });

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};