const Candidate = require("../models/candidateProfile");

// =================================
// Advanced Candidate Search
// =================================
exports.searchCandidatesAdvanced = async (req, res) => {
  try {
    const {
      workType,
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
      profileActive: true,
    };

    // =================================
    // Work Types (Array)
    // =================================
    if (workType) {
      filter.workTypes = workType;
    }

    // =================================
    // Province
    // =================================
    if (province) {
      filter.province = {
        $regex: province,
        $options: "i",
      };
    }

    // =================================
    // City
    // =================================
    if (city) {
      filter.city = {
        $regex: city,
        $options: "i",
      };
    }

    // =================================
    // Experience
    // =================================
    if (minExperience || maxExperience) {
      filter.yearsExperience = {};

      if (minExperience) {
        filter.yearsExperience.$gte = Number(minExperience);
      }

      if (maxExperience) {
        filter.yearsExperience.$lte = Number(maxExperience);
      }
    }

    // =================================
    // Skills
    // =================================
    if (skills) {
      const skillArray = skills
        .split(",")
        .map((skill) => skill.trim());

      filter.skills = {
        $in: skillArray,
      };
    }

    // =================================
    // Rating
    // =================================
    if (minRating) {
      filter.averageRating = {
        $gte: Number(minRating),
      };
    }

    // =================================
    // Availability
    // =================================
    if (availabilityStatus) {
      filter.availabilityStatus = availabilityStatus;
    }

    if (workPreference) {
      filter.workPreferences = workPreference;
    }

    // =================================
    // Salary
    // =================================
    if (minSalary || maxSalary) {
      filter.expectedSalary = {};

      if (minSalary) {
        filter.expectedSalary.$gte = Number(minSalary);
      }

      if (maxSalary) {
        filter.expectedSalary.$lte = Number(maxSalary);
      }
    }

    // =================================
    // Sorting
    // =================================
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

    const skip = (Number(page) - 1) * Number(limit);

    let candidates = await Candidate.find(filter)
      .populate(
        "user",
        "name profilePhoto verifiedBadge"
      )
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    // Filter verified candidates if requested
    if (verifiedBadge === "true") {
      candidates = candidates.filter(
        (candidate) => candidate.user?.verifiedBadge
      );
    }

    const total = await Candidate.countDocuments(filter);

    return res.json({
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalResults: total,
      results: candidates,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};