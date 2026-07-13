const User = require("../models/user");


// ==============================
// Update Worker Profile (EMPLOYEE ONLY)
// ==============================
exports.updateWorkerProfile = async (req, res) => {
  try {
    // Only employees can update worker profiles
    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Only employees can update worker profiles"
      });
    }

    // Only allow safe fields to be updated
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

    return res.json(updatedUser);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// ==============================
// View Worker Profile
// ==============================
// Search Workers (Filters)
// ==============================
exports.searchWorkers = (req, res) => {
  try {
    const {
      workerType,
      province,
      minRating,
      availabilityStatus,
      workPreference,
      minExperience,
      maxExperience,
      keyword
    } = req.query;

    const filter = { role: "employee" };

    // Basic filters mapping
    const basicFilters = { workerType, province, availabilityStatus, workPreference };
    Object.entries(basicFilters).forEach(([key, value]) => {
      if (value) filter[key] = value;
    });

const getWorkers = async (req, res) => {
  try {
    // Rating filter
    if (minRating) {
      filter.averageRating = { $gte: Number(minRating) };
    }

    // Experience filter
    if (minExperience || maxExperience) {
      filter.experience = {
        ...(minExperience && { $gte: Number(minExperience) }),
        ...(maxExperience && { $lte: Number(maxExperience) })
      };
    }

    // Keyword filter
    if (keyword) {
      filter.$text = { $search: keyword };
    }

    const workers = await User.find(filter).select("-password");
    return res.json(workers);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};