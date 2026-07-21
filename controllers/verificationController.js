const Verification = require("../models/Verification");
const User = require("../models/user");

// ==============================
// EMPLOYEE: Submit verification
// ==============================
exports.submitVerification = async (req, res) => {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Only employees can request verification",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Must pay verification fee first
    if (!user.hasPaidVerificationFee) {
      return res.status(403).json({
        message: "Please pay verification fee first",
      });
    }

    // Prevent duplicate submissions
    const existing = await Verification.findOne({
      user: req.user._id,
    });

    if (existing) {
      return res.status(400).json({
        message: "Verification already submitted",
      });
    }

    // ID document is required
    if (!req.files || !req.files.idDocument) {
      return res.status(400).json({
        message: "ID document is required",
      });
    }

    const idDocument = req.files.idDocument[0].filename;

    const policeClearance =
      req.files.policeClearance && req.files.policeClearance.length > 0
        ? req.files.policeClearance[0].filename
        : null;

    const verification = await Verification.create({
      user: req.user._id,
      idDocument,
      policeClearance,
      status: "pending",
    });

    user.verificationStatus = "pending";
    await user.save();

    return res.status(201).json({
      message: "Verification submitted successfully ✅",
      verification,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// ==============================
// ADMIN: Get all verifications
// ==============================
exports.getVerifications = async (req, res) => {
  try {
    const verifications = await Verification.find()
      .populate("user", "name email workerType verificationStatus")
      .sort({ createdAt: -1 });

    return res.json(verifications);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// ==============================
// ADMIN: Approve verification
// ==============================
exports.approveVerification = async (req, res) => {
  try {
    const verification = await Verification.findById(req.params.id);

    if (!verification) {
      return res.status(404).json({
        message: "Verification not found",
      });
    }

    if (verification.status === "approved") {
      return res.status(400).json({
        message: "Already approved",
      });
    }

    verification.status = "approved";
    await verification.save();

    await User.findByIdAndUpdate(verification.user, {
      verificationStatus: "verified",
      verifiedBadge: true,
    });

    return res.json({
      message: "Candidate verified successfully ✅",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// ==============================
// ADMIN: Reject verification
// ==============================
exports.rejectVerification = async (req, res) => {
  try {
    const verification = await Verification.findById(req.params.id);

    if (!verification) {
      return res.status(404).json({
        message: "Verification not found",
      });
    }

    if (verification.status === "rejected") {
      return res.status(400).json({
        message: "Already rejected",
      });
    }

    verification.status = "rejected";
    await verification.save();

    await User.findByIdAndUpdate(verification.user, {
      verificationStatus: "rejected",
      verifiedBadge: false,
    });

    return res.json({
      message: "Verification rejected ❌",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};