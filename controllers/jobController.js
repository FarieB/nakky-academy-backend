const JobPost = require("../models/JobPost");
const EmployeeProfile = require("../models/EmployeeProfile");

exports.createJob = async (req, res) => {
  try {
    const job = await JobPost.create({
      ...req.body,
      employer: req.user._id
    });

    res.status(201).json(job);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMatchedCandidates = async (req, res) => {
  try {
    const job = await JobPost.findById(req.params.id);

    const candidates = await EmployeeProfile.find({
      "location.province": job.location.province,
      yearsExperience: { $gte: job.requiredExperience },
      skills: { $in: job.requiredSkills },
      age: { 
        $gte: job.ageRange.min,
        $lte: job.ageRange.max
      }
    }).populate("user", "name email isVerified");

    res.json(candidates);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
