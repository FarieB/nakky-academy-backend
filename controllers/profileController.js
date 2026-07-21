const User = require("../models/user");

// ==============================
// Update Worker Profile (EMPLOYEE ONLY)
// ==============================
exports.updateWorkerProfile = async (req, res) => {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Only employees can update worker profiles",
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
      "bio",
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
    return res.status(500).json({
      message: error.message,
    });
  }
};

// ==============================
// Search Workers
// ==============================
exports.searchWorkers = async (req, res) => {
  try {
    const {
      workerType,
      province,
      minRating,
      availabilityStatus,
      workPreference,
      minExperience,
      maxExperience,
      keyword,
    } = req.query;

    const filter = {
      role: "employee",
    };

    if (workerType) filter.workerType = workerType;
    if (province) filter.province = province;
    if (availabilityStatus)
      filter.availabilityStatus = availabilityStatus;
    if (workPreference) filter.workPreference = workPreference;

    if (minRating) {
      filter.averageRating = {
        $gte: Number(minRating),
      };
    }

    if (minExperience || maxExperience) {
      filter.yearsExperience = {};

      if (minExperience) {
        filter.yearsExperience.$gte = Number(minExperience);
      }

      if (maxExperience) {
        filter.yearsExperience.$lte = Number(maxExperience);
      }
    }

    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { bio: { $regex: keyword, $options: "i" } },
        { skills: { $in: [new RegExp(keyword, "i")] } },
      ];
    }

    const workers = await User.find(filter).select("-password");

    return res.json(workers);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};