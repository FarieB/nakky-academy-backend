const User = require("../models/user");

// Upload employee documents
exports.uploadDocuments = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role !== "employee") {
      return res.status(403).json({ message: "Only employees can upload documents" });
    }

    const { idDocument, references, qualifications } = req.body;

    if (!idDocument || !references || !qualifications) {
      return res.status(400).json({
        message: "Please provide ID document, references and qualifications"
      });
    }

    user.uploadedDocuments = {
      idDocument,
      references,
      qualifications
    };

    user.isVerified = false; // Reset verification until admin approves

    await user.save();

    res.json({
      message: "Documents uploaded successfully. Awaiting admin verification."
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Admin verifies employee
exports.verifyEmployee = async (req, res) => {
  try {

    // 🔐 Only admin allowed
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role !== "employee") {
      return res.status(400).json({ message: "Not an employee account" });
    }

    user.isVerified = true;
    await user.save();

    res.json({ message: "Employee verified successfully ✅" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
