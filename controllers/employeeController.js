const User = require("../models/user");

// Upload documents
exports.uploadDocuments = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "employee") return res.status(403).json({ message: "Not an employee" });

    const { idDocument, references, qualifications } = req.body;

    user.uploadedDocuments = { idDocument, references, qualifications };
    await user.save();

    res.json({ message: "Documents uploaded. Admin will verify your profile." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin verifies employee
exports.verifyEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isVerified = true;
    await user.save();

    res.json({ message: "Employee verified successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
