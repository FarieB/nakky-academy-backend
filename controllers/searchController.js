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
      maxSalary
    } = req.query;

    const filter = { role: "employee" };

    if (workerType) filter.workerType = workerType;
    if (province) filter.province = province;
    if (city) filter.city = city;
    if (minExperience || maxExperience) {
      filter.yearsExperience = {};
      if (minExperience) filter.yearsExperience.$gte = Number(minExperience);
      if (maxExperience) filter.yearsExperience.$lte = Number(maxExperience);
    }

    if (skills) {
      // comma-separated skills
      const skillsArray = skills.split(",").map(s => s.trim());
      filter.skills = { $all: skillsArray };
    }

    if (minRating) filter.averageRating = { $gte: Number(minRating) };
    if (availabilityStatus) filter.availabilityStatus = availabilityStatus;
    if (workPreference) filter.workPreference = workPreference;
    if (verifiedBadge) filter.verifiedBadge = verifiedBadge === "true";
    if (minSalary || maxSalary) {
      filter.expectedSalary = {};
      if (minSalary) filter.expectedSalary.$gte = Number(minSalary);
      if (maxSalary) filter.expectedSalary.$lte = Number(maxSalary);
    }

    const workers = await User.find(filter)
      .select("-password")
      .sort({ averageRating: -1 });

    res.json(workers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};