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
exports.getWorkerProfile = async (req, res) => {
  try {
    const worker = await User.findOne({
      _id: { $eq: req.params.id },
      role: "employee"
    }).select("-password");

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found"
      });
    }

    return res.json(worker);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// ==============================
// Search Workers (Filters)
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
      keyword
    } = req.query;

    const filter = {
      role: "employee"
    };

    // Basic filters mapping
    const directFilters = {
      workerType,
      province,
      availabilityStatus,
      workPreference
    };
    Object.entries(directFilters).forEach(([key, value]) => {
      if (value) filter[key] = value;
    });

    // Rating filter
    if (minRating) {
      filter.averageRating = { $gte: Number(minRating) };
    }

    // Experience filter
    if (minExperience || maxExperience) {
      filter.experience = {};
      if (minExperience) filter.experience.$gte = Number(minExperience);
      if (maxExperience) filter.experience.$lte = Number(maxExperience);
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
    }

    // Experience filter
    if (minExperience || maxExperience) {
      filter.yearsExperience = {};

      if (minExperience) {
        filter.yearsExperience.$gte = Number(minExperience);
      }

      if (maxExperience) {
        filter.yearsExperience.$lte = Number(maxExperience);
      }
    }

    // Keyword search (name or skills)
    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { skills: { $in: [new RegExp(keyword, "i")] } }
      ];
    }

    const workers = await User.find(filter)
      .select("-password")
      .sort({ averageRating: -1, yearsExperience: -1 });

    return res.json(workers);

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};