const User = require("../models/user");

// ==============================
// Advanced Worker Search
// ==============================
exports.searchWorkersAdvanced = async (req, res) => {
  try {
    const {
      workerType,
      province,
      city,
      minExperience,
      maxExperience,
      skills,
      minRating,
      availabilityStatus,
      workPreference,
      verifiedBadge,
      minSalary,
      maxSalary,
      page = 1,
      limit = 10,
      sortBy = "rating",
    } = req.query;

    const filter = {
      role: "employee",
    };

    // ============================
    // Basic Filters
    // ============================
    if (workerType) filter.workerType = workerType;

    if (province) {
      filter.province = {
        $regex: province,
        $options: "i",
      };
    }

    if (city) {
      filter.city = {
        $regex: city,
        $options: "i",
      };
    }

    // ============================
    // Experience
    // ============================
    if (minExperience || maxExperience) {
      filter.yearsExperience = {};

      if (minExperience) {
        filter.yearsExperience.$gte = Number(minExperience);
      }

      if (maxExperience) {
        filter.yearsExperience.$lte = Number(maxExperience);
      }
    }

    // ============================
    // Skills
    // ============================
    if (skills) {
      const skillsArray = skills
        .split(",")
        .map((skill) => skill.trim());

      filter.skills = {
        $in: skillsArray,
      };
    }

    // ============================
    // Rating
    // ============================
    if (minRating) {
      filter.averageRating = {
        $gte: Number(minRating),
      };
    }

    // ============================
    // Availability
    // ============================
    if (availabilityStatus) {
      filter.availabilityStatus = availabilityStatus;
    }

    if (workPreference) {
      filter.workPreference = workPreference;
    }

    if (verifiedBadge !== undefined) {
      filter.verifiedBadge = verifiedBadge === "true";
    }

    // ============================
    // Salary
    // ============================
    if (minSalary || maxSalary) {
      filter.expectedSalary = {};

      if (minSalary) {
        filter.expectedSalary.$gte = Number(minSalary);
      }

      if (maxSalary) {
        filter.expectedSalary.$lte = Number(maxSalary);
      }
    }

    // ============================
    // Sorting
    // ============================
    let sort = {};

    switch (sortBy) {
      case "experience":
        sort = { yearsExperience: -1 };
        break;

      case "salary":
        sort = { expectedSalary: 1 };
        break;

      default:
        sort = { averageRating: -1 };
    }

    // ============================
    // Pagination
    // ============================
    const skip = (Number(page) - 1) * Number(limit);

    const workers = await User.find(filter)
      .select("-password")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    return res.json({
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalResults: total,
      results: workers,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};