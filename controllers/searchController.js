const User = require("../models/user");


// ==============================
// Advanced Worker Search (Optimized)
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
      sortBy = "rating" // rating | experience | salary
    } = req.query;

    const filter = { role: "employee" };

    // ==============================
    // Filters
    // ==============================
    const simpleFilterMap = {
      workerType: "workerType",
      province: "province",
      city: "city",
      availabilityStatus: "availabilityStatus",
      workPreference: "workPreference"
    };
    Object.keys(simpleFilterMap).forEach(key => {
      if (req.query[key]) {
        filter[simpleFilterMap[key]] = req.query[key];
      }
    });
    if (verifiedBadge !== undefined) {
      filter.verifiedBadge = verifiedBadge === "true";
    }
    if (skills) {
      filter.skills = { $all: skills.split(",") };
    }
    if (minExperience || maxExperience) {
      filter.experience = {};
      if (minExperience) filter.experience.$gte = Number(minExperience);
      if (maxExperience) filter.experience.$lte = Number(maxExperience);
    }
    if (minSalary || maxSalary) {
      filter.salary = {};
      if (minSalary) filter.salary.$gte = Number(minSalary);
      if (maxSalary) filter.salary.$lte = Number(maxSalary);
    }
    if (minRating) {
      filter.rating = { $gte: Number(minRating) };
    }

    if (workerType) filter.workerType = workerType;

    if (province) {
      filter.province = { $regex: province, $options: "i" };
    }

    if (city) {
      filter.city = { $regex: city, $options: "i" };
    }

    if (minExperience || maxExperience) {
      filter.yearsExperience = {};
      if (minExperience) filter.yearsExperience.$gte = Number(minExperience);
      if (maxExperience) filter.yearsExperience.$lte = Number(maxExperience);
    }

    if (skills) {
      const skillsArray = skills.split(",").map(s => s.trim());
      filter.skills = { $in: skillsArray }; // match ANY skill
    }

    if (minRating) {
      filter.averageRating = { $gte: Number(minRating) };
    }

    if (availabilityStatus) filter.availabilityStatus = availabilityStatus;

    if (workPreference) filter.workPreference = workPreference;

    if (verifiedBadge) {
      filter.verifiedBadge = verifiedBadge === "true";
    }

    if (minSalary || maxSalary) {
      filter.expectedSalary = {};
      if (minSalary) filter.expectedSalary.$gte = Number(minSalary);
      if (maxSalary) filter.expectedSalary.$lte = Number(maxSalary);
    }

    // ==============================
    // Sorting
    // ==============================
    let sort = {};

    if (sortBy === "rating") sort = { averageRating: -1 };
    if (sortBy === "experience") sort = { yearsExperience: -1 };
    if (sortBy === "salary") sort = { expectedSalary: 1 };

    // ==============================
    // Pagination
    // ==============================
    const skip = (Number(page) - 1) * Number(limit);

    const workers = await User.find(filter)
      .select("-password")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.json({
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      totalResults: total,
      results: workers
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};