const JobPost = require("../models/JobPost");
const JobInvitation = require("../models/JobInvitation");
const Hire = require("../models/Hire");
const Message = require("../models/Message");
const User = require("../models/user");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

// ==============================
// Unified Dashboard
// ==============================
const dashboardHandlers = {
  employer: async (userId) => {
    const jobs = await JobPost.find({ employer: userId }).sort({ createdAt: -1 });
    const invitations = await JobInvitation.find({ employer: userId })
      .populate("candidate", "name workerType skills yearsExperience verifiedBadge")
      .populate("job");
    const hires = await Hire.find({ employer: userId })
      .populate("candidate", "name workerType skills yearsExperience verifiedBadge")
      .populate("job");
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender", "name")
      .populate("receiver", "name");
    return { jobs, invitations, hires, messages };
  },
  // add other role handlers here...
};

exports.getUnifiedDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    // ✅ FIX: fetch user INSIDE function
    const user = await User.findById(userId).select("-password");

    const handler = dashboardHandlers[role];
    if (!handler) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const data = await handler(userId);
    res.json({ user, ...data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};
        .populate("receiver", "name")
        .sort({ createdAt: -1 });

      // AI Recommendations
      let recommendations = [];
      if (jobs.length > 0) {
        const { getRecommendedCandidates } = require("./jobController");

        for (const job of jobs.slice(0, 5)) {
          const reqMock = { params: { id: job._id }, user: req.user };
          const resMock = {
            json: (data) =>
              recommendations.push({ job: job._id, topCandidates: data }),
          };

          await getRecommendedCandidates(reqMock, resMock);
        }
      }

      // ✅ Subscription logic (correct way)
      const isActive =
        user.subscriptionExpires &&
        new Date(user.subscriptionExpires) > new Date();

      const stats = {
        totalJobs: jobs.length,
        totalInvitations: invitations.length,
        totalHires: hires.length,
        totalMessages: messages.length,
      };

      return res.json({
        role: "employer",
        subscriptionStatus: isActive ? "active" : "inactive",
        subscriptionExpires: user.subscriptionExpires || null,
        stats,
        jobs,
        invitations,
        hires,
        messages,
        recommendations,
      });
    }

   // ==========================
// Employee View
// ==========================
if (role === "employee") {
  const profile = await User.findById(userId).select("-password");

  // Recommended jobs
  const jobs = await JobPost.find({
    province: profile.province,
  }).sort({ createdAt: -1 });

  // Invitations received
  const invitations = await JobInvitation.find({
    candidate: userId,
  })
    .populate("job")
    .populate("employer", "name");

  return res.json({
    role: "employee",
    profile,
    jobs,
    invitations,
  });
}

    // ==========================
    // Student View
    // ==========================
    if (role === "student") {
      const enrollments = await Enrollment.find({
        student: userId, // ✅ FIX (was wrong before)
      }).populate("course");

      const courses = await Course.find();

      return res.json({
        role: "student",
        enrollments,
        courses,
      });
    }

    // ==========================
    // Admin View
    // ==========================
    if (role === "admin") {
      const jobs = await JobPost.find().sort({ createdAt: -1 });

      const invitations = await JobInvitation.find()
        .populate("candidate", "name workerType skills yearsExperience verifiedBadge")
        .populate("employer", "name")
        .populate("job");

      const hires = await Hire.find()
        .populate("candidate", "name workerType skills yearsExperience verifiedBadge")
        .populate("employer", "name")
        .populate("job");

      const messages = await Message.find()
        .populate("sender", "name")
        .populate("receiver", "name")
        .sort({ createdAt: -1 });

      const candidateStats = await User.aggregate([
        { $match: { role: "employee" } },
        { $group: { _id: "$verificationStatus", count: { $sum: 1 } } },
      ]);

      const stats = {
        totalJobs: jobs.length,
        totalInvitations: invitations.length,
        totalHires: hires.length,
        totalMessages: messages.length,
        candidateVerification: candidateStats,
      };

      return res.json({
        role: "admin",
        stats,
        jobs,
        invitations,
        hires,
        messages,
      });
    }

    res.status(403).json({ message: "Unauthorized role" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};