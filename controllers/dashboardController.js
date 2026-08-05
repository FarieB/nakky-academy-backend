const User = require("../models/user");
const CandidateProfile = require("../models/CandidateProfile");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const Payment = require("../models/Payment");

// 1. ADD THIS UTILITY IMPORT AT THE TOP OF THE FILE
const {
    calculateProfileCompletion,
} = require("../utils/profileCompletion");

// ==============================
// Unified Dashboard
// ==============================
exports.getUnifiedDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    const user = await User.findById(userId).select("-password");

        // =====================================================
    // EMPLOYER DASHBOARD
    // =====================================================
    if (role === "employer") {

      const isActive =
        user.subscriptionExpiry &&
        new Date(user.subscriptionExpiry) > new Date();

      const totalCandidates = await CandidateProfile.countDocuments({
        profileStatus: "active",
      });

      return res.json({
        role: "employer",

        subscriptionStatus: isActive ? "active" : "inactive",

        subscriptionExpiry: user.subscriptionExpiry || null,

        stats: {
          totalCandidates,
        },
      });
    }


    // =====================================================
    // CANDIDATE DASHBOARD
    // =====================================================
    if (role === "candidate") {

      const profile = await CandidateProfile.findOne({
        user: userId,
      }).populate("user");

      const enrollments = await Enrollment.find({
        student: userId,
      }).populate("course");

      const completedCourses = enrollments.filter(
        (e) => e.completed
      );

      const certificates = enrollments.filter(
        (e) => e.certificateIssued
      );

      const enrolledIds = enrollments.map(
        (e) => e.course._id
      );

      const recommendedCourses = await Course.find({
        _id: {
          $nin: enrolledIds,
        },
      }).limit(5);

      // 2. CALCULATE COMPLETION SCORE HERE
      const completion = calculateProfileCompletion(profile);

      return res.json({

        role: "candidate",

        profile,

        stats: {
          enrolledCourses: enrollments.length,
          completedCourses: completedCourses.length,
          certificates: certificates.length,
          verificationStatus:
            profile?.verificationStatus || "unverified",
          verifiedBadge:
            profile?.verifiedBadge || false,
        },

        enrollments,

        completedCourses,

        certificates,

        recommendedCourses,

        // 3. EXPOSE THE COMPLETION OBJECT TO RESPOND TO FRONTEND
        profileCompletion: completion,

      });
    }

    // =====================================================
    // STUDENT DASHBOARD
    // =====================================================
    if (role === "student") {

      const profile = await User.findById(userId)
        .select("-password");

      const enrollments = await Enrollment.find({
        student: userId,
      }).populate("course");

      const enrolledIds = enrollments.map(
        (e) => e.course._id
      );

      const recommendedCourses = await Course.find({
        _id: {
          $nin: enrolledIds,
        },
      }).limit(5);

      const certificates = enrollments.filter(
        (e) => e.certificateIssued
      );

      const completedCourses = enrollments.filter(
        (e) => e.completed
      );

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

    // =====================================================
    // ADMIN DASHBOARD
    // =====================================================
    if (role === "admin") {

      const profile = await User.findById(userId)
        .select("-password");

      const totalUsers = await User.countDocuments();

      const totalStudents = await User.countDocuments({
        role: "student",
      });

      const totalEmployers = await User.countDocuments({
        role: "employer",
      });

      const totalCandidates =
        await CandidateProfile.countDocuments();

      const totalCourses =
        await Course.countDocuments();

      const totalEnrollments =
        await Enrollment.countDocuments();

      const revenue = await Payment.aggregate([
        {
          $match: {
            status: "paid",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
          },
        },
      ]);

      const pendingVerifications =
        await CandidateProfile.find({
          verificationStatus: "pending",
        })
          .populate("user", "name email")
          .limit(5);

      const recentUsers = await User.find()
        .sort({
          createdAt: -1,
        })
        .limit(5)
        .select("name role createdAt");

      return res.json({

        role: "admin",

        profile,

        stats: {
          totalUsers,
          totalStudents,
          totalEmployers,
          totalCandidates,
          totalCourses,
          totalEnrollments,
          revenue: revenue[0]?.total || 0,
        },

        pendingVerifications,

        recentUsers,

        recentActivity: [
          {
            message: "New candidate registered",
          },
          {
            message: "Employer subscription activated",
          },
          {
            message: "New course created",
          },
          {
            message: "Candidate verification approved",
          },
          {
            message: "Student enrolled in a course",
          },
        ],

      });
    }

    return res.status(403).json({
      message: "Unauthorized role",
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      message: err.message,
    });

  }
};
