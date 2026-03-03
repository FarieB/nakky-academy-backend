const User = require("../models/user");
const EmployeeProfile = require("../models/EmployeeProfile");


// ==============================
// Upload employee documents
// ==============================
exports.uploadDocuments = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "employee") {
      return res.status(403).json({ message: "Only employees can upload documents" });
    }

    // Optional: Ensure employee paid verification fee
    if (!user.hasPaidVerificationFee) {
      return res.status(403).json({
        message: "Please pay the R100 verification fee before uploading documents"
      });
    }

    const { idDocument, references, qualifications } = req.body;

    if (!idDocument || !references || !qualifications) {
      return res.status(400).json({
        message: "ID document, references and qualifications are required"
      });
    }

    user.uploadedDocuments = {
      idDocument,
      references,
      qualifications
    };

    user.isVerified = false; // Reset until admin approves

    await user.save();

    res.json({
      message: "Documents uploaded successfully. Awaiting admin verification."
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ==============================
// Admin verifies employee
// ==============================
exports.verifyEmployee = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "employee") {
      return res.status(400).json({ message: "Not an employee account" });
    }

    // Must have uploaded documents
    if (!user.uploadedDocuments?.idDocument) {
      return res.status(400).json({
        message: "Employee has not uploaded required documents"
      });
    }

    user.isVerified = true;
    await user.save();

    res.json({
      message: "Employee verified successfully ✅"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ==============================
// Create or Update Professional Profile
// ==============================
exports.createOrUpdateProfile = async (req, res) => {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({ message: "Employees only" });
    }

    if (!req.user.isVerified) {
      return res.status(403).json({
        message: "Profile must be verified before creating professional profile"
      });
    }

    const profile = await EmployeeProfile.findOneAndUpdate(
      { user: req.user._id },
      { ...req.body, user: req.user._id },
      { new: true, upsert: true }
    );

    res.json(profile);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
