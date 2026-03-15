const JobPost = require("../models/JobPost");
const User = require("../models/user");
const Course = require("../models/Course");


// =================================
// Recommend Jobs to Employees
// =================================
exports.recommendJobs = async (req, res) => {

  try {

    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Only employees can access job recommendations"
      });
    }

    const user = await User.findById(req.user._id);

    const jobs = await JobPost.find({
      province: user.province
    }).sort({ createdAt: -1 });

    res.json(jobs);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};


// =================================
// Recommend Candidates to Employers
// =================================
exports.recommendCandidates = async (req, res) => {

  try {

    if (req.user.role !== "employer") {
      return res.status(403).json({
        message: "Only employers can view candidate recommendations"
      });
    }

    const job = await JobPost.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const candidates = await User.find({

      role: "employee",
      verifiedBadge: true

    });

    res.json(candidates);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};


// =================================
// Recommend Courses to Students
// =================================
exports.recommendCourses = async (req, res) => {

  try {

    if (req.user.role !== "student") {
      return res.status(403).json({
        message: "Students only"
      });
    }

    const courses = await Course.find().limit(5);

    res.json(courses);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};