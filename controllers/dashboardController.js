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
exports.getUnifiedDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    // ✅ FIX: fetch user INSIDE function
    const user = await User.findById(userId).select("-password");

    // ==========================
    // Employer View
    // ==========================
    if (role === "employer") {
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
        .populate("receiver", "name")
        .sort({ createdAt: -1 });

      // AI Recommendations
      const recommendations = [];
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

  // Student profile
  const profile = await User.findById(userId).select("-password");

  // Courses the student is enrolled in
  const enrollments = await Enrollment.find({
    student: userId,
  }).populate("course");

  // Courses not yet enrolled in
  const enrolledIds = enrollments.map((e) => e.course._id);

  const recommendedCourses = await Course.find({
    _id: { $nin: enrolledIds },
  }).limit(5);

  // Certificates
  const certificates = enrollments.filter(
    (e) => e.certificateIssued
  );

  // Completed courses
  const completedCourses = enrollments.filter(
    (e) => e.completed
  );

  // Temporary announcements
  const announcements = [
    {
      title: "Welcome to Nakky Academy",
      message:
        "Continue learning and complete your courses to earn certificates.",
    },
    {
      title: "New Courses Available",
      message:
        "Browse our latest professional caregiving courses.",
    },
  ];

  return res.json({
    role: "student",

    profile,

    enrollments,

    recommendedCourses,

    certificates,

    completedCourses,

    announcements,
  });
}

// ==========================
// Admin View
// ==========================
if (role === "admin") {

    const profile = await User.findById(userId).select("-password");

    const totalUsers = await User.countDocuments();

    const totalStudents = await User.countDocuments({
        role: "student",
    });

    const totalEmployees = await User.countDocuments({
        role: "employee",
    });

    const totalEmployers = await User.countDocuments({
        role: "employer",
    });

    const totalCourses = await Course.countDocuments();

    const totalJobs = await JobPost.countDocuments();

    const pendingVerifications =
        await User.find({
            verificationStatus: "pending",
        })
        .select("name email")
        .limit(5);

    const recentUsers =
        await User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name role createdAt");

    return res.json({

        role: "admin",

        profile,

        stats: {
            totalUsers,
            totalStudents,
            totalEmployees,
            totalEmployers,
            totalCourses,
            totalJobs,
            revenue: 0
        },

        pendingVerifications,

        recentUsers,

        recentActivity: [

            {
                message:
                    "New caregiver registered"
            },

            {
                message:
                    "Employer purchased subscription"
            },

            {
                message:
                    "New course published"
            },

            {
                message:
                    "Verification approved"
            }

        ]

    });

}
    res.status(403).json({ message: "Unauthorized role" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};