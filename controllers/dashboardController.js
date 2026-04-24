const JobPost = require("../models/JobPost");
const JobInvitation = require("../models/JobInvitation");
const Hire = require("../models/Hire");
const Message = require("../models/Message");
const User = require("../models/user");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

// ==============================
// Unified Dashboard (Admin & Employer)
// ==============================
exports.getUnifiedDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    // ==========================
    // Employer View
    // ==========================
    if (role === "employer") {
      // Jobs posted by this employer
      const jobs = await JobPost.find({ employer: userId }).sort({ createdAt: -1 });

      // Invitations sent by this employer
      const invitations = await JobInvitation.find({ employer: userId })
        .populate("candidate", "name workerType skills yearsExperience verifiedBadge")
        .populate("job");

      // Hires made by this employer
      const hires = await Hire.find({ employer: userId })
        .populate("candidate", "name workerType skills yearsExperience verifiedBadge")
        .populate("job");

      // Messages sent or received
      const messages = await Message.find({
        $or: [{ sender: userId }, { receiver: userId }]
      })
        .populate("sender", "name")
        .populate("receiver", "name")
        .sort({ createdAt: -1 });

      // AI Recommendations for top jobs
      let recommendations = [];
      if (jobs.length > 0) {
        const { getRecommendedCandidates } = require("./jobController");
        for (const job of jobs.slice(0, 5)) {
          const reqMock = { params: { id: job._id }, user: req.user };
          const resMock = {
            json: (data) => recommendations.push({ job: job._id, topCandidates: data })
          };
          await getRecommendedCandidates(reqMock, resMock);
        }
      }

      // Dashboard stats
      const stats = {
        totalJobs: jobs.length,
        totalInvitations: invitations.length,
        totalHires: hires.length,
        totalMessages: messages.length
      };

      return res.json({
        role: "employer",
        stats,
        jobs,
        invitations,
        hires,
        messages,
        recommendations
      });
    }

    // ==========================
// Employee View
// ==========================
if (role === "employee") {
  const user = await User.findById(userId);

  // Job matches (basic example)
  const jobs = await JobPost.find().sort({ createdAt: -1 }).limit(10);

  return res.json({
    role: "employee",
    profile: user,
    jobs
  });
}

// ==========================
// Student View
// ==========================
if (role === "student") {
  const enrollments = await Enrollment.find({ user: userId })
    .populate("course");

  const courses = await Course.find();

  return res.json({
    role: "student",
    enrollments,
    courses
  });
}

    // ==========================
    // Admin View
    // ==========================
    if (role === "admin") {
      // All jobs
      const jobs = await JobPost.find().sort({ createdAt: -1 });

      // All invitations
      const invitations = await JobInvitation.find()
        .populate("candidate", "name workerType skills yearsExperience verifiedBadge")
        .populate("employer", "name")
        .populate("job");

      // All hires
      const hires = await Hire.find()
        .populate("candidate", "name workerType skills yearsExperience verifiedBadge")
        .populate("employer", "name")
        .populate("job");

      // All messages
      const messages = await Message.find()
        .populate("sender", "name")
        .populate("receiver", "name")
        .sort({ createdAt: -1 });

      // Candidate verification stats
      const candidateStats = await User.aggregate([
        { $match: { role: "employee" } },
        { $group: { _id: "$verificationStatus", count: { $sum: 1 } } }
      ]);

      // Revenue analytics
      const employers = await User.find({ role: "employer" });
      const students = await User.find({ role: "student" });

      const totalEmployerRevenue = employers.reduce((sum, e) => {
        if (e.subscriptionStatus === "active") return sum + 100; // R100 monthly subscription assumed
        return sum;
      }, 0);

      const totalVerificationRevenue = students.reduce((sum, s) => {
        if (s.hasPaidVerificationFee) return sum + 100; // R100 verification fee
        return sum;
      }, 0);

      const totalCourseRevenue = await Enrollment.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$amountPaid" } } }
      ]);

      const totalRevenue =
        totalEmployerRevenue +
        totalVerificationRevenue +
        (totalCourseRevenue[0] ? totalCourseRevenue[0].total : 0);

      const stats = {
        totalJobs: jobs.length,
        totalInvitations: invitations.length,
        totalHires: hires.length,
        totalMessages: messages.length,
        candidateVerification: candidateStats,
        totalRevenue
      };

      return res.json({
        role: "admin",
        stats,
        jobs,
        invitations,
        hires,
        messages
      });
    }

    res.status(403).json({ message: "Unauthorized role" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};