const JobPost = require("../models/JobPost");
const Employee = require("../models/Employee");
const JobInvitation = require("../models/JobInvitation");
const Message = require("../models/Message");
const Hire = require("../models/Hire");


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

    const candidates = await Employee.find({
      jobType: job.jobType
    });

    const rankedCandidates = candidates.map(candidate => {

      let score = 0;

      // =================
      // Location Score (25)
      // =================
      if (candidate.province === job.province) {
        score += 15;
      }

      if (candidate.city === job.city) {
        score += 10;
      }

      // =================
      // Experience Score (25)
      // =================
      if (candidate.yearsOfExperience >= job.requiredExperience) {
        score += 25;
      }

      // =================
      // Skills Score (35)
      // =================
      if (candidate.skills && job.requiredSkills) {

        const matchedSkills = candidate.skills.filter(skill =>
          job.requiredSkills.includes(skill)
        );

        const skillScore =
          (matchedSkills.length / job.requiredSkills.length) * 35;

        score += skillScore;
      }

      // =================
      // Age Score (15)
      // =================
      if (candidate.age >= job.minAge && candidate.age <= job.maxAge) {
        score += 15;
      }

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