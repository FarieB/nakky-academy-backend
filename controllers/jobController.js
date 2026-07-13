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
      employer: req.user.id
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
            workerType: job.jobType
        });

    const scoringRules = {
      province: (c, j) => (c.province === j.province ? 15 : 0),
      city: (c, j) => (c.city === j.city ? 10 : 0),
      experience: (c, j) => (c.yearsExperience >= j.requiredExperience ? 25 : 0),
      skills: (c, j) => {
        if (c.skills && j.requiredSkills) {
          const matchedSkills = c.skills.filter(skill =>
            j.requiredSkills.includes(skill)
          );
          return (matchedSkills.length / j.requiredSkills.length) * 35;
        }
        return 0;
      },
      age: (c, j) => (c.age >= j.minAge && c.age <= j.maxAge ? 15 : 0)
    };

    const rankedCandidates = candidates.map(candidate => {
      const score = Object.values(scoringRules).reduce(
        (total, ruleFn) => total + ruleFn(candidate, job),
        0
      );

      return {
        candidate,
        matchScore: Math.round(score)
      };
    });

    // Sort best matches first
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
      job: req.params.jobId
    });

    res.status(201).json({
      message: "Candidate invited successfully",
      invitation
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
      message: req.body.message
    });

    res.status(201).json({
      message: "Message sent",
      data: message
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
      job: req.params.jobId
    });

    res.status(201).json({
      message: "Candidate hired successfully",
      hire
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};

// ==============================
// Get Recommended Candidates for a Job Post
// ==============================
exports.getRecommendedCandidates = async (req, res) => {
  try {
    const job = await JobPost.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Build filter based on job requirements
    const filter = {
      role: "employee",
      workerType: job.jobType,
      province: job.province,
      yearsExperience: { $gte: job.requiredExperience },
      verifiedBadge: true
    };

    // Age filter
    const ageOperators = { $gte: job.minAge, $lte: job.maxAge };
    const ageFilter = Object.entries(ageOperators).reduce((acc, [operator, value]) => {
      if (value != null) {
        acc[operator] = value;
      }
      return acc;
    }, {});
    if (Object.keys(ageFilter).length > 0) {
      filter.age = ageFilter;
    }

    // Skills filter: match at least one required skill
    if (job.requiredSkills && job.requiredSkills.length > 0) {
      filter.skills = { $in: job.requiredSkills };
    }

    // Query candidates
    let candidates = await User.find(filter).select("-password");

    // Score candidates
    candidates = candidates.map(candidate => {
      let score = 0;

      // Matching skills
      const matchedSkills = candidate.skills.filter(skill => job.requiredSkills.includes(skill));
      score += matchedSkills.length * 10; // each skill 10 points

      // Experience weight
      score += candidate.yearsExperience;

      // Ratings weight
      score += candidate.averageRating * 5;

      // Availability bonus
      if (candidate.availabilityStatus === "available-now") score += 10;
      if (candidate.verifiedBadge) score += 5;

      return { candidate, score };
    });

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Return top 5 recommended candidates
    res.json(candidates.slice(0, 5));

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};