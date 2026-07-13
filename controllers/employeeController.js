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

    const docRequirements = {
      idDocument: "ID document is required",
      policeClearance: "Police clearance is required",
      references: "References are required",
      qualifications: "Qualifications are required"
    };

    const missing = Object.keys(docRequirements).find(key => !req.body[key]);
    if (missing) {
      return res.status(400).json({ message: docRequirements[missing] });
    }

    // continue with document upload logic...
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadDocuments };

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
    const errorResponses = {
      notAdmin: { status: 403, message: "Admin access required" },
      userNotFound: { status: 404, message: "User not found" },
      notEmployee: { status: 400, message: "Not an employee" },
      documentsNotUploaded: { status: 400, message: "Documents not uploaded" }
    };

    const preChecks = {
      notAdmin: () => req.user.role === "admin"
    };

    for (const [key, check] of Object.entries(preChecks)) {
      if (!check()) {
        const err = errorResponses[key];
        return res.status(err.status).json({ message: err.message });
      }
    }

    const user = await User.findById(req.params.id);

    const postChecks = {
      userNotFound: () => user,
      notEmployee: () => user.role === "employee",
      documentsNotUploaded: () => user.uploadedDocuments?.idDocument
    };

    for (const [key, check] of Object.entries(postChecks)) {
      if (!check()) {
        const err = errorResponses[key];
        return res.status(err.status).json({ message: err.message });
      }
    }
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