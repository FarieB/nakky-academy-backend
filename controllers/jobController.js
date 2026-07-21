const JobPost = require("../models/JobPost");
const JobInvitation = require("../models/JobInvitation");
const Message = require("../models/Message");
const Hire = require("../models/Hire");
const User = require("../models/user");

// ==============================
// Create Job
// ==============================
exports.createJob = async (req, res) => {
  try {
    const job = await JobPost.create({
      ...req.body,
      employer: req.user.id,
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// SMART MATCH ALGORITHM
// ==============================
exports.getMatchedCandidates = async (req, res) => {
  try {
    const job = await JobPost.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const candidates = await User.find({
      role: "employee",
      workerType: job.jobType,
    });

    const rankedCandidates = candidates.map((candidate) => {
      let score = 0;

      // Location
      if (candidate.province === job.province) score += 15;
      if (candidate.city === job.city) score += 10;

      // Experience
      if (candidate.yearsExperience >= job.requiredExperience) {
        score += 25;
      }

      // Skills
      if (
        candidate.skills &&
        job.requiredSkills &&
        job.requiredSkills.length > 0
      ) {
        const matchedSkills = candidate.skills.filter((skill) =>
          job.requiredSkills.includes(skill)
        );

        score +=
          (matchedSkills.length / job.requiredSkills.length) * 35;
      }

      // Age
      if (candidate.age >= job.minAge && candidate.age <= job.maxAge) {
        score += 15;
      }

      return {
        candidate,
        matchScore: Math.round(score),
      };
    });

    rankedCandidates.sort((a, b) => b.matchScore - a.matchScore);

    res.json(rankedCandidates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// Invite Candidate
// ==============================
exports.inviteCandidate = async (req, res) => {
  try {
    const invitation = await JobInvitation.create({
      employer: req.user.id,
      candidate: req.body.candidateId,
      job: req.params.jobId,
    });

    res.status(201).json({
      message: "Candidate invited successfully",
      invitation,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// Send Message
// ==============================
exports.sendMessage = async (req, res) => {
  try {
    const message = await Message.create({
      sender: req.user.id,
      receiver: req.body.receiverId,
      job: req.body.jobId,
      message: req.body.message,
    });

    res.status(201).json({
      message: "Message sent",
      data: message,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// Hire Candidate
// ==============================
exports.hireCandidate = async (req, res) => {
  try {
    const hire = await Hire.create({
      employer: req.user.id,
      candidate: req.body.candidateId,
      job: req.params.jobId,
    });

    res.status(201).json({
      message: "Candidate hired successfully",
      hire,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// Get Recommended Candidates
// ==============================
exports.getRecommendedCandidates = async (req, res) => {
  try {
    const job = await JobPost.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const filter = {
      role: "employee",
      workerType: job.jobType,
      province: job.province,
      yearsExperience: { $gte: job.requiredExperience },
      verifiedBadge: true,
    };

    if (job.minAge || job.maxAge) {
      filter.age = {};

      if (job.minAge) filter.age.$gte = job.minAge;
      if (job.maxAge) filter.age.$lte = job.maxAge;
    }

    if (job.requiredSkills && job.requiredSkills.length > 0) {
      filter.skills = {
        $in: job.requiredSkills,
      };
    }

    let candidates = await User.find(filter).select("-password");

    candidates = candidates.map((candidate) => {
      let score = 0;

      if (job.requiredSkills && candidate.skills) {
        const matchedSkills = candidate.skills.filter((skill) =>
          job.requiredSkills.includes(skill)
        );

        score += matchedSkills.length * 10;
      }

      score += candidate.yearsExperience || 0;
      score += (candidate.averageRating || 0) * 5;

      if (candidate.availabilityStatus === "available-now") score += 10;
      if (candidate.verifiedBadge) score += 5;

      return {
        candidate,
        score,
      };
    });

    candidates.sort((a, b) => b.score - a.score);

    res.json(candidates.slice(0, 5));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};