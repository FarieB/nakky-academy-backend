const User = require("../models/user");

// ==============================
// Upload Employee Documents
// ==============================
const uploadDocuments = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "employee") {
      return res.status(403).json({
        message: "Only employees can upload documents"
      });
    }

    if (!user.hasPaidVerificationFee) {
      return res.status(403).json({
        message: "Please pay the R100 verification fee first"
      });
    }

    const {
      idDocument,
      policeClearance,
      references,
      qualifications
    } = req.body;

    if (!idDocument || !references || !qualifications) {
      return res.status(400).json({
        message: "Required: ID document, references, qualifications"
      });
    }

    user.uploadedDocuments = {
      idDocument,
      policeClearance: policeClearance || null,
      references,
      qualifications
    };

    user.verificationStatus = "pending";
    user.isVerified = false;
    user.verifiedBadge = false;

    await user.save();

    res.json({
      message: "Documents uploaded. Awaiting admin verification."
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ==============================
// Admin Verify Employee
// ==============================
const verifyEmployee = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required"
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (user.role !== "employee") {
      return res.status(400).json({
        message: "Not an employee"
      });
    }

    if (!user.uploadedDocuments?.idDocument) {
      return res.status(400).json({
        message: "Documents not uploaded"
      });
    }

    user.isVerified = true;
    user.verificationStatus = "verified";
    user.verifiedBadge = true;

    await user.save();

    res.json({
      message: "Employee verified successfully ✅"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ==============================
// Create / Update Profile
// ==============================
const createOrUpdateProfile = async (req, res) => {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Employees only"
      });
    }

    if (!req.user.isVerified) {
      return res.status(403).json({
        message: "You must be verified first"
      });
    }

    const allowedFields = [
      "workerType",
      "skills",
      "yearsExperience",
      "expectedSalary",
      "province",
      "city",
      "availabilityStatus",
      "workPreference",
      "bio"
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    res.json(updatedUser);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  uploadDocuments,
  verifyEmployee,
  createOrUpdateProfile
};