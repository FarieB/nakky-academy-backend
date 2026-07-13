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

    // Find relevant jobs
    const jobs = await JobPost.find({
      jobType: user.workerType,
      province: user.province
    });

    // Score jobs
    const scoreRules = [
      (job, user) => job.city === user.city ? 20 : 0,
      (job, user) => job.province === user.province ? 10 : 0,
      (job, user) => user.yearsExperience >= job.requiredExperience ? 25 : 0,
      (job, user) => {
        if (user.skills && job.requiredSkills) {
          const matched = user.skills.filter(skill =>
            job.requiredSkills.includes(skill)
          );
          return matched.length * 10;
        }
        return 0;
      }
    ];

    const scoredJobs = jobs.map(job => {
      const score = scoreRules.reduce((total, rule) => total + rule(job, user), 0);
      return { job, score };
    });

    // Sort best first
    scoredJobs.sort((a, b) => b.score - a.score);

    res.json(scoredJobs);
    return null;

  } catch (error) {
    res.status(500).json({ message: error.message });
    return null;
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

    // Filter candidates
    const candidates = await User.find({
      role: "employee",
      workerType: job.jobType,
      province: job.province
    });

    // Score candidates
    const ranked = candidates.map(candidate => {
      let score = 0;

      // Skills match
    });

    // Sort best first
    ranked.sort((a, b) => b.score - a.score);

    res.json(ranked);
    return null;
  } catch (error) {
    res.status(500).json({ message: error.message });
    return null;
  }
      if (candidate.skills && job.requiredSkills) {
        const matched = candidate.skills.filter(skill =>
          job.requiredSkills.includes(skill)
        );
        score += matched.length * 10;
      }

      // Experience
      score += candidate.yearsExperience;

      // Rating weight
      score += (candidate.averageRating || 0) * 5;

      // Verified bonus
      if (candidate.verifiedBadge) score += 10;

      return { candidate, score };
    });

    ranked.sort((a, b) => b.score - a.score);

    res.json(ranked.slice(0, 5)); // Top 5

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
    const courses = await Course.find();

    // Example: prioritize caregiving-related courses
    const ranked = courses.map(course => {
      let score = 0;

      if (course.title.toLowerCase().includes("care")) score += 20;
      if (course.title.toLowerCase().includes("child")) score += 15;

      return { course, score };
    });

    ranked.sort((a, b) => b.score - a.score);

    res.json(ranked.slice(0, 5));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
  return null;
};