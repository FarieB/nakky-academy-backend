const JobPost = require("../models/JobPost");
const EmployeeProfile = require("../models/EmployeeProfile");

// ==============================
// Employer creates a job
// ==============================
exports.createJob = async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({ message: "Only employers can create jobs" });
    }

    // Validation
    const { province, city, requiredExperience, jobType } = req.body;
    if (!province || !city || requiredExperience == null || !jobType) {
      return res.status(400).json({ message: "Province, city, experience, and jobType are required" });
    }

    const job = await JobPost.create({
      ...req.body,
      employer: req.user._id
    });

    res.status(201).json(job);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==============================
// Get matched employees for a job
// ==============================
exports.getMatchedCandidates = async (req, res) => {
  try {
    const job = await JobPost.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    // 🔥 Matching query
    const candidates = await EmployeeProfile.find({
      province: job.province,
      city: job.city,
      yearsExperience: { $gte: job.requiredExperience },
      skills: { $in: job.requiredSkills || [] },
      age: { 
        $gte: job.minAge || 18, 
        $lte: job.maxAge || 65
      }
    })
    .populate("user", "name email isVerified")
    .where("user.isVerified").equals(true); // Only verified employees

    res.json(candidates);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};