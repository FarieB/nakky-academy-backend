const User = require("../models/user");

// ==============================
// Upload Employee Documents
// ==============================
const uploadDocuments = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const checks = [
      {
        condition: user => !user,
        status: 404,
        message: "User not found"
      },
      {
        condition: user => user.role !== "employee",
        status: 403,
        message: "Only employees can upload documents"
      },
      {
        condition: user => !user.hasPaidVerificationFee,
        status: 403,
        message: "Please pay the R100 verification fee first"
      }
    ];

    for (const { condition, status, message } of checks) {
      if (condition(user)) {
        return res.status(status).json({ message });
      }
    }

    const {
      idDocument,
      policeClearance,
      references,
      qualifications
    } = req.body;
    return null;
    return null;

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
      return res.status(403).json({ message: "Admin access required" });
    }

    const user = await User.findById(req.params.id);

    const validations = [
      {
        isValid: () => user,
        code: 404,
        message: "User not found"
      },
      {
        isValid: () => user.role === "employee",
        code: 400,
        message: "Not an employee"
      },
      {
        isValid: () => user.uploadedDocuments?.idDocument,
        code: 400,
        message: "Documents not uploaded"
      },
      {
        isValid: () => user.uploadedDocuments?.policeClearance,
        code: 400,
        message: "Police clearance not uploaded"
      },
      {
        isValid: () => user.uploadedDocuments?.references,
        code: 400,
        message: "References not uploaded"
    router.post('/verify', async (req, res) => {
      try {
        const validations = [
          {
            isValid: () => user.uploadedDocuments?.qualifications,
            code: 400,
            message: "Qualifications not uploaded"
          }
        ];

        for (const { isValid, code, message } of validations) {
          if (!isValid()) {
            return res.status(code).json({ message });
          }
        }

        user.verificationStatus = "verified";
        user.isVerified = true;
        user.verifiedBadge = true;

        await user.save();

        res.json({ message: "Employee verified successfully." });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    user.isVerified = true;
    user.verificationStatus = "verified";
    user.verifiedBadge = true;

    await user.save();

    res.json({
      message: "Employee verified successfully ✅"
    });
    return null;

  } catch (err) {
    res.status(500).json({ error: err.message });
    return null;
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
    return null;

  } catch (err) {
    res.status(500).json({ error: err.message });
    return null;
  }
};


module.exports = {
  uploadDocuments,
  verifyEmployee,
  createOrUpdateProfile
};